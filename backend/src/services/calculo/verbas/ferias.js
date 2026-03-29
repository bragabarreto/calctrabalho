'use strict';

const { round2, nonNegative } = require('../../../utils/formatacao');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');

/**
 * Filtra períodos integrais de férias a partir do array periodosFerias.
 * Retorna apenas períodos ativos (não excluídos) do tipo 'integral'.
 */
function filtrarPeriodosIntegrais(periodosFerias) {
  if (!periodosFerias || periodosFerias.length === 0) return [];
  return periodosFerias.filter(p => !p.excluida && p.tipo === 'integral');
}

/**
 * Verifica se um período deve ser incluído no cálculo:
 * - Não pago → incluir (valor integral)
 * - Pago com valorPago > 0 → incluir (pagamento parcial, calcular diferença)
 * - Pago sem valorPago → excluir (pagamento integral, nada a deduzir)
 */
function periodoDeveSerCalculado(p) {
  if (!p.pagas) return true;
  return parseFloat(p.valorPago) > 0;
}

/**
 * Férias Vencidas Dobradas (+ 1/3 constitucional)
 * Fórmula por período: base × 2 × (4/3) − valorPago
 * Base: último salário + comissões + gorjetas (Súmula 7 TST + Súmula 354 TST)
 *
 * Critério: período integral, vencido (concessivo expirado), não gozado.
 * Se pagas com valorPago > 0 → pagamento parcial, deduz-se o valor pago.
 */
function calcularFeriasDobradas(dados, temporal) {
  if (dados.verbasExcluidas?.includes('ferias_dobradas')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const { valor: base } = calcularBaseRescisoria(dados, { incluirGorjetas: true });
  const periodosFerias = dados.periodosFerias || [];
  const integrais = filtrarPeriodosIntegrais(periodosFerias);

  // Períodos dobrados: vencidos + não gozados + (não pagos OU pagos parcialmente)
  const dobrados = integrais.filter(p => p.vencidas && !p.gozadas && periodoDeveSerCalculado(p));

  // Se há dados de períodos detalhados, usar cálculo por-período
  if (periodosFerias.length > 0) {
    if (dobrados.length === 0) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias dobradas pendente' } };
    }

    const valorPorPeriodo = round2(base * 2 * (4 / 3));
    let totalValor = 0;
    const detalhes = [];

    for (const p of dobrados) {
      const pago = parseFloat(p.valorPago) || 0;
      const valorPeriodo = nonNegative(round2(valorPorPeriodo - pago));
      totalValor += valorPeriodo;
      detalhes.push({
        numero: p.numero,
        periodo: `${p.inicioAquisitivo} a ${p.fimAquisitivo}`,
        bruto: valorPorPeriodo,
        valorPago: pago,
        valor: valorPeriodo,
      });
    }

    const valor = round2(totalValor);
    return {
      valor,
      excluida: false,
      memoria: {
        formula: `${dobrados.length} período(s) × R$ ${base.toFixed(2)} × 2 × 4/3 = R$ ${valorPorPeriodo.toFixed(2)}/período`,
        base,
        qtde: dobrados.length,
        multiplicador: '2 × 4/3 = dobro + 1/3 constitucional',
        fundamentoLegal: 'Art. 137 CLT — férias não concedidas no prazo concessivo são devidas em dobro. Súmula 7 TST — base = último salário.',
        periodosDetalhados: detalhes,
      },
    };
  }

  // Fallback: cálculo por contagem simples (legado)
  const qtde = dados.qtdeFeriasVencidasDobradas || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias dobradas informado' } };

  const valor = round2(base * 2 * (4 / 3) * qtde);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `R$ ${base.toFixed(2)} × 2 × 4/3 × ${qtde} período(s) = R$ ${valor.toFixed(2)}`,
      base,
      qtde,
      multiplicador: '2 × 4/3 = dobro + 1/3 constitucional',
    },
  };
}

/**
 * Férias Integrais (simples + 1/3)
 * Fórmula por período: base × (4/3) − valorPago
 *
 * Critério: período integral que NÃO é dobrado (não vencido, ou gozado) e ainda é devido.
 * Inclui: não vencidos não pagos, gozados não pagos, qualquer integral com pagamento parcial.
 */
function calcularFeriasIntegrais(dados, temporal) {
  if (dados.verbasExcluidas?.includes('ferias_integrais')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const { valor: base } = calcularBaseRescisoria(dados, { incluirGorjetas: true });
  const periodosFerias = dados.periodosFerias || [];
  const integrais = filtrarPeriodosIntegrais(periodosFerias);

  if (periodosFerias.length > 0) {
    // Integrais simples: NÃO são dobrados (excluir vencidos não gozados que vão para calcularFeriasDobradas)
    // Incluem: (a) não vencidos, não pagos integralmente
    //          (b) gozados mas não pagos (ou pagos parcialmente)
    //          (c) vencidos + gozados (gozo tardio) mas não pagos
    const simples = integrais.filter(p => {
      // Se é dobrado (vencido + não gozado), não vai aqui
      if (p.vencidas && !p.gozadas) return false;
      // Deve ser calculado (não pago integralmente)
      return periodoDeveSerCalculado(p);
    });

    if (simples.length === 0) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias integrais pendente' } };
    }

    const valorPorPeriodo = round2(base * (4 / 3));
    let totalValor = 0;
    const detalhes = [];

    for (const p of simples) {
      const pago = parseFloat(p.valorPago) || 0;
      const valorPeriodo = nonNegative(round2(valorPorPeriodo - pago));
      totalValor += valorPeriodo;
      detalhes.push({
        numero: p.numero,
        periodo: `${p.inicioAquisitivo} a ${p.fimAquisitivo}`,
        bruto: valorPorPeriodo,
        valorPago: pago,
        valor: valorPeriodo,
        gozadas: p.gozadas,
        vencidas: p.vencidas,
      });
    }

    const valor = round2(totalValor);
    return {
      valor,
      excluida: false,
      memoria: {
        formula: `${simples.length} período(s) × R$ ${base.toFixed(2)} × 4/3 = R$ ${valorPorPeriodo.toFixed(2)}/período`,
        base,
        qtde: simples.length,
        fundamentoLegal: 'Art. 129 CLT — férias anuais remuneradas com 1/3 constitucional. Súmula 7 TST — base = último salário.',
        periodosDetalhados: detalhes,
      },
    };
  }

  // Fallback: cálculo por contagem simples (legado)
  const qtde = dados.qtdeFeriasVencidasSimples || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias integrais informado' } };

  const valor = round2(base * (4 / 3) * qtde);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `R$ ${base.toFixed(2)} × 4/3 × ${qtde} período(s) = R$ ${valor.toFixed(2)}`,
      base,
      qtde,
    },
  };
}

/**
 * Férias Proporcionais + 1/3
 * Regra dos 15 dias: se diasRestantes >= 15, conta mês a mais
 */
function calcularFeriasProporcionais(dados, temporal) {
  if (dados.verbasExcluidas?.includes('ferias_proporcionais')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  // Se informadas como integralmente pagas (sem valor de desconto), nada é devido
  if (dados.feriasProporcionaisPagas && !dados.valorPagoFeriasProporcionais) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Férias proporcionais informadas como integralmente pagas' } };
  }

  const { valor: base } = calcularBaseRescisoria(dados, { incluirGorjetas: true });
  const meses = temporal.mesesUltimoAno;
  const diasRestantes = temporal.diasUltimoAno;
  const mesesEfetivos = diasRestantes >= 15 ? meses + 1 : meses;

  if (mesesEfetivos === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Período aquisitivo < 15 dias — férias não devidas' } };
  }

  const bruto = round2(base * (mesesEfetivos / 12) * (4 / 3));
  const desconto = dados.valorPagoFeriasProporcionais || 0;
  const valor = desconto > 0 ? nonNegative(round2(bruto - desconto)) : bruto;

  return {
    valor,
    excluida: false,
    memoria: {
      formula: desconto > 0
        ? `R$ ${base.toFixed(2)} × (${mesesEfetivos}/12) × 4/3 = R$ ${bruto.toFixed(2)} − R$ ${desconto.toFixed(2)} (pago parcialmente) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} × (${mesesEfetivos}/12) × 4/3 = R$ ${valor.toFixed(2)}`,
      base,
      mesesTrabalhados: meses,
      diasRestantes,
      mesesEfetivos,
      regraQuinze: diasRestantes >= 15 ? 'Aplicada (+1 mês)' : 'Não aplicada',
      fundamentoLegal: 'Art. 146 parágrafo único CLT — férias proporcionais na rescisão.',
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
    },
  };
}

module.exports = { calcularFeriasDobradas, calcularFeriasIntegrais, calcularFeriasProporcionais };

'use strict';

const { round2, nonNegative } = require('../../../utils/formatacao');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');

/**
 * 13º Salário Integral (vencidos não pagos)
 * Base: salário + comissões + gorjetas (Súmula 354 TST)
 *
 * Quando periodosDecimoTerceiro disponível: itera períodos integrais
 * com status !== 'pago' ou com valorPago > 0 (pagamento parcial).
 */
function calcularDecimoTerceiroIntegral(dados, temporal) {
  if (dados.verbasExcluidas?.includes('decimo_terceiro_integral')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const dadosBase = dados.mediaSalarial ? { ...dados, ultimoSalario: dados.mediaSalarial } : dados;
  const { valor: base } = calcularBaseRescisoria(dadosBase, { incluirGorjetas: true });

  const periodosDecimo = dados.periodosDecimoTerceiro || [];

  // Cálculo por-período quando array detalhado disponível
  if (periodosDecimo.length > 0) {
    const integrais = periodosDecimo.filter(p => !p.excluido && p.tipo === 'integral');
    // Devidos: status !== 'pago' OU pago com valorPago > 0 (parcial)
    const devidos = integrais.filter(p =>
      p.status !== 'pago' || (p.status === 'pago' && parseFloat(p.valorPago) > 0)
    );

    if (devidos.length === 0) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Todos os 13º integrais foram pagos' } };
    }

    let totalValor = 0;
    const detalhes = [];

    for (const p of devidos) {
      const pago = parseFloat(p.valorPago) || 0;
      const valorPeriodo = nonNegative(round2(base - pago));
      totalValor += valorPeriodo;
      detalhes.push({
        anoReferencia: p.anoReferencia,
        bruto: base,
        valorPago: pago,
        valor: valorPeriodo,
        status: p.status,
      });
    }

    const valor = round2(totalValor);
    return {
      valor,
      excluida: false,
      memoria: {
        formula: `${devidos.length} período(s) × R$ ${base.toFixed(2)} = R$ ${round2(base * devidos.length).toFixed(2)}`,
        base,
        qtde: devidos.length,
        fundamentoLegal: 'Art. 1º Lei 4.090/62 — 13º salário integral por ano de serviço.',
        periodosDetalhados: detalhes,
      },
    };
  }

  // Fallback: cálculo por contagem simples (legado)
  const qtde = dados.qtdeDecimoTerceiroVencidos || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum 13º integral informado' } };

  const bruto = round2(base * qtde);
  const desconto = dados.valorPagoParcialDecimo || 0;
  const valor = nonNegative(round2(bruto - desconto));

  return {
    valor,
    excluida: false,
    memoria: {
      formula: desconto > 0
        ? `R$ ${base.toFixed(2)} × ${qtde} = R$ ${bruto.toFixed(2)} − R$ ${desconto.toFixed(2)} (pago parcialmente) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} × ${qtde} = R$ ${valor.toFixed(2)}`,
      fundamentoLegal: 'Art. 1º Lei 4.090/62 — 13º salário integral por ano de serviço.',
      base,
      qtde,
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
    },
  };
}

/**
 * 13º Salário Proporcional
 * Fórmula: base / 12 × meses trabalhados no ano
 * Meses: conta mês com >= 15 dias trabalhados
 */
function calcularDecimoTerceiroProporcional(dados, temporal) {
  if (dados.verbasExcluidas?.includes('decimo_terceiro_proporcional')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  // Se informado como integralmente pago (sem valor de desconto), nada é devido
  if (dados.decimoProporcionalPago && !dados.valorPagoDecimoTerceiroProporcional) {
    return { valor: 0, excluida: false, memoria: { motivo: '13º proporcional informado como integralmente pago' } };
  }

  // Gorjetas integram base do 13º (Súmula 354 TST) — padronizado via baseRescisoria
  const dadosBase13 = dados.mediaSalarial ? { ...dados, ultimoSalario: dados.mediaSalarial } : dados;
  const { valor: base } = calcularBaseRescisoria(dadosBase13, { incluirGorjetas: true });
  // OJ 82 SDI1 TST: aviso prévio indenizado projeta para o 13º proporcional
  const meses = temporal.lapsoComAviso.mesesRestantes;
  const dias = temporal.lapsoComAviso.diasRestantes;
  const mesesEfetivos = dias >= 15 ? meses + 1 : meses;

  if (mesesEfetivos === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Menos de 15 dias no ano — 13º não devido' } };
  }

  const bruto = round2((base / 12) * mesesEfetivos);
  const desconto = dados.valorPagoDecimoTerceiroProporcional || 0;
  const valor = desconto > 0 ? nonNegative(round2(bruto - desconto)) : bruto;

  return {
    valor,
    excluida: false,
    memoria: {
      formula: desconto > 0
        ? `R$ ${base.toFixed(2)} / 12 × ${mesesEfetivos} meses = R$ ${bruto.toFixed(2)} − R$ ${desconto.toFixed(2)} (pago parcialmente) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} / 12 × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      fundamentoLegal: 'Art. 1º Lei 4.090/62 c/c OJ 82 SDI-1 TST — 13º proporcional com projeção do aviso prévio.',
      base,
      meses,
      diasRestantes: dias,
      mesesEfetivos,
      regraQuinze: dias >= 15 ? 'Aplicada (+1 mês)' : 'Não aplicada',
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
    },
  };
}

module.exports = { calcularDecimoTerceiroIntegral, calcularDecimoTerceiroProporcional };

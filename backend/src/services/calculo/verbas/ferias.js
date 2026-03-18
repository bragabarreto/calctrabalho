'use strict';

const { round2, nonNegative } = require('../../../utils/formatacao');

/**
 * Férias Vencidas Dobradas (+ 1/3 constitucional)
 * Fórmula: base × 2 × (4/3) × qtde_períodos
 */
function calcularFeriasDobradas(dados, temporal) {
  if (dados.verbasExcluidas?.includes('ferias_dobradas')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  const qtde = dados.qtdeFeriasVencidasDobradas || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias dobradas informado' } };

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0) + (dados.gorjetas || 0);
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
 * Fórmula: base × (4/3) × qtde_períodos
 */
function calcularFeriasIntegrais(dados, temporal) {
  if (dados.verbasExcluidas?.includes('ferias_integrais')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  const qtde = dados.qtdeFeriasVencidasSimples || 0;
  if (qtde === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum período de férias integrais informado' } };

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0) + (dados.gorjetas || 0);
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

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0) + (dados.gorjetas || 0);
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
      ...(desconto > 0 && { descontoPagoParcialmente: desconto }),
    },
  };
}

module.exports = { calcularFeriasDobradas, calcularFeriasIntegrais, calcularFeriasProporcionais };

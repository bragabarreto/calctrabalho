'use strict';

const { round2 } = require('../../../utils/formatacao');

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

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0) + (dados.gorjetas || 0);
  const meses = temporal.mesesUltimoAno;
  const diasRestantes = temporal.diasUltimoAno;
  const mesesEfetivos = diasRestantes >= 15 ? meses + 1 : meses;

  if (mesesEfetivos === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Período aquisitivo < 15 dias — férias não devidas' } };
  }

  const valor = round2(base * (mesesEfetivos / 12) * (4 / 3));

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `R$ ${base.toFixed(2)} × (${mesesEfetivos}/12) × 4/3 = R$ ${valor.toFixed(2)}`,
      base,
      mesesTrabalhados: meses,
      diasRestantes,
      mesesEfetivos,
      regraQuinze: diasRestantes >= 15 ? 'Aplicada (+1 mês)' : 'Não aplicada',
    },
  };
}

module.exports = { calcularFeriasDobradas, calcularFeriasIntegrais, calcularFeriasProporcionais };

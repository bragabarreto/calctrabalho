'use strict';

const { valorParaCompetencia, calcularTotalPorHistorico } = require('./historicoSalarial');

/**
 * Encontra o histórico salarial principal (fixo=true ou o primeiro).
 * @param {Array} historicosSalariais
 * @returns {Object|null}
 */
function encontrarHistoricoPrincipal(historicosSalariais) {
  if (!historicosSalariais || historicosSalariais.length === 0) return null;
  return historicosSalariais.find(h => h.fixo) || historicosSalariais[0];
}

/**
 * Resolve o salário para uma competência específica usando o histórico salarial.
 * Fallback: mediaSalarial → ultimoSalario.
 *
 * @param {Object} dados - dados do contrato (com historicosSalariais, mediaSalarial, ultimoSalario)
 * @param {string} competencia - 'YYYY-MM'
 * @returns {number}
 */
function resolverSalarioCompetencia(dados, competencia) {
  const hist = encontrarHistoricoPrincipal(dados.historicosSalariais);
  if (hist) {
    const valor = valorParaCompetencia(hist, competencia);
    if (valor > 0) return valor;
  }
  return dados.mediaSalarial || dados.ultimoSalario || 0;
}

/**
 * Calcula o total mensal de uma verba ao longo de um período, usando o salário histórico.
 * Para cada mês: salario(mes) × fator.
 * Se histórico não disponível: fallback para (mediaSalarial || ultimoSalario) × fator × nMeses.
 *
 * @param {Object} dados - dados do contrato
 * @param {Date|string} dataInicio - início do período
 * @param {Date|string} dataFim - fim do período
 * @param {number} fator - multiplicador mensal (ex: 0.30 para periculosidade)
 * @returns {{ total: number, meses: number, distribuicaoMensal: Array, usouHistorico: boolean }}
 */
function calcularComHistoricoMensal(dados, dataInicio, dataFim, fator = 1.0) {
  const hist = encontrarHistoricoPrincipal(dados.historicosSalariais);

  const inicio = typeof dataInicio === 'string' ? dataInicio : dataInicio.toISOString().split('T')[0];
  const fim = typeof dataFim === 'string' ? dataFim : dataFim.toISOString().split('T')[0];

  if (hist) {
    const resultado = calcularTotalPorHistorico(hist, inicio, fim, fator);
    if (resultado.total > 0 || resultado.meses > 0) {
      return {
        total: resultado.total,
        meses: resultado.meses,
        distribuicaoMensal: resultado.memoria,
        usouHistorico: true,
      };
    }
  }

  // Fallback: usar média/último salário
  const salarioBase = dados.mediaSalarial || dados.ultimoSalario || 0;
  const compInicio = inicio.substring(0, 7);
  const compFim = fim.substring(0, 7);

  let meses = 0;
  let comp = compInicio;
  while (comp <= compFim) {
    meses++;
    const [y, m] = comp.split('-').map(Number);
    comp = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  const valorMensal = Math.round(salarioBase * fator * 100) / 100;
  const total = Math.round(valorMensal * meses * 100) / 100;

  return {
    total,
    meses,
    distribuicaoMensal: [],
    usouHistorico: false,
  };
}

module.exports = {
  encontrarHistoricoPrincipal,
  resolverSalarioCompetencia,
  calcularComHistoricoMensal,
};

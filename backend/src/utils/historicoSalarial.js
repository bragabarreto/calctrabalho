'use strict';

/**
 * Utilitário para resolução de históricos salariais.
 * Cada histórico tem faixas com { inicio, fim, valor } no formato 'YYYY-MM'.
 * Quando há sobreposição, a faixa mais recente (maior inicio) prevalece.
 */

/**
 * Mês anterior no formato 'YYYY-MM'.
 */
function mesAnterior(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Resolve sobreposições entre faixas.
 * Ordena por inicio; quando faixa A sobrepõe faixa B,
 * o fim efetivo de A passa a ser o mês anterior ao inicio de B.
 *
 * @param {Array} faixas - [{ inicio, fim, valor }]
 * @returns {Array} - faixas com fimEfetivo calculado
 */
function resolverFaixas(faixas) {
  const sorted = [...faixas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return sorted.map((f, i) => {
    const next = sorted[i + 1];
    let fimEfetivo = f.fim || null;
    if (next && (!f.fim || f.fim >= next.inicio)) {
      fimEfetivo = mesAnterior(next.inicio);
    }
    return { ...f, fimEfetivo };
  });
}

/**
 * Retorna o valor do histórico para uma competência específica.
 *
 * @param {Object} historico - { faixas: [{ inicio, fim, valor }] }
 * @param {string} competencia - 'YYYY-MM'
 * @returns {number} valor aplicável (0 se não houver faixa)
 */
function valorParaCompetencia(historico, competencia) {
  const resolvidas = resolverFaixas(historico.faixas || []);
  // A última faixa que começa antes ou no mesmo mês e cujo fimEfetivo é nulo ou >= competencia
  for (let i = resolvidas.length - 1; i >= 0; i--) {
    const f = resolvidas[i];
    if (f.inicio <= competencia && (!f.fimEfetivo || f.fimEfetivo >= competencia)) {
      return f.valor;
    }
  }
  return 0;
}

/**
 * Calcula o total de uma parcela mensal ao longo de um período usando o histórico.
 * Itera mês a mês entre dataInicio e dataFim (formato 'YYYY-MM' ou 'YYYY-MM-DD').
 *
 * @param {Object} historico - { faixas: [...] }
 * @param {string} dataInicio - início do período ('YYYY-MM' ou 'YYYY-MM-DD')
 * @param {string} dataFim    - fim do período ('YYYY-MM' ou 'YYYY-MM-DD')
 * @param {number} percentual - fator aplicado sobre o valor (padrão 1.0)
 * @returns {{ total: number, memoria: Array, meses: number }}
 */
function calcularTotalPorHistorico(historico, dataInicio, dataFim, percentual = 1.0) {
  // Normaliza para 'YYYY-MM'
  const compInicio = String(dataInicio).substring(0, 7);
  const compFim = String(dataFim).substring(0, 7);

  const memoria = [];
  let total = 0;
  let comp = compInicio;
  let meses = 0;

  while (comp <= compFim) {
    const valor = valorParaCompetencia(historico, comp);
    const valorComPercentual = Math.round((valor * percentual) * 100) / 100;
    if (valor > 0) {
      memoria.push({ competencia: comp, valor, valorComPercentual });
    }
    total += valorComPercentual;
    meses++;

    // Avança um mês
    const [y, m] = comp.split('-').map(Number);
    comp = m === 12
      ? `${y + 1}-01`
      : `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  return {
    total: Math.round(total * 100) / 100,
    meses,
    memoria,
  };
}

/**
 * Encontra um histórico pelo id na lista de historicosSalariais.
 *
 * @param {Array} historicosSalariais
 * @param {string} id
 * @returns {Object|null}
 */
function encontrarHistorico(historicosSalariais, id) {
  return (historicosSalariais || []).find((h) => h.id === id) || null;
}

module.exports = {
  resolverFaixas,
  valorParaCompetencia,
  calcularTotalPorHistorico,
  encontrarHistorico,
};

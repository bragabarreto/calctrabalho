'use strict';

/**
 * Utilitário para resolução de históricos salariais.
 * Estrutura: [{ id, titulo, fixo?, parcelas: [{ id, nome, faixas: [{ inicio, fim, valor }] }] }]
 * baseHistoricoId pode ser "histId" (soma todas as parcelas) ou "histId:parcelaId" (parcela específica).
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
 * Retorna o valor de uma parcela (faixas) para uma competência específica.
 *
 * @param {Array} faixas - [{ inicio, fim, valor }]
 * @param {string} competencia - 'YYYY-MM'
 * @returns {number} valor aplicável (0 se não houver faixa)
 */
function valorFaixasParaCompetencia(faixas, competencia) {
  const resolvidas = resolverFaixas(faixas || []);
  for (let i = resolvidas.length - 1; i >= 0; i--) {
    const f = resolvidas[i];
    if (f.inicio <= competencia && (!f.fimEfetivo || f.fimEfetivo >= competencia)) {
      return f.valor;
    }
  }
  return 0;
}

/**
 * Retorna o valor do histórico para uma competência específica.
 * Se parcelaId fornecido, retorna apenas essa parcela; caso contrário soma todas.
 *
 * @param {Object} historico - { parcelas: [{ id, nome, faixas }] }
 * @param {string} competencia - 'YYYY-MM'
 * @param {string|null} parcelaId - ID da parcela específica (opcional)
 * @returns {number} valor aplicável (0 se não houver)
 */
function valorParaCompetencia(historico, competencia, parcelaId = null) {
  const parcelas = historico.parcelas || [];
  if (parcelaId) {
    const parcela = parcelas.find((p) => p.id === parcelaId);
    return parcela ? valorFaixasParaCompetencia(parcela.faixas, competencia) : 0;
  }
  // Soma todas as parcelas
  return parcelas.reduce((acc, p) => acc + valorFaixasParaCompetencia(p.faixas, competencia), 0);
}

/**
 * Calcula o total de uma parcela mensal ao longo de um período usando o histórico.
 * Itera mês a mês entre dataInicio e dataFim (formato 'YYYY-MM' ou 'YYYY-MM-DD').
 *
 * @param {Object} historico - { parcelas: [...] }
 * @param {string} dataInicio - início do período ('YYYY-MM' ou 'YYYY-MM-DD')
 * @param {string} dataFim    - fim do período ('YYYY-MM' ou 'YYYY-MM-DD')
 * @param {number} percentual - fator aplicado sobre o valor (padrão 1.0)
 * @param {string|null} parcelaId - ID da parcela específica (opcional)
 * @returns {{ total: number, memoria: Array, meses: number }}
 */
function calcularTotalPorHistorico(historico, dataInicio, dataFim, percentual = 1.0, parcelaId = null) {
  // Normaliza para 'YYYY-MM'
  const compInicio = String(dataInicio).substring(0, 7);
  const compFim = String(dataFim).substring(0, 7);

  const memoria = [];
  let total = 0;
  let comp = compInicio;
  let meses = 0;

  while (comp <= compFim) {
    const valor = valorParaCompetencia(historico, comp, parcelaId);
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

/**
 * Resolve baseHistoricoId que pode ser "histId" ou "histId:parcelaId".
 * Retorna { historico, parcelaId } para uso em calcularTotalPorHistorico.
 *
 * @param {Array} historicosSalariais
 * @param {string} baseHistoricoId
 * @returns {{ historico: Object|null, parcelaId: string|null }}
 */
function resolverBaseHistoricoId(historicosSalariais, baseHistoricoId) {
  if (!baseHistoricoId) return { historico: null, parcelaId: null };
  const [histId, parcelaId] = baseHistoricoId.split(':');
  const historico = encontrarHistorico(historicosSalariais, histId);
  return { historico, parcelaId: parcelaId || null };
}

module.exports = {
  resolverFaixas,
  valorFaixasParaCompetencia,
  valorParaCompetencia,
  calcularTotalPorHistorico,
  encontrarHistorico,
  resolverBaseHistoricoId,
};

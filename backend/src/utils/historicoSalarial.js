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
 * Extrai o dia de uma data 'YYYY-MM-DD'. Retorna null se só houver mês/ano.
 */
function diaDe(data) {
  const s = String(data);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? Number(s.substring(8, 10)) : null;
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
 * @param {Object} opcoes - { proporcionalPorDias: boolean }
 *   Quando true, os meses de início e fim do período são rateados por dias/30
 *   (art. 64 CLT). Sem isso, um contrato de 04/06 a 21/07 era apurado como dois
 *   meses cheios de salário.
 * @returns {{ total: number, memoria: Array, meses: number, mesesEquivalentes: number }}
 */
function calcularTotalPorHistorico(historico, dataInicio, dataFim, percentual = 1.0, parcelaId = null, opcoes = {}) {
  // Normaliza para 'YYYY-MM'
  const compInicio = String(dataInicio).substring(0, 7);
  const compFim = String(dataFim).substring(0, 7);

  const proporcional = opcoes.proporcionalPorDias === true;
  const diaInicio = proporcional ? (diaDe(dataInicio) ?? 1) : 1;
  const diaFim = proporcional ? diaDe(dataFim) : null;

  const memoria = [];
  let total = 0;
  let comp = compInicio;
  let meses = 0;
  let mesesEquivalentes = 0;

  while (comp <= compFim) {
    const [y, m] = comp.split('-').map(Number);
    const diasNoMes = new Date(y, m, 0).getDate();

    // Fração do mês efetivamente coberta pelo período
    let fator = 1;
    let diasCobertos = diasNoMes;
    if (proporcional) {
      const de = comp === compInicio ? diaInicio : 1;
      const ate = comp === compFim ? (diaFim ?? diasNoMes) : diasNoMes;
      diasCobertos = Math.max(0, ate - de + 1);
      if (diasCobertos < diasNoMes) fator = diasCobertos / 30;
    }

    const valor = valorParaCompetencia(historico, comp, parcelaId);
    const valorComPercentual = Math.round((valor * percentual * fator) * 100) / 100;
    if (valor > 0) {
      memoria.push({
        competencia: comp,
        valor,
        valorComPercentual,
        ...(fator !== 1 && { diasCobertos, diasNoMes, proporcional: true }),
      });
    }
    total += valorComPercentual;
    meses++;
    mesesEquivalentes += fator;

    // Avança um mês
    comp = m === 12
      ? `${y + 1}-01`
      : `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  return {
    total: Math.round(total * 100) / 100,
    meses,
    mesesEquivalentes: Math.round(mesesEquivalentes * 10000) / 10000,
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
 * Encontra o histórico "principal" do reclamante.
 * Usa o histórico marcado como fixo (principal), ou o primeiro da lista.
 *
 * @param {Array} historicosSalariais
 * @returns {Object|null}
 */
function encontrarHistoricoReclamante(historicosSalariais) {
  const lista = historicosSalariais || [];
  return lista.find((h) => h.fixo) || lista[0] || null;
}

/**
 * Resolve baseHistoricoId que pode ser:
 *   - "reclamante"         → sentinel: usa o histórico principal do reclamante
 *   - "histId"             → soma todas as parcelas do histórico
 *   - "histId:parcelaId"   → parcela específica de um histórico
 *
 * @param {Array} historicosSalariais
 * @param {string} baseHistoricoId
 * @returns {{ historico: Object|null, parcelaId: string|null, usouSentinelReclamante: boolean }}
 */
function resolverBaseHistoricoId(historicosSalariais, baseHistoricoId) {
  if (!baseHistoricoId) return { historico: null, parcelaId: null, usouSentinelReclamante: false };

  // Sentinel especial: "reclamante" → usa o histórico principal do reclamante
  if (baseHistoricoId === 'reclamante') {
    const historico = encontrarHistoricoReclamante(historicosSalariais);
    return { historico, parcelaId: null, usouSentinelReclamante: true };
  }

  const [histId, parcelaId] = baseHistoricoId.split(':');
  const historico = encontrarHistorico(historicosSalariais, histId);
  return { historico, parcelaId: parcelaId || null, usouSentinelReclamante: false };
}

module.exports = {
  resolverFaixas,
  valorFaixasParaCompetencia,
  valorParaCompetencia,
  calcularTotalPorHistorico,
  encontrarHistorico,
  encontrarHistoricoReclamante,
  resolverBaseHistoricoId,
};

'use strict';

const NATUREZAS = {
  SALARIAL: 'salarial',
  INDENIZATORIA: 'indenizatoria',
};

/**
 * Verifica se uma parcela com determinada natureza jurídica deve gerar reflexos.
 * Apenas parcelas de natureza salarial geram reflexos (RSR, férias, 13º, FGTS, aviso prévio).
 *
 * @param {string} natureza - 'salarial' ou 'indenizatoria'
 * @returns {boolean}
 */
function deveGerarReflexos(natureza) {
  return natureza === NATUREZAS.SALARIAL;
}

/**
 * Valida coerência entre natureza jurídica e configuração de reflexos.
 * Retorna warning se parcela indenizatória estiver marcada para gerar reflexos.
 *
 * @param {Object} parcela - Parcela com campos natureza e geraReflexos
 * @returns {{ valido: boolean, aviso?: string }}
 */
function validarNaturezaReflexos(parcela) {
  if (parcela.natureza === NATUREZAS.INDENIZATORIA && parcela.geraReflexos) {
    return {
      valido: false,
      aviso: `Parcela "${parcela.nome}" tem natureza indenizatória mas está marcada para gerar reflexos. Reflexos serão ignorados.`,
    };
  }
  return { valido: true };
}

module.exports = { NATUREZAS, deveGerarReflexos, validarNaturezaReflexos };

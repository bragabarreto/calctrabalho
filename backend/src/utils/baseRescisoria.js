'use strict';

const { round2 } = require('./formatacao');

/**
 * Calcula a base rescisória padronizada (OJ 181 SDI-1 TST).
 *
 * @param {Object} dados - Dados do contrato
 * @param {Object} [opcoes={}]
 * @param {boolean} [opcoes.incluirGorjetas=false] - Incluir gorjetas na base
 * @param {boolean} [opcoes.incluirMediaVariaveis=false] - Calcular média 12 meses de variáveis
 * @returns {{ valor: number, componentes: Object, memoria: Object }}
 */
function calcularBaseRescisoria(dados, opcoes = {}) {
  const { incluirGorjetas = false, incluirMediaVariaveis = false } = opcoes;

  const salarioBase = dados.ultimoSalario || 0;
  const comissoes = dados.comissoes || 0;
  const gorjetas = incluirGorjetas ? (dados.gorjetas || 0) : 0;

  let mediaVariaveis = 0;
  if (incluirMediaVariaveis && dados.historicosSalariais?.length > 0) {
    // OJ 181 SDI-1 TST: média dos últimos 12 meses de parcelas variáveis
    // Implementação simplificada — usa comissões + gorjetas como variáveis
    // Para históricos completos, o motor usa calcularTotalPorHistorico
    mediaVariaveis = 0; // reservado para integração futura com históricos detalhados
  }

  const valor = round2(salarioBase + comissoes + gorjetas + mediaVariaveis);

  return {
    valor,
    componentes: {
      salarioBase,
      comissoes,
      gorjetas,
      mediaVariaveis,
    },
    memoria: {
      formula: `Base rescisória: R$ ${salarioBase.toFixed(2)} (salário)${comissoes > 0 ? ` + R$ ${comissoes.toFixed(2)} (comissões)` : ''}${gorjetas > 0 ? ` + R$ ${gorjetas.toFixed(2)} (gorjetas)` : ''} = R$ ${valor.toFixed(2)}`,
      criterio: 'OJ 181 SDI-1 TST + art. 457 §1º CLT',
    },
  };
}

/**
 * Calcula a remuneração mensal completa (art. 457 §1º CLT).
 * Usada como base para multas art. 467/477 e outras verbas que exigem remuneração total.
 *
 * @param {Object} dados - Dados do contrato
 * @returns {number} Valor da remuneração mensal
 */
function calcularRemuneracaoMensal(dados) {
  return round2(
    (dados.ultimoSalario || 0) +
    (dados.comissoes || 0) +
    (dados.gorjetas || 0)
  );
}

module.exports = { calcularBaseRescisoria, calcularRemuneracaoMensal };

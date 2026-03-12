'use strict';

/**
 * Formata número como moeda BRL
 */
function formatBRL(valor) {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formata percentual
 */
function formatPercentual(valor, casas = 2) {
  return `${(valor * 100).toFixed(casas)}%`;
}

/**
 * Arredonda para 2 casas decimais (dinheiro)
 */
function round2(valor) {
  return Math.round(valor * 100) / 100;
}

/**
 * Garante valor mínimo zero
 */
function nonNegative(valor) {
  return Math.max(0, valor || 0);
}

module.exports = { formatBRL, formatPercentual, round2, nonNegative };

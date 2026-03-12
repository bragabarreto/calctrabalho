'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Saldo Salarial
 * Fórmula: (salário + comissões) / 30 × dias trabalhados no mês
 */
function calcularSaldoSalarial(dados, temporal) {
  if (dados.verbasExcluidas?.includes('saldo_salarial')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const base = (dados.ultimoSalario || 0) + (dados.comissoes || 0);
  const dias = temporal.diasUltimoMes;
  const diasNoMes = temporal.diasNoMes;
  const valor = round2((base / 30) * dias);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `(R$ ${base.toFixed(2)} / 30) × ${dias} dias = R$ ${valor.toFixed(2)}`,
      base,
      dias,
      diasNoMes,
    },
  };
}

module.exports = { calcularSaldoSalarial };

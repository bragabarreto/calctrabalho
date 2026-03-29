'use strict';

const { round2 } = require('../../../utils/formatacao');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');

/**
 * Saldo Salarial
 * Fórmula: (salário + comissões) / 30 × dias trabalhados no mês
 * Base: art. 457 §1º CLT (sem gorjetas — saldo salarial reflete contraprestação fixa)
 */
function calcularSaldoSalarial(dados, temporal) {
  if (dados.verbasExcluidas?.includes('saldo_salarial')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const { valor: base } = calcularBaseRescisoria(dados, { incluirGorjetas: false });
  const dias = temporal.diasUltimoMes;
  const diasNoMes = temporal.diasNoMes;
  const valor = round2((base / 30) * dias);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `(R$ ${base.toFixed(2)} / 30) × ${dias} dias = R$ ${valor.toFixed(2)}`,
      fundamentoLegal: 'Art. 457 CLT — saldo de salário proporcional aos dias trabalhados no mês da rescisão.',
      base,
      dias,
      diasNoMes,
    },
  };
}

module.exports = { calcularSaldoSalarial };

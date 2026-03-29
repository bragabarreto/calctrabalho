'use strict';

const { round2, nonNegative } = require('../../../utils/formatacao');
const { calcularBaseRescisoria } = require('../../../utils/baseRescisoria');
const { FGTS_ALIQUOTA, MULTA_FGTS_SJC, MULTA_FGTS_RECIPROCA } = require('../../../config/constants');

/**
 * FGTS — período imprescrito (com aviso projetado)
 * Base: salário + comissões + gorjetas (Súmula 354 TST, Lei 8.036/1990 art. 15)
 */
function calcularFGTS(dados, temporal) {
  if (dados.verbasExcluidas?.includes('fgts_imprescrito')) {
    return { valor: 0, excluida: true, fgtsBruto: 0, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const dadosBase = dados.mediaSalarial ? { ...dados, ultimoSalario: dados.mediaSalarial } : dados;
  const { valor: base } = calcularBaseRescisoria(dadosBase, { incluirGorjetas: true });
  const meses = temporal.lapsoComAviso.meses;
  const fgtsBruto = round2(base * FGTS_ALIQUOTA * meses);
  const depositado = dados.fgtsIntegralizado ? fgtsBruto : (dados.fgtsDepositado || 0);
  const valor = nonNegative(round2(fgtsBruto - depositado));

  return {
    valor,
    excluida: false,
    fgtsBruto,
    depositado,
    memoria: {
      formula: dados.fgtsIntegralizado
        ? `R$ ${base.toFixed(2)} × 8% × ${meses} meses = R$ ${fgtsBruto.toFixed(2)} (bruto) — FGTS integralizado (depositado = R$ ${depositado.toFixed(2)}) = R$ ${valor.toFixed(2)}`
        : `R$ ${base.toFixed(2)} × 8% × ${meses} meses = R$ ${fgtsBruto.toFixed(2)} (bruto) − R$ ${depositado.toFixed(2)} (depositado) = R$ ${valor.toFixed(2)}`,
      base,
      meses,
      aliquota: '8%',
      ...(dados.fgtsIntegralizado && { integralizado: true }),
    },
  };
}

/**
 * Multa FGTS conforme modalidade
 * SJC/Rescisão Indireta: 40% | Culpa Recíproca: 20% | Pedido Demissão/JC: 0%
 */
function calcularMultaFGTS(fgtsBruto, modalidade) {
  const percentuais = {
    sem_justa_causa: MULTA_FGTS_SJC,
    rescisao_indireta: MULTA_FGTS_SJC,
    culpa_reciproca: MULTA_FGTS_RECIPROCA,
    pedido_demissao: 0,
    justa_causa: 0,
  };
  const percentual = percentuais[modalidade] || 0;
  const valor = round2(fgtsBruto * percentual);

  return {
    valor,
    excluida: percentual === 0,
    percentual,
    memoria: {
      formula: `R$ ${fgtsBruto.toFixed(2)} × ${(percentual * 100).toFixed(0)}% = R$ ${valor.toFixed(2)}`,
      modalidade,
    },
  };
}

module.exports = { calcularFGTS, calcularMultaFGTS };

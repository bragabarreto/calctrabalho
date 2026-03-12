'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Parcelas Genéricas Salariais — geram reflexos em férias, 13º e FGTS
 */
function calcularParcelasGenericasSalariais(dados, temporal) {
  const {
    parcelaGenericaSalarialMensal: mensal = 0,
    parcelaGenericaSalarialDiaria6d: diaria6d = 0,
    parcelaGenericaSalarialDiaria5d: diaria5d = 0,
  } = dados;

  const meses = temporal.lapsoSemAviso.meses;
  const diasUteis6d = temporal.diasUteis6d;
  const diasUteis5d = temporal.diasUteis5d;

  const valorMensal = round2(mensal * meses);
  const valorDiaria6d = round2(diaria6d * diasUteis6d);
  const valorDiaria5d = round2(diaria5d * diasUteis5d);
  const valor = round2(valorMensal + valorDiaria6d + valorDiaria5d);

  if (valor === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Parcelas genéricas salariais = 0' } };

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `Mensal: ${mensal}×${meses}m + Diária 6d: ${diaria6d}×${diasUteis6d}d + Diária 5d: ${diaria5d}×${diasUteis5d}d = R$ ${valor.toFixed(2)}`,
      valorMensal,
      valorDiaria6d,
      valorDiaria5d,
    },
  };
}

/**
 * Parcelas Genéricas Indenizatórias — não geram reflexos
 */
function calcularParcelasGenericasIndenizatorias(dados, temporal) {
  const {
    parcelaGenericaIndenizatoriaMensal: mensal = 0,
    parcelaGenericaIndenizatoriaDiaria6d: diaria6d = 0,
    parcelaGenericaIndenizatoriaDiaria5d: diaria5d = 0,
    parcelaGenericaIndenizatoriaUnica: unica = 0,
  } = dados;

  const meses = temporal.lapsoSemAviso.meses;
  const diasUteis6d = temporal.diasUteis6d;
  const diasUteis5d = temporal.diasUteis5d;

  const valorMensal = round2(mensal * meses);
  const valorDiaria6d = round2(diaria6d * diasUteis6d);
  const valorDiaria5d = round2(diaria5d * diasUteis5d);
  const valor = round2(valorMensal + valorDiaria6d + valorDiaria5d + unica);

  if (valor === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Parcelas genéricas indenizatórias = 0' } };

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `Mensal: ${mensal}×${meses}m + Diária 6d: ${diaria6d}×${diasUteis6d}d + Diária 5d: ${diaria5d}×${diasUteis5d}d + Única: ${unica} = R$ ${valor.toFixed(2)}`,
      valorMensal,
      valorDiaria6d,
      valorDiaria5d,
      unica,
    },
  };
}

module.exports = { calcularParcelasGenericasSalariais, calcularParcelasGenericasIndenizatorias };

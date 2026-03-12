'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Intervalo Intrajornada (hora suprimida = hora extra + 50% ou 100% conforme CCT)
 * Base: mesma fórmula da hora extra
 */
function calcularIntervaloIntrajornada(dados, temporal) {
  if (dados.verbasExcluidas?.includes('intervalo_intrajornada')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const horasMensais = dados.intervaloIntrajornadaMensalHoras || 0;
  if (horasMensais === 0) return { valor: 0, excluida: false, memoria: { motivo: 'Horas de intervalo suprimido = 0' } };

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const adicional = dados.adicionalHoraExtra ?? 0.5; // mesmo adicional das HE
  const AF = dados.mesesAfastamento || 0;
  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  const valorHora = (M / D) * (1 + adicional);
  const valor = round2(valorHora * horasMensais * mesesEfetivos);

  return {
    valor,
    excluida: false,
    memoria: {
      formula: `(R$ ${M.toFixed(2)} / ${D}) × (1 + ${(adicional * 100).toFixed(0)}%) × ${horasMensais}h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      valorHora: valorHora.toFixed(6),
      horasMensais,
      mesesEfetivos,
    },
  };
}

module.exports = { calcularIntervaloIntrajornada };

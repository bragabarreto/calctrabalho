'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Intervalo Intrajornada (Súmula 437 TST)
 *
 * Quando o intervalo concedido for inferior ao mínimo legal:
 *   - Jornada > 6h: mínimo 60min (CLT art. 71)
 *   - 4h < jornada ≤ 6h: mínimo 15min
 *
 * Natureza: INDENIZATÓRIA — sem reflexos (RSR, férias, 13º, FGTS, aviso prévio).
 *
 * Modos:
 *   - 'automatico': deriva o déficit dia a dia do cartão de ponto virtual
 *   - 'manual'    : usuário informa qtde de horas suprimidas por mês
 */
function calcularIntervaloIntrajornada(dados, temporal, diasCartao) {
  if (dados.verbasExcluidas?.includes('intervalo_intrajornada')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const adicional = dados.adicionalHoraExtra ?? 0.5;
  const AF = dados.mesesAfastamento || 0;
  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  const valorHora = round2((M / D) * (1 + adicional));

  const modo = dados.intrajornadaModo || (diasCartao ? 'automatico' : 'manual');

  if (modo === 'automatico' && diasCartao && diasCartao.length > 0) {
    // Soma todo o déficit de intervalo dos dias trabalhados
    const totalMinDeficit = diasCartao
      .filter(d => d.trabalhado && !d.afastado && !d.ferias)
      .reduce((acc, d) => acc + (d.minIntervaloDeficit || 0), 0);

    if (totalMinDeficit === 0) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum déficit de intervalo intrajornada apurado no cartão de ponto' } };
    }

    const horasDeficit = +(totalMinDeficit / 60).toFixed(4);
    const valor = round2(valorHora * horasDeficit);

    return {
      valor,
      excluida: false,
      natureza: 'indenizatoria',
      memoria: {
        formula: `${totalMinDeficit} min déficit ÷ 60 = ${horasDeficit}h × R$ ${valorHora.toFixed(2)}/h (M/D × (1+adicional)) = R$ ${valor.toFixed(2)}`,
        totalMinDeficit,
        horasDeficit,
        valorHora,
        modo: 'automatico (cartão de ponto)',
        aviso: 'Natureza indenizatória — sem reflexos (Súmula 437 TST)',
      },
    };
  }

  // Modo manual
  const horasMensais = dados.intervaloIntrajornadaMensalHoras || 0;
  if (horasMensais === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Horas de intervalo suprimido = 0' } };
  }

  const valor = round2(valorHora * horasMensais * mesesEfetivos);

  return {
    valor,
    excluida: false,
    natureza: 'indenizatoria',
    memoria: {
      formula: `R$ ${valorHora.toFixed(2)}/h × ${horasMensais}h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      valorHora,
      horasMensais,
      mesesEfetivos,
      modo: 'manual',
      aviso: 'Natureza indenizatória — sem reflexos (Súmula 437 TST)',
    },
  };
}

module.exports = { calcularIntervaloIntrajornada };

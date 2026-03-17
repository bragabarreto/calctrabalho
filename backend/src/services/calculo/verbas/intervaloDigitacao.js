'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Intervalo por Digitação (CLT art. 72 + NR-17)
 *
 * CLT art. 72: 10 minutos de descanso a cada 90 minutos de trabalho em digitação/datilografia
 * NR-17 (ABNT): para operadores de caixa e trabalho com teclado intenso: 10min/50min
 *
 * Se o intervalo não for concedido (total ou parcialmente):
 *   Déficit = hora extra indenizatória com adicional.
 *
 * Natureza: SALARIAL — com reflexos (RSR, férias, 13º, FGTS, aviso prévio).
 * (Posição majoritária na doutrina e jurisprudência trabalhista)
 *
 * Parâmetros editáveis:
 *   dados.regimeDigitacao: '90min' (CLT art. 72) | '50min' (NR-17)
 *   dados.horasIntervaloDigitacaoConcedido: horas/mês efetivamente concedidas
 */
function calcularIntervaloDigitacao(dados, temporal) {
  if (dados.verbasExcluidas?.includes('intervalo_digitacao')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (!dados.intervaloDigitacao) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Intervalo por digitação não habilitado' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const adicional = dados.adicionalHoraExtra ?? 0.5;
  const AF = dados.mesesAfastamento || 0;
  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  // Regime: cicloMin = minutos de trabalho por ciclo (90 ou 50)
  const regime = dados.regimeDigitacao || '90min';
  const cicloMin = regime === '50min' ? 50 : 90;

  // Jornada diária em minutos (derivada do divisor ou informada)
  const minJornadaDia = dados.minJornadaDia || Math.round((D / 21.75) * 60);

  // Número de ciclos por dia = floor(minJornadaDia / cicloMin)
  // Intervalo devido por ciclo = 10min
  const ciclosPorDia = Math.floor(minJornadaDia / cicloMin);
  const minIntervaloDiario = ciclosPorDia * 10;

  // Intervalo efetivamente concedido (horas/mês → minutos/dia)
  const diasUteisMedia = 21.75;
  const horasConcedidasMes = dados.horasIntervaloDigitacaoConcedido || 0;
  const minConcedidoDia = (horasConcedidasMes * 60) / diasUteisMedia;

  const minDeficitDia = Math.max(0, minIntervaloDiario - minConcedidoDia);

  if (minDeficitDia === 0) {
    return {
      valor: 0,
      excluida: false,
      memoria: { motivo: 'Intervalo por digitação integralmente concedido — sem débito' },
    };
  }

  const horasDeficitMes = (minDeficitDia / 60) * diasUteisMedia;
  const valorHora = round2((M / D) * (1 + adicional));
  const valor = round2(valorHora * horasDeficitMes * mesesEfetivos);

  const regimeLabel = regime === '50min'
    ? '10min/50min (NR-17 — operador caixa/trabalho intenso)'
    : '10min/90min (CLT art. 72 — digitação/datilografia)';

  return {
    valor,
    excluida: false,
    natureza: 'salarial',
    memoria: {
      formula: `${ciclosPorDia} ciclos × 10min = ${minIntervaloDiario}min/dia devido; déficit ${minDeficitDia.toFixed(1)}min/dia × 21,75 = ${horasDeficitMes.toFixed(2)}h/mês × R$ ${valorHora.toFixed(2)}/h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      regime: regimeLabel,
      cicloMin,
      ciclosPorDia,
      minJornadaDia,
      minIntervaloDiario,
      minConcedidoDia: +minConcedidoDia.toFixed(1),
      minDeficitDia: +minDeficitDia.toFixed(1),
      horasDeficitMes: +horasDeficitMes.toFixed(2),
      valorHora,
      mesesEfetivos,
      aviso: 'Natureza salarial — com reflexos em RSR, férias, 13º, FGTS e aviso prévio',
    },
  };
}

/**
 * Reflexos do Intervalo por Digitação (natureza salarial)
 */
function calcularReflexosIntervaloDigitacao(idResult, dados, temporal, modalidade) {
  if (!idResult || idResult.valor === 0) {
    return { rsr: { valor: 0 }, avisoPrevio: { valor: 0 }, ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses - (dados.mesesAfastamento || 0);
  const mediaMensal = meses > 0 ? idResult.valor / meses : 0;

  const rsr = round2(idResult.valor / 6);

  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    avisoPrevio = round2(mediaMensal * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaMensal * (mesesFerias / 12) * (4 / 3));

  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaMensal / 12) * meses13);

  const fgts = round2((idResult.valor + rsr + ferias + decimoTerceiro) * 0.08);
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);

  return {
    rsr: { valor: rsr },
    avisoPrevio: { valor: avisoPrevio },
    ferias: { valor: ferias },
    decimoTerceiro: { valor: decimoTerceiro },
    fgts: { valor: fgts },
    mulFgts: { valor: mulFgts },
  };
}

module.exports = { calcularIntervaloDigitacao, calcularReflexosIntervaloDigitacao };

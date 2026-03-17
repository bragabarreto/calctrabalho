'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Intervalo Térmico (CLT art. 253 + Súmula 438 TST)
 *
 * Trabalhadores em câmaras frigoríficas ou ambientes com calor excessivo
 * têm direito a 20 minutos de descanso para cada 1h40 (100min) trabalhados,
 * totalizando 1/5 da jornada efetiva.
 *
 * Se o intervalo não for concedido (ou for insuficiente):
 *   Déficit = hora extra indenizatória com adicional.
 *
 * Natureza: SALARIAL — com reflexos completos (RSR, férias, 13º, FGTS, aviso prévio).
 */
function calcularIntervaloTermico(dados, temporal) {
  if (dados.verbasExcluidas?.includes('intervalo_termico')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (!dados.intervaloTermico) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Intervalo térmico não habilitado' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const adicional = dados.adicionalHoraExtra ?? 0.5;
  const AF = dados.mesesAfastamento || 0;
  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  // Jornada diária em minutos: derivada do divisor (mensal → diário)
  // Divisor mensal / 21.75 dias úteis = horas/dia
  const horasDia = (D / 21.75) / (60 / 60); // D em horas/mês → horas/dia
  const minJornadaDia = dados.minJornadaDia || Math.round((D / 21.75) * 60);
  // Se o usuário informa explicitamente, usa; caso contrário, deriva do divisor

  // Intervalo devido por dia: 20min para cada 100min trabalhados = 1/5 da jornada
  const minIntervaloDiario = Math.round(minJornadaDia / 5);

  // Intervalo efetivamente concedido por dia (em minutos, informado pelo usuário)
  const minConcedidoDia = dados.minIntervaloTermicoConcedido || 0;

  const minDeficitDia = Math.max(0, minIntervaloDiario - minConcedidoDia);

  if (minDeficitDia === 0) {
    return {
      valor: 0,
      excluida: false,
      memoria: { motivo: 'Intervalo térmico integralmente concedido — sem débito' },
    };
  }

  // Horas de déficit por mês (estimativa: 21.75 dias úteis/mês)
  const diasUteisMedia = 21.75;
  const horasDeficitMes = (minDeficitDia / 60) * diasUteisMedia;
  const valorHora = round2((M / D) * (1 + adicional));
  const valor = round2(valorHora * horasDeficitMes * mesesEfetivos);

  return {
    valor,
    excluida: false,
    natureza: 'salarial',
    memoria: {
      formula: `${minDeficitDia} min/dia déficit × 21,75 dias = ${horasDeficitMes.toFixed(2)}h/mês × R$ ${valorHora.toFixed(2)}/h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      tipoAmbiente: dados.tipoAmbienteTermico === 'frio' ? 'Câmara fria (CLT art. 253)' : 'Calor excessivo (Súmula 438 TST)',
      minJornadaDia,
      minIntervaloDiario,
      minConcedidoDia,
      minDeficitDia,
      horasDeficitMes: +horasDeficitMes.toFixed(2),
      valorHora,
      mesesEfetivos,
      aviso: 'Natureza salarial — com reflexos em RSR, férias, 13º, FGTS e aviso prévio',
    },
  };
}

/**
 * Reflexos do Intervalo Térmico (natureza salarial)
 * RSR, Aviso Prévio, Férias + 1/3, 13º, FGTS, Multa FGTS
 */
function calcularReflexosIntervaloTermico(itResult, dados, temporal, modalidade) {
  if (!itResult || itResult.valor === 0) {
    return { rsr: { valor: 0 }, avisoPrevio: { valor: 0 }, ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses - (dados.mesesAfastamento || 0);
  const mediaMensal = meses > 0 ? itResult.valor / meses : 0;

  const rsr = round2(itResult.valor / 6);

  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    avisoPrevio = round2(mediaMensal * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaMensal * (mesesFerias / 12) * (4 / 3));

  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaMensal / 12) * meses13);

  const fgts = round2((itResult.valor + rsr + ferias + decimoTerceiro) * 0.08);
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

module.exports = { calcularIntervaloTermico, calcularReflexosIntervaloTermico };

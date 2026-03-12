'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Adicional Noturno (20% sobre hora noturna)
 * Hora noturna = 52min30s = hora normal / (60/52.5)
 */
function calcularAdicionalNoturno(dados, temporal) {
  if (dados.verbasExcluidas?.includes('adicional_noturno')) {
    return { valor: 0, excluida: true, valorHora: 0, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const AHN = dados.adicionalHoraNoturna ?? 0.2;
  const HN = dados.qtdeHorasNoturnasMensais || 0;
  const AF = dados.mesesAfastamento || 0;

  if (HN === 0) return { valor: 0, excluida: false, valorHora: 0, memoria: { motivo: 'Qtde horas noturnas = 0' } };

  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;
  const valorHora = M / D;
  const adicionalHora = valorHora * AHN;
  const valor = round2(adicionalHora * HN * mesesEfetivos);

  return {
    valor,
    excluida: false,
    valorHora: round2(adicionalHora),
    memoriaInputs: { M, D, AHN, HN, mesesEfetivos },
    memoria: {
      formula: `R$ ${M.toFixed(2)} / ${D} × ${(AHN * 100).toFixed(0)}% × ${HN}h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      valorHora: valorHora.toFixed(6),
      adicionalHora: adicionalHora.toFixed(6),
      mesesEfetivos,
    },
  };
}

function calcularReflexosAN(anResult, dados, temporal, modalidade) {
  if (anResult.valor === 0) {
    return { rsr: { valor: 0 }, avisoPrevio: { valor: 0 }, ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses - (dados.mesesAfastamento || 0);
  const rsr = round2(anResult.valor / 6);

  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    const mediaAN = meses > 0 ? anResult.valor / meses : 0;
    avisoPrevio = round2(mediaAN * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  const mediaANMensal = meses > 0 ? anResult.valor / meses : 0;
  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaANMensal * (mesesFerias / 12) * (4 / 3));
  const meses13 = temporal.lapsoSemAviso.mesesRestantes + (temporal.lapsoSemAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaANMensal / 12) * meses13);
  const fgts = round2((anResult.valor + rsr + ferias + decimoTerceiro) * 0.08);
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

module.exports = { calcularAdicionalNoturno, calcularReflexosAN };

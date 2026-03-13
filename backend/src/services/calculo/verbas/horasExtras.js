'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Horas Extras + reflexos
 * Fórmula (planilha):
 * HE = (M + M/D × AHN × HN) / D × (1 + AHE) × HE × mesesEfetivos
 *    + C / (D + HE) × (1 + AHE) × HE × mesesEfetivos
 */
function calcularHorasExtras(dados, temporal) {
  if (dados.verbasExcluidas?.includes('horas_extras')) {
    return { valor: 0, excluida: true, valorHora: 0, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const AHE = dados.adicionalHoraExtra ?? 0.5;
  const HE = dados.qtdeHorasExtrasMensais || 0;
  const AHN = dados.adicionalHoraNoturna ?? 0.2;
  const HN = dados.qtdeHorasNoturnasMensais || 0;
  const C = dados.comissoes || 0;
  const AF = dados.mesesAfastamento || 0;

  if (HE === 0) return { valor: 0, excluida: false, valorHora: 0, memoria: { motivo: 'Qtde horas extras = 0' } };

  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  // Valor hora normal incluindo redução noturna
  const valorHoraNormal = (M + (M / D) * AHN * HN) / D;

  // HE sobre salário fixo
  const heFixo = valorHoraNormal * (1 + AHE) * HE * mesesEfetivos;

  // HE sobre comissões
  const heComissoes = C > 0 ? (C / (D + HE)) * (1 + AHE) * HE * mesesEfetivos : 0;

  const valor = round2(heFixo + heComissoes);

  return {
    valor,
    excluida: false,
    valorHora: round2(valorHoraNormal * (1 + AHE)),
    memoriaInputs: { M, D, AHE, HE, AHN, HN, C, AF, mesesEfetivos },
    memoria: {
      formula: `(${M} + ${M}/${D}×${AHN}×${HN})/${D} × (1+${AHE}) × ${HE}h × ${mesesEfetivos} meses + ${C}/(${D}+${HE}) × (1+${AHE}) × ${HE}h × ${mesesEfetivos}`,
      valorHoraNormal: valorHoraNormal.toFixed(6),
      heFixo: heFixo.toFixed(2),
      heComissoes: heComissoes.toFixed(2),
      mesesEfetivos,
    },
  };
}

/**
 * Reflexos das Horas Extras
 */
function calcularReflexosHE(heResult, dados, temporal, modalidade) {
  if (heResult.valor === 0) {
    return {
      rsr: { valor: 0 },
      avisoPrevio: { valor: 0 },
      ferias: { valor: 0 },
      decimoTerceiro: { valor: 0 },
      fgts: { valor: 0 },
      mulFgts: { valor: 0 },
    };
  }

  const HE = dados.qtdeHorasExtrasMensais || 0;
  const meses = temporal.lapsoSemAviso.meses - (dados.mesesAfastamento || 0);

  // RSR: 1 repouso para cada 6 dias úteis
  const rsr = round2(heResult.valor / 6);

  // Aviso Prévio
  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    const D = dados.divisorJornada || 220;
    const diasAviso = temporal.diasAvisoPrevio;
    avisoPrevio = round2(heResult.valorHora * HE * (diasAviso / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  // Férias (proporcional sobre média das HE)
  const mediaHeMensal = meses > 0 ? heResult.valor / meses : 0;
  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaHeMensal * (mesesFerias / 12) * (4 / 3));

  // 13º proporcional — OJ 82 SDI1 TST: aviso projeta para 13º
  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaHeMensal / 12) * meses13);

  // FGTS sobre HE + reflexos salariais
  const baseGts = heResult.valor + rsr + ferias + decimoTerceiro;
  const fgts = round2(baseGts * 0.08);

  // Multa FGTS
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);

  return {
    rsr: { valor: rsr, memoria: { formula: `R$ ${heResult.valor.toFixed(2)} / 6 = R$ ${rsr.toFixed(2)}` } },
    avisoPrevio: { valor: avisoPrevio },
    ferias: { valor: ferias },
    decimoTerceiro: { valor: decimoTerceiro },
    fgts: { valor: fgts },
    mulFgts: { valor: mulFgts },
  };
}

module.exports = { calcularHorasExtras, calcularReflexosHE };

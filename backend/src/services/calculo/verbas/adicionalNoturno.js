'use strict';

const { round2 } = require('../../../utils/formatacao');
const { calcularPeriodoJornada } = require('./cartaoPontoVirtual');

/** Deriva qtdeHorasNoturnasMensais ponderado por período */
function resolverHorasNoturnasPeriodos(dados, feriadosAdicionais) {
  const periodos = dados.jornadaPeriodos || [];
  if (!periodos.length) return null;

  let totalHN = 0;
  let totalMeses = 0;
  let adicionalPonderado = 0;

  for (const p of periodos) {
    const res = calcularPeriodoJornada(p, dados.dataAdmissao, dados.dataDispensa, feriadosAdicionais);
    const meses = res.numMeses || 1;
    totalHN += res.totalHorasNoturnas;
    adicionalPonderado += (p.adicionalHoraNoturna || 0.2) * meses;
    totalMeses += meses;
  }

  if (totalMeses === 0 || totalHN === 0) return null;
  return {
    qtdeHorasNoturnasMensais: +(totalHN / totalMeses).toFixed(2),
    adicionalHoraNoturna: +(adicionalPonderado / totalMeses).toFixed(4),
  };
}

/**
 * Adicional Noturno (CLT art. 73)
 *
 * Hora noturna = 52min30s (hora reduzida — equivale a multiplicar por 60/52.5)
 * Período noturno: 22h–05h
 * Prorrogação (art. 73 §5): se a jornada prossegue após 5h, as horas da prorrogação
 * mantêm o caráter noturno (ficção legal) — ativado por periodo.prorrogacaoNoturna = true
 *
 * OJ 97 SDI-1 TST: o adicional noturno compõe a base de cálculo das horas extras.
 * Quando ativado (dados.adicionalNoturnoOJ97 = true), o valorHora calculado aqui
 * é retornado para que o módulo de horas extras possa incorporá-lo.
 */
function calcularAdicionalNoturno(dados, temporal) {
  if (dados.verbasExcluidas?.includes('adicional_noturno')) {
    return { valor: 0, excluida: true, valorHora: 0, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const feriadosAdicionais = dados.feriadosAdicionais || [];
  const periodoResolvido = resolverHorasNoturnasPeriodos(dados, feriadosAdicionais);

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const AHN = periodoResolvido?.adicionalHoraNoturna ?? dados.adicionalHoraNoturna ?? 0.2;
  const HN = periodoResolvido?.qtdeHorasNoturnasMensais ?? dados.qtdeHorasNoturnasMensais ?? 0;
  const AF = dados.mesesAfastamento || 0;

  // Verifica se algum período tem prorrogação configurada (informativo na memória)
  const temProrrogacao = (dados.jornadaPeriodos || []).some(p => p.prorrogacaoNoturna);

  if (HN === 0) return { valor: 0, excluida: false, valorHora: 0, memoria: { motivo: 'Qtde horas noturnas = 0' } };

  const mesesEfetivos = temporal.lapsoSemAviso.meses - AF;

  // Valor da hora noturna = M/D × AHN
  // A hora noturna real = 52min30s, mas o cálculo monetário já incorpora a ficção via AHN
  const valorHoraBase = M / D;
  const adicionalHora = valorHoraBase * AHN;
  const valor = round2(adicionalHora * HN * mesesEfetivos);

  return {
    valor,
    excluida: false,
    valorHora: round2(adicionalHora),
    valorHoraBase: round2(valorHoraBase),
    adicionalHoraNoturna: AHN,
    memoriaInputs: { M, D, AHN, HN, mesesEfetivos },
    memoria: {
      formula: `R$ ${M.toFixed(2)} / ${D} × ${(AHN * 100).toFixed(0)}% × ${HN}h × ${mesesEfetivos} meses = R$ ${valor.toFixed(2)}`,
      fundamentoLegal: 'Art. 73 CLT — adicional noturno de no mínimo 20% sobre a hora diurna.',
      valorHora: valorHoraBase.toFixed(6),
      adicionalHora: adicionalHora.toFixed(6),
      mesesEfetivos,
      prorrogacaoNoturna: temProrrogacao
        ? 'Ativa — horas após 5h mantêm caráter noturno (CLT art. 73 §5)'
        : 'Não configurada',
      oj97: dados.adicionalNoturnoOJ97
        ? 'OJ 97 SDI-1 ativo — adicional noturno compõe base das horas extras'
        : 'OJ 97 SDI-1 não ativo',
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

  const mediaANMensal = meses > 0 ? round2(anResult.valor / meses) : 0;
  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaANMensal * (mesesFerias / 12) * (4 / 3));
  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaANMensal / 12) * meses13);
  const fgts = round2((anResult.valor + rsr + ferias + decimoTerceiro) * 0.08);
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);
  const baseGts = round2(anResult.valor + rsr + ferias + decimoTerceiro);

  return {
    rsr: {
      valor: rsr,
      memoria: {
        formula: `R$ ${anResult.valor.toFixed(2)} ÷ 6 = R$ ${rsr.toFixed(2)}`,
        base: anResult.valor,
        criterio: '1 DSR para cada 6 dias de trabalho noturno',
      },
    },
    avisoPrevio: {
      valor: avisoPrevio,
      memoria: avisoPrevio > 0
        ? {
            formula: `Média AN R$ ${mediaANMensal.toFixed(2)}/mês × (${temporal.diasAvisoPrevio} dias ÷ 30) = R$ ${avisoPrevio.toFixed(2)}`,
            mediaANMensal,
            diasAviso: temporal.diasAvisoPrevio,
          }
        : { motivo: 'Não aplicável para esta modalidade de rescisão' },
    },
    ferias: {
      valor: ferias,
      memoria: {
        formula: `Média AN R$ ${mediaANMensal.toFixed(2)}/mês × (${mesesFerias}/12 avos) × 4/3 = R$ ${ferias.toFixed(2)}`,
        mediaANMensal,
        mesesFerias,
        avos: `${mesesFerias}/12`,
      },
    },
    decimoTerceiro: {
      valor: decimoTerceiro,
      memoria: {
        formula: `Média AN R$ ${mediaANMensal.toFixed(2)}/mês ÷ 12 × ${meses13} meses = R$ ${decimoTerceiro.toFixed(2)}`,
        mediaANMensal,
        meses13,
        criterio: 'OJ 82 SDI-1 TST',
      },
    },
    fgts: {
      valor: fgts,
      memoria: {
        formula: `(AN + RSR + Férias + 13º = R$ ${baseGts.toFixed(2)}) × 8% = R$ ${fgts.toFixed(2)}`,
        base: baseGts,
        aliquota: '8%',
      },
    },
    mulFgts: {
      valor: mulFgts,
      memoria: mulFgts > 0
        ? {
            formula: `R$ ${fgts.toFixed(2)} × ${(pctMul * 100).toFixed(0)}% = R$ ${mulFgts.toFixed(2)}`,
            baseFgts: fgts,
            percentual: `${(pctMul * 100).toFixed(0)}%`,
          }
        : { motivo: 'Multa rescisória não aplicável para esta modalidade' },
    },
  };
}

module.exports = { calcularAdicionalNoturno, calcularReflexosAN };

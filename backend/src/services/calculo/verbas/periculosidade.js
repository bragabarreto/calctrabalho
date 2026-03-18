'use strict';

const { round2 } = require('../../../utils/formatacao');
const { differenceInMonths, isSameMonth, getDaysInMonth, getDate } = require('../../../utils/datas');

/**
 * Adicional de Periculosidade (30% sobre o salário)
 * Calcula proporcional ao período
 */
function calcularPericulosidade(dados, temporal) {
  if (dados.verbasExcluidas?.includes('periculosidade')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const percentual = dados.adicionalPericulosidadePercentual || 0;
  if (!percentual) return { valor: 0, excluida: false, memoria: { motivo: 'Periculosidade não informada' } };

  const salario = dados.ultimoSalario || 0;
  const inicio = dados.dataInicioPericulosidade
    ? new Date(dados.dataInicioPericulosidade)
    : temporal.marcoPrescricional;
  const fim = dados.dataFimPericulosidade
    ? new Date(dados.dataFimPericulosidade)
    : temporal.dataDispensa;

  const mesesCompletos = differenceInMonths(fim, inicio);
  const valor = round2(salario * percentual * mesesCompletos);

  return {
    valor,
    excluida: false,
    memoriaInputs: { salario, percentual, inicio, fim, mesesCompletos },
    memoria: {
      formula: `R$ ${salario.toFixed(2)} × ${(percentual * 100).toFixed(0)}% × ${mesesCompletos} meses = R$ ${valor.toFixed(2)}`,
      percentual,
      periodo: { inicio: inicio.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] },
      mesesCompletos,
    },
  };
}

function calcularReflexosPericulosidade(perResult, dados, temporal, modalidade) {
  if (perResult.valor === 0) {
    return { avisoPrevio: { valor: 0 }, ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses;
  const mediaPer = meses > 0 ? perResult.valor / meses : 0;

  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    avisoPrevio = round2(mediaPer * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaPer * (mesesFerias / 12) * (4 / 3));
  const meses13 = temporal.lapsoSemAviso.mesesRestantes + (temporal.lapsoSemAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaPer / 12) * meses13);
  const fgts = round2((perResult.valor + ferias + decimoTerceiro) * 0.08);
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);

  const mediaPerMensal = round2(mediaPer);
  const baseGts = round2(perResult.valor + ferias + decimoTerceiro);

  return {
    avisoPrevio: {
      valor: avisoPrevio,
      memoria: avisoPrevio > 0
        ? {
            formula: `Média per. R$ ${mediaPerMensal.toFixed(2)}/mês × (${temporal.diasAvisoPrevio} dias ÷ 30) = R$ ${avisoPrevio.toFixed(2)}`,
            mediaPerMensal,
            diasAviso: temporal.diasAvisoPrevio,
          }
        : { motivo: 'Não aplicável para esta modalidade de rescisão' },
    },
    ferias: {
      valor: ferias,
      memoria: {
        formula: `Média per. R$ ${mediaPerMensal.toFixed(2)}/mês × (${mesesFerias}/12 avos) × 4/3 = R$ ${ferias.toFixed(2)}`,
        mediaPerMensal,
        mesesFerias,
        avos: `${mesesFerias}/12`,
      },
    },
    decimoTerceiro: {
      valor: decimoTerceiro,
      memoria: {
        formula: `Média per. R$ ${mediaPerMensal.toFixed(2)}/mês ÷ 12 × ${meses13} meses = R$ ${decimoTerceiro.toFixed(2)}`,
        mediaPerMensal,
        meses13,
      },
    },
    fgts: {
      valor: fgts,
      memoria: {
        formula: `(Per. + Férias + 13º = R$ ${baseGts.toFixed(2)}) × 8% = R$ ${fgts.toFixed(2)}`,
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

module.exports = { calcularPericulosidade, calcularReflexosPericulosidade };

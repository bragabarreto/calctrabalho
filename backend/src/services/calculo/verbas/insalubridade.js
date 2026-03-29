'use strict';

const {
  isSameMonth, getDate, getDaysInMonth, startOfMonth, addMonths,
  differenceInMonths, toDate: _toDate,
} = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');
const db = require('../../../config/database');

/**
 * Adicional de Insalubridade
 * Calcula sobre o salário mínimo histórico proporcional ao período.
 * Faz consulta ao banco de dados para obter o histórico.
 */
async function calcularInsalubridade(dados, temporal) {
  if (dados.verbasExcluidas?.includes('insalubridade')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }

  const percentual = dados.adicionalInsalubridadePercentual || 0;
  if (!percentual) return { valor: 0, excluida: false, memoria: { motivo: 'Percentual de insalubridade = 0' } };

  const inicio = dados.dataInicioInsalubridade
    ? new Date(dados.dataInicioInsalubridade)
    : temporal.marcoPrescricional;
  const fim = dados.dataFimInsalubridade
    ? new Date(dados.dataFimInsalubridade)
    : temporal.dataDispensa;

  // Buscar histórico do salário mínimo
  const result = await db.query(
    `SELECT mes_ano, valor FROM salario_minimo_historico
     WHERE mes_ano >= DATE_TRUNC('month', $1::date)
       AND mes_ano <= DATE_TRUNC('month', $2::date)
     ORDER BY mes_ano ASC`,
    [inicio.toISOString().split('T')[0], fim.toISOString().split('T')[0]]
  );

  let totalInsalubridade = 0;
  const detalhes = [];

  for (const row of result.rows) {
    const mesAno = new Date(row.mes_ano);
    const salMin = parseFloat(row.valor);
    const adicionalMes = salMin * percentual;
    const diasNoMes = getDaysInMonth(mesAno);
    let diasCobertos = diasNoMes;

    if (isSameMonth(mesAno, inicio) && isSameMonth(mesAno, fim)) {
      diasCobertos = getDate(fim) - getDate(inicio) + 1;
    } else if (isSameMonth(mesAno, inicio)) {
      diasCobertos = diasNoMes - getDate(inicio) + 1;
    } else if (isSameMonth(mesAno, fim)) {
      diasCobertos = getDate(fim);
    }

    const valorMes = round2((adicionalMes / diasNoMes) * diasCobertos);
    totalInsalubridade += valorMes;
    detalhes.push({ mes: mesAno.toISOString().split('T')[0], salMin, adicionalMes, diasCobertos, valorMes });
  }

  const valor = round2(totalInsalubridade);

  return {
    valor,
    excluida: false,
    memoriaInputs: { percentual, inicio, fim },
    memoria: {
      formula: `Σ (salário mínimo × ${(percentual * 100).toFixed(0)}% × dias/mês) para cada mês`,
      fundamentoLegal: 'Art. 192 CLT c/c Súmula 228 TST — adicional de insalubridade sobre o salário mínimo.',
      percentual,
      periodo: { inicio: inicio.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] },
      detalhes,
    },
  };
}

function calcularReflexosInsalubridade(insResult, dados, temporal, modalidade) {
  if (insResult.valor === 0) {
    return { avisoPrevio: { valor: 0 }, ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses;
  const mediaIns = meses > 0 ? insResult.valor / meses : 0;

  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    avisoPrevio = round2(mediaIns * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaIns * (mesesFerias / 12) * (4 / 3));
  // OJ 82 SDI1 TST: aviso projeta para 13º
  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaIns / 12) * meses13);
  const fgts = round2((insResult.valor + ferias + decimoTerceiro) * 0.08);
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);

  const mediaInsMensal = round2(mediaIns);
  const baseGts = round2(insResult.valor + ferias + decimoTerceiro);

  return {
    avisoPrevio: {
      valor: avisoPrevio,
      memoria: avisoPrevio > 0
        ? {
            formula: `Média ins. R$ ${mediaInsMensal.toFixed(2)}/mês × (${temporal.diasAvisoPrevio} dias ÷ 30) = R$ ${avisoPrevio.toFixed(2)}`,
            mediaInsMensal,
            diasAviso: temporal.diasAvisoPrevio,
          }
        : { motivo: 'Não aplicável para esta modalidade de rescisão' },
    },
    ferias: {
      valor: ferias,
      memoria: {
        formula: `Média ins. R$ ${mediaInsMensal.toFixed(2)}/mês × (${mesesFerias}/12 avos) × 4/3 = R$ ${ferias.toFixed(2)}`,
        mediaInsMensal,
        mesesFerias,
        avos: `${mesesFerias}/12`,
      },
    },
    decimoTerceiro: {
      valor: decimoTerceiro,
      memoria: {
        formula: `Média ins. R$ ${mediaInsMensal.toFixed(2)}/mês ÷ 12 × ${meses13} meses = R$ ${decimoTerceiro.toFixed(2)}`,
        mediaInsMensal,
        meses13,
        criterio: 'OJ 82 SDI-1 TST',
      },
    },
    fgts: {
      valor: fgts,
      memoria: {
        formula: `(Ins. + Férias + 13º = R$ ${baseGts.toFixed(2)}) × 8% = R$ ${fgts.toFixed(2)}`,
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

module.exports = { calcularInsalubridade, calcularReflexosInsalubridade };

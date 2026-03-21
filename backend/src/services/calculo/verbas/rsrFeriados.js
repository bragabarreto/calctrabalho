'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * RSR Não Concedido (Súmula 146 TST + OJ 410 SDI-1 TST)
 * Feriados Laborados (mesma regra — pagamento em dobro)
 *
 * Quando o trabalhador trabalha no dia de repouso semanal remunerado (RSR) ou
 * em feriado, tem direito ao pagamento em dobro do valor do dia.
 * O salário do dia já está incluso na remuneração mensal, portanto acrescenta-se
 * apenas mais UM valor-dia.
 *
 * Natureza: SALARIAL — com reflexos em férias, 13º, FGTS e aviso prévio.
 *
 * OJ 410 SDI-1 TST: não há cumulação de RSR sobre RSR.
 *
 * Requer cartão de ponto (modoEntrada = 'cartao_ponto') para apuração automática.
 */

/**
 * @param {Object}  dados
 * @param {Object}  temporal
 * @param {Array}   diasCartao - array de dias gerado pelo cartaoPontoVirtual
 * @returns {Object} { valor, excluida, natureza, memoria }
 */
function calcularRSRNaoConcedido(dados, temporal, diasCartao) {
  if (dados.verbasExcluidas?.includes('rsr_nao_concedido')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (!dados.rsrNaoConcedido) {
    return { valor: 0, excluida: false, memoria: { motivo: 'RSR não concedido não habilitado' } };
  }
  if (!diasCartao || diasCartao.length === 0) {
    // Modo médio: usa mediaRsrDiasMensais (normalizado no frontend para dias/mês)
    const diasMensais = dados.mediaRsrDiasMensais || 0;
    if (!diasMensais) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Requer cartão de ponto ou informe a média de RSR trabalhados' } };
    }
    const meses = temporal.lapsoSemAviso.meses || 1;
    const M0 = dados.mediaSalarial || dados.ultimoSalario || 0;
    const vDia = round2(M0 / 30);
    const valor = round2(vDia * diasMensais * meses);
    return {
      valor,
      excluida: false,
      natureza: 'salarial',
      memoria: {
        formula: `R$ ${vDia.toFixed(2)}/dia × ${diasMensais} dias/mês × ${meses} meses = R$ ${valor.toFixed(2)} (modo médio — Súm. 146 TST)`,
        diasMensais,
        meses,
        aviso: 'Natureza salarial — com reflexos em férias, 13º, FGTS e aviso prévio (Súmula 146 TST)',
      },
    };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;

  // Valor de 1 dia = salário / 30 (critério pro-labore)
  const valorDia = round2(M / 30);

  // Dias de RSR efetivamente trabalhados
  const diasRSR = diasCartao.filter(d => d.ehRSR && d.trabalhado && !d.afastado && !d.ferias);
  const qtde = diasRSR.length;

  if (qtde === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum RSR trabalhado detectado no cartão de ponto' } };
  }

  // Pagamento em dobro: 1 dia adicional (o dia normal já está no salário)
  const valor = round2(valorDia * qtde);

  return {
    valor,
    excluida: false,
    natureza: 'salarial',
    qtdeDias: qtde,
    valorDia,
    memoria: {
      formula: `${qtde} dias RSR × R$ ${valorDia.toFixed(2)}/dia (salário/30) = R$ ${valor.toFixed(2)}`,
      qtdeDias: qtde,
      valorDia,
      aviso: 'Natureza salarial — com reflexos em férias, 13º, FGTS e aviso prévio (Súmula 146 TST + OJ 410 SDI-1)',
    },
  };
}

/**
 * Feriados Laborados
 * Mesmas regras do RSR não concedido (Súmula 146 TST aplicada por analogia).
 * Natureza salarial com reflexos.
 */
function calcularFeriadosLaborados(dados, temporal, diasCartao) {
  if (dados.verbasExcluidas?.includes('feriados_laborados')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (!dados.feriadosLaborados) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Feriados laborados não habilitado' } };
  }
  if (!diasCartao || diasCartao.length === 0) {
    // Modo médio: usa mediaFeriadosDiasMensais (normalizado no frontend)
    const diasMensais = dados.mediaFeriadosDiasMensais || 0;
    if (!diasMensais) {
      return { valor: 0, excluida: false, memoria: { motivo: 'Requer cartão de ponto ou informe a média de feriados laborados' } };
    }
    const meses = temporal.lapsoSemAviso.meses || 1;
    const M0 = dados.mediaSalarial || dados.ultimoSalario || 0;
    const vDia = round2(M0 / 30);
    const valor = round2(vDia * diasMensais * meses);
    return {
      valor,
      excluida: false,
      natureza: 'salarial',
      memoria: {
        formula: `R$ ${vDia.toFixed(2)}/dia × ${diasMensais} dias/mês × ${meses} meses = R$ ${valor.toFixed(2)} (modo médio — Súm. 146 TST)`,
        diasMensais,
        meses,
        aviso: 'Natureza salarial — com reflexos (Súmula 146 TST)',
      },
    };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const valorDia = round2(M / 30);

  // Dias de feriado efetivamente trabalhados (não afastados, não férias)
  const diasFeriado = diasCartao.filter(d => d.ehFeriado && d.trabalhado && !d.afastado && !d.ferias);
  const qtde = diasFeriado.length;

  if (qtde === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Nenhum feriado laborado detectado no cartão de ponto' } };
  }

  const valor = round2(valorDia * qtde);

  return {
    valor,
    excluida: false,
    natureza: 'salarial',
    qtdeDias: qtde,
    valorDia,
    diasFeriados: diasFeriado.map(d => d.data),
    memoria: {
      formula: `${qtde} feriado(s) × R$ ${valorDia.toFixed(2)}/dia (salário/30) = R$ ${valor.toFixed(2)}`,
      qtdeDias: qtde,
      valorDia,
      diasFeriados: diasFeriado.map(d => d.data),
      aviso: 'Natureza salarial — com reflexos (Súmula 146 TST)',
    },
  };
}

/**
 * Reflexos de RSR não concedido e feriados laborados.
 * Natureza salarial → reflexos em férias, 13º, FGTS, aviso prévio.
 */
function calcularReflexosRSRFeriados(resultado, dados, temporal, modalidade) {
  if (!resultado || resultado.valor === 0) {
    return { ferias: { valor: 0 }, decimoTerceiro: { valor: 0 }, fgts: { valor: 0 }, mulFgts: { valor: 0 }, avisoPrevio: { valor: 0 } };
  }

  const meses = temporal.lapsoSemAviso.meses - (dados.mesesAfastamento || 0);
  const mediaRSRMensal = meses > 0 ? resultado.valor / meses : 0;

  // Férias: proporcional ao período aquisitivo
  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const ferias = round2(mediaRSRMensal * (mesesFerias / 12) * (4 / 3));

  // 13º: proporcional (OJ 82 SDI1 TST: aviso projeta para 13º)
  const meses13 = temporal.lapsoComAviso.mesesRestantes + (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
  const decimoTerceiro = round2((mediaRSRMensal / 12) * meses13);

  // FGTS sobre base salarial (RSR + férias + 13º)
  const fgts = round2((resultado.valor + ferias + decimoTerceiro) * 0.08);

  // Multa FGTS
  const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
  const mulFgts = round2(fgts * pctMul);

  // Aviso prévio
  let avisoPrevio = 0;
  if (!dados.avisoPrevioTrabalhado && modalidade !== 'pedido_demissao' && modalidade !== 'justa_causa') {
    avisoPrevio = round2(mediaRSRMensal * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') avisoPrevio = round2(avisoPrevio / 2);
  }

  return {
    ferias: { valor: ferias },
    decimoTerceiro: { valor: decimoTerceiro },
    fgts: { valor: fgts },
    mulFgts: { valor: mulFgts },
    avisoPrevio: { valor: avisoPrevio },
  };
}

module.exports = { calcularRSRNaoConcedido, calcularFeriadosLaborados, calcularReflexosRSRFeriados };

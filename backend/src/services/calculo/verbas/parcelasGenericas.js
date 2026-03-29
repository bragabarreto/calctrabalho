'use strict';

const { differenceInMonths } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');
const { deveGerarReflexos, validarNaturezaReflexos } = require('../../../utils/naturezaJuridica');
const { calcularComHistoricoMensal } = require('../../../utils/resolverSalarioBase');

/**
 * Calcula o valor base e total de uma parcela personalizada genérica.
 *
 * @param {Object} parcela    — item de dados.parcelasPersonalizadas
 * @param {Object} dados      — dados do contrato
 * @param {Object} temporal   — resultado de calcularTemporais(dados)
 * @param {number} smVigente  — salário mínimo vigente na data de dispensa (0 se não disponível)
 * @returns {{ valorMensal, total, nMeses, formulaFreq, distribuicaoMensal? }}
 */
function calcularParcelaGenerica(parcela, dados, temporal, smVigente = 0) {
  // ---- Período ----
  const inicioData =
    parcela.periodoTipo === 'especifico' && parcela.periodoInicio
      ? new Date(parcela.periodoInicio)
      : temporal.marcoPrescricional || new Date(dados.dataAdmissao);
  const fimData =
    parcela.periodoTipo === 'especifico' && parcela.periodoFim
      ? new Date(parcela.periodoFim)
      : temporal.dataDispensa || new Date(dados.dataDispensa);
  const nMeses = Math.max(1, differenceInMonths(fimData, inicioData) + 1);

  // ---- Valor mensal base ----
  let valorMensal = 0;
  let distribuicaoMensal = null;

  switch (parcela.tipoValor) {
    case 'fixo':
      valorMensal = parcela.valorBase || 0;
      break;
    case 'percentual_salario': {
      const pctFator = (parcela.percentualBase || 0) / 100;
      // Tenta cálculo mês a mês via histórico salarial
      if (parcela.frequencia === 'mensal' || parcela.frequencia === 'horaria' || parcela.frequencia === 'calculada') {
        const resultado = calcularComHistoricoMensal(dados, inicioData, fimData, pctFator);
        if (resultado.usouHistorico) {
          return {
            valorMensal: resultado.meses > 0 ? round2(resultado.total / resultado.meses) : 0,
            total: round2(resultado.total),
            nMeses: resultado.meses,
            formulaFreq: `Σ salário(mês) × ${(pctFator * 100).toFixed(1)}% ao longo de ${resultado.meses} meses`,
            distribuicaoMensal: resultado.distribuicaoMensal,
          };
        }
      }
      // Fallback: último salário
      valorMensal = (dados.ultimoSalario || 0) * pctFator;
      break;
    }
    case 'percentual_sm':
      valorMensal = smVigente * ((parcela.percentualBase || 0) / 100);
      break;
    default:
      valorMensal = parcela.valorBase || 0;
  }

  // ---- Total por frequência ----
  let total = 0;
  let formulaFreq = '';

  switch (parcela.frequencia) {
    case 'mensal':
    case 'horaria':    // parcela horária custom: valorBase informado = valor mensal equivalente
    case 'calculada':
      total = round2(valorMensal * nMeses);
      formulaFreq = `× ${nMeses} meses`;
      break;

    case 'unica':
      total = round2(parcela.valorBase || 0);
      formulaFreq = '(valor único)';
      break;

    case 'semestral': {
      const nSem = Math.floor(nMeses / 6);
      total = round2(valorMensal * nSem);
      formulaFreq = `× ${nSem} semestres`;
      break;
    }

    case 'anual': {
      const nAnos = Math.floor(nMeses / 12);
      total = round2(valorMensal * nAnos);
      formulaFreq = `× ${nAnos} anos`;
      break;
    }

    case 'diaria_6d': {
      const nDias6 = Math.round(nMeses * 26);
      total = round2(valorMensal * nDias6);
      formulaFreq = `× ${nDias6} dias (6d/sem)`;
      break;
    }

    case 'diaria_5d': {
      const nDias5 = Math.round(nMeses * 22);
      total = round2(valorMensal * nDias5);
      formulaFreq = `× ${nDias5} dias (5d/sem)`;
      break;
    }

    default:
      total = round2(parcela.valorBase || 0);
      formulaFreq = '(valor único)';
  }

  return { valorMensal, total, nMeses, formulaFreq };
}

/**
 * Calcula os reflexos de uma parcela personalizada genérica.
 * Os reflexos efetivamente gerados dependem de parcela.reflexosEm e parcela.geraReflexos.
 *
 * @param {number} valorTotal — valor base da parcela (sem reflexos)
 * @param {number} nMeses     — número de meses do período
 * @param {Object} parcela    — item de dados.parcelasPersonalizadas
 * @param {Object} dados      — dados do contrato
 * @param {Object} temporal   — resultado de calcularTemporais(dados)
 * @param {string} modalidade — modalidade de rescisão
 * @returns {Object} mapa de reflexos { rsr?, avisoPrevio?, ferias?, decimoTerceiro?, fgts?, mulFgts? }
 */
function calcularReflexosParcela(valorTotal, nMeses, parcela, dados, temporal, modalidade) {
  const r = {};
  if (!parcela.geraReflexos || valorTotal === 0) return r;

  // Guard: natureza jurídica — parcelas indenizatórias não geram reflexos
  if (!deveGerarReflexos(parcela.natureza)) {
    const { aviso } = validarNaturezaReflexos(parcela);
    if (aviso) console.warn(aviso);
    return r;
  }

  const reflexosEm = parcela.reflexosEm || [];
  const mediaValor = nMeses > 0 ? round2(valorTotal / nMeses) : 0;

  // RSR — 1 dia de repouso para cada 6 dias trabalhados (Súmula 172 TST)
  if (reflexosEm.includes('rsr')) {
    const rsr = round2(valorTotal / 6);
    r.rsr = {
      valor: rsr,
      memoria: { formula: `R$ ${valorTotal.toFixed(2)} / 6 = R$ ${rsr.toFixed(2)}` },
    };
  }

  // Aviso Prévio
  if (
    reflexosEm.includes('aviso_previo') &&
    !dados.avisoPrevioTrabalhado &&
    modalidade !== 'pedido_demissao' &&
    modalidade !== 'justa_causa'
  ) {
    let ap = round2(mediaValor * (temporal.diasAvisoPrevio / 30));
    if (modalidade === 'culpa_reciproca') ap = round2(ap / 2);
    r.avisoPrevio = {
      valor: ap,
      memoria: {
        formula: `R$ ${mediaValor.toFixed(2)}/mês × (${temporal.diasAvisoPrevio}d / 30) = R$ ${ap.toFixed(2)}`,
      },
    };
  }

  // Férias + 1/3
  if (reflexosEm.includes('ferias')) {
    const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
    const ferias = round2(mediaValor * (mesesFerias / 12) * (4 / 3));
    r.ferias = {
      valor: ferias,
      memoria: {
        formula: `R$ ${mediaValor.toFixed(2)} × (${mesesFerias}/12) × 4/3 = R$ ${ferias.toFixed(2)}`,
      },
    };
  }

  // 13º Salário — OJ 82 SDI1 TST: aviso previo projeta para 13º
  if (reflexosEm.includes('decimo_terceiro')) {
    const meses13 =
      temporal.lapsoComAviso.mesesRestantes +
      (temporal.lapsoComAviso.diasRestantes >= 15 ? 1 : 0);
    const dt = round2((mediaValor / 12) * meses13);
    r.decimoTerceiro = {
      valor: dt,
      memoria: {
        formula: `(R$ ${mediaValor.toFixed(2)} / 12) × ${meses13} meses = R$ ${dt.toFixed(2)}`,
      },
    };
  }

  // FGTS — 8% sobre verba + RSR + férias + 13º (somente se parcela incide em FGTS)
  if (reflexosEm.includes('fgts') && parcela.incideFgts) {
    const baseFgts =
      valorTotal +
      (r.rsr?.valor || 0) +
      (r.ferias?.valor || 0) +
      (r.decimoTerceiro?.valor || 0);
    const fgts = round2(baseFgts * 0.08);
    r.fgts = {
      valor: fgts,
      memoria: { formula: `R$ ${baseFgts.toFixed(2)} × 8% = R$ ${fgts.toFixed(2)}` },
    };

    // Multa FGTS
    const pctMul =
      { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
    if (pctMul > 0) {
      const mulFgts = round2(fgts * pctMul);
      r.mulFgts = {
        valor: mulFgts,
        memoria: {
          formula: `R$ ${fgts.toFixed(2)} × ${(pctMul * 100).toFixed(0)}% = R$ ${mulFgts.toFixed(2)}`,
        },
      };
    }
  }

  return r;
}

module.exports = { calcularParcelaGenerica, calcularReflexosParcela };

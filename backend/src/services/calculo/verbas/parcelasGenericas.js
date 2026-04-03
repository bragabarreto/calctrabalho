'use strict';

const { differenceInMonths } = require('../../../utils/datas');
const { round2 } = require('../../../utils/formatacao');
const { deveGerarReflexos, validarNaturezaReflexos } = require('../../../utils/naturezaJuridica');
const { calcularComHistoricoMensal } = require('../../../utils/resolverSalarioBase');

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Parseia uma data de forma segura (sem problemas de fuso horário UTC).
 * Aceita Date, 'YYYY-MM-DD' ou 'YYYY-MM'.
 */
function parseDataSegura(d) {
  if (d instanceof Date) return d;
  const s = String(d).trim();
  if (s.length === 7) return new Date(s + '-01T12:00:00');
  return new Date(s.substring(0, 10) + 'T12:00:00');
}

/**
 * Retorna o salário mínimo vigente em uma competência 'YYYY-MM'
 * buscando no array smHistorico (ordenado por mesAno ASC).
 *
 * @param {Array<{mesAno: string, valor: number}>} smHistorico
 * @param {string} competencia - 'YYYY-MM'
 * @returns {number}
 */
function smParaCompetencia(smHistorico, competencia) {
  if (!smHistorico || smHistorico.length === 0) return 0;
  // Busca o SM mais recente que seja <= competencia
  let smAplicavel = null;
  for (const entry of smHistorico) {
    if (entry.mesAno <= competencia) {
      smAplicavel = entry.valor;
    } else {
      break; // array está ordenado ASC, pode parar
    }
  }
  return smAplicavel !== null ? smAplicavel : smHistorico[0].valor;
}

/**
 * Gera a distribuição mensal de uma parcela, com proporcionalidade automática
 * nos meses parciais (primeiro e último mês do período).
 *
 * @param {Date|string} inicioData  - Data de início do período (com dia)
 * @param {Date|string} fimData    - Data de fim do período (com dia)
 * @param {Function} getValorMes   - (competencia: 'YYYY-MM') => { valorBase: number, valorMensal: number }
 * @returns {Array<{mes, competencia, diasNoMes, diasTrabalhados, ehProporcional, valorBase, valor}>}
 */
function gerarDistribuicaoMensal(inicioData, fimData, getValorMes) {
  const inicio = parseDataSegura(inicioData);
  const fim    = parseDataSegura(fimData);

  const resultado = [];

  let ano = inicio.getFullYear();
  let mes = inicio.getMonth() + 1; // 1-indexed
  const anoFim = fim.getFullYear();
  const mesFim = fim.getMonth() + 1;

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;

    // Total de dias no mês: new Date(ano, mes, 0) = último dia do mês mes (1-indexed)
    const diasNoMes = new Date(ano, mes, 0).getDate();

    // Dia de início e fim dentro deste mês
    let diaInicio = 1;
    let diaFim = diasNoMes;

    if (ano === inicio.getFullYear() && mes === inicio.getMonth() + 1) {
      diaInicio = inicio.getDate();
    }
    if (ano === fim.getFullYear() && mes === fim.getMonth() + 1) {
      diaFim = fim.getDate();
    }

    const diasTrabalhados = Math.max(1, diaFim - diaInicio + 1);
    const ehProporcional  = diasTrabalhados < diasNoMes;

    const { valorBase, valorMensal } = getValorMes(competencia);

    const valor = ehProporcional
      ? round2(valorMensal * diasTrabalhados / diasNoMes)
      : round2(valorMensal);

    resultado.push({
      mes: competencia,         // compat com MemoriaCalculo (m.mes || m.competencia)
      competencia,
      diasNoMes,
      diasTrabalhados,
      ehProporcional,
      valorBase,
      valor,
    });

    // Avança para o próximo mês
    if (mes === 12) { ano++; mes = 1; } else mes++;
  }

  return resultado;
}

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------

/**
 * Calcula o valor base e total de uma parcela personalizada genérica.
 * Gera sempre `distribuicaoMensal` para parcelas com frequência mensal,
 * com proporcionalidade no primeiro e último mês do período.
 *
 * @param {Object} parcela     — item de dados.parcelasPersonalizadas
 * @param {Object} dados       — dados do contrato
 * @param {Object} temporal    — resultado de calcularTemporais(dados)
 * @param {Array}  smHistorico — [{mesAno:'YYYY-MM', valor:number}] ordenado ASC
 * @returns {{ valorMensal, total, nMeses, formulaFreq, distribuicaoMensal? }}
 */
function calcularParcelaGenerica(parcela, dados, temporal, smHistorico = []) {
  // ---- Período ----
  const inicioData =
    parcela.periodoTipo === 'especifico' && parcela.periodoInicio
      ? parseDataSegura(parcela.periodoInicio)
      : parseDataSegura(
          temporal.marcoPrescricional
            ? temporal.marcoPrescricional
            : dados.dataAdmissao
        );
  const fimData =
    parcela.periodoTipo === 'especifico' && parcela.periodoFim
      ? parseDataSegura(parcela.periodoFim)
      : parseDataSegura(
          temporal.dataDispensa
            ? temporal.dataDispensa
            : dados.dataDispensa
        );

  // Número de meses (mantido para fórmulas não-mensais e compatibilidade)
  const nMeses = Math.max(1, differenceInMonths(fimData, inicioData) + 1);

  // ====================================================================
  // 1. percentual_salario — usa histórico mensal quando disponível
  // ====================================================================
  if (parcela.tipoValor === 'percentual_salario') {
    const pctFator = (parcela.percentualBase || 0) / 100;

    if (parcela.frequencia === 'mensal' || parcela.frequencia === 'horaria' || parcela.frequencia === 'calculada') {
      // Tenta cálculo mês a mês via histórico salarial do reclamante
      const resultado = calcularComHistoricoMensal(dados, inicioData, fimData, pctFator);
      if (resultado.usouHistorico && resultado.total > 0) {
        const nM = resultado.meses || nMeses;
        // Normaliza campos: memoria do historicoSalarial usa { competencia, valor, valorComPercentual }
        // Mapeia para o formato padrão: { mes, competencia, valorBase, valor }
        const distNorm = (resultado.distribuicaoMensal || []).map((m) => ({
          mes: m.competencia || m.mes,
          competencia: m.competencia || m.mes,
          valorBase: m.valorBase !== undefined ? m.valorBase : m.valor,
          valor: m.valorComPercentual !== undefined ? m.valorComPercentual : m.valor,
        }));
        return {
          valorMensal: nM > 0 ? round2(resultado.total / nM) : 0,
          total: round2(resultado.total),
          nMeses: nM,
          formulaFreq: `Σ salário(mês) × ${(pctFator * 100).toFixed(1)}% ao longo de ${nM} meses`,
          distribuicaoMensal: distNorm,
        };
      }

      // Fallback: último salário — gera distribuição proporcional plana
      const salBase   = dados.ultimoSalario || 0;
      const valMensal = round2(salBase * pctFator);
      const dist = gerarDistribuicaoMensal(inicioData, fimData, () => ({
        valorBase:   salBase,
        valorMensal: valMensal,
      }));
      const total = round2(dist.reduce((s, m) => s + m.valor, 0));
      return {
        valorMensal: valMensal,
        total,
        nMeses: dist.length,
        formulaFreq: `R$ ${salBase.toFixed(2)} × ${(pctFator * 100).toFixed(1)}% × ${dist.length} meses`,
        distribuicaoMensal: dist,
      };
    }
  }

  // ====================================================================
  // 2. percentual_sm — usa SM histórico por competência
  // ====================================================================
  if (parcela.tipoValor === 'percentual_sm') {
    const pct = (parcela.percentualBase || 0) / 100;

    if (parcela.frequencia === 'mensal' || parcela.frequencia === 'horaria' || parcela.frequencia === 'calculada') {
      const dist = gerarDistribuicaoMensal(inicioData, fimData, (competencia) => {
        const sm         = smParaCompetencia(smHistorico, competencia);
        const valorMensal = round2(sm * pct);
        return { valorBase: sm, valorMensal };
      });
      const total  = round2(dist.reduce((s, m) => s + m.valor, 0));
      const smFim  = smParaCompetencia(
        smHistorico,
        `${fimData.getFullYear()}-${String(fimData.getMonth() + 1).padStart(2, '0')}`
      );
      return {
        valorMensal: smFim > 0 ? round2(smFim * pct) : 0,
        total,
        nMeses: dist.length,
        formulaFreq: `SM(competência) × ${(pct * 100).toFixed(2)}% ao longo de ${dist.length} meses`,
        distribuicaoMensal: dist,
      };
    }
  }

  // ====================================================================
  // 3. fixo — gera distribuição proporcional para frequência mensal
  // ====================================================================
  const valorBase = parcela.valorBase || 0;

  switch (parcela.frequencia) {
    case 'mensal':
    case 'horaria':    // parcela horária custom: valorBase = valor mensal equivalente
    case 'calculada': {
      const dist = gerarDistribuicaoMensal(inicioData, fimData, () => ({
        valorBase,
        valorMensal: valorBase,
      }));
      const total = round2(dist.reduce((s, m) => s + m.valor, 0));
      return {
        valorMensal: valorBase,
        total,
        nMeses: dist.length,
        formulaFreq: `R$ ${valorBase.toFixed(2)} × ${dist.length} meses (com proporcionalidade)`,
        distribuicaoMensal: dist,
      };
    }

    case 'unica':
      return {
        valorMensal: valorBase,
        total: round2(valorBase),
        nMeses: 1,
        formulaFreq: '(valor único)',
        distribuicaoMensal: null,
      };

    case 'semestral': {
      const nSem = Math.floor(nMeses / 6);
      return {
        valorMensal: valorBase,
        total: round2(valorBase * nSem),
        nMeses,
        formulaFreq: `× ${nSem} semestres`,
        distribuicaoMensal: null,
      };
    }

    case 'anual': {
      const nAnos = Math.floor(nMeses / 12);
      return {
        valorMensal: valorBase,
        total: round2(valorBase * nAnos),
        nMeses,
        formulaFreq: `× ${nAnos} anos`,
        distribuicaoMensal: null,
      };
    }

    case 'diaria_6d': {
      const nDias6 = Math.round(nMeses * 26);
      return {
        valorMensal: valorBase,
        total: round2(valorBase * nDias6),
        nMeses,
        formulaFreq: `× ${nDias6} dias (6d/sem)`,
        distribuicaoMensal: null,
      };
    }

    case 'diaria_5d': {
      const nDias5 = Math.round(nMeses * 22);
      return {
        valorMensal: valorBase,
        total: round2(valorBase * nDias5),
        nMeses,
        formulaFreq: `× ${nDias5} dias (5d/sem)`,
        distribuicaoMensal: null,
      };
    }

    default:
      return {
        valorMensal: valorBase,
        total: round2(valorBase),
        nMeses: 1,
        formulaFreq: '(valor único)',
        distribuicaoMensal: null,
      };
  }
}

// ---------------------------------------------------------------------------
// Reflexos
// ---------------------------------------------------------------------------

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
  if (reflexosEm.includes('rsr') || reflexosEm.includes('dsr')) {
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

  // 13º Salário — OJ 82 SDI1 TST: aviso prévio projeta para 13º
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

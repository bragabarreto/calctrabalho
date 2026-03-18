'use strict';

const { round2 } = require('../../../utils/formatacao');
const { INSS_TABELA_2025, INSS_TETO_2025 } = require('../../../config/constants');

/**
 * Cálculo do INSS pela tabela progressiva 2025
 */
function calcularINSS(salarioBruto) {
  let inss = 0;
  let baseAnterior = 0;

  for (const faixa of INSS_TABELA_2025) {
    if (salarioBruto <= baseAnterior) break;
    const baseNaFaixa = Math.min(salarioBruto, faixa.ate) - baseAnterior;
    if (baseNaFaixa > 0) {
      inss += baseNaFaixa * faixa.aliquota;
    }
    baseAnterior = faixa.ate;
    if (salarioBruto <= faixa.ate) break;
  }

  return round2(Math.min(inss, INSS_TETO_2025));
}

/**
 * Simulação INSS em acordo judicial
 */
function calcularINSS_Acordo(dados, totalCalculo, percentualSalarial) {
  const { tipoAcordo, valorAcordo, valorLiquidoExequente, contribuicaoSocialLiquidacao, tipoDevedor } = dados;

  if (!valorAcordo || valorAcordo <= 0) return { valor: 0, memoria: { motivo: 'Sem valor de acordo informado' } };

  if (tipoAcordo === 'sem_vinculo') {
    const percentual = tipoDevedor === 'pf_mei_me_epp' ? 0.11 : 0.28;
    const valor = round2(valorAcordo * percentualSalarial * percentual);
    return {
      valor,
      memoria: {
        formula: `R$ ${valorAcordo.toFixed(2)} × ${(percentualSalarial * 100).toFixed(1)}% salarial × ${(percentual * 100).toFixed(0)}% = R$ ${valor.toFixed(2)}`,
        tipo: 'Sem vínculo',
        percentual,
      },
    };
  }

  if (tipoAcordo === 'com_vinculo_execucao_liquidada' && contribuicaoSocialLiquidacao && valorLiquidoExequente) {
    const pctLiquidacao = contribuicaoSocialLiquidacao / valorLiquidoExequente;
    const valor = round2(valorAcordo * pctLiquidacao);
    return {
      valor,
      memoria: {
        formula: `R$ ${valorAcordo.toFixed(2)} × (${contribuicaoSocialLiquidacao} / ${valorLiquidoExequente}) = R$ ${valor.toFixed(2)}`,
        tipo: 'Com vínculo — execução liquidada',
      },
    };
  }

  // Com vínculo — conhecimento ou trânsito em julgado
  const baseINSS = (totalCalculo - (dados.fgtsDepositado || 0)) * percentualSalarial;
  const valor = round2(Math.max(0, valorAcordo * percentualSalarial * 0.28));

  return {
    valor,
    memoria: {
      formula: `R$ ${valorAcordo.toFixed(2)} × ${(percentualSalarial * 100).toFixed(1)}% × 28% = R$ ${valor.toFixed(2)}`,
      tipo: tipoAcordo || 'Com vínculo — conhecimento',
    },
  };
}

/**
 * Calcula IR pelo método RRA (Rendimentos Recebidos Acumuladamente)
 * Art. 12-A da Lei 7.713/1988 - aplicado a verbas trabalhistas
 *
 * @param {number} baseCalculo - Total das verbas tributáveis (depois do INSS)
 * @param {number} mesesReferencia - Meses a que se referem os rendimentos
 * @returns {Object} { valor, aliquotaEfetiva, memoria }
 */
function calcularIR_RRA(baseCalculo, mesesReferencia) {
  const { IR_TABELA_2025 } = require('../../../config/constants');
  if (!baseCalculo || baseCalculo <= 0) return { valor: 0, aliquotaEfetiva: 0, memoria: { motivo: 'Sem base tributável' } };

  const meses = Math.max(1, Math.min(mesesReferencia || 1, 12)); // máximo 12 meses p/ RRA
  const rendimentoMensal = baseCalculo / meses;

  // Aplica tabela progressiva ao rendimento mensal
  let faixa = IR_TABELA_2025.find(f => rendimentoMensal <= f.ate);
  if (!faixa) faixa = IR_TABELA_2025[IR_TABELA_2025.length - 1];

  const irMensal = rendimentoMensal * faixa.aliquota - faixa.deducao;
  const irTotal = round2(Math.max(0, irMensal) * meses);
  const aliquotaEfetiva = baseCalculo > 0 ? round2((irTotal / baseCalculo) * 100) : 0;

  return {
    valor: irTotal,
    aliquotaEfetiva,
    memoria: {
      formula: `Base RRA: R$ ${baseCalculo.toFixed(2)} ÷ ${meses} meses = R$ ${rendimentoMensal.toFixed(2)}/mês → alíquota ${(faixa.aliquota * 100).toFixed(1)}% → IR mensal R$ ${Math.max(0, irMensal).toFixed(2)} × ${meses} = R$ ${irTotal.toFixed(2)}`,
      rendimentoMensal: round2(rendimentoMensal),
      mesesReferencia: meses,
      aliquota: faixa.aliquota,
    },
  };
}

/**
 * Contribuição patronal INSS (20% — alíquota padrão, art. 22 Lei 8.212/91)
 * Na Justiça do Trabalho apura-se normalmente apenas a contribuição básica (20%)
 */
function calcularINSSEmpregador(baseInss) {
  return round2(baseInss * 0.20);
}

/**
 * Calcula INSS + IR devidos pelo trabalhador sobre as verbas salariais,
 * mais contribuição patronal (20%).
 * (Para informação na memória de cálculo — não deduzido automaticamente)
 *
 * @param {Array} listaVerbas - Lista de verbas calculadas
 * @param {number} lapsoMeses - Meses de contrato (para RRA)
 * @param {number} percentualSalarial - Fração salarial sobre o subtotal (0–1)
 * @returns {Object} encargos completos empregado + empregador
 */
function calcularEncargosEmpregado(listaVerbas, lapsoMeses, percentualSalarial) {
  // Base INSS: soma das verbas que incideInss === true e não excluídas
  const baseInss = round2(
    listaVerbas
      .filter(v => v.incideInss && !v.excluida)
      .reduce((acc, v) => acc + v.valor, 0)
  );

  const subtotal = round2(
    listaVerbas.filter(v => !v.excluida).reduce((acc, v) => acc + v.valor, 0)
  );
  const baseSalarial = round2(
    listaVerbas.filter(v => v.natureza === 'salarial' && !v.excluida).reduce((acc, v) => acc + v.valor, 0)
  );
  const baseIndenizatoria = round2(subtotal - baseSalarial);
  const pctSalarial = subtotal > 0 ? round2(baseSalarial / subtotal) : (percentualSalarial || 0);
  const pctIndenizatorio = round2(1 - pctSalarial);

  const inssEmpregado = calcularINSS(baseInss);
  const inssEmpregador = calcularINSSEmpregador(baseInss);

  // Base IR = base INSS - INSS empregado (rendimentos tributáveis depois do INSS)
  const baseTributavel = round2(Math.max(0, baseInss - inssEmpregado));
  const irRetido = calcularIR_RRA(baseTributavel, lapsoMeses);

  return {
    baseInss,
    baseSalarial,
    baseIndenizatoria,
    pctSalarial,
    pctIndenizatorio,
    inssEmpregado,
    inssEmpregador,
    baseTributavel,
    irRetido,
    memoria: {
      baseInss: `R$ ${baseInss.toFixed(2)} (verbas com incidência INSS, não excluídas)`,
      inssEmpregado: `R$ ${inssEmpregado.toFixed(2)} (tabela progressiva 2025)`,
      inssEmpregador: `R$ ${inssEmpregador.toFixed(2)} (20% patronal — art. 22 Lei 8.212/91)`,
      baseTributavel: `R$ ${baseTributavel.toFixed(2)} (base INSS − INSS empregado)`,
      aviso: 'Valores informativos — o IR em reclamações trabalhistas segue o método RRA (art. 12-A da Lei 7.713/88). Confirme com o perito contábil.',
    },
  };
}

module.exports = { calcularINSS, calcularINSSEmpregador, calcularINSS_Acordo, calcularEncargosEmpregado, calcularIR_RRA };

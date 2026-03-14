'use strict';

const { calcularTemporais } = require('../../utils/datas');
const { round2, nonNegative } = require('../../utils/formatacao');
const { Auditoria } = require('../../utils/auditoria');

const { calcularSaldoSalarial } = require('./verbas/saldoSalarial');
const { calcularAvisoPrevio } = require('./verbas/avisoPrevio');
const { calcularFeriasDobradas, calcularFeriasIntegrais, calcularFeriasProporcionais } = require('./verbas/ferias');
const { calcularDecimoTerceiroIntegral, calcularDecimoTerceiroProporcional } = require('./verbas/decimoTerceiro');
const { calcularFGTS, calcularMultaFGTS } = require('./verbas/fgts');
const { calcularMultaArt467, calcularMultaArt477 } = require('./verbas/multasArt467e477');
const { calcularHorasExtras, calcularReflexosHE } = require('./verbas/horasExtras');
const { calcularAdicionalNoturno, calcularReflexosAN } = require('./verbas/adicionalNoturno');
const { calcularInsalubridade, calcularReflexosInsalubridade } = require('./verbas/insalubridade');
const { calcularPericulosidade, calcularReflexosPericulosidade } = require('./verbas/periculosidade');
const { calcularIntervaloIntrajornada } = require('./verbas/intervaloIntrajornada');
const { calcularINSS, calcularINSS_Acordo, calcularEncargosEmpregado } = require('./verbas/inss');
const { calcularJurosSelic } = require('./verbas/jurosSelic');
const { calcularTotalPorHistorico, resolverBaseHistoricoId } = require('../../utils/historicoSalarial');

/**
 * Motor Central de Cálculo Trabalhista
 * @param {Object} dados - Dados completos do contrato
 * @param {string} modalidade - Modalidade de rescisão
 * @returns {Object} resultado completo com verbas, totais e auditoria
 */
async function calcular(dados, modalidade) {
  const auditoria = new Auditoria();
  const temporal = calcularTemporais(dados);
  const verbas = {};
  const reflexos = {};

  // ---- SALDO SALARIAL ----
  verbas.saldoSalarial = calcularSaldoSalarial(dados, temporal);

  // ---- SALÁRIOS E COMISSÕES ATRASADOS ----
  const historicosSalariais = dados.historicosSalariais || [];

  // Helper: get last N months before dataDispensa (excluding dispensa month)
  function getUltimosMeses(n) {
    const d = new Date(dados.dataDispensa);
    const resultado = [];
    for (let i = 1; i <= n; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      resultado.unshift(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
    }
    return resultado;
  }

  // Salários atrasados
  const salAtrasadosMeses = dados.salariosMesesAtrasados || 0;
  if (salAtrasadosMeses > 0) {
    let valorSalAt = round2((dados.ultimoSalario || 0) * salAtrasadosMeses);
    let memoriaFormulaSal = `R$ ${dados.ultimoSalario} × ${salAtrasadosMeses} meses`;
    if (dados.salarioAtrasadoBase === 'historico' && dados.salarioAtrasadoHistoricoId) {
      const { historico, parcelaId } = resolverBaseHistoricoId(historicosSalariais, dados.salarioAtrasadoHistoricoId);
      if (historico) {
        const meses = getUltimosMeses(salAtrasadosMeses);
        const inicio = meses[0] + '-01';
        const fim = meses[meses.length - 1] + '-28';
        const { total: totalHist } = calcularTotalPorHistorico(historico, inicio, fim, 1, parcelaId);
        valorSalAt = totalHist;
        memoriaFormulaSal = `Histórico "${historico.titulo}": ${meses[0]} a ${meses[meses.length - 1]} (${salAtrasadosMeses} meses) = R$ ${totalHist.toFixed(2)}`;
      }
    }
    verbas.salariosAtrasados = { valor: valorSalAt, excluida: false, memoria: { formula: memoriaFormulaSal } };
  } else {
    verbas.salariosAtrasados = { valor: 0, excluida: false };
  }

  // Comissões atrasadas
  const comAtrasadosMeses = dados.comissoesMesesAtrasados || 0;
  if (comAtrasadosMeses > 0) {
    let valorComAt = round2((dados.comissoes || 0) * comAtrasadosMeses);
    let memoriaFormulaComm = `R$ ${dados.comissoes} × ${comAtrasadosMeses} meses`;
    if (dados.comissaoAtrasadaBase === 'historico' && dados.comissaoAtrasadoHistoricoId) {
      const { historico, parcelaId } = resolverBaseHistoricoId(historicosSalariais, dados.comissaoAtrasadoHistoricoId);
      if (historico) {
        const meses = getUltimosMeses(comAtrasadosMeses);
        const inicio = meses[0] + '-01';
        const fim = meses[meses.length - 1] + '-28';
        const { total: totalHist } = calcularTotalPorHistorico(historico, inicio, fim, 1, parcelaId);
        valorComAt = totalHist;
        memoriaFormulaComm = `Histórico "${historico.titulo}": ${meses[0]} a ${meses[meses.length - 1]} (${comAtrasadosMeses} meses) = R$ ${totalHist.toFixed(2)}`;
      }
    }
    verbas.comissoesAtrasadas = { valor: valorComAt, excluida: false, memoria: { formula: memoriaFormulaComm } };
  } else {
    verbas.comissoesAtrasadas = { valor: 0, excluida: false };
  }

  // Gorjetas atrasadas
  const gorjAtrasadosMeses = dados.gorjetasMesesAtrasados || 0;
  if (gorjAtrasadosMeses > 0) {
    let valorGorjAt = round2((dados.gorjetas || 0) * gorjAtrasadosMeses);
    let memoriaFormulaGorj = `R$ ${dados.gorjetas || 0} × ${gorjAtrasadosMeses} meses (Súmula 354 TST)`;
    if (dados.gorjetaAtrasadaBase === 'historico' && dados.gorjetaAtrasadoHistoricoId) {
      const { historico, parcelaId } = resolverBaseHistoricoId(historicosSalariais, dados.gorjetaAtrasadoHistoricoId);
      if (historico) {
        const meses = getUltimosMeses(gorjAtrasadosMeses);
        const inicio = meses[0] + '-01';
        const fim = meses[meses.length - 1] + '-28';
        const { total: totalHist } = calcularTotalPorHistorico(historico, inicio, fim, 1, parcelaId);
        valorGorjAt = totalHist;
        memoriaFormulaGorj = `Histórico "${historico.titulo}": ${meses[0]} a ${meses[meses.length - 1]} (${gorjAtrasadosMeses} meses) = R$ ${totalHist.toFixed(2)} (Súmula 354 TST)`;
      }
    }
    verbas.gorjetasAtrasadas = { valor: valorGorjAt, excluida: false, memoria: { formula: memoriaFormulaGorj } };
  } else {
    verbas.gorjetasAtrasadas = { valor: 0, excluida: false };
  }

  // ---- AVISO PRÉVIO ----
  verbas.avisoPrevio = calcularAvisoPrevio(dados, temporal, modalidade);

  // ---- FÉRIAS ----
  verbas.feriasDobradas = calcularFeriasDobradas(dados, temporal);
  verbas.feriasIntegrais = calcularFeriasIntegrais(dados, temporal);
  verbas.feriasProporcionais = calcularFeriasProporcionais(dados, temporal);

  // ---- 13º SALÁRIO ----
  verbas.decimoTerceiroIntegral = calcularDecimoTerceiroIntegral(dados, temporal);
  verbas.decimoTerceiroProporcional = calcularDecimoTerceiroProporcional(dados, temporal);

  // ---- FGTS ----
  verbas.fgts = calcularFGTS(dados, temporal);
  verbas.multaFgts = calcularMultaFGTS(verbas.fgts.fgtsBruto, modalidade);

  // ---- MULTAS ----
  // Multa 467: placeholder zero — calculada após montarListaVerbas (pós-processamento)
  verbas.multaArt467 = { valor: 0, excluida: false, memoria: {} };
  verbas.multaArt477 = calcularMultaArt477(dados, temporal);

  // ---- HORAS EXTRAS ----
  verbas.horasExtras = calcularHorasExtras(dados, temporal);
  reflexos.horasExtras = calcularReflexosHE(verbas.horasExtras, dados, temporal, modalidade);

  // ---- ADICIONAL NOTURNO ----
  verbas.adicionalNoturno = calcularAdicionalNoturno(dados, temporal);
  reflexos.adicionalNoturno = calcularReflexosAN(verbas.adicionalNoturno, dados, temporal, modalidade);

  // ---- INSALUBRIDADE ----
  verbas.insalubridade = await calcularInsalubridade(dados, temporal);
  reflexos.insalubridade = calcularReflexosInsalubridade(verbas.insalubridade, dados, temporal, modalidade);

  // ---- PERICULOSIDADE ----
  verbas.periculosidade = calcularPericulosidade(dados, temporal);
  reflexos.periculosidade = calcularReflexosPericulosidade(verbas.periculosidade, dados, temporal, modalidade);

  // ---- INTERVALO INTRAJORNADA ----
  verbas.intervaloIntrajornada = calcularIntervaloIntrajornada(dados, temporal);

  // ---- PARCELAS PERSONALIZADAS COM BASE EM HISTÓRICO SALARIAL ----
  // Parcelas do array dados.parcelasPersonalizadas que possuem baseHistoricoId
  verbas.parcelasHistorico = [];
  const parcelasComHistorico = (dados.parcelasPersonalizadas || []).filter((p) => p.baseHistoricoId);
  for (const parcela of parcelasComHistorico) {
    const { historico, parcelaId } = resolverBaseHistoricoId(historicosSalariais, parcela.baseHistoricoId);
    if (!historico) continue;
    const periodoInicio = parcela.periodoInicio || dados.dataAdmissao;
    const periodoFim = parcela.periodoFim || dados.dataDispensa;
    const percentual = parcela.percentualBase ? (parcela.percentualBase / 100) : 1;
    const { total, meses, memoria } = calcularTotalPorHistorico(historico, periodoInicio, periodoFim, percentual, parcelaId);
    verbas.parcelasHistorico.push({
      codigo: `hist_parcela_${parcela.id || parcela.nome}`,
      nome: parcela.nome,
      natureza: parcela.natureza || 'salarial',
      incideFgts: parcela.incideFgts || false,
      incideInss: parcela.incideInss || false,
      valor: total,
      excluida: false,
      memoria: {
        formula: `${parcela.nome} via histórico "${historico.titulo}": ${meses} meses × valores variáveis = R$ ${total.toFixed(2)}`,
        itens: memoria,
        percentualAplicado: percentual,
      },
    });
  }

  // ---- DANO MORAL (valor manual) ----
  verbas.danoMoral = { valor: dados.valorDanoMoral || 0, excluida: false };

  // ---- HONORÁRIOS (valor manual ou % do total) ----
  // Calculado após subtotal abaixo

  // ---- MONTA LISTA PLANA DE VERBAS ----
  const listaVerbas = montarListaVerbas(verbas, reflexos);

  // ---- MULTA ART. 467 (PÓS-PROCESSAMENTO: 50% das verbas selecionadas) ----
  const idx467 = listaVerbas.findIndex((v) => v.codigo === 'multa_art_467');
  if (dados.aplicarMulta467 && dados.multa467BaseVerbas?.length > 0 && idx467 >= 0) {
    const somaBase467 = listaVerbas
      .filter((v) => dados.multa467BaseVerbas.includes(v.codigo) && !v.excluida)
      .reduce((acc, v) => acc + v.valor, 0);
    const valor467 = round2(somaBase467 * 0.5);
    listaVerbas[idx467].valor = valor467;
    listaVerbas[idx467].excluida = false;
    listaVerbas[idx467].memoria = {
      formula: `Art. 467 CLT — 50% × R$ ${somaBase467.toFixed(2)} (verbas selecionadas) = R$ ${valor467.toFixed(2)}`,
      base: somaBase467,
      verbas: dados.multa467BaseVerbas,
    };
  } else if (idx467 >= 0) {
    listaVerbas[idx467].valor = 0;
    listaVerbas[idx467].excluida = !dados.aplicarMulta467;
    listaVerbas[idx467].memoria = { motivo: dados.aplicarMulta467 ? 'Nenhuma verba selecionada como base' : 'Multa art. 467 não aplicada neste cálculo' };
  }

  // ---- SUBTOTAL (soma das verbas sem deduções nem despesas processuais) ----
  const subtotal = round2(listaVerbas.reduce((acc, v) => acc + (v.excluida ? 0 : v.valor), 0));

  // ---- DEDUÇÕES ----
  const fgtsDepositado = dados.fgtsDepositado || 0;
  const valorPago = dados.valorPago || 0;
  const deducoesGlobaisTotal = (dados.deducoesGlobais || []).reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const feriasDeducaoPagas = dados.feriasDeducaoPagas || 0;
  // fgtsDepositado já deduzido internamente no cálculo da verba FGTS (fgts.js)
  const totalDeducoes = round2(valorPago + deducoesGlobaisTotal + feriasDeducaoPagas);

  // ---- TOTAL LÍQUIDO (subtotal - deduções) ----
  const total = nonNegative(round2(subtotal - totalDeducoes));

  // ---- HONORÁRIOS ADVOCATÍCIOS ----
  const pctHonorarios = dados.percentualHonorarios ?? 0.15;
  const honorarios = round2(total * pctHonorarios);

  // ---- HONORÁRIOS PERICIAIS ----
  const honorariosPericiais = dados.aplicarHonorariosPericiais ? (dados.honorariosPericiaisValor || 0) : 0;

  // ---- CUSTAS PROCESSUAIS (2% do total antes das despesas) ----
  const custas = dados.aplicarCustas ? round2(total * 0.02) : 0;

  // ---- TOTAL DEVIDO PELO RECLAMADO ----
  const totalComHonorarios = round2(total + honorarios + honorariosPericiais + custas);

  // ---- PERCENTUAL SALARIAL (para INSS acordo) ----
  const percentualSalarial = calcularPercentualSalarial(listaVerbas, subtotal);

  // ---- SIMULAÇÃO DE ACORDO ----
  const inssAcordo = await calcularINSS_Acordo(dados, total, percentualSalarial);

  // ---- JUROS DE MORA (SELIC desde o ajuizamento) ----
  const dataCalculo = new Date().toISOString().split('T')[0];
  const juros = await calcularJurosSelic(total, dados.dataAjuizamento, dataCalculo);

  // ---- ENCARGOS DO EMPREGADO (INSS + IR — informativo) ----
  const lapsoMeses = temporal.lapsoComAviso?.meses || temporal.lapsoSemAviso?.meses || 1;
  const encargosEmpregado = calcularEncargosEmpregado(listaVerbas, lapsoMeses);

  return {
    verbas: listaVerbas,
    verbas_raw: verbas,
    reflexos,
    subtotal,
    deducoes: { valorPago, deducoesGlobaisTotal, feriasDeducaoPagas, total: totalDeducoes },
    total,
    honorarios,
    honorariosPericiais,
    custas,
    totalComHonorarios,
    percentualSalarial,
    inssAcordo,
    juros,
    encargosEmpregado,
    temporal,
    auditoria: auditoria.toArray(),
    modalidade,
  };
}

/**
 * Monta lista plana de verbas com metadados para exibição
 */
function montarListaVerbas(verbas, reflexos) {
  const lista = [];
  let ordem = 0;

  function add(codigo, nome, categoria, natureza, incideFgts, incideInss, result) {
    lista.push({
      codigo,
      nome,
      categoria,
      natureza,
      incideFgts,
      incideInss,
      valor: result?.valor || 0,
      excluida: result?.excluida || false,
      memoria: result?.memoria || {},
      ordemExibicao: ordem++,
    });
  }

  add('saldo_salarial', 'Saldo Salarial', 'rescisoria', 'salarial', true, true, verbas.saldoSalarial);
  add('salarios_atrasados', 'Salários Atrasados', 'salarial', 'salarial', true, true, verbas.salariosAtrasados);
  add('comissoes_atrasadas', 'Comissões Atrasadas', 'salarial', 'salarial', true, true, verbas.comissoesAtrasadas);
  add('gorjetas_atrasadas', 'Gorjetas Atrasadas', 'salarial', 'salarial', false, false, verbas.gorjetasAtrasadas);
  add('aviso_previo', 'Aviso Prévio Indenizado', 'rescisoria', 'salarial', true, true, verbas.avisoPrevio);
  add('ferias_dobradas', 'Férias Vencidas Dobradas + 1/3', 'rescisoria', 'salarial', false, false, verbas.feriasDobradas);
  add('ferias_integrais', 'Férias Integrais + 1/3', 'rescisoria', 'salarial', false, false, verbas.feriasIntegrais);
  add('ferias_proporcionais', 'Férias Proporcionais + 1/3', 'rescisoria', 'salarial', false, false, verbas.feriasProporcionais);
  add('decimo_terceiro_integral', '13º Salário Integral', 'rescisoria', 'salarial', true, true, verbas.decimoTerceiroIntegral);
  add('decimo_terceiro_proporcional', '13º Salário Proporcional', 'rescisoria', 'salarial', true, true, verbas.decimoTerceiroProporcional);
  add('fgts_imprescrito', 'FGTS (Período Imprescrito)', 'fgts', 'indenizatoria', false, false, verbas.fgts);
  add('multa_fgts', `Multa FGTS ${verbas.multaFgts?.percentual ? (verbas.multaFgts.percentual * 100).toFixed(0) : 0}%`, 'fgts', 'indenizatoria', false, false, verbas.multaFgts);
  add('multa_art_467', 'Multa Art. 467 CLT', 'indenizatoria', 'indenizatoria', false, false, verbas.multaArt467);
  add('multa_art_477', 'Multa Art. 477 CLT', 'indenizatoria', 'indenizatoria', false, false, verbas.multaArt477);
  add('horas_extras', 'Horas Extras', 'salarial', 'salarial', true, true, verbas.horasExtras);
  add('reflexo_he_rsr', 'Reflexo HE no RSR', 'salarial', 'salarial', true, true, reflexos.horasExtras?.rsr);
  add('reflexo_he_aviso', 'Reflexo HE no Aviso Prévio', 'salarial', 'salarial', true, true, reflexos.horasExtras?.avisoPrevio);
  add('reflexo_he_ferias', 'Reflexo HE nas Férias', 'salarial', 'salarial', true, true, reflexos.horasExtras?.ferias);
  add('reflexo_he_13', 'Reflexo HE no 13º', 'salarial', 'salarial', true, true, reflexos.horasExtras?.decimoTerceiro);
  add('reflexo_he_fgts', 'Reflexo HE no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.horasExtras?.fgts);
  add('reflexo_he_mul_fgts', 'Reflexo HE na Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.horasExtras?.mulFgts);
  add('intervalo_intrajornada', 'Intervalo Intrajornada', 'salarial', 'salarial', true, true, verbas.intervaloIntrajornada);
  add('adicional_noturno', 'Adicional Noturno', 'salarial', 'salarial', true, true, verbas.adicionalNoturno);
  add('reflexo_an_rsr', 'Reflexo AN no RSR', 'salarial', 'salarial', true, true, reflexos.adicionalNoturno?.rsr);
  add('reflexo_an_aviso', 'Reflexo AN no Aviso', 'salarial', 'salarial', true, true, reflexos.adicionalNoturno?.avisoPrevio);
  add('reflexo_an_ferias', 'Reflexo AN nas Férias', 'salarial', 'salarial', true, true, reflexos.adicionalNoturno?.ferias);
  add('reflexo_an_13', 'Reflexo AN no 13º', 'salarial', 'salarial', true, true, reflexos.adicionalNoturno?.decimoTerceiro);
  add('reflexo_an_fgts', 'Reflexo AN no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.adicionalNoturno?.fgts);
  add('reflexo_an_mul_fgts', 'Reflexo AN na Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.adicionalNoturno?.mulFgts);
  add('insalubridade', 'Adicional de Insalubridade', 'salarial', 'salarial', true, true, verbas.insalubridade);
  add('reflexo_ins_aviso', 'Reflexo Insalub. Aviso', 'salarial', 'salarial', true, true, reflexos.insalubridade?.avisoPrevio);
  add('reflexo_ins_ferias', 'Reflexo Insalub. Férias', 'salarial', 'salarial', true, true, reflexos.insalubridade?.ferias);
  add('reflexo_ins_13', 'Reflexo Insalub. 13º', 'salarial', 'salarial', true, true, reflexos.insalubridade?.decimoTerceiro);
  add('reflexo_ins_fgts', 'Reflexo Insalub. FGTS', 'fgts', 'indenizatoria', false, false, reflexos.insalubridade?.fgts);
  add('reflexo_ins_mul_fgts', 'Reflexo Insalub. Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.insalubridade?.mulFgts);
  add('periculosidade', 'Adicional de Periculosidade', 'salarial', 'salarial', true, true, verbas.periculosidade);
  add('reflexo_per_aviso', 'Reflexo Peric. Aviso', 'salarial', 'salarial', true, true, reflexos.periculosidade?.avisoPrevio);
  add('reflexo_per_ferias', 'Reflexo Peric. Férias', 'salarial', 'salarial', true, true, reflexos.periculosidade?.ferias);
  add('reflexo_per_13', 'Reflexo Peric. 13º', 'salarial', 'salarial', true, true, reflexos.periculosidade?.decimoTerceiro);
  add('reflexo_per_fgts', 'Reflexo Peric. FGTS', 'fgts', 'indenizatoria', false, false, reflexos.periculosidade?.fgts);
  add('reflexo_per_mul_fgts', 'Reflexo Peric. Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.periculosidade?.mulFgts);
  add('dano_moral', 'Indenização por Danos Morais', 'indenizatoria', 'indenizatoria', false, false, verbas.danoMoral);

  // Parcelas calculadas a partir de históricos salariais
  for (const ph of (verbas.parcelasHistorico || [])) {
    lista.push({
      codigo: ph.codigo,
      nome: ph.nome,
      categoria: ph.natureza,
      natureza: ph.natureza,
      incideFgts: ph.incideFgts,
      incideInss: ph.incideInss,
      valor: ph.valor,
      excluida: false,
      memoria: ph.memoria,
      ordemExibicao: ordem++,
    });
  }

  return lista;
}

/**
 * Calcula percentual das parcelas salariais sobre o total (para INSS acordo)
 */
function calcularPercentualSalarial(listaVerbas, subtotal) {
  if (!subtotal || subtotal === 0) return 0;
  const totalSalarial = listaVerbas
    .filter(v => v.natureza === 'salarial' && !v.excluida)
    .reduce((acc, v) => acc + v.valor, 0);
  return round2(totalSalarial / subtotal);
}

module.exports = { calcular };

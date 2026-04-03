'use strict';

const { calcularTemporais, format, toDate } = require('../../utils/datas');
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
const { calcularIntervaloInterjornada } = require('./verbas/intervaloInterjornada');
const { calcularRSRNaoConcedido, calcularFeriadosLaborados, calcularReflexosRSRFeriados } = require('./verbas/rsrFeriados');
const { calcularIntervaloTermico, calcularReflexosIntervaloTermico } = require('./verbas/intervaloTermico');
const { calcularIntervaloDigitacao, calcularReflexosIntervaloDigitacao } = require('./verbas/intervaloDigitacao');
const { gerarDiasCartao } = require('./verbas/cartaoPontoVirtual');
const { calcularINSS, calcularINSS_Acordo, calcularEncargosEmpregado } = require('./verbas/inss');
const { calcularJurosADC58 } = require('./verbas/jurosCorrecao');
const { calcularTotalPorHistorico, resolverBaseHistoricoId } = require('../../utils/historicoSalarial');
const { calcularParcelaGenerica, calcularReflexosParcela } = require('./verbas/parcelasGenericas');
const { aplicarCascataOJ394 } = require('./reflexosCascata');
const { DATA_OJ394, INSS_TABELA_2025, INSS_CONTRIBUICAO_MAXIMA_2025, IR_TABELA_2025 } = require('../../config/constants');
const db = require('../../config/database');

/**
 * Motor Central de Cálculo Trabalhista
 * @param {Object} dados - Dados completos do contrato
 * @param {string} modalidade - Modalidade de rescisão
 * @returns {Object} resultado completo com verbas, totais e auditoria
 */
async function calcular(dados, modalidade) {
  const auditoria = new Auditoria();
  const temporal = calcularTemporais(dados, modalidade);
  const verbas = {};
  const reflexos = {};

  const apenasParc = dados.tipoFluxo === 'apenas_parcelas';
  const historicosSalariais = dados.historicosSalariais || [];

  if (!apenasParc) {
  // ---- SALDO SALARIAL ----
  verbas.saldoSalarial = calcularSaldoSalarial(dados, temporal);

  // ---- SALÁRIOS E COMISSÕES ATRASADOS ----

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

  } // fim if (!apenasParc)

  // ---- CARTÃO DE PONTO VIRTUAL (gerado uma vez, compartilhado por todos os módulos de jornada) ----
  const diasCartao = gerarDiasCartao(dados);

  // ---- ADICIONAL NOTURNO (calculado ANTES das HE para OJ 97 SDI-1 TST) ----
  verbas.adicionalNoturno = calcularAdicionalNoturno(dados, temporal);
  reflexos.adicionalNoturno = calcularReflexosAN(verbas.adicionalNoturno, dados, temporal, modalidade);

  // ---- HORAS EXTRAS (todos os fluxos — retorna 0 se sem dados de jornada) ----
  // OJ 97 SDI-1 TST: quando ativo, AN compõe a base de cálculo das HE
  // Injeta os valores resolvidos de HN/AHN no dados para que HE os use na fórmula
  const dadosParaHE = (dados.adicionalNoturnoOJ97 && verbas.adicionalNoturno.memoriaInputs)
    ? {
        ...dados,
        qtdeHorasNoturnasMensais: verbas.adicionalNoturno.memoriaInputs.HN,
        adicionalHoraNoturna: verbas.adicionalNoturno.memoriaInputs.AHN,
      }
    : dados;
  verbas.horasExtras = calcularHorasExtras(dadosParaHE, temporal);
  reflexos.horasExtras = calcularReflexosHE(verbas.horasExtras, dadosParaHE, temporal, modalidade);

  // ---- INSALUBRIDADE (todos os fluxos) ----
  verbas.insalubridade = await calcularInsalubridade(dados, temporal);
  reflexos.insalubridade = calcularReflexosInsalubridade(verbas.insalubridade, dados, temporal, modalidade);

  // ---- PERICULOSIDADE (todos os fluxos) ----
  verbas.periculosidade = calcularPericulosidade(dados, temporal);
  reflexos.periculosidade = calcularReflexosPericulosidade(verbas.periculosidade, dados, temporal, modalidade);

  // ---- INTERVALO INTRAJORNADA (todos os fluxos) ----
  verbas.intervaloIntrajornada = calcularIntervaloIntrajornada(dados, temporal, diasCartao);

  // ---- INTERVALO INTERJORNADA (quando habilitado — requer cartão de ponto) ----
  verbas.intervaloInterjornada = calcularIntervaloInterjornada(dados, temporal, diasCartao);

  // ---- RSR NÃO CONCEDIDO (quando habilitado — requer cartão de ponto) ----
  verbas.rsrNaoConcedido = calcularRSRNaoConcedido(dados, temporal, diasCartao);
  reflexos.rsrNaoConcedido = calcularReflexosRSRFeriados(verbas.rsrNaoConcedido, dados, temporal, modalidade);

  // ---- FERIADOS LABORADOS (quando habilitado — requer cartão de ponto) ----
  verbas.feriadosLaborados = calcularFeriadosLaborados(dados, temporal, diasCartao);
  reflexos.feriadosLaborados = calcularReflexosRSRFeriados(verbas.feriadosLaborados, dados, temporal, modalidade);

  // ---- INTERVALO TÉRMICO (quando habilitado) ----
  verbas.intervaloTermico = calcularIntervaloTermico(dados, temporal);
  reflexos.intervaloTermico = calcularReflexosIntervaloTermico(verbas.intervaloTermico, dados, temporal, modalidade);

  // ---- INTERVALO POR DIGITAÇÃO (quando habilitado) ----
  verbas.intervaloDigitacao = calcularIntervaloDigitacao(dados, temporal);
  reflexos.intervaloDigitacao = calcularReflexosIntervaloDigitacao(verbas.intervaloDigitacao, dados, temporal, modalidade);

  // ---- PARCELAS PERSONALIZADAS COM BASE EM HISTÓRICO SALARIAL ----
  // Parcelas do array dados.parcelasPersonalizadas que possuem baseHistoricoId.
  // historicoIdCalculo: override por cálculo (quando há múltiplos históricos e o usuário escolhe outro).
  const errosParcelas = [];
  verbas.parcelasHistorico = [];
  const parcelasComHistorico = (dados.parcelasPersonalizadas || []).filter((p) => {
    const effectiveId = p.historicoIdCalculo || p.baseHistoricoId;
    return !!effectiveId;
  });
  for (const parcela of parcelasComHistorico) {
    const effectiveHistId = parcela.historicoIdCalculo || parcela.baseHistoricoId;
    const { historico, parcelaId, usouSentinelReclamante } = resolverBaseHistoricoId(historicosSalariais, effectiveHistId);
    if (!historico) {
      if (usouSentinelReclamante) {
        errosParcelas.push({
          parcelaId: parcela.id || null,
          parcelaNome: parcela.nome,
          erro: `A parcela "${parcela.nome}" requer o histórico salarial do reclamante, mas nenhum histórico foi cadastrado neste cálculo. Cadastre o histórico na etapa anterior e recalcule.`,
          tipo: 'historico_reclamante_ausente',
        });
      }
      continue;
    }
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
        distribuicaoMensal: memoria.map((m) => ({
          mes: m.competencia,
          valorBase: m.valor,
          valor: m.valorComPercentual,
        })),
      },
    });
  }

  // ---- PARCELAS GENÉRICAS (fixo / percentual_salario / percentual_sm / horaria custom) ----
  // Parcelas que não usam histórico salarial nem têm calculadora dedicada
  const TEMPLATES_DEDICADOS = new Set([
    'tpl_horas_extras', 'tpl_noturno', 'tpl_feriados', // cálculo via jornada (calcularHorasExtras)
    'tpl_insalubridade',                                // calcularInsalubridade
    'tpl_periculosidade',                               // calcularPericulosidade
    'tpl_intervalo',                                    // calcularIntervaloIntrajornada
  ]);

  // Buscar histórico completo do SM (necessário para parcelas percentual_sm com cálculo mês a mês)
  let smHistorico = [];
  const hasSmParcela = (dados.parcelasPersonalizadas || []).some(
    (p) => p.tipoValor === 'percentual_sm' && !p.baseHistoricoId && !TEMPLATES_DEDICADOS.has(p.templateId)
  );
  if (hasSmParcela) {
    const smRows = await db.query(
      `SELECT TO_CHAR(mes_ano, 'YYYY-MM') AS mes_ano, valor
       FROM salario_minimo_historico
       ORDER BY mes_ano ASC`
    );
    smHistorico = smRows.rows.map((r) => ({
      mesAno: r.mes_ano,
      valor: parseFloat(r.valor),
    }));
  }

  verbas.parcelasCustom = [];
  const parcelasGenericas = (dados.parcelasPersonalizadas || []).filter(
    (p) =>
      !p.baseHistoricoId &&
      p.tipoValor !== 'percentual_historico' &&
      !TEMPLATES_DEDICADOS.has(p.templateId)
  );

  for (let idx = 0; idx < parcelasGenericas.length; idx++) {
    const parcela = parcelasGenericas[idx];
    const { valorMensal, total, nMeses, formulaFreq, distribuicaoMensal } =
      calcularParcelaGenerica(parcela, dados, temporal, smHistorico);

    if (total === 0 && parcela.frequencia !== 'unica') continue;

    const reflexos = calcularReflexosParcela(total, nMeses, parcela, dados, temporal, modalidade);

    const codBase = parcela.nome.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    verbas.parcelasCustom.push({
      codigo: `parcela_${codBase}_${idx}`,
      nome: parcela.nome,
      natureza: parcela.natureza || 'salarial',
      incideFgts: parcela.incideFgts || false,
      incideInss: parcela.incideInss || false,
      valor: total,
      excluida: false,
      reflexos,
      memoria: {
        formula: `${parcela.nome}: R$ ${valorMensal.toFixed(2)} ${formulaFreq} = R$ ${total.toFixed(2)}`,
        valorMensal,
        nMeses,
        frequencia: parcela.frequencia,
        tipoValor: parcela.tipoValor,
        ...(distribuicaoMensal && distribuicaoMensal.length > 0 ? { distribuicaoMensal } : {}),
      },
    });
  }

  // ---- DANO MORAL (valor manual) ----
  verbas.danoMoral = { valor: dados.valorDanoMoral || 0, excluida: false };

  // ---- OJ 394 SDI-1 TST: REFLEXOS EM CASCATA (pós 20/03/2023) ----
  // Para fatos geradores a partir de 20/03/2023, RSR majorado por HE
  // integra base de férias, 13º, aviso prévio e FGTS (IRR-10169-57.2013.5.05.0024)
  const dataRef = temporal.dataDispensa || new Date(dados.dataDispensa);
  if (dataRef >= DATA_OJ394) {
    aplicarCascataOJ394(verbas, reflexos, temporal, dados, modalidade);
  }

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

  // ---- JUROS DE MORA ADC 58 STF + Lei 14.905/2024 ----
  const dataEncerramentoStr = temporal.dataEncerramentoComAviso
    ? format(toDate(temporal.dataEncerramentoComAviso), 'yyyy-MM-dd')
    : dados.dataDispensa;
  const juros = await calcularJurosADC58(totalComHonorarios, dataEncerramentoStr, dados.dataAjuizamento);

  // ---- ENCARGOS DO EMPREGADO + PATRONAL (INSS + IR — informativo) ----
  const lapsoMeses = temporal.lapsoComAviso?.meses || temporal.lapsoSemAviso?.meses || 1;
  const encargosEmpregado = await calcularEncargosEmpregado(listaVerbas, lapsoMeses, percentualSalarial);

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
    // Erros de parcelas (ex: histórico do reclamante ausente)
    errosParcelas: errosParcelas.length > 0 ? errosParcelas : undefined,
    // Tabelas INSS/IR para recálculo dinâmico no frontend
    tabelasEncargos: {
      inss: { faixas: INSS_TABELA_2025, contribuicaoMaxima: INSS_CONTRIBUICAO_MAXIMA_2025 },
      ir: IR_TABELA_2025,
    },
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
  add('intervalo_intrajornada', 'Intervalo Intrajornada', 'indenizatoria', 'indenizatoria', false, false, verbas.intervaloIntrajornada);
  add('intervalo_interjornada', 'Intervalo Interjornada', 'indenizatoria', 'indenizatoria', false, false, verbas.intervaloInterjornada);
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
  add('rsr_nao_concedido', 'RSR Não Concedido', 'salarial', 'salarial', true, true, verbas.rsrNaoConcedido);
  add('reflexo_rsr_ferias', 'Reflexo RSR nas Férias', 'salarial', 'salarial', true, true, reflexos.rsrNaoConcedido?.ferias);
  add('reflexo_rsr_13', 'Reflexo RSR no 13º', 'salarial', 'salarial', true, true, reflexos.rsrNaoConcedido?.decimoTerceiro);
  add('reflexo_rsr_aviso', 'Reflexo RSR no Aviso', 'salarial', 'salarial', true, true, reflexos.rsrNaoConcedido?.avisoPrevio);
  add('reflexo_rsr_fgts', 'Reflexo RSR no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.rsrNaoConcedido?.fgts);
  add('reflexo_rsr_mul_fgts', 'Reflexo RSR na Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.rsrNaoConcedido?.mulFgts);
  add('feriados_laborados', 'Feriados Laborados', 'salarial', 'salarial', true, true, verbas.feriadosLaborados);
  add('reflexo_fer_ferias', 'Reflexo Feriados nas Férias', 'salarial', 'salarial', true, true, reflexos.feriadosLaborados?.ferias);
  add('reflexo_fer_13', 'Reflexo Feriados no 13º', 'salarial', 'salarial', true, true, reflexos.feriadosLaborados?.decimoTerceiro);
  add('reflexo_fer_aviso', 'Reflexo Feriados no Aviso', 'salarial', 'salarial', true, true, reflexos.feriadosLaborados?.avisoPrevio);
  add('reflexo_fer_fgts', 'Reflexo Feriados no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.feriadosLaborados?.fgts);
  add('reflexo_fer_mul_fgts', 'Reflexo Feriados na Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.feriadosLaborados?.mulFgts);
  add('intervalo_termico', 'Intervalo Térmico', 'salarial', 'salarial', true, true, verbas.intervaloTermico);
  add('reflexo_it_rsr', 'Reflexo Interv. Térmico no RSR', 'salarial', 'salarial', true, true, reflexos.intervaloTermico?.rsr);
  add('reflexo_it_ferias', 'Reflexo Interv. Térmico nas Férias', 'salarial', 'salarial', true, true, reflexos.intervaloTermico?.ferias);
  add('reflexo_it_13', 'Reflexo Interv. Térmico no 13º', 'salarial', 'salarial', true, true, reflexos.intervaloTermico?.decimoTerceiro);
  add('reflexo_it_aviso', 'Reflexo Interv. Térmico no Aviso', 'salarial', 'salarial', true, true, reflexos.intervaloTermico?.avisoPrevio);
  add('reflexo_it_fgts', 'Reflexo Interv. Térmico no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.intervaloTermico?.fgts);
  add('reflexo_it_mul_fgts', 'Reflexo Interv. Térmico Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.intervaloTermico?.mulFgts);
  add('intervalo_digitacao', 'Intervalo por Digitação', 'salarial', 'salarial', true, true, verbas.intervaloDigitacao);
  add('reflexo_id_rsr', 'Reflexo Interv. Digitação no RSR', 'salarial', 'salarial', true, true, reflexos.intervaloDigitacao?.rsr);
  add('reflexo_id_ferias', 'Reflexo Interv. Digitação nas Férias', 'salarial', 'salarial', true, true, reflexos.intervaloDigitacao?.ferias);
  add('reflexo_id_13', 'Reflexo Interv. Digitação no 13º', 'salarial', 'salarial', true, true, reflexos.intervaloDigitacao?.decimoTerceiro);
  add('reflexo_id_aviso', 'Reflexo Interv. Digitação no Aviso', 'salarial', 'salarial', true, true, reflexos.intervaloDigitacao?.avisoPrevio);
  add('reflexo_id_fgts', 'Reflexo Interv. Digitação no FGTS', 'fgts', 'indenizatoria', false, false, reflexos.intervaloDigitacao?.fgts);
  add('reflexo_id_mul_fgts', 'Reflexo Interv. Digitação Multa FGTS', 'fgts', 'indenizatoria', false, false, reflexos.intervaloDigitacao?.mulFgts);

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

  // Parcelas genéricas (fixo / percentual_salario / percentual_sm) + seus reflexos
  for (const pc of (verbas.parcelasCustom || [])) {
    lista.push({
      codigo: pc.codigo,
      nome: pc.nome,
      categoria: pc.natureza,
      natureza: pc.natureza,
      incideFgts: pc.incideFgts,
      incideInss: pc.incideInss,
      valor: pc.valor,
      excluida: pc.excluida,
      memoria: pc.memoria,
      ordemExibicao: ordem++,
    });
    const r = pc.reflexos || {};
    if (r.rsr?.valor) {
      lista.push({ codigo: `${pc.codigo}_rsr`, nome: `Reflexo ${pc.nome} no RSR`, categoria: 'salarial', natureza: 'salarial', incideFgts: true, incideInss: true, valor: r.rsr.valor, excluida: false, memoria: r.rsr.memoria || {}, ordemExibicao: ordem++ });
    }
    if (r.avisoPrevio?.valor) {
      lista.push({ codigo: `${pc.codigo}_ap`, nome: `Reflexo ${pc.nome} no Aviso Prévio`, categoria: 'salarial', natureza: 'salarial', incideFgts: true, incideInss: true, valor: r.avisoPrevio.valor, excluida: false, memoria: r.avisoPrevio.memoria || {}, ordemExibicao: ordem++ });
    }
    if (r.ferias?.valor) {
      lista.push({ codigo: `${pc.codigo}_fer`, nome: `Reflexo ${pc.nome} nas Férias`, categoria: 'salarial', natureza: 'salarial', incideFgts: false, incideInss: false, valor: r.ferias.valor, excluida: false, memoria: r.ferias.memoria || {}, ordemExibicao: ordem++ });
    }
    if (r.decimoTerceiro?.valor) {
      lista.push({ codigo: `${pc.codigo}_13`, nome: `Reflexo ${pc.nome} no 13º`, categoria: 'salarial', natureza: 'salarial', incideFgts: true, incideInss: true, valor: r.decimoTerceiro.valor, excluida: false, memoria: r.decimoTerceiro.memoria || {}, ordemExibicao: ordem++ });
    }
    if (r.fgts?.valor) {
      lista.push({ codigo: `${pc.codigo}_fgts`, nome: `Reflexo ${pc.nome} no FGTS`, categoria: 'fgts', natureza: 'indenizatoria', incideFgts: false, incideInss: false, valor: r.fgts.valor, excluida: false, memoria: r.fgts.memoria || {}, ordemExibicao: ordem++ });
    }
    if (r.mulFgts?.valor) {
      lista.push({ codigo: `${pc.codigo}_mfgts`, nome: `Reflexo ${pc.nome} na Multa FGTS`, categoria: 'fgts', natureza: 'indenizatoria', incideFgts: false, incideInss: false, valor: r.mulFgts.valor, excluida: false, memoria: r.mulFgts.memoria || {}, ordemExibicao: ordem++ });
    }
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

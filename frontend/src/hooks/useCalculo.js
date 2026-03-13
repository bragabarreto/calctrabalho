import { useMutation } from '@tanstack/react-query';

// Filtra e converte tipos do store para o formato esperado pelo backend (schemaDadosContrato)
export function prepararDadosContrato(dados) {
  const toNum = (v, def = null) =>
    v === '' || v === null || v === undefined ? def : Number(v);
  const toDate = (v) => (v === '' || v === null || v === undefined ? null : v);

  return {
    // Datas
    dataAdmissao: dados.dataAdmissao,
    dataDispensa: dados.dataDispensa,
    dataAjuizamento: dados.dataAjuizamento,
    dataPgtoRescisorio: toDate(dados.dataPgtoRescisorio),
    avisoPrevioTrabalhado: Boolean(dados.avisoPrevioTrabalhado),

    // Remuneração
    ultimoSalario: toNum(dados.ultimoSalario),
    mediaSalarial: toNum(dados.mediaSalarial),
    comissoes: toNum(dados.comissoes, 0),
    gorjetas: toNum(dados.gorjetas, 0),
    salariosMesesAtrasados: toNum(dados.salariosMesesAtrasados, 0),
    comissoesMesesAtrasados: toNum(dados.comissoesMesesAtrasados, 0),
    gorjetasMesesAtrasados: toNum(dados.gorjetasMesesAtrasados, 0),

    // Férias e 13º
    qtdeFeriasVencidasDobradas: toNum(dados.qtdeFeriasVencidasDobradas, 0),
    qtdeFeriasVencidasSimples: toNum(dados.qtdeFeriasVencidasSimples, 0),
    qtdeDecimoTerceiroVencidos: toNum(dados.qtdeDecimoTerceiroVencidos, 0),

    // Jornada
    divisorJornada: toNum(dados.divisorJornada, 220),
    adicionalHoraExtra: toNum(dados.adicionalHoraExtra, 0.5),
    qtdeHorasExtrasMensais: toNum(dados.qtdeHorasExtrasMensais, 0),
    intervaloIntrajornadaMensalHoras: toNum(dados.intervaloIntrajornadaMensalHoras, 0),
    adicionalHoraNoturna: toNum(dados.adicionalHoraNoturna, 0.2),
    qtdeHorasNoturnasMensais: toNum(dados.qtdeHorasNoturnasMensais, 0),

    // Adicionais
    adicionalInsalubridadePercentual: toNum(dados.adicionalInsalubridadePercentual, 0),
    dataInicioInsalubridade: toDate(dados.dataInicioInsalubridade),
    dataFimInsalubridade: toDate(dados.dataFimInsalubridade),
    adicionalPericulosidadePercentual: toNum(dados.adicionalPericulosidadePercentual, 0),
    dataInicioPericulosidade: toDate(dados.dataInicioPericulosidade),
    dataFimPericulosidade: toDate(dados.dataFimPericulosidade),

    // Parcelas genéricas
    parcelaGenericaSalarialMensal: toNum(dados.parcelaGenericaSalarialMensal, 0),
    parcelaGenericaSalarialDiaria6d: toNum(dados.parcelaGenericaSalarialDiaria6d, 0),
    parcelaGenericaSalarialDiaria5d: toNum(dados.parcelaGenericaSalarialDiaria5d, 0),
    parcelaGenericaIndenizatoriaMensal: toNum(dados.parcelaGenericaIndenizatoriaMensal, 0),
    parcelaGenericaIndenizatoriaDiaria6d: toNum(dados.parcelaGenericaIndenizatoriaDiaria6d, 0),
    parcelaGenericaIndenizatoriaDiaria5d: toNum(dados.parcelaGenericaIndenizatoriaDiaria5d, 0),
    parcelaGenericaIndenizatoriaUnica: toNum(dados.parcelaGenericaIndenizatoriaUnica, 0),
    valorDanoMoral: toNum(dados.valorDanoMoral, 0),

    // Deduções
    fgtsDepositado: toNum(dados.fgtsDepositado, 0),
    valorPago: toNum(dados.valorPago, 0),
    percentualHonorarios: toNum(dados.percentualHonorarios, 0.15),

    // Afastamentos
    mesesAfastamento: toNum(dados.mesesAfastamento, 0),
    diasAfastamento: toNum(dados.diasAfastamento, 0),

    // Verbas excluídas
    verbasExcluidas: dados.verbasExcluidas || [],

    // Acordo
    valorAcordo: toNum(dados.valorAcordo),
    tipoAcordo: dados.tipoAcordo || null,
    tipoDevedor: dados.tipoDevedor || null,
    valorLiquidoExequente: toNum(dados.valorLiquidoExequente),
    contribuicaoSocialLiquidacao: toNum(dados.contribuicaoSocialLiquidacao),

    // Parcelas personalizadas
    parcelasPersonalizadas: dados.parcelasPersonalizadas || [],

    // Deduções detalhadas
    deducoesGlobais: dados.deducoesGlobais || [],
    deducoesPorVerba: dados.deducoesPorVerba || [],

    // Multa Art. 467 CLT
    aplicarMulta467: dados.aplicarMulta467 || false,
    multa467BaseVerbas: dados.multa467BaseVerbas || [],

    // Períodos de férias e 13o (arrays com status definido pelo usuário)
    periodosFerias: dados.periodosFerias || [],
    periodosDecimoTerceiro: dados.periodosDecimoTerceiro || [],

    // Honorários e despesas processuais
    percentualHonorarios: toNum(dados.percentualHonorarios, 0.15),
    aplicarHonorariosPericiais: Boolean(dados.aplicarHonorariosPericiais),
    honorariosPericiaisValor: toNum(dados.honorariosPericiaisValor, 0),
    aplicarCustas: Boolean(dados.aplicarCustas),

    // Históricos salariais (estrutura em dois níveis: history → parcelas → faixas)
    historicosSalariais: (dados.historicosSalariais || []).map((h) => ({
      id: h.id,
      titulo: h.titulo,
      fixo: Boolean(h.fixo),
      parcelas: (h.parcelas || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        faixas: (p.faixas || []).map((faixa) => ({
          inicio: faixa.inicio,
          fim: faixa.fim || null,
          valor: Number(faixa.valor) || 0,
        })),
      })),
    })),
  };
}

async function simular(dadosBrutos, modalidade) {
  const resp = await fetch('/api/calculos/simular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dados: prepararDadosContrato(dadosBrutos), modalidade }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
  return json.resultado;
}

async function salvarSimulacao(payload) {
  const resp = await fetch('/api/simulacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      dados: prepararDadosContrato(payload.dados),
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao salvar');
  return json;
}

async function simularMultiplo(dadosBrutos) {
  const resp = await fetch('/api/calculos/simular-multiplo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dados: prepararDadosContrato(dadosBrutos) }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
  return json.resultados;
}

async function buscarPeriodosAquisitivos({ dataAdmissao, dataDispensa, avisoPrevioTrabalhado }) {
  const resp = await fetch('/api/calculos/periodos-aquisitivos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataAdmissao, dataDispensa, avisoPrevioTrabalhado }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao buscar períodos');
  return json;
}

export function useSimular() {
  return useMutation({ mutationFn: ({ dados, modalidade }) => simular(dados, modalidade) });
}

export function useSimularMultiplo() {
  return useMutation({ mutationFn: ({ dados }) => simularMultiplo(dados) });
}

export function usePeriodosAquisitivos() {
  return useMutation({ mutationFn: buscarPeriodosAquisitivos });
}

export function useSalvarSimulacao() {
  return useMutation({ mutationFn: salvarSimulacao });
}

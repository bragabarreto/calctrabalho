import { create } from 'zustand';

const dadosIniciais = {
  // Contrato
  dataAdmissao: '',
  dataDispensa: '',
  dataAjuizamento: '',
  dataPgtoRescisorio: '',
  avisoPrevioTrabalhado: false,
  modalidade: 'sem_justa_causa', // usado apenas em fluxo de modalidade única

  // Remuneração
  ultimoSalario: '',
  mediaSalarial: '',
  comissoes: '',
  gorjetas: '',
  salariosMesesAtrasados: 0,
  comissoesMesesAtrasados: 0,

  // Jornada
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  qtdeHorasExtrasMensais: 0,
  intervaloIntrajornadaMensalHoras: 0,
  adicionalHoraNoturna: 0.2,
  qtdeHorasNoturnasMensais: 0,

  // Adicionais
  adicionalInsalubridadePercentual: 0,
  dataInicioInsalubridade: '',
  dataFimInsalubridade: '',
  adicionalPericulosidadePercentual: 0,
  dataInicioPericulosidade: '',
  dataFimPericulosidade: '',

  // Dano moral (mantido como campo direto)
  valorDanoMoral: 0,

  // Deduções básicas
  fgtsDepositado: 0,
  valorPago: 0,

  // Honorários e despesas processuais (etapa "Multas e Despesas")
  percentualHonorarios: 0.15,
  aplicarHonorariosPericiais: false,
  honorariosPericiaisValor: 0,
  aplicarCustas: false, // 2% sobre o total da condenação
  multasProcessuaisValor: 0,
  multasProcessuaisBase: 'condenacao', // 'condenacao' | 'causa'
  multasProcessuaisPercentual: 0,
  valorCausa: 0,

  // Afastamentos
  mesesAfastamento: 0,
  diasAfastamento: 0,

  // Acordo
  valorAcordo: 0,
  tipoAcordo: '',
  tipoDevedor: 'outros',

  // Metadados
  nomeSimulacao: '',
  numeroProcesso: '',
  varaNome: '',
  observacoes: '',

  // Histórico salarial (múltiplos históricos com múltiplas rubricas)
  historicosSalariais: [], // [{ id, titulo, tipo: 'reclamante'|'paradigma', entradas: [{ competencia, rubrica, valor }] }]

  // Verbas excluídas
  verbasExcluidas: [],

  // Parcelas personalizadas (lista de objetos com parâmetros completos)
  parcelasPersonalizadas: [],

  // Deduções detalhadas (globais e por verba específica)
  deducoesGlobais: [],
  deducoesPorVerba: [],

  // Multa Art. 467 CLT
  aplicarMulta467: false,
  multa467BaseVerbas: [], // codigos das verbas selecionadas como base

  // Férias detalhadas (substituem qtdeFeriasVencidasDobradas/Simples)
  periodosFerias: [], // gerado automaticamente + status definido pelo usuário

  // 13o detalhado (substitui qtdeDecimoTerceiroVencidos)
  periodosDecimoTerceiro: [], // gerado automaticamente + status definido pelo usuário

  // Campos legados (mantidos para compatibilidade com simulações salvas)
  qtdeFeriasVencidasDobradas: 0,
  qtdeFeriasVencidasSimples: 0,
  qtdeDecimoTerceiroVencidos: 0,

  // Parcelas genéricas (legado — mantidas para compatibilidade)
  parcelaGenericaSalarialMensal: 0,
  parcelaGenericaSalarialDiaria6d: 0,
  parcelaGenericaSalarialDiaria5d: 0,
  parcelaGenericaIndenizatoriaMensal: 0,
  parcelaGenericaIndenizatoriaDiaria6d: 0,
  parcelaGenericaIndenizatoriaDiaria5d: 0,
  parcelaGenericaIndenizatoriaUnica: 0,
};

export const useCalculoStore = create((set, get) => ({
  step: 1,
  tipoFluxo: 'verbas_rescisórias', // 'verbas_rescisórias' | 'verbas_e_parcelas' | 'apenas_parcelas'
  dados: { ...dadosIniciais },
  resultado: null,       // resultado único (apenas_parcelas ou modalidade específica)
  resultadosTriplos: null, // { sem_justa_causa, pedido_demissao, culpa_reciproca }
  carregando: false,
  erro: null,

  setStep: (step) => set({ step }),
  setTipoFluxo: (tipoFluxo) => set({ tipoFluxo }),

  setDados: (novosDados) =>
    set((state) => ({ dados: { ...state.dados, ...novosDados } })),

  toggleVerbaExcluida: (codigo) =>
    set((state) => {
      const excluidas = state.dados.verbasExcluidas || [];
      const novas = excluidas.includes(codigo)
        ? excluidas.filter((c) => c !== codigo)
        : [...excluidas, codigo];
      return { dados: { ...state.dados, verbasExcluidas: novas } };
    }),

  setPeriodosFerias: (periodos) =>
    set((state) => ({ dados: { ...state.dados, periodosFerias: periodos } })),

  setPeriodosDecimoTerceiro: (periodos) =>
    set((state) => ({ dados: { ...state.dados, periodosDecimoTerceiro: periodos } })),

  setResultado: (resultado) => set({ resultado }),
  setResultadosTriplos: (resultadosTriplos) => set({ resultadosTriplos }),
  setCarregando: (v) => set({ carregando: v }),
  setErro: (erro) => set({ erro }),

  resetar: () => set({
    step: 1,
    tipoFluxo: 'verbas_rescisórias',
    dados: { ...dadosIniciais },
    resultado: null,
    resultadosTriplos: null,
    erro: null,
  }),
}));

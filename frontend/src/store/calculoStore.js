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
  gorjetasMesesAtrasados: 0,

  // Jornada
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  qtdeHorasExtrasMensais: 0,
  intervaloIntrajornadaMensalHoras: 0,
  adicionalHoraNoturna: 0.2,
  qtdeHorasNoturnasMensais: 0,

  // Jornada — modelo multi-período (substitui campos acima quando preenchido)
  // Cada período: { id, dataInicio, dataFim, padraoApuracao, divisorJornada,
  //   adicionalHoraExtra, adicionalHoraNoturna, modoEntrada,
  //   mediaHorasExtrasDiarias, mediaHorasExtrasSemanais, mediaHorasExtrasPorTurno,
  //   mediaHorasNoturnasDiarias, horaEntrada, horaSaida, intervaloMinutos,
  //   diasSemana, afastamentos, totalHorasExtras, totalHorasNoturnas, distribuicaoMensal }
  jornadaPeriodos: [],

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
  fgtsIntegralizado: false,
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

  // Afastamentos (array de períodos)
  periodosAfastamento: [], // [{ id, inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' }]

  // Afastamentos (legado — mantidos para compatibilidade)
  mesesAfastamento: 0,
  diasAfastamento: 0,

  // Saldo de salário
  saldoSalarialPago: false,

  // Bases para cálculo de atrasados
  salarioAtrasadoBase: 'ultimo_salario', // 'ultimo_salario' | 'historico'
  salarioAtrasadoHistoricoId: '', // 'histId' ou 'histId:parcelaId'
  comissaoAtrasadaBase: 'media', // 'media' | 'historico'
  comissaoAtrasadoHistoricoId: '',
  gorjetaAtrasadaBase: 'media', // 'media' | 'historico'
  gorjetaAtrasadoHistoricoId: '',

  // Acordo
  valorAcordo: 0,
  tipoAcordo: '',
  tipoDevedor: 'outros',

  // Metadados
  nomeSimulacao: '',
  numeroProcesso: '',
  varaNome: '',
  observacoes: '',

  // Histórico salarial com estrutura em dois níveis:
  // [{ id, titulo, fixo?, parcelas: [{ id, nome, faixas: [{ inicio, fim, valor }] }] }]
  // O histórico "Reclamante" (id='reclamante') é pré-seeded e não pode ser deletado.
  historicosSalariais: [
    { id: 'reclamante', titulo: 'Reclamante', fixo: true, parcelas: [] },
  ],

  // Verbas excluídas
  verbasExcluidas: [],

  // Overrides manuais de valores/nomes de verbas { codigo: { nome?, valor? } }
  verbasEditadas: {},

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

  setVerbasEditadas: (edits) =>
    set((state) => ({
      dados: {
        ...state.dados,
        verbasEditadas: { ...(state.dados.verbasEditadas || {}), ...edits },
      },
    })),

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
    carregando: false,
  }),
}));

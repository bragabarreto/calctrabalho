import React, { useState } from 'react';
import { Plus, Trash2, Edit2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { useParcelas, useCriarParcela, useAtualizarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
import ParcelaEditor from '../../components/ParcelaEditor/index.jsx';

const FREQUENCIA_LABELS = {
  horaria: 'Horária',
  diaria_6d: 'Diária 6d',
  diaria_5d: 'Diária 5d',
  mensal: 'Mensal',
  semestral: 'Semestral',
  anual: 'Anual',
  unica: 'Única',
};

// Grupos temáticos padrão
const GRUPOS_PADRAO = [
  { id: 'duracao', label: 'Duração do Trabalho' },
  { id: 'meio_ambiente', label: 'Meio Ambiente do Trabalho' },
  { id: 'remuneracao', label: 'Remuneração e Benefícios' },
  { id: 'funcao', label: 'Função e Cargo' },
  { id: 'rescisao', label: 'Verbas Rescisórias' },
  { id: 'responsabilidade', label: 'Responsabilidade Civil' },
];

// Templates de parcelas padrão do direito do trabalho
const TEMPLATES_PADRAO = [
  {
    _templateId: 'tpl_horas_extras',
    grupo: 'duracao',
    nome: 'Horas Extras',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'horaria',
    tipoValor: 'percentual_salario',
    percentualBase: 100,
    percentualAdicional: 50,
    geraReflexos: true,
    reflexosEm: ['rsr', 'aviso_previo', 'ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 59 CLT. 50% para dias úteis; 100% para domingos e feriados.',
    opcoesPercentual: [50, 100],
    campoPercentual: 'adicional',
    rotulosPercentual: ['50% — dias úteis', '100% — domingos/feriados'],
  },
  {
    _templateId: 'tpl_noturno',
    grupo: 'duracao',
    nome: 'Adicional Noturno',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'horaria',
    tipoValor: 'percentual_salario',
    percentualBase: 100,
    percentualAdicional: 20,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 73 CLT. Trabalho entre 22h–5h. Padrão: 20%; CCT pode prever percentual maior.',
    opcoesPercentual: [20],
    campoPercentual: 'adicional',
    rotulosPercentual: ['20% (padrão CLT)'],
  },
  {
    _templateId: 'tpl_intervalo',
    grupo: 'duracao',
    nome: 'Intervalo Intrajornada (1h)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 71 CLT / Súm. 437 TST. Informe o valor mensal (salário-hora × dias × 50%)',
  },
  {
    _templateId: 'tpl_intervalo_inter',
    grupo: 'duracao',
    nome: 'Intervalo Interjornada',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Art. 66 CLT / Súm. 110 TST. Mínimo 11h entre jornadas. Pós-Reforma 2017: natureza indenizatória. Informe valor mensal.',
  },
  {
    _templateId: 'tpl_prontidao',
    grupo: 'duracao',
    nome: 'Prontidão',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 244 §3º CLT. Empregado permanece nas dependências do empregador. Remunerado em 2/3 das horas de prontidão.',
  },
  {
    _templateId: 'tpl_sobreaviso',
    grupo: 'duracao',
    nome: 'Sobreaviso',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 244 § 2º CLT / Súm. 428 TST. = 1/3 do valor-hora × horas de sobreaviso mensais',
  },
  {
    _templateId: 'tpl_feriados',
    grupo: 'duracao',
    nome: 'Feriados Trabalhados (100%)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'horaria',
    tipoValor: 'percentual_salario',
    percentualBase: 100,
    percentualAdicional: 100,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 9º Lei 605/49. Adicional de 100% por hora trabalhada em feriado',
  },
  {
    _templateId: 'tpl_insalubridade',
    grupo: 'meio_ambiente',
    nome: 'Adicional de Insalubridade',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_sm',
    percentualBase: 10,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 192 CLT. Base: salário mínimo. Grau: Mínimo=10%, Médio=20%, Máximo=40%.',
    opcoesPercentual: [10, 20, 40],
    campoPercentual: 'base',
    rotulosPercentual: ['10% — Grau Mínimo', '20% — Grau Médio', '40% — Grau Máximo'],
  },
  {
    _templateId: 'tpl_periculosidade',
    grupo: 'meio_ambiente',
    nome: 'Adicional de Periculosidade',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 30,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 193 CLT. Base: salário base × 30%. CCT pode prever percentual diferente.',
    opcoesPercentual: [30],
    campoPercentual: 'base',
    rotulosPercentual: ['30% (padrão CLT)'],
  },
  {
    _templateId: 'tpl_diferencas_salariais',
    grupo: 'remuneracao',
    nome: 'Diferenças Salariais / Equiparação Salarial',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 461 CLT. Diferença mensal entre salários. Reflexos integrais: RSR, férias, 13º, FGTS, aviso',
  },
  {
    _templateId: 'tpl_adicional_transferencia',
    grupo: 'remuneracao',
    nome: 'Adicional de Transferência (25%)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 25,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 469 § 3º CLT. 25% do salário durante transferência provisória',
  },
  {
    _templateId: 'tpl_comissoes',
    grupo: 'remuneracao',
    nome: 'Comissões / Gorjetas',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Arts. 457 e 458 CLT / Súm. 93 TST. Integram salário com reflexos integrais. Informe a média mensal.',
  },
  {
    _templateId: 'tpl_dsr_variaveis',
    grupo: 'remuneracao',
    nome: 'RSR/DSR sobre Variáveis',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 16.67,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Súm. 172 TST. Repouso semanal remunerado sobre parcelas variáveis (comissões, HE, adicional noturno). Padrão: 1/6 = 16,67%.',
    opcoesPercentual: [16.67],
    campoPercentual: 'base',
    rotulosPercentual: ['16,67% (1/6 — padrão)'],
  },
  {
    _templateId: 'tpl_plr',
    grupo: 'remuneracao',
    nome: 'PLR / Participação nos Lucros e Resultados',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'semestral',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: true,
    incideFgts: false,
    descricao: 'Lei 10.101/2000. Não integra salário. Não incide INSS/FGTS. Incide IR por tabela específica. Informe o valor por semestre.',
  },
  {
    _templateId: 'tpl_ajuda_custo',
    grupo: 'remuneracao',
    nome: 'Ajuda de Custo',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Art. 457 §2º CLT. Parcela indenizatória para ressarcimento de despesas. Não integra salário, sem reflexos.',
  },
  {
    _templateId: 'tpl_quebra_caixa',
    grupo: 'remuneracao',
    nome: 'Quebra de Caixa',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Súm. 247 TST. Indenização para cobertura de diferenças de caixa de bancários e similares. Natureza indenizatória.',
  },
  {
    _templateId: 'tpl_vale_refeicao_sal',
    grupo: 'remuneracao',
    nome: 'Vale-Refeição (salarial)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Quando não enquadrado no PAT — integra salário com reflexos em férias, 13º e FGTS',
  },
  {
    _templateId: 'tpl_gratificacao_funcao',
    grupo: 'funcao',
    nome: 'Gratificação de Função',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 20,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Adicional pelo exercício de cargo de confiança ou função gratificada. Reflexos integrais (art. 62, II, CLT).',
    opcoesPercentual: [10, 20, 30, 40, 50],
    campoPercentual: 'base',
    rotulosPercentual: ['10%', '20%', '30%', '40%', '50%'],
  },
  {
    _templateId: 'tpl_desvio_funcao',
    grupo: 'funcao',
    nome: 'Acúmulo / Desvio de Função',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 10,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['rsr', 'ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Súm. 159/448 TST. Normalmente 10%–40% do salário. Reflexos integrais',
  },
  // ── Verbas Rescisórias ────────────────────────────────────────────────────────
  {
    _templateId: 'tpl_aviso_indenizado',
    grupo: 'rescisao',
    nome: 'Aviso Prévio Indenizado',
    natureza: 'indenizatoria',
    periodoTipo: 'especifico',
    frequencia: 'unica',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Art. 487 CLT / RE 576.967 STF. Natureza indenizatória. Não incide INSS, IR nem FGTS. Informe o valor do aviso prévio indenizado.',
  },
  {
    _templateId: 'tpl_multa_477',
    grupo: 'rescisao',
    nome: 'Multa do art. 477 da CLT',
    natureza: 'indenizatoria',
    periodoTipo: 'especifico',
    frequencia: 'unica',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Art. 477 §8º CLT. Multa de 1 salário (+ adicionais) pelo pagamento fora do prazo na rescisão. Natureza indenizatória.',
  },
  {
    _templateId: 'tpl_multa_467',
    grupo: 'rescisao',
    nome: 'Multa do art. 467 da CLT',
    natureza: 'indenizatoria',
    periodoTipo: 'especifico',
    frequencia: 'unica',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Art. 467 CLT. Multa de 50% sobre verbas rescisórias incontroverses não pagas na rescisão. Natureza indenizatória.',
  },

  // ── Responsabilidade Civil ─────────────────────────────────────────────────
  {
    _templateId: 'tpl_dano_moral',
    grupo: 'responsabilidade',
    nome: 'Indenização por Danos Morais',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'unica',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Valor único, natureza indenizatória, não integra base de FGTS/INSS/IR',
  },
  {
    _templateId: 'tpl_vale_transporte',
    grupo: 'responsabilidade',
    nome: 'Vale-Transporte Não Fornecido',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Lei 7.418/85. Informe valor mensal = (passagem × 2 × dias úteis) − (salário × 6%)',
  },
  {
    _templateId: 'tpl_vale_refeicao_pat',
    grupo: 'responsabilidade',
    nome: 'Vale-Refeição (PAT — indenizatório)',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Lei 6.321/76 / PAT. Natureza indenizatória — sem reflexos e sem incidência de FGTS/INSS',
  },
  {
    _templateId: 'tpl_pensionamento',
    grupo: 'responsabilidade',
    nome: 'Pensionamento / Indenização por Incapacidade',
    natureza: 'indenizatoria',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_salario',
    percentualBase: 100,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Arts. 949–950 CC. % de incapacidade × salário. Informe o percentual de incapacidade como base',
  },
  {
    _templateId: 'tpl_estabilidade',
    grupo: 'responsabilidade',
    nome: 'Indenização por Estabilidade Provisória',
    natureza: 'indenizatoria',
    periodoTipo: 'especifico',
    frequencia: 'unica',
    tipoValor: 'fixo',
    valorBase: null,
    percentualAdicional: 0,
    geraReflexos: false,
    reflexosEm: [],
    incideInss: false,
    incideIr: false,
    incideFgts: false,
    descricao: 'Gestante, CIPA, acidentado etc. Salários do período de estabilidade × meses restantes',
  },
];

// Helpers de localStorage
function lerGruposCustom() {
  try { return JSON.parse(localStorage.getItem('parcelas_grupos_custom') || '{}'); } catch { return {}; }
}
function lerGruposExtras() {
  try { return JSON.parse(localStorage.getItem('parcelas_grupos_extras') || '[]'); } catch { return []; }
}

// Converte registro DB (snake_case) para form (camelCase)
function mapParcelaBDParaForm(p) {
  return {
    nome: p.nome,
    descricao: p.descricao || '',
    natureza: p.natureza,
    periodoTipo: p.periodo_tipo,
    periodoInicio: p.periodo_inicio,
    periodoFim: p.periodo_fim,
    frequencia: p.frequencia,
    tipoValor: p.tipo_valor,
    valorBase: p.valor_base,
    percentualBase: p.percentual_base ? p.percentual_base * 100 : null,
    percentualAdicional: p.percentual_adicional ? p.percentual_adicional * 100 : 0,
    geraReflexos: p.gera_reflexos,
    reflexosEm: p.reflexos_em || [],
    incideInss: p.incide_inss,
    incideIr: p.incide_ir,
    incideFgts: p.incide_fgts,
    templateId: p.template_id,
    baseHistoricoId: p.base_historico_id || '',
  };
}

export default function ParcelasPersonalizadas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  function onNext() { setStep(11); }
  function onBack() { setStep(tipoFluxo === 'apenas_parcelas' ? 2 : 3); }

  const [parcelasDoCalculo, setParcelasDoCalculo] = useState(dados.parcelasPersonalizadas || []);

  // editor: null | { mode: 'nova' } | { mode: 'template', template } | { mode: 'biblioteca', parcela }
  const [editorCtx, setEditorCtx] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // Configuração inline de percentual por template
  const [templateConfig, setTemplateConfig] = useState(() => {
    const cfg = {};
    TEMPLATES_PADRAO.forEach(t => {
      if (t.opcoesPercentual?.length) cfg[t._templateId] = t.opcoesPercentual[0];
    });
    return cfg;
  });

  // Grupos temáticos (com override do localStorage)
  const [gruposCustom, setGruposCustom] = useState(lerGruposCustom);
  const [gruposExtras, setGruposExtras] = useState(lerGruposExtras);
  const [novoGrupoInput, setNovoGrupoInput] = useState('');

  // Accordion — primeiro grupo aberto por padrão
  const [gruposAbertos, setGruposAbertos] = useState({ duracao: true });

  const todosGrupos = [...GRUPOS_PADRAO, ...gruposExtras];

  const { data: parcelasSalvas = [], isLoading } = useParcelas();
  const { mutateAsync: criarNaBiblioteca } = useCriarParcela();
  const { mutateAsync: atualizarNaBiblioteca } = useAtualizarParcela();
  const { mutateAsync: excluirDaBiblioteca } = useExcluirParcela();

  // Set de templateIds que já têm versão customizada salva na biblioteca
  const templateIdsSalvos = new Set(
    parcelasSalvas.map(p => p.template_id).filter(Boolean)
  );

  function atualizarStore(lista) {
    setParcelasDoCalculo(lista);
    setDados({ parcelasPersonalizadas: lista });
  }

  function adicionarAoCalculo(parcela) {
    let nova = { ...parcela, _localId: Date.now() + Math.random() };
    if (parcela._templateId && templateConfig[parcela._templateId] !== undefined) {
      const pct = templateConfig[parcela._templateId];
      if (parcela.campoPercentual === 'adicional') {
        nova = { ...nova, percentualAdicional: pct, nome: `${parcela.nome} (${pct}%)` };
      } else if (parcela.campoPercentual === 'base') {
        nova = { ...nova, percentualBase: pct };
        if (parcela._templateId === 'tpl_insalubridade') {
          const grau = pct === 10 ? 'Grau Mínimo' : pct === 20 ? 'Grau Médio' : pct === 40 ? 'Grau Máximo' : `${pct}%`;
          nova = { ...nova, nome: `Adicional de Insalubridade — ${grau} (${pct}%)` };
        }
      }
    }
    // eslint-disable-next-line no-unused-vars
    const { opcoesPercentual, campoPercentual, rotulosPercentual, grupo, ...parcelaSemUI } = nova;
    atualizarStore([...parcelasDoCalculo, parcelaSemUI]);
  }

  function removerDoCalculo(idx) {
    atualizarStore(parcelasDoCalculo.filter((_, i) => i !== idx));
  }

  function toggleGrupo(grupoId) {
    setGruposAbertos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  }

  function moverTemplate(templateId, novoGrupoId) {
    const novo = { ...gruposCustom, [templateId]: novoGrupoId };
    setGruposCustom(novo);
    localStorage.setItem('parcelas_grupos_custom', JSON.stringify(novo));
  }

  function adicionarGrupo() {
    if (!novoGrupoInput.trim()) return;
    const id = 'grp_' + Date.now();
    const novo = [...gruposExtras, { id, label: novoGrupoInput.trim() }];
    setGruposExtras(novo);
    localStorage.setItem('parcelas_grupos_extras', JSON.stringify(novo));
    setNovoGrupoInput('');
  }

  async function onEditorSalvar(form) {
    if (!editorCtx) return;
    setSalvando(true);
    try {
      if (editorCtx.mode === 'template') {
        // Salvar na biblioteca como customização do template + adicionar ao cálculo
        const salva = await criarNaBiblioteca({ ...form, templateId: editorCtx.template._templateId });
        adicionarAoCalculo({ ...form, id: salva.id });

      } else if (editorCtx.mode === 'biblioteca') {
        // LOCAL apenas — não altera a biblioteca. Se já está em parcelasDoCalculo, atualiza em-place; senão adiciona como cópia local.
        const idOrig = editorCtx.parcela.id;
        const jaNoCalculo = parcelasDoCalculo.findIndex(p => p.id === idOrig);
        if (jaNoCalculo >= 0) {
          atualizarStore(parcelasDoCalculo.map((p, i) => i === jaNoCalculo ? { ...p, ...form } : p));
        } else {
          adicionarAoCalculo({ ...form });
        }

      } else if (editorCtx.mode === 'editar_local') {
        // Editar item já presente em parcelasDoCalculo — apenas local, sem API
        const { idx } = editorCtx;
        atualizarStore(parcelasDoCalculo.map((p, i) => i === idx ? { ...p, ...form } : p));

      } else {
        // Nova parcela — SEMPRE salva na biblioteca permanentemente + adiciona ao cálculo
        const salva = await criarNaBiblioteca(form);
        adicionarAoCalculo({ ...form, id: salva.id });
      }
      setEditorCtx(null);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  function usarDaBiblioteca(p) {
    adicionarAoCalculo({
      id: p.id,
      nome: p.nome,
      natureza: p.natureza,
      periodoTipo: p.periodo_tipo,
      periodoInicio: p.periodo_inicio,
      periodoFim: p.periodo_fim,
      frequencia: p.frequencia,
      tipoValor: p.tipo_valor,
      valorBase: p.valor_base,
      percentualBase: p.percentual_base ? p.percentual_base * 100 : null,
      percentualAdicional: p.percentual_adicional ? p.percentual_adicional * 100 : 0,
      geraReflexos: p.gera_reflexos,
      reflexosEm: p.reflexos_em || [],
      incideInss: p.incide_inss,
      incideIr: p.incide_ir,
      incideFgts: p.incide_fgts,
    });
  }

  // Obtém grupo efetivo de um template (custom override ou padrão)
  function grupoDoTemplate(t) {
    return gruposCustom[t._templateId] ?? t.grupo;
  }

  // Renderiza um card de template
  function TemplateCard({ t }) {
    return (
      <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">{t.nome}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t.descricao}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded ${t.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {t.natureza}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {FREQUENCIA_LABELS[t.frequencia] || t.frequencia}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditorCtx({ mode: 'template', template: t })}
            className="text-gray-400 hover:text-primaria p-1 shrink-0"
            title="Editar e salvar na biblioteca"
          >
            <Edit2 size={14} />
          </button>
        </div>
        {/* Seletor inline de percentual */}
        {t.opcoesPercentual?.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-xs text-gray-500 mr-1">%:</span>
            {t.rotulosPercentual.map((rotulo, i) => (
              <button
                key={t.opcoesPercentual[i]}
                type="button"
                onClick={() => setTemplateConfig(prev => ({ ...prev, [t._templateId]: t.opcoesPercentual[i] }))}
                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                  templateConfig[t._templateId] === t.opcoesPercentual[i]
                    ? 'border-primaria bg-blue-50 text-primaria font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 justify-between">
          {/* Dropdown mover para grupo */}
          <select
            value={grupoDoTemplate(t)}
            onChange={(e) => moverTemplate(t._templateId, e.target.value)}
            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 bg-white max-w-[160px]"
            title="Mover para outro grupo"
          >
            {todosGrupos.map(g => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => adicionarAoCalculo({ ...t })}
            className="btn-secundario text-xs py-1 px-3 shrink-0"
          >
            Usar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Editor de parcela (modal) */}
      {editorCtx && (
        <ParcelaEditor
          parcela={
            editorCtx.mode === 'template'
              ? editorCtx.template
              : editorCtx.mode === 'biblioteca'
              ? mapParcelaBDParaForm(editorCtx.parcela)
              : editorCtx.mode === 'editar_local'
              ? editorCtx.parcela
              : null
          }
          titulo={
            editorCtx.mode === 'template'
              ? `Personalizar: ${editorCtx.template.nome}`
              : editorCtx.mode === 'biblioteca'
              ? 'Editar Parcela (apenas neste cálculo)'
              : editorCtx.mode === 'editar_local'
              ? 'Editar Parcela (apenas neste cálculo)'
              : 'Nova Parcela Personalizada'
          }
          historicos={dados.historicosSalariais || []}
          onSalvar={onEditorSalvar}
          salvando={salvando}
          onCancelar={() => setEditorCtx(null)}
        />
      )}

      {/* Parcelas deste cálculo */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-titulo text-lg text-primaria">Parcelas deste Cálculo</h3>
            <p className="text-xs text-gray-400 mt-1">Adicione parcelas personalizadas para incluir neste cálculo.</p>
          </div>
          <button
            type="button"
            className="btn-primario flex items-center gap-2 text-sm"
            onClick={() => setEditorCtx({ mode: 'nova' })}
          >
            <Plus size={16} />
            Nova Parcela
          </button>
        </div>

        {parcelasDoCalculo.length === 0 ? (
          <div className="py-6 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <p className="text-sm">Nenhuma parcela adicionada.</p>
            <p className="text-xs mt-1">Clique em "Nova Parcela" ou use uma da biblioteca abaixo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {parcelasDoCalculo.map((p, idx) => (
              <div key={p._localId || p.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-sm">{p.nome}</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {p.natureza}
                    </span>
                    <span className="text-xs text-gray-400">{FREQUENCIA_LABELS[p.frequencia] || p.frequencia}</span>
                    {p.valorBase && <span className="text-xs text-gray-400">R$ {Number(p.valorBase).toFixed(2)}</span>}
                    {p.percentualBase && <span className="text-xs text-gray-400">{Number(p.percentualBase).toFixed(1)}%</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorCtx({ mode: 'editar_local', idx, parcela: p })}
                  className="text-gray-400 hover:text-primaria p-1"
                  title="Editar (apenas neste cálculo)"
                >
                  <Edit2 size={16} />
                </button>
                <button type="button" onClick={() => removerDoCalculo(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Biblioteca — accordion de grupos temáticos */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-primaria" />
          <h3 className="font-titulo text-lg text-primaria">Biblioteca de Parcelas</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Modelos pré-configurados por tema. Clique em "Usar" para adicionar ao cálculo ou no lápis para personalizar e salvar na biblioteca.
        </p>

        {/* Grupos de templates padrão */}
        {todosGrupos.map((grupo) => {
          const templatesDoGrupo = TEMPLATES_PADRAO.filter(
            t => grupoDoTemplate(t) === grupo.id && !templateIdsSalvos.has(t._templateId)
          );
          // Parcelas salvas que pertencem a templates deste grupo
          const parcelasSalvasDoGrupo = parcelasSalvas.filter(p => {
            if (!p.template_id) return false;
            const tpl = TEMPLATES_PADRAO.find(t => t._templateId === p.template_id);
            return tpl && grupoDoTemplate(tpl) === grupo.id;
          });
          const total = templatesDoGrupo.length + parcelasSalvasDoGrupo.length;
          if (total === 0) return null;

          const aberto = Boolean(gruposAbertos[grupo.id]);
          return (
            <div key={grupo.id} className="border border-gray-200 rounded-lg mb-2">
              <button
                type="button"
                onClick={() => toggleGrupo(grupo.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-sm text-gray-700">
                  {grupo.label}
                  <span className="ml-2 text-xs text-gray-400 font-normal">({total})</span>
                </span>
                {aberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>
              {aberto && (
                <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templatesDoGrupo.map(t => <TemplateCard key={t._templateId} t={t} />)}
                  {parcelasSalvasDoGrupo.map(p => (
                    <div key={p.id} className="flex flex-col gap-2 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm leading-tight">{p.nome}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-200 text-blue-700">Personalizado</span>
                          </div>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${p.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                              {p.natureza}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              {FREQUENCIA_LABELS[p.frequencia] || p.frequencia}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditorCtx({ mode: 'biblioteca', parcela: p })}
                          className="text-blue-400 hover:text-primaria p-1 shrink-0"
                          title="Editar parcela salva"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => { if (window.confirm('Excluir esta parcela da biblioteca?')) excluirDaBiblioteca(p.id); }}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Excluir da biblioteca"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button type="button" onClick={() => usarDaBiblioteca(p)} className="btn-secundario text-xs py-1 px-3">
                          Usar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Grupo "Minhas Parcelas" — parcelas salvas sem template_id */}
        {(() => {
          const minhasParcelas = parcelasSalvas.filter(p => !p.template_id);
          if (isLoading) return <p className="text-sm text-gray-400 mt-2">Carregando biblioteca...</p>;
          if (minhasParcelas.length === 0) return null;
          const aberto = Boolean(gruposAbertos['_minhas']);
          return (
            <div className="border border-gray-200 rounded-lg mb-2">
              <button
                type="button"
                onClick={() => toggleGrupo('_minhas')}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-sm text-gray-700">
                  Minhas Parcelas
                  <span className="ml-2 text-xs text-gray-400 font-normal">({minhasParcelas.length})</span>
                </span>
                {aberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </button>
              {aberto && (
                <div className="px-4 pb-4 space-y-2">
                  {minhasParcelas.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <span className="font-medium text-sm">{p.nome}</span>
                        <div className="flex gap-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${p.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            {p.natureza}
                          </span>
                          <span className="text-xs text-gray-400">{FREQUENCIA_LABELS[p.frequencia] || p.frequencia}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorCtx({ mode: 'biblioteca', parcela: p })}
                        className="text-gray-400 hover:text-primaria p-1"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (window.confirm('Excluir esta parcela da biblioteca?')) excluirDaBiblioteca(p.id); }}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button type="button" onClick={() => usarDaBiblioteca(p)} className="btn-secundario text-xs py-1 px-3">
                        Usar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Adicionar grupo personalizado */}
        <div className="flex gap-2 mt-3 items-center">
          <input
            type="text"
            value={novoGrupoInput}
            onChange={(e) => setNovoGrupoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarGrupo()}
            placeholder="Nome do novo grupo..."
            className="campo-input text-sm flex-1"
          />
          <button
            type="button"
            onClick={adicionarGrupo}
            disabled={!novoGrupoInput.trim()}
            className="btn-secundario text-xs py-1.5 px-3 shrink-0 disabled:opacity-40"
          >
            <Plus size={14} className="inline mr-1" />
            Novo Grupo
          </button>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={onBack}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

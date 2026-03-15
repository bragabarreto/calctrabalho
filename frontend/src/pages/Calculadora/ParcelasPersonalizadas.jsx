import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, BookOpen } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { useParcelas, useCriarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
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

// Templates de parcelas padrão do direito do trabalho
// Podem ser adicionadas diretamente ao cálculo sem criar nova parcela do zero
// opcoesPercentual → mostra seletor inline antes de "Usar"
// campoPercentual → qual campo recebe o valor selecionado: 'adicional' | 'base'
const TEMPLATES_PADRAO = [
  {
    _templateId: 'tpl_horas_extras',
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
    _templateId: 'tpl_insalubridade',
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
    _templateId: 'tpl_intervalo',
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
    _templateId: 'tpl_dano_moral',
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
  // === Parcelas adicionais da biblioteca padrão ===
  {
    _templateId: 'tpl_vale_transporte',
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
    _templateId: 'tpl_vale_refeicao_sal',
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
    _templateId: 'tpl_diferencas_salariais',
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
    _templateId: 'tpl_desvio_funcao',
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
  {
    _templateId: 'tpl_adicional_transferencia',
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
    _templateId: 'tpl_sobreaviso',
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
    _templateId: 'tpl_pensionamento',
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
  {
    _templateId: 'tpl_feriados',
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
];

export default function ParcelasPersonalizadas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  function onNext() {
    // Sempre vai para Configurar Parcelas (step 11) em fluxos com parcelas
    setStep(11);
  }
  function onBack() {
    // apenas_parcelas → TipoCalculo (2); verbas_e_parcelas → Verbas (3)
    setStep(tipoFluxo === 'apenas_parcelas' ? 2 : 3);
  }
  const [parcelasDoCalculo, setParcelasDoCalculo] = useState(dados.parcelasPersonalizadas || []);

  // Estado de configuração inline por template (ex: percentual selecionado)
  const [templateConfig, setTemplateConfig] = useState(() => {
    const cfg = {};
    TEMPLATES_PADRAO.forEach(t => {
      if (t.opcoesPercentual?.length) {
        cfg[t._templateId] = t.opcoesPercentual[0];
      }
    });
    return cfg;
  });
  const [editorAberto, setEditorAberto] = useState(false);
  const [parcelaEditando, setParcelaEditando] = useState(null);
  const [salvandoBiblioteca, setSalvandoBiblioteca] = useState(false);

  const { data: parcelasSalvas = [], isLoading } = useParcelas();
  const { mutateAsync: criarNaBiblioteca } = useCriarParcela();
  const { mutateAsync: excluirDaBiblioteca } = useExcluirParcela();

  function atualizarStore(lista) {
    setParcelasDoCalculo(lista);
    setDados({ parcelasPersonalizadas: lista });
  }

  function adicionarAoCalculo(parcela, configOverride) {
    let nova = { ...parcela, _localId: Date.now() + Math.random() };
    // Se o template tem opções de percentual e há configuração selecionada, aplicá-la
    if (parcela._templateId && templateConfig[parcela._templateId] !== undefined) {
      const pct = configOverride ?? templateConfig[parcela._templateId];
      if (parcela.campoPercentual === 'adicional') {
        nova = { ...nova, percentualAdicional: pct, nome: `${parcela.nome} (${pct}%)` };
      } else if (parcela.campoPercentual === 'base') {
        nova = { ...nova, percentualBase: pct };
        // Para insalubridade: incluir grau no nome
        if (parcela._templateId === 'tpl_insalubridade') {
          const grau = pct === 10 ? 'Grau Mínimo' : pct === 20 ? 'Grau Médio' : pct === 40 ? 'Grau Máximo' : `${pct}%`;
          nova = { ...nova, nome: `Adicional de Insalubridade — ${grau} (${pct}%)` };
        }
      }
    }
    // Remover campos de controle de UI que não devem ir para o backend
    // eslint-disable-next-line no-unused-vars
    const { opcoesPercentual, campoPercentual, rotulosPercentual, ...parcelaSemUI } = nova;
    atualizarStore([...parcelasDoCalculo, parcelaSemUI]);
  }

  function removerDoCalculo(idx) {
    atualizarStore(parcelasDoCalculo.filter((_, i) => i !== idx));
  }

  function salvarNovaParcela(form) {
    adicionarAoCalculo(form);
    setEditorAberto(false);
    setParcelaEditando(null);
  }

  async function salvarNaBiblioteca(form) {
    setSalvandoBiblioteca(true);
    try {
      const salva = await criarNaBiblioteca(form);
      adicionarAoCalculo(salva);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvandoBiblioteca(false);
      setEditorAberto(false);
    }
  }

  function usarDaBiblioteca(p) {
    // Copia os dados da biblioteca para o cálculo atual
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

  return (
    <div className="max-w-4xl">
      {editorAberto && (
        <ParcelaEditor
          parcela={parcelaEditando}
          titulo={parcelaEditando ? 'Editar Parcela' : 'Nova Parcela Personalizada'}
          historicos={dados.historicosSalariais || []}
          onSalvar={(form) => {
            // Pergunta se quer salvar na biblioteca também
            if (!parcelaEditando && window.confirm('Salvar esta parcela na biblioteca para uso futuro?')) {
              salvarNaBiblioteca(form);
            } else {
              salvarNovaParcela(form);
            }
          }}
          onCancelar={() => { setEditorAberto(false); setParcelaEditando(null); }}
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
            onClick={() => { setParcelaEditando(null); setEditorAberto(true); }}
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
                    {p.percentualBase && <span className="text-xs text-gray-400">{(Number(p.percentualBase)).toFixed(1)}%</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removerDoCalculo(idx)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parcelas Padrão — catálogo de templates trabalhistas */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-primaria" />
          <h3 className="font-titulo text-lg text-primaria">Parcelas Padrão</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Modelos pré-configurados do direito do trabalho. Clique em "Usar" para adicionar ao cálculo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES_PADRAO.map((t) => (
            <div key={t._templateId} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-start gap-3">
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
              </div>
              {/* Seletor inline de percentual para templates configuráveis */}
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
              <button
                type="button"
                onClick={() => adicionarAoCalculo({ ...t })}
                className="btn-secundario text-xs py-1 px-3 self-end"
              >
                Usar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Biblioteca de parcelas salvas */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-primaria" />
          <h3 className="font-titulo text-lg text-primaria">Biblioteca de Parcelas Salvas</h3>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : parcelasSalvas.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma parcela salva na biblioteca. Crie uma nova parcela e escolha salvar na biblioteca.</p>
        ) : (
          <div className="space-y-2">
            {parcelasSalvas.map((p) => (
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
                  onClick={() => usarDaBiblioteca(p)}
                  className="btn-secundario text-xs py-1 px-3"
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={onBack}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={onNext}>Próximo →</button>
      </div>
    </div>
  );
}

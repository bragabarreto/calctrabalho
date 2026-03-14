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
const TEMPLATES_PADRAO = [
  {
    _templateId: 'tpl_he_50',
    nome: 'Horas Extras (50%)',
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
    descricao: 'Art. 59 CLT. Base: valor-hora × adicional 50% × qtde horas',
  },
  {
    _templateId: 'tpl_he_100',
    nome: 'Horas Extras (100%)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'horaria',
    tipoValor: 'percentual_salario',
    percentualBase: 100,
    percentualAdicional: 100,
    geraReflexos: true,
    reflexosEm: ['rsr', 'aviso_previo', 'ferias', 'decimo_terceiro', 'fgts'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Domingos/feriados. Base: valor-hora × adicional 100% × qtde horas',
  },
  {
    _templateId: 'tpl_noturno',
    nome: 'Adicional Noturno (20%)',
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
    descricao: 'Art. 73 CLT. Trabalho entre 22h e 5h. Hora noturna reduzida: 52min30s',
  },
  {
    _templateId: 'tpl_insalubridade_min',
    nome: 'Adicional de Insalubridade — Grau Mínimo (10%)',
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
    descricao: 'Art. 192 CLT. Base: salário mínimo × 10%',
  },
  {
    _templateId: 'tpl_insalubridade_med',
    nome: 'Adicional de Insalubridade — Grau Médio (20%)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_sm',
    percentualBase: 20,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 192 CLT. Base: salário mínimo × 20%',
  },
  {
    _templateId: 'tpl_insalubridade_max',
    nome: 'Adicional de Insalubridade — Grau Máximo (40%)',
    natureza: 'salarial',
    periodoTipo: 'contrato',
    frequencia: 'mensal',
    tipoValor: 'percentual_sm',
    percentualBase: 40,
    percentualAdicional: 0,
    geraReflexos: true,
    reflexosEm: ['ferias', 'decimo_terceiro', 'fgts', 'aviso_previo'],
    incideInss: true,
    incideIr: true,
    incideFgts: true,
    descricao: 'Art. 192 CLT. Base: salário mínimo × 40%',
  },
  {
    _templateId: 'tpl_periculosidade',
    nome: 'Adicional de Periculosidade (30%)',
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
    descricao: 'Art. 193 CLT. Base: salário base × 30%',
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
];

export default function ParcelasPersonalizadas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  function onNext() {
    // apenas_parcelas → Deduções (7); verbas_e_parcelas → Jornada (6)
    setStep(tipoFluxo === 'apenas_parcelas' ? 7 : 6);
  }
  function onBack() {
    // apenas_parcelas → TipoCalculo (2); verbas_e_parcelas → Adicionais (4)
    setStep(tipoFluxo === 'apenas_parcelas' ? 2 : 4);
  }
  const [parcelasDoCalculo, setParcelasDoCalculo] = useState(dados.parcelasPersonalizadas || []);
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

  function adicionarAoCalculo(parcela) {
    const nova = { ...parcela, _localId: Date.now() + Math.random() };
    atualizarStore([...parcelasDoCalculo, nova]);
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
            <div key={t._templateId} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
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
                onClick={() => adicionarAoCalculo({ ...t })}
                className="btn-secundario text-xs py-1 px-3 shrink-0"
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

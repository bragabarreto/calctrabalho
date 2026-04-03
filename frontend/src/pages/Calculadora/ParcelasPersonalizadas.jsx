import React, { useState } from 'react';
import { Plus, Trash2, Edit2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { useParcelas, useCriarParcela, useAtualizarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
import ParcelaEditor from '../../components/ParcelaEditor/index.jsx';
import {
  FREQUENCIA_LABELS,
  GRUPOS_PADRAO,
  TEMPLATES_PADRAO,
  mapParcelaBDParaForm,
  resolverGrupoParcela,
} from '../../data/parcelasTemplates.js';

// Helpers de localStorage para grupos extras criados pelo usuário
function lerGruposCustom() {
  try { return JSON.parse(localStorage.getItem('parcelas_grupos_custom') || '{}'); } catch { return {}; }
}
function lerGruposExtras() {
  try { return JSON.parse(localStorage.getItem('parcelas_grupos_extras') || '[]'); } catch { return []; }
}

export default function ParcelasPersonalizadas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  function onNext() { setStep(11); }
  function onBack() { setStep(tipoFluxo === 'apenas_parcelas' ? 2 : 3); }

  const [parcelasDoCalculo, setParcelasDoCalculo] = useState(dados.parcelasPersonalizadas || []);

  /**
   * editor: null
   *   | { mode: 'nova' }
   *   | { mode: 'template', template }
   *   | { mode: 'biblioteca', parcela }   ← edita E persiste no BD via PUT
   *   | { mode: 'editar_local', idx, parcela }
   */
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

  // Set de templateIds que já têm versão salva na biblioteca
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
    // Remove campos exclusivamente de UI
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

  // Salvar no editor — lógica unificada
  async function onEditorSalvar(form) {
    if (!editorCtx) return;
    setSalvando(true);
    try {
      if (editorCtx.mode === 'template') {
        // Personalizar template: salva na biblioteca (POST) + adiciona ao cálculo
        const salva = await criarNaBiblioteca({
          ...form,
          templateId: editorCtx.template._templateId,
          grupoId: form.grupoId || editorCtx.template.grupo,
        });
        adicionarAoCalculo({ ...form, id: salva.id });

      } else if (editorCtx.mode === 'biblioteca') {
        // Editar parcela salva: persiste no BD (PUT) + atualiza no cálculo se presente
        await atualizarNaBiblioteca({ id: editorCtx.parcela.id, ...form });
        const idOrig = editorCtx.parcela.id;
        const jaNoCalculo = parcelasDoCalculo.findIndex(p => p.id === idOrig);
        if (jaNoCalculo >= 0) {
          atualizarStore(parcelasDoCalculo.map((p, i) =>
            i === jaNoCalculo ? { ...p, ...form } : p
          ));
        }

      } else if (editorCtx.mode === 'editar_local') {
        // Editar item já presente no cálculo — apenas local
        const { idx } = editorCtx;
        atualizarStore(parcelasDoCalculo.map((p, i) => i === idx ? { ...p, ...form } : p));

      } else {
        // Nova parcela: salva na biblioteca (POST) + adiciona ao cálculo
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
      descricao: p.descricao,
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
      grupoId: p.grupo_biblioteca,
      // Preserva vínculo com histórico salarial (incluindo sentinel 'reclamante')
      baseHistoricoId: p.base_historico_id || null,
    });
  }

  // Obtém grupo efetivo de um template (custom override ou padrão)
  function grupoDoTemplate(t) {
    return gruposCustom[t._templateId] ?? t.grupo;
  }

  // Obtém grupo efetivo de uma parcela salva no banco
  function grupoDaParcela(p) {
    return resolverGrupoParcela(p, gruposCustom);
  }

  // ---------------------------------------------------------------------------
  // Card de template (parcela não customizada)
  // ---------------------------------------------------------------------------
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
            title="Personalizar e salvar na biblioteca"
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

  // ---------------------------------------------------------------------------
  // Card de parcela salva no banco (template customizado ou criada pelo usuário)
  // Todas tratadas igualmente — sem distinção visual por origem.
  // ---------------------------------------------------------------------------
  function ParcelaSalvaCard({ p }) {
    return (
      <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">{p.nome}</p>
            {p.descricao && (
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{p.descricao}</p>
            )}
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
            className="text-gray-400 hover:text-primaria p-1 shrink-0"
            title="Editar parcela"
          >
            <Edit2 size={14} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Excluir "${p.nome}" da biblioteca?`)) excluirDaBiblioteca(p.id);
            }}
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
    );
  }

  // ---------------------------------------------------------------------------
  // Render principal
  // ---------------------------------------------------------------------------
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
              ? `Editar: ${editorCtx.parcela.nome}`
              : editorCtx.mode === 'editar_local'
              ? 'Editar Parcela (apenas neste cálculo)'
              : 'Nova Parcela Personalizada'
          }
          historicos={dados.historicosSalariais || []}
          onSalvar={onEditorSalvar}
          salvando={salvando}
          onCancelar={() => setEditorCtx(null)}
          // Modo editar_local não precisa persistir grupo na biblioteca
          mostrarGrupo={editorCtx.mode !== 'editar_local'}
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
            {parcelasDoCalculo.map((p, idx) => {
              const usaReclamante = p.baseHistoricoId === 'reclamante';
              const historicosCalculo = dados.historicosSalariais || [];
              const temHistoricos = historicosCalculo.length > 0;
              const temMultiplos = historicosCalculo.length > 1;
              return (
                <div key={p._localId || p.id || idx} className={`p-3 rounded-lg ${usaReclamante && !temHistoricos ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{p.nome}</span>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                          {p.natureza}
                        </span>
                        <span className="text-xs text-gray-400">{FREQUENCIA_LABELS[p.frequencia] || p.frequencia}</span>
                        {p.valorBase && <span className="text-xs text-gray-400">R$ {Number(p.valorBase).toFixed(2)}</span>}
                        {p.percentualBase && <span className="text-xs text-gray-400">{Number(p.percentualBase).toFixed(1)}%</span>}
                        {/* Indicação de vínculo com histórico do reclamante */}
                        {usaReclamante && !temHistoricos && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                            ⚠ Histórico do reclamante não cadastrado
                          </span>
                        )}
                        {usaReclamante && temHistoricos && !temMultiplos && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                            ↪ Histórico do reclamante
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorCtx({ mode: 'editar_local', idx, parcela: p })}
                      className="text-gray-400 hover:text-primaria p-1 shrink-0"
                      title="Editar (apenas neste cálculo)"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button type="button" onClick={() => removerDoCalculo(idx)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Override de histórico quando há múltiplos históricos e a parcela usa sentinel */}
                  {usaReclamante && temMultiplos && (
                    <div className="mt-2 flex items-center gap-2 pl-1">
                      <span className="text-xs text-gray-500 shrink-0">Histórico neste cálculo:</span>
                      <select
                        value={p.historicoIdCalculo || 'reclamante'}
                        onChange={(e) => {
                          const val = e.target.value;
                          atualizarStore(parcelasDoCalculo.map((pc, i) =>
                            i === idx
                              ? { ...pc, historicoIdCalculo: val === 'reclamante' ? undefined : val }
                              : pc
                          ));
                        }}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white flex-1 max-w-xs"
                      >
                        <option value="reclamante">↪ Histórico do Reclamante (principal)</option>
                        {historicosCalculo.map(h => (
                          <option key={h.id} value={h.id}>{h.titulo}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mensagem de erro quando histórico do reclamante não está cadastrado */}
                  {usaReclamante && !temHistoricos && (
                    <p className="mt-1.5 text-xs text-red-600 pl-1">
                      Esta parcela requer o histórico salarial do reclamante. Cadastre-o na etapa anterior (Histórico Salarial) para incluir esta parcela no cálculo.
                    </p>
                  )}
                </div>
              );
            })}
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
          Clique em "Usar" para adicionar ao cálculo. Clique no lápis para editar e salvar na biblioteca.
          Todas as parcelas são totalmente personalizáveis.
        </p>

        {isLoading && <p className="text-sm text-gray-400 mb-2">Carregando biblioteca...</p>}

        {todosGrupos.map((grupo) => {
          // Templates padrão do grupo que ainda NÃO têm versão salva no banco
          const templatesDoGrupo = TEMPLATES_PADRAO.filter(
            t => grupoDoTemplate(t) === grupo.id && !templateIdsSalvos.has(t._templateId)
          );

          // Parcelas salvas no banco que pertencem a este grupo
          const parcelasSalvasDoGrupo = parcelasSalvas.filter(
            p => grupoDaParcela(p) === grupo.id
          );

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
                  {/* Templates sem versão salva */}
                  {templatesDoGrupo.map(t => <TemplateCard key={t._templateId} t={t} />)}
                  {/* Parcelas salvas no banco (customizadas ou criadas pelo usuário) */}
                  {parcelasSalvasDoGrupo.map(p => <ParcelaSalvaCard key={p.id} p={p} />)}
                </div>
              )}
            </div>
          );
        })}

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

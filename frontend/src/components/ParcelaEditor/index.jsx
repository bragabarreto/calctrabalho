import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GRUPOS_PADRAO } from '../../data/parcelasTemplates.js';

const FREQUENCIAS = [
  { value: 'horaria', label: 'Horária' },
  { value: 'diaria_6d', label: 'Diária (6 dias/sem)' },
  { value: 'diaria_5d', label: 'Diária (5 dias/sem)' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'unica', label: 'Única (valor fixo total)' },
];

const TIPO_VALOR = [
  { value: 'fixo', label: 'Valor fixo (R$)' },
  { value: 'percentual_salario', label: '% do salário (histórico mês a mês)' },
  { value: 'percentual_sm', label: '% do salário mínimo (histórico mês a mês)' },
  { value: 'percentual_historico', label: '% de histórico salarial específico' },
];

const REFLEXOS_OPCOES = [
  { value: 'ferias', label: 'Férias' },
  { value: 'decimo_terceiro', label: '13º Salário' },
  { value: 'fgts', label: 'FGTS' },
  { value: 'aviso_previo', label: 'Aviso Prévio' },
  { value: 'dsr', label: 'Repouso Semanal Remunerado (RSR)' },
];

const INICIAL = {
  nome: '',
  descricao: '',
  natureza: 'salarial',
  periodoTipo: 'contrato',
  periodoInicio: '',
  periodoFim: '',
  frequencia: 'mensal',
  tipoValor: 'fixo',
  valorBase: '',
  percentualBase: '',
  percentualAdicional: 0,
  baseHistoricoId: '',
  baseParcelaId: '',
  geraReflexos: false,
  reflexosEm: [],
  incideInss: false,
  incideIr: false,
  incideFgts: false,
  incidePrevidenciaPrivada: false,
  aliquotaPrevidenciaPrivada: '',
  grupoId: 'remuneracao',
};

/**
 * Editor de parcela (modal).
 *
 * @param {Object} parcela   - parcela existente para editar (null = nova)
 * @param {Function} onSalvar
 * @param {Function} onCancelar
 * @param {string} titulo
 * @param {Array} historicos - lista de históricos do cálculo atual
 * @param {boolean} mostrarGrupo - exibir seletor de grupo (padrão: true)
 */
export default function ParcelaEditor({
  parcela,
  onSalvar,
  onCancelar,
  titulo = 'Nova Parcela',
  historicos = [],
  mostrarGrupo = true,
}) {
  // Decompose baseHistoricoId into histId + parcelaId for the UI
  function decomporBaseHistoricoId(id) {
    if (!id) return { histId: '', parcelaId: '' };
    const [histId, parcelaId = ''] = id.split(':');
    return { histId, parcelaId };
  }

  const initial = {
    ...INICIAL,
    ...(parcela || {}),
    // Compatibilidade: templates usam campo 'grupo', parcelas do BD usam 'grupoId'
    grupoId: parcela?.grupoId || parcela?.grupo || 'remuneracao',
  };
  const { histId: initHistId, parcelaId: initParcelaId } = decomporBaseHistoricoId(initial.baseHistoricoId);

  const [form, setForm] = useState(initial);
  const [histSel, setHistSel] = useState(initHistId);
  const [parcelaSel, setParcelaSel] = useState(initParcelaId);

  function set(campo, valor) {
    // Quando mudar natureza de salarial para indenizatória, pedir confirmação
    if (campo === 'natureza' && valor === 'indenizatoria' && form.natureza === 'salarial') {
      const confirmar = window.confirm(
        'Alterar a natureza jurídica de salarial para indenizatória removerá todos os reflexos ' +
        '(férias, 13º, FGTS, aviso prévio) e incidências (INSS, IR). Deseja continuar?'
      );
      if (!confirmar) return;
      setForm((prev) => ({
        ...prev,
        natureza: 'indenizatoria',
        geraReflexos: false,
        reflexosEm: [],
        incideInss: false,
        incideIr: false,
        incideFgts: false,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function toggleReflexo(v) {
    setForm((prev) => ({
      ...prev,
      reflexosEm: prev.reflexosEm.includes(v)
        ? prev.reflexosEm.filter((r) => r !== v)
        : [...prev.reflexosEm, v],
    }));
  }

  // Parcelas disponíveis no histórico selecionado
  const histSelecionado = historicos.find((h) => h.id === histSel);
  const parcelasDoHist  = histSelecionado?.parcelas || [];

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) { alert('Nome da parcela é obrigatório.'); return; }

    if (form.tipoValor === 'percentual_historico') {
      if (!histSel) { alert('Selecione um histórico salarial como base.'); return; }
      if (!form.percentualBase) { alert('Informe o percentual a aplicar sobre o histórico.'); return; }
      // Sentinel 'reclamante': não usa parcelaSel
      const baseHistoricoId = histSel === 'reclamante'
        ? 'reclamante'
        : (parcelaSel ? `${histSel}:${parcelaSel}` : histSel);
      onSalvar({
        ...form,
        valorBase: null,
        percentualBase: Number(form.percentualBase) / 100,
        percentualAdicional: Number(form.percentualAdicional) / 100,
        baseHistoricoId,
        aliquotaPrevidenciaPrivada: form.aliquotaPrevidenciaPrivada !== '' ? Number(form.aliquotaPrevidenciaPrivada) / 100 : null,
      });
      return;
    }

    if (!form.valorBase && !form.percentualBase) {
      alert('Informe o valor base ou o percentual da parcela.'); return;
    }
    onSalvar({
      ...form,
      valorBase: form.valorBase !== '' ? Number(form.valorBase) : null,
      percentualBase: form.percentualBase !== '' ? Number(form.percentualBase) / 100 : null,
      percentualAdicional: Number(form.percentualAdicional) / 100,
      baseHistoricoId: null,
      aliquotaPrevidenciaPrivada: form.aliquotaPrevidenciaPrivada !== '' ? Number(form.aliquotaPrevidenciaPrivada) / 100 : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-titulo text-lg text-primaria">{titulo}</h3>
          <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome e natureza */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="campo-label">Nome da Parcela *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                className="campo-input"
                placeholder="Ex: Comissão de Vendas, Adicional de Sobreaviso..."
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="campo-label">Descrição / Fundamento Legal</label>
              <input
                type="text"
                value={form.descricao || ''}
                onChange={(e) => set('descricao', e.target.value)}
                className="campo-input"
                placeholder="Ex: Art. 59 CLT — horas extras"
              />
            </div>
            <div>
              <label className="campo-label">Natureza Jurídica</label>
              <select value={form.natureza} onChange={(e) => set('natureza', e.target.value)} className="campo-input">
                <option value="salarial">Salarial (gera reflexos)</option>
                <option value="indenizatoria">Indenizatória (não gera reflexos)</option>
              </select>
            </div>
            <div>
              <label className="campo-label">Frequência</label>
              <select value={form.frequencia} onChange={(e) => set('frequencia', e.target.value)} className="campo-input">
                {FREQUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Grupo temático na biblioteca */}
            {mostrarGrupo && (
              <div className="sm:col-span-2">
                <label className="campo-label">Grupo na Biblioteca</label>
                <select
                  value={form.grupoId || 'remuneracao'}
                  onChange={(e) => set('grupoId', e.target.value)}
                  className="campo-input"
                >
                  {GRUPOS_PADRAO.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Onde esta parcela aparecerá na biblioteca de parcelas.</p>
              </div>
            )}
          </div>

          {/* Período */}
          <div>
            <label className="campo-label">Período de Vigência</label>
            <div className="flex gap-4 mb-2">
              {[
                { v: 'contrato', l: 'Todo o contrato' },
                { v: 'especifico', l: 'Período específico' },
              ].map(({ v, l }) => (
                <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="periodoTipo"
                    value={v}
                    checked={form.periodoTipo === v}
                    onChange={() => set('periodoTipo', v)}
                  />
                  {l}
                </label>
              ))}
            </div>
            {form.periodoTipo === 'especifico' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="campo-label">Data Início</label>
                  <input type="date" value={form.periodoInicio} onChange={(e) => set('periodoInicio', e.target.value)} className="campo-input" />
                </div>
                <div>
                  <label className="campo-label">Data Fim</label>
                  <input type="date" value={form.periodoFim} onChange={(e) => set('periodoFim', e.target.value)} className="campo-input" />
                </div>
              </div>
            )}
          </div>

          {/* Base de Cálculo */}
          <div className="space-y-3">
            <div>
              <label className="campo-label">Base de Cálculo</label>
              <select value={form.tipoValor} onChange={(e) => set('tipoValor', e.target.value)} className="campo-input">
                {TIPO_VALOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {form.tipoValor === 'fixo' && (
              <div>
                <label className="campo-label">Valor Base (R$)</label>
                <input type="number" value={form.valorBase} onChange={(e) => set('valorBase', e.target.value)} className="campo-input" step="0.01" min="0" placeholder="0.00" />
              </div>
            )}

            {(form.tipoValor === 'percentual_salario' || form.tipoValor === 'percentual_sm') && (
              <div>
                <label className="campo-label">Percentual (%)</label>
                <input type="number" value={form.percentualBase} onChange={(e) => set('percentualBase', e.target.value)} className="campo-input" step="0.1" min="0" placeholder="0.0" />
                <p className="text-xs text-gray-400 mt-1">
                  {form.tipoValor === 'percentual_sm'
                    ? 'Aplicado sobre o salário mínimo de cada competência (cálculo mês a mês)'
                    : 'Aplicado sobre o salário de cada competência do histórico salarial (cálculo mês a mês)'}
                </p>
              </div>
            )}

            {form.tipoValor === 'percentual_historico' && (
              <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <label className="campo-label">Histórico Salarial</label>
                  <select
                    value={histSel}
                    onChange={(e) => {
                      setHistSel(e.target.value);
                      setParcelaSel('');
                    }}
                    className="campo-input"
                  >
                    <option value="">Selecione o histórico...</option>
                    <option value="reclamante">↪ Histórico do Reclamante (principal)</option>
                    {historicos.map((h) => (
                      <option key={h.id} value={h.id}>{h.titulo}</option>
                    ))}
                  </select>

                  {/* Contexto: biblioteca (sem históricos disponíveis) */}
                  {historicos.length === 0 && histSel !== 'reclamante' && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-1">
                      Nenhum histórico disponível aqui. Selecione <strong>"Histórico do Reclamante"</strong> para vincular
                      permanentemente ao histórico principal do reclamante — que será exigido no cálculo.
                    </p>
                  )}

                  {/* Informativo quando sentinel reclamante está selecionado */}
                  {histSel === 'reclamante' && (
                    <p className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded p-2 mt-1">
                      Esta parcela usará automaticamente o histórico principal do reclamante em cada cálculo.
                      Se nenhum histórico estiver cadastrado, o cálculo exibirá um aviso de erro para esta parcela.
                      Em cálculos com múltiplos históricos, o usuário poderá escolher outro.
                    </p>
                  )}
                </div>

                {/* Parcela específica — disponível apenas para histórico concreto (não para sentinel) */}
                {histSel && histSel !== 'reclamante' && parcelasDoHist.length > 0 && (
                  <div>
                    <label className="campo-label">Parcela Específica (opcional)</label>
                    <select
                      value={parcelaSel}
                      onChange={(e) => setParcelaSel(e.target.value)}
                      className="campo-input"
                    >
                      <option value="">Todas as parcelas (soma)</option>
                      {parcelasDoHist.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Deixe em branco para somar todas as parcelas do histórico.</p>
                  </div>
                )}

                <div>
                  <label className="campo-label">Percentual a aplicar (%)</label>
                  <input
                    type="number"
                    value={form.percentualBase}
                    onChange={(e) => set('percentualBase', e.target.value)}
                    className="campo-input"
                    step="0.1" min="0" placeholder="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ex: 100 = valor integral do histórico; 30 = 30% do histórico</p>
                </div>
              </div>
            )}

            {form.tipoValor !== 'fixo' && (
              <div>
                <label className="campo-label">Adicional sobre o valor calculado (%)</label>
                <input
                  type="number"
                  value={form.percentualAdicional}
                  onChange={(e) => set('percentualAdicional', e.target.value)}
                  className="campo-input"
                  step="1"
                  min="0"
                  placeholder="0"
                />
                <p className="text-xs text-gray-400 mt-1">Ex: 50 para acrescentar 50% sobre o valor calculado</p>
              </div>
            )}
          </div>

          {/* Reflexos */}
          {form.natureza === 'salarial' && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="geraReflexos"
                  checked={form.geraReflexos}
                  onChange={(e) => set('geraReflexos', e.target.checked)}
                />
                <label htmlFor="geraReflexos" className="campo-label mb-0">Gera reflexos em outras verbas</label>
              </div>
              {form.geraReflexos && (
                <div className="grid grid-cols-2 gap-2 mt-2 pl-4">
                  {REFLEXOS_OPCOES.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.reflexosEm.includes(value)}
                        onChange={() => toggleReflexo(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incidências */}
          <div>
            <p className="campo-label mb-2">Incidências</p>
            <div className="flex gap-6 flex-wrap">
              {[
                { campo: 'incideInss', label: 'INSS' },
                { campo: 'incideIr', label: 'Imposto de Renda' },
                { campo: 'incideFgts', label: 'FGTS' },
              ].map(({ campo, label }) => (
                <label key={campo} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[campo]}
                    onChange={(e) => set(campo, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.incidePrevidenciaPrivada}
                  onChange={(e) => set('incidePrevidenciaPrivada', e.target.checked)}
                />
                Previdência Privada
              </label>
            </div>
            {form.incidePrevidenciaPrivada && (
              <div className="pl-4 mt-2">
                <label className="campo-label">Alíquota Previdência Privada (%)</label>
                <input
                  type="number"
                  value={form.aliquotaPrevidenciaPrivada}
                  onChange={(e) => set('aliquotaPrevidenciaPrivada', e.target.value)}
                  className="campo-input max-w-xs"
                  step="0.1" min="0" max="100"
                  placeholder="Ex: 3.5"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" className="btn-secundario" onClick={onCancelar}>Cancelar</button>
            <button type="submit" className="btn-primario">Salvar Parcela</button>
          </div>
        </form>
      </div>
    </div>
  );
}

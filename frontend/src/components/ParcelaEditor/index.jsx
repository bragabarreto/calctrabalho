import React, { useState } from 'react';
import { X } from 'lucide-react';

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
  { value: 'percentual_salario', label: '% do último salário' },
  { value: 'percentual_sm', label: '% do salário mínimo' },
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
  natureza: 'salarial',
  periodoTipo: 'contrato',
  periodoInicio: '',
  periodoFim: '',
  frequencia: 'mensal',
  tipoValor: 'fixo',
  valorBase: '',
  percentualBase: '',
  percentualAdicional: 0,
  geraReflexos: false,
  reflexosEm: [],
  incideInss: false,
  incideIr: false,
  incideFgts: false,
  incidePrevidenciaPrivada: false,
  aliquotaPrevidenciaPrivada: '',
};

export default function ParcelaEditor({ parcela, onSalvar, onCancelar, titulo = 'Nova Parcela' }) {
  const [form, setForm] = useState({ ...INICIAL, ...(parcela || {}) });

  function set(campo, valor) {
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

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) { alert('Nome da parcela é obrigatório.'); return; }
    if (!form.valorBase && !form.percentualBase) {
      alert('Informe o valor base ou o percentual da parcela.'); return;
    }
    onSalvar({
      ...form,
      valorBase: form.valorBase !== '' ? Number(form.valorBase) : null,
      percentualBase: form.percentualBase !== '' ? Number(form.percentualBase) / 100 : null,
      percentualAdicional: Number(form.percentualAdicional) / 100,
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

          {/* Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="campo-label">Tipo de Valor</label>
              <select value={form.tipoValor} onChange={(e) => set('tipoValor', e.target.value)} className="campo-input">
                {TIPO_VALOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              {form.tipoValor === 'fixo' ? (
                <>
                  <label className="campo-label">Valor Base (R$)</label>
                  <input type="number" value={form.valorBase} onChange={(e) => set('valorBase', e.target.value)} className="campo-input" step="0.01" min="0" placeholder="0.00" />
                </>
              ) : (
                <>
                  <label className="campo-label">Percentual (%)</label>
                  <input type="number" value={form.percentualBase} onChange={(e) => set('percentualBase', e.target.value)} className="campo-input" step="0.1" min="0" placeholder="0.0" />
                </>
              )}
            </div>
            <div>
              <label className="campo-label">Adicional sobre o valor (%)</label>
              <input
                type="number"
                value={form.percentualAdicional}
                onChange={(e) => set('percentualAdicional', e.target.value)}
                className="campo-input"
                step="1"
                min="0"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">Ex: 50 para adicionar 50% sobre o valor calculado</p>
            </div>
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

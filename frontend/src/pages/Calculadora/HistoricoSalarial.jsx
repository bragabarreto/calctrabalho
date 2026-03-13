import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

/** '2020-01' → '01/2020' (formato numérico compacto) */
function fmtComp(data) {
  if (!data) return '—';
  const [ano, mes] = data.split('-');
  return `${mes}/${ano}`;
}

/** Devolve o mês anterior no formato 'YYYY-MM' */
function mesAnterior(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Resolve sobreposições entre faixas.
 * Ordena por início; quando faixa A sobrepõe faixa B,
 * o fim efetivo de A passa a ser o mês anterior ao início de B
 * (faixa mais recente prevalece no mês de coincidência).
 */
function resolverFaixas(faixas) {
  const sorted = [...faixas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return sorted.map((f, i) => {
    const next = sorted[i + 1];
    let fimEfetivo = f.fim;
    if (next && (!f.fim || f.fim >= next.inicio)) {
      fimEfetivo = mesAnterior(next.inicio);
    }
    const sobreposicao = f.fim && next && f.fim >= next.inicio;
    return { ...f, fimEfetivo, sobreposicao };
  });
}

function FormFaixa({ onAdicionar }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valor, setValor] = useState('');

  function submit() {
    if (!inicio || !valor) return;
    onAdicionar({ inicio, fim: fim || null, valor: parseFloat(valor) });
    setInicio(''); setFim(''); setValor('');
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Adicionar faixa
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="campo-label">Início * <span className="text-gray-400 font-normal">(mês/ano)</span></label>
          <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo-input" />
        </div>
        <div>
          <label className="campo-label">Fim <span className="text-gray-400 font-normal">(vazio = vigente)</span></label>
          <input type="month" value={fim} onChange={(e) => setFim(e.target.value)} className="campo-input" />
        </div>
        <div>
          <label className="campo-label">Valor (R$) *</label>
          <input
            type="number" value={valor} onChange={(e) => setValor(e.target.value)}
            className="campo-input" step="0.01" min="0" placeholder="0,00"
          />
        </div>
      </div>
      <button
        type="button" onClick={submit}
        disabled={!inicio || !valor}
        className="btn-secundario flex items-center gap-1 text-sm mt-3 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar faixa
      </button>
    </div>
  );
}

export default function HistoricoSalarial() {
  const { dados, setDados } = useCalculoStore();
  const historicos = dados.historicosSalariais || [];
  const [expandido, setExpandido] = useState(null);

  function addHistorico() {
    const novo = { id: `hist_${Date.now()}`, titulo: 'Novo Histórico', faixas: [] };
    setDados({ historicosSalariais: [...historicos, novo] });
    setExpandido(novo.id);
  }

  function removeHistorico(id) {
    setDados({ historicosSalariais: historicos.filter((h) => h.id !== id) });
    if (expandido === id) setExpandido(null);
  }

  function updateTitulo(id, titulo) {
    setDados({ historicosSalariais: historicos.map((h) => h.id === id ? { ...h, titulo } : h) });
  }

  function addFaixa(id, faixa) {
    setDados({
      historicosSalariais: historicos.map((h) =>
        h.id === id
          ? { ...h, faixas: [...(h.faixas || []), faixa].sort((a, b) => a.inicio.localeCompare(b.inicio)) }
          : h
      ),
    });
  }

  function removeFaixa(histId, idx) {
    setDados({
      historicosSalariais: historicos.map((h) =>
        h.id === histId ? { ...h, faixas: h.faixas.filter((_, i) => i !== idx) } : h
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={addHistorico}
          className="btn-secundario flex items-center gap-2 text-sm">
          <Plus size={14} /> Adicionar Histórico Salarial
        </button>
      </div>

      {historicos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhum histórico criado. Clique no botão acima para adicionar.
        </p>
      )}

      {historicos.map((h) => {
        const isOpen = expandido === h.id;
        const faixas = h.faixas || [];
        const resolvidas = resolverFaixas(faixas);
        const temSobreposicao = resolvidas.some((f) => f.sobreposicao);
        const ultimoValor = faixas.length > 0
          ? faixas[faixas.length - 1].valor
          : null;

        return (
          <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandido(isOpen ? null : h.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-gray-800 truncate">{h.titulo}</span>
                {faixas.length > 0 && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {faixas.length} {faixas.length === 1 ? 'faixa' : 'faixas'}
                    {ultimoValor !== null && (
                      <span className="ml-1 text-gray-600 font-medium">
                        · {formatBRL(ultimoValor)}/mês (atual)
                      </span>
                    )}
                  </span>
                )}
                {temSobreposicao && (
                  <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0">
                    <AlertCircle size={11} /> sobreposição ajustada
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); removeHistorico(h.id); }}
                  className="text-red-400 hover:text-red-600 p-1" title="Remover histórico">
                  <Trash2 size={14} />
                </button>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="p-4">
                <div className="mb-4">
                  <label className="campo-label">Nome / Rubrica</label>
                  <input
                    type="text" value={h.titulo}
                    onChange={(e) => updateTitulo(h.id, e.target.value)}
                    className="campo-input"
                    placeholder="Ex: Salário Base, Piso da Categoria, Salário Paradigma..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Este nome será exibido como opção de base de cálculo nas parcelas mensais.
                  </p>
                </div>

                {faixas.length > 0 ? (
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-gray-500 font-medium text-xs">Início</th>
                          <th className="text-left py-2 text-gray-500 font-medium text-xs pl-2">Fim cadastrado</th>
                          <th className="text-left py-2 text-gray-500 font-medium text-xs pl-2">Fim efetivo</th>
                          <th className="text-right py-2 text-gray-500 font-medium text-xs">Valor</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resolvidas.map((f, idx) => (
                          <tr key={idx} className={`border-b border-gray-50 ${f.sobreposicao ? 'bg-amber-50' : ''}`}>
                            <td className="py-2 font-mono text-xs">{fmtComp(f.inicio)}</td>
                            <td className="py-2 pl-2 font-mono text-xs text-gray-500">
                              {f.fim ? fmtComp(f.fim) : <span className="italic text-gray-400">vigente</span>}
                            </td>
                            <td className="py-2 pl-2 font-mono text-xs">
                              {f.fimEfetivo
                                ? <span className={f.sobreposicao ? 'text-amber-700 font-medium' : ''}>{fmtComp(f.fimEfetivo)}</span>
                                : <span className="italic text-green-600">vigente</span>}
                            </td>
                            <td className="py-2 text-right font-mono font-semibold text-sm">{formatBRL(f.valor)}</td>
                            <td className="py-2">
                              <button type="button" onClick={() => removeFaixa(h.id, idx)}
                                className="text-red-400 hover:text-red-600">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {temSobreposicao && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} />
                        Sobreposição detectada: o fim efetivo da faixa anterior foi ajustado automaticamente.
                        Faixa mais recente prevalece no mês de coincidência.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-3 mb-2">
                    Nenhuma faixa cadastrada. Adicione abaixo.
                  </p>
                )}

                <FormFaixa onAdicionar={(faixa) => addFaixa(h.id, faixa)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

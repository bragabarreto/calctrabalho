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

function FormFaixa({ onAdicionar, minMes, maxMes }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valor, setValor] = useState('');

  function submit() {
    if (!inicio || !valor) return;
    onAdicionar({ inicio, fim: fim || null, valor: parseFloat(valor) });
    setInicio(''); setFim(''); setValor('');
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Adicionar faixa
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="campo-label">Início * <span className="text-gray-400 font-normal">(mês/ano)</span></label>
          <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo-input" min={minMes} max={maxMes} />
        </div>
        <div>
          <label className="campo-label">Fim <span className="text-gray-400 font-normal">(vazio = vigente)</span></label>
          <input type="month" value={fim} onChange={(e) => setFim(e.target.value)} className="campo-input" min={minMes || inicio} max={maxMes} />
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
        className="btn-secundario flex items-center gap-1 text-sm mt-2 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar faixa
      </button>
    </div>
  );
}

function TabelaFaixas({ faixas, onRemover }) {
  const resolvidas = resolverFaixas(faixas);
  const temSobreposicao = resolvidas.some((f) => f.sobreposicao);

  if (faixas.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-2">Nenhuma faixa cadastrada.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-1 text-gray-500 font-medium text-xs">Início</th>
            <th className="text-left py-1 text-gray-500 font-medium text-xs pl-2">Fim cad.</th>
            <th className="text-left py-1 text-gray-500 font-medium text-xs pl-2">Fim efetivo</th>
            <th className="text-right py-1 text-gray-500 font-medium text-xs">Valor</th>
            <th className="w-6"></th>
          </tr>
        </thead>
        <tbody>
          {resolvidas.map((f, idx) => (
            <tr key={idx} className={`border-b border-gray-50 ${f.sobreposicao ? 'bg-amber-50' : ''}`}>
              <td className="py-1 font-mono text-xs">{fmtComp(f.inicio)}</td>
              <td className="py-1 pl-2 font-mono text-xs text-gray-500">
                {f.fim ? fmtComp(f.fim) : <span className="italic text-gray-400">vigente</span>}
              </td>
              <td className="py-1 pl-2 font-mono text-xs">
                {f.fimEfetivo
                  ? <span className={f.sobreposicao ? 'text-amber-700 font-medium' : ''}>{fmtComp(f.fimEfetivo)}</span>
                  : <span className="italic text-green-600">vigente</span>}
              </td>
              <td className="py-1 text-right font-mono font-semibold text-xs">{formatBRL(f.valor)}</td>
              <td className="py-1">
                <button type="button" onClick={() => onRemover(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {temSobreposicao && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle size={11} />
          Sobreposição detectada — fim efetivo da faixa anterior ajustado automaticamente.
        </p>
      )}
    </div>
  );
}

/** Painel de uma parcela dentro do histórico */
function ParcelaPanel({ parcela, histId, onUpdate, onRemover, minMes, maxMes }) {
  const [aberta, setAberta] = useState(false);

  function addFaixa(faixa) {
    const novasFaixas = [...(parcela.faixas || []), faixa].sort((a, b) => a.inicio.localeCompare(b.inicio));
    onUpdate({ ...parcela, faixas: novasFaixas });
  }

  function removeFaixa(idx) {
    onUpdate({ ...parcela, faixas: parcela.faixas.filter((_, i) => i !== idx) });
  }

  const ultimoValor = parcela.faixas?.length > 0 ? parcela.faixas[parcela.faixas.length - 1].valor : null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setAberta(!aberta)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm text-gray-800 truncate">{parcela.nome}</span>
          {parcela.faixas?.length > 0 && (
            <span className="text-xs text-gray-400 shrink-0">
              {parcela.faixas.length} {parcela.faixas.length === 1 ? 'faixa' : 'faixas'}
              {ultimoValor !== null && (
                <span className="ml-1 text-gray-600 font-medium">· {formatBRL(ultimoValor)}/mês (atual)</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemover(); }}
            className="text-red-400 hover:text-red-600 p-0.5"
            title="Remover parcela"
          >
            <Trash2 size={13} />
          </button>
          {aberta ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>
      {aberta && (
        <div className="p-3">
          <TabelaFaixas faixas={parcela.faixas || []} onRemover={removeFaixa} />
          <FormFaixa onAdicionar={addFaixa} minMes={minMes} maxMes={maxMes} />
        </div>
      )}
    </div>
  );
}

/** Formulário para adicionar nova parcela */
function FormParcela({ onAdicionar }) {
  const [nome, setNome] = useState('');

  function submit() {
    if (!nome.trim()) return;
    onAdicionar({ id: `parc_${Date.now()}`, nome: nome.trim(), faixas: [] });
    setNome('');
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="campo-input flex-1"
        placeholder="Nome da rubrica (ex: Salário Base, Adicional de Função...)"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!nome.trim()}
        className="btn-secundario flex items-center gap-1 text-sm shrink-0 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar
      </button>
    </div>
  );
}

export default function HistoricoSalarial({ dataAdmissao, dataDispensa }) {
  const { dados, setDados } = useCalculoStore();
  const historicos = dados.historicosSalariais || [
    { id: 'reclamante', titulo: 'Reclamante', fixo: true, parcelas: [] },
  ];
  const [expandido, setExpandido] = useState(null);

  const minMes = dataAdmissao ? dataAdmissao.slice(0, 7) : undefined; // 'YYYY-MM'
  const maxMes = dataDispensa ? dataDispensa.slice(0, 7) : undefined; // 'YYYY-MM'

  function setHistoricos(nova) {
    setDados({ historicosSalariais: nova });
  }

  function addHistorico() {
    const novo = { id: `hist_${Date.now()}`, titulo: 'Novo Histórico', fixo: false, parcelas: [] };
    setHistoricos([...historicos, novo]);
    setExpandido(novo.id);
  }

  function removeHistorico(id) {
    setHistoricos(historicos.filter((h) => h.id !== id));
    if (expandido === id) setExpandido(null);
  }

  function updateTitulo(id, titulo) {
    setHistoricos(historicos.map((h) => h.id === id ? { ...h, titulo } : h));
  }

  function addParcela(histId, parcela) {
    setHistoricos(historicos.map((h) =>
      h.id === histId ? { ...h, parcelas: [...(h.parcelas || []), parcela] } : h
    ));
  }

  function updateParcela(histId, parcelaId, parcelaAtualizada) {
    setHistoricos(historicos.map((h) =>
      h.id === histId
        ? { ...h, parcelas: h.parcelas.map((p) => p.id === parcelaId ? parcelaAtualizada : p) }
        : h
    ));
  }

  function removeParcela(histId, parcelaId) {
    setHistoricos(historicos.map((h) =>
      h.id === histId
        ? { ...h, parcelas: h.parcelas.filter((p) => p.id !== parcelaId) }
        : h
    ));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Registre a evolução de cada rubrica ao longo do contrato. Use como base de cálculo nas parcelas mensais.
          {minMes && maxMes && (
            <span className="ml-1 font-medium text-gray-600">Período: {minMes.split('-').reverse().join('/')} a {maxMes.split('-').reverse().join('/')}</span>
          )}
        </p>
        <button type="button" onClick={addHistorico}
          className="btn-secundario flex items-center gap-2 text-sm shrink-0 ml-3">
          <Plus size={14} /> Novo Histórico
        </button>
      </div>

      {historicos.map((h) => {
        const isOpen = expandido === h.id;
        const totalParcelas = (h.parcelas || []).length;

        return (
          <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandido(isOpen ? null : h.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {h.fixo && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Principal
                  </span>
                )}
                <span className="font-semibold text-sm text-gray-800 truncate">{h.titulo}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {totalParcelas} {totalParcelas === 1 ? 'rubrica' : 'rubricas'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {!h.fixo && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); removeHistorico(h.id); }}
                    className="text-red-400 hover:text-red-600 p-1" title="Remover histórico">
                    <Trash2 size={14} />
                  </button>
                )}
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="p-4">
                {!h.fixo && (
                  <div className="mb-4">
                    <label className="campo-label">Nome do Histórico</label>
                    <input
                      type="text" value={h.titulo}
                      onChange={(e) => updateTitulo(h.id, e.target.value)}
                      className="campo-input"
                      placeholder="Ex: Paradigma, Salário da Categoria..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Rubricas / Parcelas
                  </p>
                  {h.fixo && (
                    <p className="text-xs text-gray-400 mb-2">
                      Cada rubrica representa um componente salarial do reclamante com sua evolução histórica.
                      Para usar como base de cálculo em parcelas mensais, selecione <strong>{h.titulo} → [rubrica]</strong>.
                    </p>
                  )}

                  {(h.parcelas || []).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Nenhuma rubrica cadastrada.
                    </p>
                  )}

                  {(h.parcelas || []).map((parcela) => (
                    <ParcelaPanel
                      key={parcela.id}
                      parcela={parcela}
                      histId={h.id}
                      onUpdate={(p) => updateParcela(h.id, parcela.id, p)}
                      onRemover={() => removeParcela(h.id, parcela.id)}
                      minMes={minMes}
                      maxMes={maxMes}
                    />
                  ))}

                  <FormParcela onAdicionar={(p) => addParcela(h.id, p)} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatCompetencia(data) {
  if (!data) return '—';
  const [ano, mes] = data.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${meses[parseInt(mes, 10) - 1]}/${ano}`;
}

function FormEntrada({ onAdicionar }) {
  const [competencia, setCompetencia] = useState('');
  const [rubrica, setRubrica] = useState('');
  const [valor, setValor] = useState('');

  function submit() {
    if (!competencia || !rubrica || !valor) return;
    onAdicionar({ competencia, rubrica, valor: parseFloat(valor) });
    setCompetencia('');
    setRubrica('');
    setValor('');
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Adicionar entrada</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="campo-label">Competência</label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="campo-input"
          />
        </div>
        <div>
          <label className="campo-label">Rubrica</label>
          <input
            type="text"
            value={rubrica}
            onChange={(e) => setRubrica(e.target.value)}
            className="campo-input"
            placeholder="Ex: Salário base, Comissão..."
          />
        </div>
        <div>
          <label className="campo-label">Valor (R$)</label>
          <input
            type="number"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="campo-input"
            step="0.01"
            min="0"
            placeholder="0,00"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!competencia || !rubrica || !valor}
        className="btn-secundario flex items-center gap-1 text-sm mt-3 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar
      </button>
    </div>
  );
}

export default function HistoricoSalarial() {
  const { dados, setDados } = useCalculoStore();
  const historicos = dados.historicosSalariais || [];

  const [expandido, setExpandido] = useState(null);

  function addHistorico(tipo) {
    const novo = {
      id: `hist_${Date.now()}`,
      titulo: tipo === 'reclamante' ? 'Histórico Reclamante' : 'Histórico Paradigma',
      tipo,
      entradas: [],
    };
    setDados({ historicosSalariais: [...historicos, novo] });
    setExpandido(novo.id);
  }

  function removeHistorico(id) {
    setDados({ historicosSalariais: historicos.filter((h) => h.id !== id) });
    if (expandido === id) setExpandido(null);
  }

  function updateTitulo(id, titulo) {
    setDados({
      historicosSalariais: historicos.map((h) => (h.id === id ? { ...h, titulo } : h)),
    });
  }

  function addEntrada(id, entrada) {
    setDados({
      historicosSalariais: historicos.map((h) =>
        h.id === id
          ? {
              ...h,
              entradas: [...h.entradas, entrada].sort((a, b) =>
                a.competencia.localeCompare(b.competencia)
              ),
            }
          : h
      ),
    });
  }

  function removeEntrada(histId, idx) {
    setDados({
      historicosSalariais: historicos.map((h) =>
        h.id === histId
          ? { ...h, entradas: h.entradas.filter((_, i) => i !== idx) }
          : h
      ),
    });
  }

  return (
    <div className="space-y-3">
      {/* Botões para adicionar histórico */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addHistorico('reclamante')}
          className="btn-secundario flex items-center gap-2 text-sm"
        >
          <User size={14} />
          Adicionar Histórico do Reclamante
        </button>
        <button
          type="button"
          onClick={() => addHistorico('paradigma')}
          className="btn-secundario flex items-center gap-2 text-sm"
        >
          <Users size={14} />
          Adicionar Histórico do Paradigma
        </button>
      </div>

      {historicos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Nenhum histórico criado. Use os botões acima para adicionar.
        </p>
      )}

      {/* Lista de históricos */}
      {historicos.map((h) => {
        const isOpen = expandido === h.id;
        const total = h.entradas.reduce((acc, e) => acc + (e.valor || 0), 0);

        return (
          <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho colapsível */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandido(isOpen ? null : h.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {h.tipo === 'reclamante' ? (
                  <User size={15} className="text-primaria shrink-0" />
                ) : (
                  <Users size={15} className="text-secundaria shrink-0" />
                )}
                <span className="font-semibold text-sm text-gray-800 truncate">{h.titulo}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    h.tipo === 'reclamante'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {h.tipo === 'reclamante' ? 'Reclamante' : 'Paradigma'}
                </span>
                {h.entradas.length > 0 && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {h.entradas.length} {h.entradas.length === 1 ? 'entrada' : 'entradas'} · {formatBRL(total)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHistorico(h.id);
                  }}
                  className="text-red-400 hover:text-red-600 p-1"
                  title="Remover histórico"
                >
                  <Trash2 size={14} />
                </button>
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="p-4">
                {/* Campo de título editável */}
                <div className="mb-4">
                  <label className="campo-label">Título do histórico</label>
                  <input
                    type="text"
                    value={h.titulo}
                    onChange={(e) => updateTitulo(h.id, e.target.value)}
                    className="campo-input"
                    placeholder="Ex: Diferenças salariais por piso"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Tabela de entradas */}
                {h.entradas.length > 0 ? (
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-gray-500 font-medium">Competência</th>
                          <th className="text-left py-2 text-gray-500 font-medium pl-3">Rubrica</th>
                          <th className="text-right py-2 text-gray-500 font-medium">Valor</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {h.entradas.map((e, idx) => (
                          <tr key={idx} className="border-b border-gray-50">
                            <td className="py-2 font-mono text-xs">{formatCompetencia(e.competencia)}</td>
                            <td className="py-2 pl-3 text-gray-600 text-xs">{e.rubrica}</td>
                            <td className="py-2 text-right font-mono font-semibold">{formatBRL(e.valor)}</td>
                            <td className="py-2">
                              <button
                                type="button"
                                onClick={() => removeEntrada(h.id, idx)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200">
                          <td colSpan={2} className="py-2 text-xs font-semibold text-gray-500">Total</td>
                          <td className="py-2 text-right font-mono font-bold text-primaria">{formatBRL(total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-3 mb-2">
                    Nenhuma entrada. Adicione abaixo.
                  </p>
                )}

                {/* Formulário de nova entrada */}
                <FormEntrada onAdicionar={(entrada) => addEntrada(h.id, entrada)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

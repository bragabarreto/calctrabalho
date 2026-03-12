import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulacoes } from '../../hooks/useSimulacao.js';
import { useComparacoes, useCriarComparacao } from '../../hooks/useComparacao.js';
import { Link } from 'react-router-dom';
import { GitCompare } from 'lucide-react';

export default function ComparacaoPage() {
  const navigate = useNavigate();
  const { data: simsData } = useSimulacoes({});
  const { data: compsData } = useComparacoes();
  const { mutateAsync: criar } = useCriarComparacao();

  const [selecionados, setSelecionados] = useState([]);
  const [nome, setNome] = useState('');

  const simulacoes = simsData?.dados || [];
  const comparacoes = compsData?.dados || [];

  function toggleSelecionado(id) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  async function criarComparacao() {
    if (selecionados.length < 2) { alert('Selecione pelo menos 2 simulações.'); return; }
    if (!nome) { alert('Informe um nome para a comparação.'); return; }
    try {
      const resp = await criar({ nome, simulacao_ids: selecionados });
      navigate(`/comparacao/${resp.id}`);
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  }

  return (
    <div className="p-6">
      <div className="bg-primaria text-white px-6 py-4 -mx-6 -mt-6 mb-6">
        <h2 className="font-titulo text-2xl">Comparação de Cenários</h2>
        <p className="text-blue-200 text-sm mt-1">Compare até 4 simulações lado a lado</p>
      </div>

      {/* Comparações existentes */}
      {comparacoes.length > 0 && (
        <div className="card p-5 mb-5">
          <h3 className="font-titulo text-lg mb-3 text-primaria">Comparações Salvas</h3>
          <div className="space-y-2">
            {comparacoes.map((c) => (
              <Link key={c.id} to={`/comparacao/${c.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-blue-50 transition-colors">
                <div>
                  <span className="font-medium text-sm">{c.nome}</span>
                  <span className="ml-2 text-xs text-gray-400">{c.simulacao_ids?.length} cenários</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(c.criado_em).toLocaleDateString('pt-BR')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nova comparação */}
      <div className="card p-5">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Nova Comparação</h3>

        <div className="mb-4">
          <label className="campo-label">Nome da Comparação</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="campo-input max-w-sm" placeholder="Ex: João Silva — 3 Cenários" />
        </div>

        <p className="text-sm text-gray-500 mb-3">
          Selecione de 2 a 4 simulações para comparar ({selecionados.length}/4 selecionadas):
        </p>

        {!simulacoes.length ? (
          <p className="text-gray-400 text-sm py-4">
            Nenhuma simulação salva. <Link to="/" className="text-blue-600">Crie uma simulação</Link> primeiro.
          </p>
        ) : (
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {simulacoes.map((s) => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                selecionados.includes(s.id) ? 'border-primaria bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={selecionados.includes(s.id)}
                  onChange={() => toggleSelecionado(s.id)}
                  disabled={!selecionados.includes(s.id) && selecionados.length >= 4}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm block truncate">{s.nome}</span>
                  <span className="text-xs text-gray-400">
                    {s.numero_processo || '—'} · {s.modalidade}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          className="btn-primario flex items-center gap-2"
          onClick={criarComparacao}
          disabled={selecionados.length < 2}
        >
          <GitCompare size={16} />
          Comparar {selecionados.length > 0 ? `(${selecionados.length})` : ''}
        </button>
      </div>
    </div>
  );
}

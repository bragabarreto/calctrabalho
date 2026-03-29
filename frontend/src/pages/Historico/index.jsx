import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimulacoes, useExcluirSimulacao } from '../../hooks/useSimulacao.js';
import { Trash2, Eye, Search } from 'lucide-react';

const MODALIDADE_LABELS = {
  sem_justa_causa: 'Sem Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  culpa_reciproca: 'Culpa Recíproca',
  rescisao_indireta: 'Rescisão Indireta',
  justa_causa: 'Justa Causa',
};

export default function HistoricoPage() {
  const [filtros, setFiltros] = useState({ processo: '', modalidade: '' });
  const { data, isLoading, error } = useSimulacoes(filtros);
  const { mutate: excluir } = useExcluirSimulacao();

  function handleFiltro(e) {
    setFiltros((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  if (isLoading) return <div className="p-8 text-gray-500">Carregando...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error.message}</div>;

  return (
    <div className="p-6">
      <div className="bg-primaria text-white px-6 py-4 -mx-6 -mt-6 mb-6">
        <h2 className="font-titulo text-2xl">Histórico de Simulações</h2>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            name="processo"
            placeholder="Filtrar por processo..."
            value={filtros.processo}
            onChange={handleFiltro}
            className="campo-input flex-1"
          />
        </div>
        <select name="modalidade" value={filtros.modalidade} onChange={handleFiltro} className="campo-input w-48">
          <option value="">Todas as modalidades</option>
          {Object.entries(MODALIDADE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {!data?.dados?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">Nenhuma simulação salva</p>
          <Link to="/" className="btn-primario inline-block">Nova Simulação</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tabela-memoria">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Processo</th>
                <th>Modalidade</th>
                <th>Admissão</th>
                <th>Dispensa</th>
                <th>Salário</th>
                <th>Criado em</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.dados.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.nome}</td>
                  <td className="text-xs font-mono">{s.numero_processo || '—'}</td>
                  <td><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{MODALIDADE_LABELS[s.modalidade] || s.modalidade}</span></td>
                  <td className="text-xs">{s.data_admissao ? new Date(s.data_admissao).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="text-xs">{s.data_dispensa ? new Date(s.data_dispensa).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="valor-monetario text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.ultimo_salario)}</td>
                  <td className="text-xs text-gray-400">{new Date(s.criado_em).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/historico/${s.id}`} title="Ver detalhes">
                        <Eye size={16} className="text-blue-600 hover:text-blue-800" />
                      </Link>
                      <button
                        onClick={() => confirm('Excluir esta simulação?') && excluir(s.id)}
                        title="Excluir"
                      >
                        <Trash2 size={16} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

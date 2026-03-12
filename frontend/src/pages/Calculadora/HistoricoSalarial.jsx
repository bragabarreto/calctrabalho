import React, { useState } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
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

export default function HistoricoSalarial({ tipo = 'reclamante', titulo = 'Reclamante' }) {
  const { dados, setDados } = useCalculoStore();
  const chave = tipo === 'reclamante' ? 'historicoSalarial' : 'historicoSalarialParadigma';
  const historico = dados[chave] || [];

  const [novaCompetencia, setNovaCompetencia] = useState('');
  const [novoSalario, setNovoSalario] = useState('');
  const [novaObs, setNovaObs] = useState('');

  function adicionar() {
    if (!novaCompetencia || !novoSalario) return;
    const novo = {
      competencia: novaCompetencia,
      salario: parseFloat(novoSalario),
      observacao: novaObs,
    };
    const atualizado = [...historico, novo].sort((a, b) => a.competencia.localeCompare(b.competencia));
    setDados({ [chave]: atualizado });
    setNovaCompetencia('');
    setNovoSalario('');
    setNovaObs('');
  }

  function remover(idx) {
    setDados({ [chave]: historico.filter((_, i) => i !== idx) });
  }

  const variacao = historico.length >= 2
    ? ((historico[historico.length - 1].salario / historico[0].salario - 1) * 100).toFixed(1)
    : null;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-titulo text-lg text-primaria">{titulo}</h3>
          {variacao !== null && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <TrendingUp size={12} />
              Variação total: {variacao}%
            </p>
          )}
        </div>
      </div>

      {/* Tabela de histórico */}
      {historico.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Competência</th>
                <th className="text-right py-2 text-gray-500 font-medium">Salário</th>
                <th className="text-left py-2 text-gray-500 font-medium pl-4">Obs.</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h, idx) => {
                const ant = idx > 0 ? historico[idx - 1].salario : null;
                const diff = ant ? ((h.salario / ant - 1) * 100).toFixed(1) : null;
                return (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 font-mono text-xs">{formatCompetencia(h.competencia)}</td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {formatBRL(h.salario)}
                      {diff !== null && (
                        <span className={`ml-2 text-xs ${parseFloat(diff) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ({diff >= 0 ? '+' : ''}{diff}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2 pl-4 text-gray-400 text-xs">{h.observacao || '—'}</td>
                    <td className="py-2">
                      <button onClick={() => remover(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historico.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 mb-4">Nenhum registro. Adicione salários abaixo.</p>
      )}

      {/* Formulário de adição */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Adicionar registro</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="campo-label">Competência (mês/ano)</label>
            <input
              type="month"
              value={novaCompetencia}
              onChange={(e) => setNovaCompetencia(e.target.value)}
              className="campo-input"
            />
          </div>
          <div>
            <label className="campo-label">Salário (R$)</label>
            <input
              type="number"
              value={novoSalario}
              onChange={(e) => setNovoSalario(e.target.value)}
              className="campo-input"
              step="0.01"
              min="0"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="campo-label">Observação (opcional)</label>
            <input
              type="text"
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              className="campo-input"
              placeholder="Ex: Promoção, reajuste CCT..."
            />
          </div>
        </div>
        <button
          type="button"
          onClick={adicionar}
          disabled={!novaCompetencia || !novoSalario}
          className="btn-secundario flex items-center gap-1 text-sm mt-3 disabled:opacity-40"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

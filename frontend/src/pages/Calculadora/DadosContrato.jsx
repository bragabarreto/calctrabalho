import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import HistoricoSalarial from './HistoricoSalarial.jsx';

const MODALIDADES = [
  { value: 'sem_justa_causa', label: 'Dispensa sem Justa Causa' },
  { value: 'pedido_demissao', label: 'Pedido de Demissão' },
  { value: 'culpa_reciproca', label: 'Culpa Recíproca' },
  { value: 'rescisao_indireta', label: 'Rescisão Indireta (art. 483 CLT)' },
  { value: 'justa_causa', label: 'Dispensa por Justa Causa' },
];

export default function DadosContrato() {
  const { dados, setDados, setStep } = useCalculoStore();
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mostrarAfastamentos, setMostrarAfastamentos] = useState(false);
  const [novoAfastInicio, setNovoAfastInicio] = useState('');
  const [novoAfastFim, setNovoAfastFim] = useState('');

  const periodosAfastamento = dados.periodosAfastamento || [];

  function addAfastamento() {
    if (!novoAfastInicio || !novoAfastFim) return;
    const novo = { id: `afast_${Date.now()}`, inicio: novoAfastInicio, fim: novoAfastFim };
    setDados({ periodosAfastamento: [...periodosAfastamento, novo] });
    setNovoAfastInicio('');
    setNovoAfastFim('');
  }

  function removeAfastamento(id) {
    setDados({ periodosAfastamento: periodosAfastamento.filter((p) => p.id !== id) });
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setDados({ [name]: type === 'checkbox' ? checked : value });
  }

  function avancar(e) {
    e.preventDefault();
    if (!dados.dataAdmissao || !dados.dataDispensa || !dados.dataAjuizamento || !dados.ultimoSalario) {
      alert('Preencha os campos obrigatórios: datas e salário.');
      return;
    }
    setStep(2);
  }

  return (
    <form onSubmit={avancar} className="max-w-3xl">
      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Dados do Contrato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Data de Admissão *</label>
            <input type="date" name="dataAdmissao" value={dados.dataAdmissao} onChange={handleChange} className="campo-input" required />
          </div>
          <div>
            <label className="campo-label">Data de Dispensa *</label>
            <input type="date" name="dataDispensa" value={dados.dataDispensa} onChange={handleChange} className="campo-input" required />
          </div>
          <div>
            <label className="campo-label">Data de Ajuizamento *</label>
            <input type="date" name="dataAjuizamento" value={dados.dataAjuizamento} onChange={handleChange} className="campo-input" required />
          </div>
          <div>
            <label className="campo-label">Data de Pagamento das Verbas Rescisórias</label>
            <input type="date" name="dataPgtoRescisorio" value={dados.dataPgtoRescisorio} onChange={handleChange} className="campo-input" />
            <p className="text-xs text-gray-400 mt-1">Para cálculo das multas arts. 467 e 477</p>
          </div>
          <div className="sm:col-span-2">
            <label className="campo-label">Modalidade de Rescisão *</label>
            <select name="modalidade" value={dados.modalidade} onChange={handleChange} className="campo-input">
              {MODALIDADES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="campo-label">Aviso Prévio</label>
            <div className="flex flex-wrap gap-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tipoAvisoPrevio" value="indenizado"
                  checked={!dados.avisoPrevioTrabalhado}
                  onChange={() => setDados({ avisoPrevioTrabalhado: false })}
                />
                <span className="text-sm">Indenizado</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="tipoAvisoPrevio" value="trabalhado"
                  checked={Boolean(dados.avisoPrevioTrabalhado)}
                  onChange={() => setDados({ avisoPrevioTrabalhado: true })}
                />
                <span className="text-sm">Trabalhado</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {dados.avisoPrevioTrabalhado
                ? 'Aviso trabalhado: empregado cumpriu o período — não gera verba indenizatória.'
                : 'Aviso indenizado: empregador pagou em dinheiro — integra ao tempo para FGTS e férias.'}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="campo-label">Fase do Processo para Cálculo de Juros (ADC 58 STF)</label>
            <div className="flex flex-wrap gap-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="faseProcessual" value="pre_judicial"
                  checked={dados.faseProcessual === 'pre_judicial' || !dados.faseProcessual}
                  onChange={() => setDados({ faseProcessual: 'pre_judicial' })}
                />
                <span className="text-sm">Pré-Judicial</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="faseProcessual" value="judicial"
                  checked={dados.faseProcessual === 'judicial'}
                  onChange={() => setDados({ faseProcessual: 'judicial' })}
                />
                <span className="text-sm">Judicial</span>
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {dados.faseProcessual === 'judicial'
                ? 'Juros contados a partir do ajuizamento da ação (SELIC até 29/08/2024; IPCA + juros a partir de 30/08/2024).'
                : 'Juros contados a partir do fim do contrato: IPCA-E + 1%/mês (pré-judicial) → SELIC (judicial até 29/08/2024) → IPCA + juros (a partir de 30/08/2024).'}
            </p>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Remuneração</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Último Salário (R$) *</label>
            <input type="number" name="ultimoSalario" value={dados.ultimoSalario} onChange={handleChange} className="campo-input" step="0.01" min="0" required placeholder="2000.00" />
          </div>
          <div>
            <label className="campo-label">Média de Comissões Mensais (R$)</label>
            <input type="number" name="comissoes" value={dados.comissoes} onChange={handleChange} className="campo-input" step="0.01" min="0" placeholder="0.00" />
          </div>
          <div>
            <label className="campo-label">Média de Gorjetas Mensais (R$)</label>
            <input type="number" name="gorjetas" value={dados.gorjetas} onChange={handleChange} className="campo-input" step="0.01" min="0" placeholder="0.00" />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Identificação (opcional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Nome da Simulação</label>
            <input type="text" name="nomeSimulacao" value={dados.nomeSimulacao} onChange={handleChange} className="campo-input" placeholder="Ex: João Silva — Cenário 1" />
          </div>
          <div>
            <label className="campo-label">Número do Processo</label>
            <input type="text" name="numeroProcesso" value={dados.numeroProcesso} onChange={handleChange} className="campo-input" placeholder="0001234-56.2026.5.02.0001" />
          </div>
        </div>
      </div>

      {/* Afastamentos (opcional) */}
      <div className="card mb-4">
        <button
          type="button"
          onClick={() => setMostrarAfastamentos(!mostrarAfastamentos)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="font-titulo text-lg text-primaria">Afastamentos (opcional)</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Períodos de suspensão/afastamento do contrato
              {periodosAfastamento.length > 0 && ` · ${periodosAfastamento.length} período(s) registrado(s)`}
            </p>
          </div>
          <span className="text-gray-400 text-lg">{mostrarAfastamentos ? '▲' : '▼'}</span>
        </button>
        {mostrarAfastamentos && (
          <div className="px-6 pb-6 space-y-3">
            {periodosAfastamento.length > 0 && (
              <div className="space-y-2">
                {periodosAfastamento.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-mono text-xs">
                      {p.inicio ? new Date(p.inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      {' → '}
                      {p.fim ? new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </span>
                    <button type="button" onClick={() => removeAfastamento(p.id)} className="text-red-400 hover:text-red-600 ml-auto">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="campo-label">Início do Afastamento</label>
                <input type="date" value={novoAfastInicio} onChange={(e) => setNovoAfastInicio(e.target.value)} className="campo-input"
                  min={dados.dataAdmissao} max={dados.dataDispensa} />
              </div>
              <div>
                <label className="campo-label">Fim do Afastamento</label>
                <input type="date" value={novoAfastFim} onChange={(e) => setNovoAfastFim(e.target.value)} className="campo-input"
                  min={novoAfastInicio || dados.dataAdmissao} max={dados.dataDispensa} />
              </div>
            </div>
            <button
              type="button"
              onClick={addAfastamento}
              disabled={!novoAfastInicio || !novoAfastFim}
              className="btn-secundario flex items-center gap-1 text-sm disabled:opacity-40"
            >
              <Plus size={14} /> Adicionar Período
            </button>
            <p className="text-xs text-gray-400">Os meses de afastamento são deduzidos do período de horas extras e adicional noturno.</p>
          </div>
        )}
      </div>

      {/* Histórico Salarial (colapsível) */}
      <div className="card mb-4">
        <button
          type="button"
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div>
            <h3 className="font-titulo text-lg text-primaria">Histórico Salarial (opcional)</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Registre evolução salarial para análise comparativa
              {dados.dataAdmissao && dados.dataDispensa && (
                <span className="ml-2 font-medium text-gray-500">
                  · Contrato: {new Date(dados.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')} – {new Date(dados.dataDispensa + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </p>
          </div>
          <span className="text-gray-400 text-lg">{mostrarHistorico ? '▲' : '▼'}</span>
        </button>
        {mostrarHistorico && (
          <div className="px-6 pb-6 space-y-4">
            <HistoricoSalarial dataAdmissao={dados.dataAdmissao} dataDispensa={dados.dataDispensa} />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primario">Próximo →</button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import FeriasDetalhadas from './FeriasDetalhadas.jsx';
import DecimoTerceiroDetalhado from './DecimoTerceiroDetalhado.jsx';

const ABAS = [
  { id: 'salarios', label: 'Salários' },
  { id: 'ferias', label: 'Férias' },
  { id: 'decimoTerceiro', label: '13º Salário' },
];

function HistoricoSelector({ historicos, value, onChange, placeholder = 'Selecione o histórico...' }) {
  const [hist, parcela] = value ? value.split(':') : ['', ''];
  const histSelecionado = historicos.find((h) => h.id === hist);
  const parcelasDoHist = histSelecionado?.parcelas || [];

  return (
    <div className="space-y-2">
      <select
        value={hist}
        onChange={(e) => onChange(e.target.value)}
        className="campo-input"
      >
        <option value="">{placeholder}</option>
        {historicos.map((h) => (
          <option key={h.id} value={h.id}>{h.titulo}</option>
        ))}
      </select>
      {hist && parcelasDoHist.length > 0 && (
        <select
          value={parcela}
          onChange={(e) => onChange(e.target.value ? `${hist}:${e.target.value}` : hist)}
          className="campo-input"
        >
          <option value="">Todas as parcelas (soma)</option>
          {parcelasDoHist.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function AtrasadoField({ label, nota, mesesField, baseField, historicoIdField, basePadrao, baseLabel1, baseValue1, baseLabel2, dados, setDados, historicos }) {
  const meses = dados[mesesField] || 0;
  const base = dados[baseField] || basePadrao;
  const historicoId = dados[historicoIdField] || '';

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm text-gray-800">{label}</h4>
      {nota && <p className="text-xs text-gray-400">{nota}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="campo-label">Quantidade (meses)</label>
          <input
            type="number"
            value={meses}
            onChange={(e) => setDados({ [mesesField]: Number(e.target.value) })}
            className="campo-input"
            min="0" step="1"
          />
        </div>
        <div>
          <label className="campo-label">Base de Cálculo</label>
          <select
            value={base}
            onChange={(e) => setDados({ [baseField]: e.target.value, [historicoIdField]: '' })}
            className="campo-input"
          >
            <option value={baseValue1}>{baseLabel1}</option>
            <option value="historico">{baseLabel2}</option>
          </select>
        </div>
      </div>
      {base === 'historico' && (
        <div>
          <label className="campo-label">Histórico Salarial</label>
          {historicos.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              Nenhum histórico disponível. Configure na aba Dados do Contrato.
            </p>
          ) : (
            <HistoricoSelector
              historicos={historicos}
              value={historicoId}
              onChange={(v) => setDados({ [historicoIdField]: v })}
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            O sistema extrairá os {meses} meses anteriores ao desligamento do histórico selecionado.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Verbas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();
  const [aba, setAba] = useState('salarios');

  const historicos = dados.historicosSalariais || [];

  function proximaEtapa() {
    // verbas_rescisórias → Deduções (7); verbas_e_parcelas → Parcelas (5)
    setStep(tipoFluxo === 'verbas_rescisórias' ? 7 : 5);
  }

  return (
    <div className="max-w-3xl">
      {/* Abas */}
      <div className="flex border-b border-gray-200 mb-4">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.id
                ? 'border-b-2 border-primaria text-primaria'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'salarios' && (
        <div className="space-y-4">
          {/* Saldo de Salário */}
          <div className="card p-6">
            <h3 className="font-titulo text-lg mb-3 text-primaria">Saldo de Salário</h3>
            <p className="text-sm text-gray-600 mb-3">
              Calculado automaticamente com base no último salário e nos dias trabalhados no mês do desligamento.
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={dados.saldoSalarialPago || false}
                onChange={(e) => setDados({ saldoSalarialPago: e.target.checked })}
              />
              Saldo de salário já foi pago ao empregado (deduzir do cálculo)
            </label>
          </div>

          {/* Remuneração Atrasada */}
          <div className="card p-6">
            <h3 className="font-titulo text-lg mb-4 text-primaria">Remuneração Atrasada</h3>
            <div className="space-y-4">
              <AtrasadoField
                label="Salários Atrasados"
                mesesField="salariosMesesAtrasados"
                baseField="salarioAtrasadoBase"
                historicoIdField="salarioAtrasadoHistoricoId"
                basePadrao="ultimo_salario"
                baseValue1="ultimo_salario"
                baseLabel1="Último salário (campo Remuneração)"
                baseLabel2="Histórico salarial do Reclamante"
                dados={dados}
                setDados={setDados}
                historicos={historicos}
              />
              <AtrasadoField
                label="Comissões Atrasadas"
                nota="Base: média de comissões informada em Remuneração, ou histórico salarial."
                mesesField="comissoesMesesAtrasados"
                baseField="comissaoAtrasadaBase"
                historicoIdField="comissaoAtrasadoHistoricoId"
                basePadrao="media"
                baseValue1="media"
                baseLabel1="Média de comissões (campo Remuneração)"
                baseLabel2="Histórico salarial"
                dados={dados}
                setDados={setDados}
                historicos={historicos}
              />
              <AtrasadoField
                label="Gorjetas Atrasadas"
                nota="Súmula 354 TST: gorjetas integram a remuneração mas não são base de AP, HE, AN, RSR."
                mesesField="gorjetasMesesAtrasados"
                baseField="gorjetaAtrasadaBase"
                historicoIdField="gorjetaAtrasadoHistoricoId"
                basePadrao="media"
                baseValue1="media"
                baseLabel1="Média de gorjetas (campo Remuneração)"
                baseLabel2="Histórico salarial"
                dados={dados}
                setDados={setDados}
                historicos={historicos}
              />
            </div>
          </div>
        </div>
      )}

      {aba === 'ferias' && <FeriasDetalhadas />}
      {aba === 'decimoTerceiro' && <DecimoTerceiroDetalhado />}

      <div className="flex justify-between mt-6">
        <button type="button" className="btn-secundario" onClick={() => setStep(2)}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={proximaEtapa}>Próximo →</button>
      </div>
    </div>
  );
}

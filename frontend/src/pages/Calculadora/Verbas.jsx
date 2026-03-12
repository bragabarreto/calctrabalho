import React, { useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import FeriasDetalhadas from './FeriasDetalhadas.jsx';
import DecimoTerceiroDetalhado from './DecimoTerceiroDetalhado.jsx';

const ABAS = [
  { id: 'ferias', label: 'Férias' },
  { id: 'decimoTerceiro', label: '13º Salário' },
  { id: 'outros', label: 'Outros' },
];

export default function Verbas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();
  const [aba, setAba] = useState('ferias');

  function handleChange(e) {
    const { name, value, type } = e.target;
    setDados({ [name]: type === 'number' ? Number(value) : value });
  }

  function proximaEtapa() {
    // Step 4 = Parcelas personalizadas OU Adicionais (ambos são step 4 no index)
    setStep(4);
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

      {aba === 'ferias' && <FeriasDetalhadas />}
      {aba === 'decimoTerceiro' && <DecimoTerceiroDetalhado />}

      {aba === 'outros' && (
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-titulo text-lg mb-4 text-primaria">Remuneração Atrasada</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Salários Atrasados (meses)</label>
                <input type="number" name="salariosMesesAtrasados" value={dados.salariosMesesAtrasados} onChange={handleChange} className="campo-input" min="0" step="1" />
              </div>
              <div>
                <label className="campo-label">Comissões Atrasadas (meses)</label>
                <input type="number" name="comissoesMesesAtrasados" value={dados.comissoesMesesAtrasados} onChange={handleChange} className="campo-input" min="0" step="1" />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-titulo text-lg mb-4 text-primaria">Dano Moral e Afastamentos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="campo-label">Indenização por Dano Moral (R$)</label>
                <input type="number" name="valorDanoMoral" value={dados.valorDanoMoral} onChange={handleChange} className="campo-input" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div>
                <label className="campo-label">Meses de Afastamento (suspensão)</label>
                <input type="number" name="mesesAfastamento" value={dados.mesesAfastamento} onChange={handleChange} className="campo-input" min="0" step="1" />
                <p className="text-xs text-gray-400 mt-1">Deduzidos do período de horas extras e adicional noturno</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button type="button" className="btn-secundario" onClick={() => setStep(2)}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={proximaEtapa}>Próximo →</button>
      </div>
    </div>
  );
}

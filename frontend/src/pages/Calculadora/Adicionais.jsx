import React from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';

// Campos que o usuário digita como % (0-100) mas são armazenados como decimal (0-1)
const CAMPOS_PERCENTUAL = new Set([
  'adicionalInsalubridadePercentual',
  'adicionalPericulosidadePercentual',
]);

export default function Adicionais() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  function handleChange(e) {
    const { name, value, type } = e.target;
    let parsed;
    if (type === 'number') {
      const num = Number(value);
      parsed = CAMPOS_PERCENTUAL.has(name) ? num / 100 : num;
    } else {
      parsed = value;
    }
    setDados({ [name]: parsed });
  }

  // Converte decimal→% para exibir no input
  const pctInsalub = ((dados.adicionalInsalubridadePercentual || 0) * 100).toFixed(0);
  const pctPeric = ((dados.adicionalPericulosidadePercentual || 0) * 100).toFixed(0);

  return (
    <div className="max-w-3xl">
      <div className="aviso-judicial mb-4">
        <strong>Insalubridade:</strong> Base de cálculo = salário mínimo (Súmula 228 STF/TST). Verificar se CCT prevê base diferente.
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Adicional de Insalubridade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="campo-label">Percentual (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="adicionalInsalubridadePercentual"
                value={pctInsalub}
                onChange={handleChange}
                className="campo-input"
                step="1"
                min="0"
                max="100"
                placeholder="0"
              />
              <span className="text-gray-500 text-sm font-medium">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Graus CLT: Mínimo 10%, Médio 20%, Máximo 40% (art. 192). CCT pode prever outro percentual.</p>
          </div>
          <div>
            <label className="campo-label">Data Início (se diferente da admissão)</label>
            <input type="date" name="dataInicioInsalubridade" value={dados.dataInicioInsalubridade} onChange={handleChange} className="campo-input" />
          </div>
          <div>
            <label className="campo-label">Data Fim (se diferente da dispensa)</label>
            <input type="date" name="dataFimInsalubridade" value={dados.dataFimInsalubridade} onChange={handleChange} className="campo-input" />
          </div>
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Adicional de Periculosidade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="campo-label">Percentual (%)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="adicionalPericulosidadePercentual"
                value={pctPeric}
                onChange={handleChange}
                className="campo-input"
                step="1"
                min="0"
                max="100"
                placeholder="0"
              />
              <span className="text-gray-500 text-sm font-medium">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Padrão CLT: 30% (art. 193). CCT pode prever percentual diferente.</p>
          </div>
          <div>
            <label className="campo-label">Data Início</label>
            <input type="date" name="dataInicioPericulosidade" value={dados.dataInicioPericulosidade} onChange={handleChange} className="campo-input" />
          </div>
          <div>
            <label className="campo-label">Data Fim</label>
            <input type="date" name="dataFimPericulosidade" value={dados.dataFimPericulosidade} onChange={handleChange} className="campo-input" />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={() => setStep(3)}>← Anterior</button>
        <button type="button" className="btn-secundario text-gray-400 text-sm"
          onClick={() => setStep(tipoFluxo === 'verbas_e_parcelas' ? 5 : 6)}>
          Pular (sem adicionais) →
        </button>
        <button type="button" className="btn-primario" onClick={() => setStep(tipoFluxo === 'verbas_e_parcelas' ? 5 : 6)}>
          Próximo →
        </button>
      </div>
    </div>
  );
}

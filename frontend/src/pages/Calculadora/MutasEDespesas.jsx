import React, { useState } from 'react';
import { AlertTriangle, Scale } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

// Verbas disponíveis como base da multa art. 467
const VERBAS_467 = [
  { codigo: 'saldo_salarial', nome: 'Saldo Salarial' },
  { codigo: 'aviso_previo', nome: 'Aviso Prévio Indenizado' },
  { codigo: 'ferias_dobradas', nome: 'Férias Vencidas Dobradas + 1/3' },
  { codigo: 'ferias_integrais', nome: 'Férias Integrais + 1/3' },
  { codigo: 'ferias_proporcionais', nome: 'Férias Proporcionais + 1/3' },
  { codigo: 'decimo_terceiro_integral', nome: '13º Salário Integral' },
  { codigo: 'decimo_terceiro_proporcional', nome: '13º Salário Proporcional' },
  { codigo: 'multa_fgts', nome: 'Multa FGTS' },
  { codigo: 'salarios_atrasados', nome: 'Salários Atrasados' },
  { codigo: 'comissoes_atrasadas', nome: 'Comissões Atrasadas' },
];

export default function MutasEDespesas() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();

  // Honorários advocatícios
  const [pctHonorarios, setPctHonorarios] = useState(
    dados.percentualHonorarios != null ? (dados.percentualHonorarios * 100).toFixed(0) : '15'
  );

  // Honorários periciais
  const [aplicarPericiais, setAplicarPericiais] = useState(dados.aplicarHonorariosPericiais || false);
  const [valorPericiais, setValorPericiais] = useState(dados.honorariosPericiaisValor || '');

  // Custas processuais
  const [aplicarCustas, setAplicarCustas] = useState(dados.aplicarCustas || false);

  // Multa Art. 467
  const [aplicar467, setAplicar467] = useState(dados.aplicarMulta467 || false);
  const [base467, setBase467] = useState(dados.multa467BaseVerbas || []);

  // Outras multas processuais
  const [aplicarMultasProcessuais, setAplicarMultasProcessuais] = useState(
    !!(dados.multasProcessuaisValor || dados.multasProcessuaisPercentual)
  );
  const [tipoMultaProc, setTipoMultaProc] = useState(
    dados.multasProcessuaisPercentual ? 'percentual' : 'fixo'
  );
  const [baseMultaProc, setBaseMultaProc] = useState(dados.multasProcessuaisBase || 'condenacao');
  const [valorMultaProc, setValorMultaProc] = useState(dados.multasProcessuaisValor || '');
  const [pctMultaProc, setPctMultaProc] = useState(
    dados.multasProcessuaisPercentual ? (dados.multasProcessuaisPercentual * 100).toFixed(1) : ''
  );

  const temVerbaRescisoria = tipoFluxo !== 'apenas_parcelas';

  function toggle467(codigo) {
    setBase467((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  }

  function salvarEAvancar() {
    setDados({
      percentualHonorarios: Number(pctHonorarios) / 100,
      aplicarHonorariosPericiais: aplicarPericiais,
      honorariosPericiaisValor: aplicarPericiais ? Number(valorPericiais) || 0 : 0,
      aplicarCustas,
      aplicarMulta467: aplicar467,
      multa467BaseVerbas: aplicar467 ? base467 : [],
      multasProcessuaisValor: aplicarMultasProcessuais && tipoMultaProc === 'fixo' ? Number(valorMultaProc) || 0 : 0,
      multasProcessuaisPercentual: aplicarMultasProcessuais && tipoMultaProc === 'percentual' ? Number(pctMultaProc) / 100 : 0,
      multasProcessuaisBase: baseMultaProc,
    });
    setStep(9); // Resultado
  }

  return (
    <div className="max-w-3xl">
      {/* Honorários Advocatícios */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-primaria" />
          <h3 className="font-titulo text-lg text-primaria">Honorários Advocatícios</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Percentual dos Honorários</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={pctHonorarios}
                onChange={(e) => setPctHonorarios(e.target.value)}
                className="campo-input"
                step="1"
                min="0"
                max="30"
                placeholder="15"
              />
              <span className="text-gray-500 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Calculado sobre o total líquido da condenação (Súmula 256 TST / art. 791-A CLT)
            </p>
          </div>
        </div>
      </div>

      {/* Honorários Periciais */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            id="aplicarPericiais"
            checked={aplicarPericiais}
            onChange={(e) => { setAplicarPericiais(e.target.checked); if (!e.target.checked) setValorPericiais(''); }}
            className="mt-0.5"
          />
          <div>
            <label htmlFor="aplicarPericiais" className="font-semibold text-sm cursor-pointer">
              Incluir Honorários Periciais
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Valor arbitrado pelo Juízo ao perito oficial. Responsabilidade da parte vencida.
            </p>
          </div>
        </div>
        {aplicarPericiais && (
          <div className="mt-3 pl-6">
            <label className="campo-label">Valor dos Honorários Periciais (R$)</label>
            <input
              type="number"
              value={valorPericiais}
              onChange={(e) => setValorPericiais(e.target.value)}
              className="campo-input"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      {/* Custas Processuais */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="aplicarCustas"
            checked={aplicarCustas}
            onChange={(e) => setAplicarCustas(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <label htmlFor="aplicarCustas" className="font-semibold text-sm cursor-pointer">
              Incluir Custas Processuais (2%)
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              2% sobre o valor total da condenação (art. 789 CLT). Calculado automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Multa Art. 467 CLT — apenas em cálculos com verbas rescisórias */}
      {temVerbaRescisoria && (
        <div className="card p-6 mb-4">
          <div className="flex items-start gap-3 mb-3">
            <input
              type="checkbox"
              id="aplicar467"
              checked={aplicar467}
              onChange={(e) => { setAplicar467(e.target.checked); if (!e.target.checked) setBase467([]); }}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="aplicar467" className="font-semibold text-sm cursor-pointer">
                Aplicar Multa do Art. 467 CLT
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                50% sobre as verbas rescisórias incontroversas não pagas até a data de rescisão.
              </p>
            </div>
          </div>

          {aplicar467 && (
            <div className="pl-6">
              <div className="aviso-judicial mb-3">
                <AlertTriangle size={14} className="inline mr-1" />
                Selecione quais parcelas compõem a base (verbas incontroversas não pagas):
              </div>
              <div className="space-y-1">
                {VERBAS_467.map(({ codigo, nome }) => (
                  <label key={codigo} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={base467.includes(codigo)}
                      onChange={() => toggle467(codigo)}
                    />
                    <span className="text-sm">{nome}</span>
                  </label>
                ))}
              </div>
              {base467.length > 0 && (
                <div className="mt-3 p-3 bg-orange-50 rounded-lg text-sm">
                  <strong>{base467.length} parcela(s)</strong> selecionada(s) — multa = 50% da soma.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Outras Multas Processuais */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            id="aplicarMultasProcessuais"
            checked={aplicarMultasProcessuais}
            onChange={(e) => { setAplicarMultasProcessuais(e.target.checked); }}
            className="mt-0.5"
          />
          <div>
            <label htmlFor="aplicarMultasProcessuais" className="font-semibold text-sm cursor-pointer">
              Outras Multas Processuais
            </label>
            <p className="text-xs text-gray-400 mt-0.5">
              Multas por litigância de má-fé, ato atentatório à dignidade da justiça, etc.
            </p>
          </div>
        </div>

        {aplicarMultasProcessuais && (
          <div className="pl-6 space-y-3 mt-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="fixo" checked={tipoMultaProc === 'fixo'} onChange={() => setTipoMultaProc('fixo')} />
                <span className="text-sm">Valor fixo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="percentual" checked={tipoMultaProc === 'percentual'} onChange={() => setTipoMultaProc('percentual')} />
                <span className="text-sm">Percentual</span>
              </label>
            </div>

            {tipoMultaProc === 'fixo' ? (
              <div>
                <label className="campo-label">Valor da Multa (R$)</label>
                <input
                  type="number"
                  value={valorMultaProc}
                  onChange={(e) => setValorMultaProc(e.target.value)}
                  className="campo-input"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="campo-label">Percentual</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pctMultaProc}
                      onChange={(e) => setPctMultaProc(e.target.value)}
                      className="campo-input"
                      step="0.1"
                      min="0"
                      max="20"
                      placeholder="5"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="campo-label">Base de Cálculo</label>
                  <select
                    value={baseMultaProc}
                    onChange={(e) => setBaseMultaProc(e.target.value)}
                    className="campo-input"
                  >
                    <option value="condenacao">Valor da condenação</option>
                    <option value="causa">Valor da causa</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={() => setStep(7)}>
          ← Anterior
        </button>
        <button type="button" className="btn-primario" onClick={salvarEAvancar}>
          Ver Resultado →
        </button>
      </div>
    </div>
  );
}

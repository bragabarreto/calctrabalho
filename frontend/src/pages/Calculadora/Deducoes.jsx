import React, { useState } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

const VERBAS_OPCOES = [
  { codigo: 'saldo_salarial', nome: 'Saldo Salarial' },
  { codigo: 'aviso_previo', nome: 'Aviso Prévio Indenizado' },
  { codigo: 'ferias_dobradas', nome: 'Férias Vencidas Dobradas + 1/3' },
  { codigo: 'ferias_integrais', nome: 'Férias Integrais + 1/3' },
  { codigo: 'ferias_proporcionais', nome: 'Férias Proporcionais + 1/3' },
  { codigo: 'decimo_terceiro_integral', nome: '13º Salário Integral' },
  { codigo: 'decimo_terceiro_proporcional', nome: '13º Salário Proporcional' },
  { codigo: 'horas_extras', nome: 'Horas Extras' },
  { codigo: 'adicional_noturno', nome: 'Adicional Noturno' },
  { codigo: 'insalubridade', nome: 'Adicional de Insalubridade' },
  { codigo: 'periculosidade', nome: 'Adicional de Periculosidade' },
  { codigo: 'multa_fgts', nome: 'Multa FGTS' },
  { codigo: 'salarios_atrasados', nome: 'Salários Atrasados' },
  { codigo: 'dano_moral', nome: 'Dano Moral / Indenização' },
];

export default function Deducoes() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();
  const [deducoesGlobais, setDeducoesGlobais] = useState(dados.deducoesGlobais || []);
  const [deducoesPorVerba, setDeducoesPorVerba] = useState(dados.deducoesPorVerba || []);

  function salvarEAvancar() {
    setDados({ deducoesGlobais, deducoesPorVerba });
    setStep(8); // Multas e Despesas
  }

  function addGlobal() { setDeducoesGlobais([...deducoesGlobais, { descricao: '', valor: '' }]); }
  function updateGlobal(idx, campo, valor) {
    setDeducoesGlobais(deducoesGlobais.map((d, i) => i === idx ? { ...d, [campo]: valor } : d));
  }
  function removeGlobal(idx) { setDeducoesGlobais(deducoesGlobais.filter((_, i) => i !== idx)); }

  function addPorVerba() { setDeducoesPorVerba([...deducoesPorVerba, { codigoVerba: '', descricao: '', valor: '' }]); }
  function updatePorVerba(idx, campo, valor) {
    setDeducoesPorVerba(deducoesPorVerba.map((d, i) => i === idx ? { ...d, [campo]: valor } : d));
  }
  function removePorVerba(idx) { setDeducoesPorVerba(deducoesPorVerba.filter((_, i) => i !== idx)); }

  return (
    <div className="max-w-3xl">
      <div className="aviso-judicial mb-4 flex items-start gap-2">
        <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
        <div>
          <strong>Deduções</strong> = valores já pagos ou a compensar (FGTS depositado, rescisão paga, adiantamentos).
          Honorários advocatícios e custas são configurados na próxima etapa.
        </div>
      </div>

      {/* FGTS e Pagamentos — apenas para verbas rescisórias */}
      {tipoFluxo !== 'apenas_parcelas' && <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">FGTS e Pagamentos Rescisórios</h3>

        {/* Toggle: FGTS Integralizado */}
        <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <button
            type="button"
            onClick={() => setDados({ fgtsIntegralizado: !dados.fgtsIntegralizado })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${
              dados.fgtsIntegralizado ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
              dados.fgtsIntegralizado ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
          <div>
            <p className="text-sm font-semibold text-gray-700">FGTS integralizado (já depositado integralmente)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Quando ativo, considera o FGTS do período como integralmente depositado na CAIXA.
              Será apurada apenas a indenização rescisória (40% ou 20% sobre o FGTS bruto do período).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!dados.fgtsIntegralizado && (
            <div>
              <label className="campo-label">FGTS já Depositado (R$)</label>
              <input
                type="number" value={dados.fgtsDepositado}
                onChange={(e) => setDados({ fgtsDepositado: Number(e.target.value) })}
                className="campo-input" step="0.01" min="0" placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">Conforme extrato FGTS/CAIXA</p>
            </div>
          )}
          <div>
            <label className="campo-label">Valor Pago na Rescisão (R$)</label>
            <input
              type="number" value={dados.valorPago}
              onChange={(e) => setDados({ valorPago: Number(e.target.value) })}
              className="campo-input" step="0.01" min="0" placeholder="0.00"
            />
            <p className="text-xs text-gray-400 mt-1">Valor efetivamente pago pelo empregador</p>
          </div>
        </div>
      </div>}

      {/* Compensações Globais */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-titulo text-lg text-primaria">Compensações Globais</h3>
            <p className="text-xs text-gray-400 mt-1">
              Adiantamentos, quitações parciais — incidem sobre o total da condenação.
            </p>
          </div>
          <button type="button" onClick={addGlobal}
            className="btn-secundario flex items-center gap-1 text-sm py-1.5 px-3">
            <Plus size={14} /> Adicionar
          </button>
        </div>
        {deducoesGlobais.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Nenhuma compensação global.</p>
        ) : (
          <div className="space-y-3">
            {deducoesGlobais.map((d, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <input
                  type="text" value={d.descricao}
                  onChange={(e) => updateGlobal(idx, 'descricao', e.target.value)}
                  className="campo-input flex-1"
                  placeholder="Descrição (ex: Adiantamento 13º)"
                />
                <div className="flex items-center gap-1 w-36">
                  <span className="text-gray-400 text-sm">R$</span>
                  <input
                    type="number" value={d.valor}
                    onChange={(e) => updateGlobal(idx, 'valor', e.target.value)}
                    className="campo-input" step="0.01" min="0" placeholder="0.00"
                  />
                </div>
                <button type="button" onClick={() => removeGlobal(idx)}
                  className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deduções por Parcela */}
      <div className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-titulo text-lg text-primaria">Deduções por Parcela Específica</h3>
            <p className="text-xs text-gray-400 mt-1">
              Deduz diretamente de uma parcela específica do cálculo.
            </p>
          </div>
          <button type="button" onClick={addPorVerba}
            className="btn-secundario flex items-center gap-1 text-sm py-1.5 px-3">
            <Plus size={14} /> Adicionar
          </button>
        </div>
        {deducoesPorVerba.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">Nenhuma dedução específica.</p>
        ) : (
          <div className="space-y-3">
            {deducoesPorVerba.map((d, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                <select
                  value={d.codigoVerba}
                  onChange={(e) => updatePorVerba(idx, 'codigoVerba', e.target.value)}
                  className="campo-input"
                >
                  <option value="">— Selecione a parcela —</option>
                  {VERBAS_OPCOES.map((v) => (
                    <option key={v.codigo} value={v.codigo}>{v.nome}</option>
                  ))}
                </select>
                <input
                  type="text" value={d.descricao}
                  onChange={(e) => updatePorVerba(idx, 'descricao', e.target.value)}
                  className="campo-input" placeholder="Motivo (opcional)"
                />
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">R$</span>
                  <input
                    type="number" value={d.valor}
                    onChange={(e) => updatePorVerba(idx, 'valor', e.target.value)}
                    className="campo-input w-28" step="0.01" min="0"
                  />
                </div>
                <button type="button" onClick={() => removePorVerba(idx)}
                  className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario"
          onClick={() => setStep(tipoFluxo === 'apenas_parcelas' ? 5 : tipoFluxo === 'verbas_rescisórias' ? 3 : 6)}>
          ← Anterior
        </button>
        <button type="button" className="btn-primario" onClick={salvarEAvancar}>
          Multas e Despesas →
        </button>
      </div>
    </div>
  );
}

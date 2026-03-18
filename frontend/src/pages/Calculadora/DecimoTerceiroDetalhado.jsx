import React, { useEffect, useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { usePeriodosAquisitivos } from '../../hooks/useCalculo.js';

/** Verifica se o 13º de um ano está prescrito.
 * Prescrição padrão: 5 anos a partir de 31/12 do ano de referência.
 * Um período é prescrito se: 31/12/anoRef < (dataAjuizamento - 5 anos)
 */
function isPrescritoDecimo(anoReferencia, dataAjuizamento) {
  if (!anoReferencia || !dataAjuizamento) return false;
  const fimAno = new Date(`${anoReferencia}-12-31`);
  const limitePrescrição = new Date(dataAjuizamento);
  limitePrescrição.setFullYear(limitePrescrição.getFullYear() - 5);
  return fimAno < limitePrescrição;
}

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export default function DecimoTerceiroDetalhado() {
  const { dados, setPeriodosDecimoTerceiro } = useCalculoStore();
  const { mutateAsync: buscarPeriodos } = usePeriodosAquisitivos();
  const [periodos, setPeriodosLocal] = useState(dados.periodosDecimoTerceiro || []);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (periodos.length === 0 && dados.dataAdmissao && dados.dataDispensa) {
      setCarregando(true);
      buscarPeriodos({
        dataAdmissao: dados.dataAdmissao,
        dataDispensa: dados.dataDispensa,
        avisoPrevioTrabalhado: dados.avisoPrevioTrabalhado,
      }).then((res) => {
        const ajuiz = dados.dataAjuizamento;
        const novos = (res.periodosDecimoTerceiro || []).map(p => {
          const prescrito = isPrescritoDecimo(p.anoReferencia, ajuiz);
          return { ...p, status: 'devido', valorPago: '', prescrito, excluido: prescrito };
        });
        setPeriodosLocal(novos);
        setPeriodosDecimoTerceiro(novos);
      }).catch(() => {}).finally(() => setCarregando(false));
    }
  }, []);

  function toggleStatus(idx, status) {
    const novos = periodos.map((item, i) =>
      i === idx ? { ...item, status, valorPago: status === 'pago' ? (item.valorPago ?? '') : '' } : item
    );
    setPeriodosLocal(novos);
    setPeriodosDecimoTerceiro(novos);
  }

  function setValorPago(idx, valor) {
    const novos = periodos.map((item, i) =>
      i === idx ? { ...item, valorPago: valor } : item
    );
    setPeriodosLocal(novos);
    setPeriodosDecimoTerceiro(novos);
  }

  function toggleExcluido(idx) {
    const p = periodos[idx];
    const novos = periodos.map((item, i) => i === idx ? { ...item, excluido: !p.excluido } : item);
    setPeriodosLocal(novos);
    setPeriodosDecimoTerceiro(novos);
  }

  // Estima o valor bruto de um período com base no salário atual
  const salarioBase = (dados.mediaSalarial || dados.ultimoSalario || 0) + (dados.comissoes || 0);

  if (carregando) {
    return <div className="py-6 text-center text-gray-400">Calculando períodos do 13º salário...</div>;
  }

  if (periodos.length === 0) {
    return <div className="py-6 text-center text-gray-400">Nenhum período de 13º encontrado.</div>;
  }

  return (
    <div>
      <div className="aviso-judicial mb-3">
        <strong>13º Salário:</strong> Marque quais períodos já foram pagos. Ao clicar em <strong>Pago</strong>, você pode informar o valor pago — se deixar em branco, o sistema considerará o pagamento integral. Se houve pagamento parcial, informe o valor para que o saldo seja calculado corretamente.
      </div>

      <div className="space-y-2">
        {periodos.map((p, idx) => {
          const ehProporcional = p.tipo === 'proporcional';

          return (
            <div key={idx} className={`card p-4 border-l-4 ${
              p.prescrito && p.excluido ? 'border-l-gray-300 opacity-60' :
              p.status === 'pago' ? 'border-l-green-400' :
              ehProporcional ? 'border-l-blue-400' : 'border-l-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Informações */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-primaria">
                      13º Salário — {p.anoReferencia}
                    </span>
                    {ehProporcional && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        Proporcional
                      </span>
                    )}
                    {p.prescrito && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        Prescrito
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {ehProporcional
                      ? `${p.avos}/12 avos (${p.meses} meses${p.diasRestantes >= 15 ? ` + ${p.diasRestantes} dias ≥ 15 → +1 mês` : ''})`
                      : `${p.avos}/12 avos — integral`}
                  </p>

                  {/* Campo de valor pago — aparece quando status = 'pago' */}
                  {p.status === 'pago' && !p.prescrito && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <label className="text-xs text-gray-500 whitespace-nowrap">Valor pago:</label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.valorPago ?? ''}
                          onChange={e => setValorPago(idx, e.target.value)}
                          className="campo-input w-32 text-right font-mono text-sm py-1"
                          placeholder="vazio = integral"
                        />
                      </div>
                      {salarioBase > 0 && (
                        <span className="text-xs text-gray-400">
                          (ref.: {formatBRL(salarioBase)})
                        </span>
                      )}
                      <p className="text-xs text-gray-400 w-full mt-0.5">
                        Vazio = integralmente pago. Preencha apenas se o pagamento foi parcial.
                      </p>
                    </div>
                  )}
                </div>

                {/* Controles */}
                {p.prescrito ? (
                  <button
                    type="button"
                    onClick={() => toggleExcluido(idx)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      p.excluido ? 'border-gray-400 text-gray-500 hover:bg-gray-50' : 'bg-amber-500 text-white border-amber-500'
                    }`}
                    title={p.excluido ? 'Incluir no cálculo' : 'Excluir do cálculo (prescrito)'}
                  >
                    {p.excluido ? 'Incluir' : 'Excluir'}
                  </button>
                ) : (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {[
                      { s: 'pago', label: 'Pago', cls: 'bg-green-500 text-white border-green-500' },
                      { s: 'devido', label: 'Devido', cls: 'bg-orange-500 text-white border-orange-500' },
                    ].map(({ s, label, cls }) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStatus(idx, s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          p.status === s ? cls : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { usePeriodosAquisitivos } from '../../hooks/useCalculo.js';

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
        setPeriodosLocal(res.periodosDecimoTerceiro || []);
        setPeriodosDecimoTerceiro(res.periodosDecimoTerceiro || []);
      }).catch(() => {}).finally(() => setCarregando(false));
    }
  }, []);

  function toggleStatus(idx, status) {
    const p = periodos[idx];
    if (p.tipo === 'proporcional') return; // sempre devido
    const novos = periodos.map((item, i) => i === idx ? { ...item, status } : item);
    setPeriodosLocal(novos);
    setPeriodosDecimoTerceiro(novos);
  }

  if (carregando) {
    return <div className="py-6 text-center text-gray-400">Calculando períodos do 13º salário...</div>;
  }

  if (periodos.length === 0) {
    return <div className="py-6 text-center text-gray-400">Nenhum período de 13º encontrado.</div>;
  }

  return (
    <div>
      <div className="aviso-judicial mb-3">
        <strong>13º Salário:</strong> Marque quais anos já foram pagos. O proporcional do ano da dispensa é sempre devido. Os avos são calculados automaticamente com base nas datas do contrato.
      </div>

      <div className="space-y-2">
        {periodos.map((p, idx) => {
          const ehProporcional = p.tipo === 'proporcional';

          return (
            <div key={idx} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 ${
              ehProporcional ? 'border-l-blue-400' : 'border-l-gray-200'
            }`}>
              {/* Informações */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-primaria">
                    13º Salário — {p.anoReferencia}
                  </span>
                  {ehProporcional && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      Proporcional
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {ehProporcional
                    ? `${p.avos}/12 avos (${p.meses} meses${p.diasRestantes >= 15 ? ` + ${p.diasRestantes} dias ≥ 15 → +1 mês` : ''})`
                    : `${p.avos}/12 avos — integral`}
                </p>
              </div>

              {/* Controles */}
              {!ehProporcional ? (
                <div className="flex gap-2">
                  {['pago', 'devido'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(idx, s)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        p.status === s
                          ? s === 'pago' ? 'bg-green-500 text-white border-green-500'
                          : 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s === 'pago' ? 'Pago' : 'Devido'}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs px-3 py-1.5 rounded-full bg-orange-500 text-white font-medium">
                  Devido
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

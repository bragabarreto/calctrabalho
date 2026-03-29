import React, { useEffect, useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { usePeriodosAquisitivos } from '../../hooks/useCalculo.js';

function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function badgeFerias(p) {
  if (p.prescrita && p.excluida) return { label: 'Prescrita (excluída)', cls: 'bg-gray-400 text-white' };
  if (p.tipo === 'proporcional') return { label: 'Devidas', cls: 'bg-orange-500 text-white' };
  if (p.gozadas && p.pagas) return { label: 'Gozadas + Pagas', cls: 'bg-green-500 text-white' };
  if (p.gozadas && !p.pagas) return { label: 'Gozadas (não pagas)', cls: 'bg-blue-500 text-white' };
  if (!p.gozadas && p.pagas) return { label: 'Pagas (não gozadas)', cls: 'bg-yellow-500 text-white' };
  return { label: p.vencidas ? 'Devidas em Dobro' : 'Devidas', cls: 'bg-red-500 text-white' };
}

/** Verifica se um período de férias está prescrito.
 * Prescrição começa após fim do período concessivo (inicio_aquisitivo + 24 meses).
 * Prazo prescricional: 5 anos. Total: inicio_aquisitivo < ajuizamento - 7 anos.
 */
function isPrescrita(inicioAquisitivo, dataAjuizamento) {
  if (!inicioAquisitivo || !dataAjuizamento) return false;
  const ini = new Date(inicioAquisitivo);
  const ajuiz = new Date(dataAjuizamento);
  const limitePrescrição = new Date(ajuiz);
  limitePrescrição.setFullYear(limitePrescrição.getFullYear() - 7);
  return ini < limitePrescrição;
}

export default function FeriasDetalhadas() {
  const { dados, setPeriodosFerias } = useCalculoStore();
  const { mutateAsync: buscarPeriodos } = usePeriodosAquisitivos();
  const [periodos, setPeriodosLocal] = useState(dados.periodosFerias || []);
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
        const novos = (res.periodosFerias || []).map(p => {
          const prescrita = isPrescrita(p.inicioAquisitivo, ajuiz);
          return {
            ...p,
            gozadas: false,
            pagas: false,
            valorPago: null,
            dataGozo: null,
            dataGozoFim: null,
            diasGozados: null,
            prescrita,
            excluida: prescrita,
          };
        });
        setPeriodosLocal(novos);
        setPeriodosFerias(novos);
      }).catch(() => {}).finally(() => setCarregando(false));
    }
  }, []);

  function atualizar(idx, updates) {
    const novos = periodos.map((p, i) => i === idx ? { ...p, ...updates } : p);
    setPeriodosLocal(novos);
    setPeriodosFerias(novos);
  }

  function toggleGozadas(idx) {
    const p = periodos[idx];
    if (p.tipo === 'proporcional') return;
    const novoGozadas = !p.gozadas;
    atualizar(idx, {
      gozadas: novoGozadas,
      ...(novoGozadas ? {} : { dataGozo: null, dataGozoFim: null, diasGozados: null }),
    });
  }

  function togglePagas(idx) {
    const p = periodos[idx];
    const novoPagas = !p.pagas;
    atualizar(idx, {
      pagas: novoPagas,
      ...(novoPagas ? {} : { valorPago: null }),
    });
  }

  if (carregando) {
    return <div className="py-8 text-center text-gray-400">Calculando períodos aquisitivos...</div>;
  }
  if (periodos.length === 0) {
    return <div className="py-8 text-center text-gray-400">Nenhum período aquisitivo encontrado. Verifique as datas do contrato.</div>;
  }

  return (
    <div>
      <div className="aviso-judicial mb-3">
        <strong>Férias:</strong> Marque independentemente se cada período foi <strong>Gozado</strong> (descanso efetivo) e/ou <strong>Pago</strong> (recebeu a remuneração). Ao marcar como <strong>Pago</strong>, informe o valor se o pagamento foi parcial — se deixar em branco, o sistema considera pagamento integral (sem saldo). Períodos cujo prazo concessivo expirou sem gozo são devidos em dobro (art. 137 CLT).
      </div>

      <div className="space-y-3">
        {periodos.map((p, idx) => {
          const ehProporcional = p.tipo === 'proporcional';
          const badge = badgeFerias(p);

          return (
            <div key={idx} className={`card p-4 border-l-4 ${
              p.prescrita && p.excluida ? 'border-l-gray-300 opacity-60' :
              p.vencidas && !p.gozadas ? 'border-l-red-400' : ehProporcional ? 'border-l-blue-400' : p.gozadas && p.pagas ? 'border-l-green-400' : 'border-l-gray-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-primaria">
                      {ehProporcional
                        ? `Período Proporcional — ${p.avos}/12 avos`
                        : `${p.numero}º Período Aquisitivo`}
                    </span>
                    {p.vencidas && !p.gozadas && !p.prescrita && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Vencidas — Dobro</span>
                    )}
                    {p.prescrita && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Prescrita</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    <div><span className="font-medium">Aquisitivo:</span> {fmtData(p.inicioAquisitivo)} a {fmtData(p.fimAquisitivo)}</div>
                    <div><span className="font-medium">Concessivo:</span> {fmtData(p.inicioConcessivo)} a {fmtData(p.fimConcessivo)}</div>
                    {ehProporcional && (
                      <div className="col-span-2">
                        <span className="font-medium">Avos:</span> {p.avos}/12
                        {p.diasRestantes >= 15 && ` (${p.meses} meses + ${p.diasRestantes} dias ≥ 15 → +1 mês)`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controles */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {!ehProporcional && (
                    <button
                      type="button"
                      onClick={() => toggleGozadas(idx)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        p.gozadas ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Gozadas
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => togglePagas(idx)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      p.pagas ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pagas
                  </button>
                  {ehProporcional && !p.pagas && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-orange-500 text-white font-medium">Devidas</span>
                  )}
                </div>
                {p.prescrita && (
                  <button
                    type="button"
                    onClick={() => atualizar(idx, { excluida: !p.excluida })}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      p.excluida ? 'border-gray-400 text-gray-500 hover:bg-gray-50' : 'bg-amber-500 text-white border-amber-500'
                    }`}
                    title={p.excluida ? 'Incluir no cálculo (sobrepõe prescrição)' : 'Excluir do cálculo (prescrita)'}
                  >
                    {p.excluida ? 'Incluir' : 'Excluir'}
                  </button>
                )}
              </div>

              {/* Campos extras para "gozadas" */}
              {p.gozadas && !ehProporcional && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-3 py-2 mb-3">
                    <strong>Gozo presumido:</strong> Se as datas não forem preenchidas, presume-se gozo integral de 30 dias.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="campo-label">Início do Gozo</label>
                      <input type="date" value={p.dataGozo || ''} onChange={(e) => atualizar(idx, { dataGozo: e.target.value })} className="campo-input" />
                      <p className="text-xs text-gray-400 mt-1">Se após o concessivo → dobro.</p>
                    </div>
                    <div>
                      <label className="campo-label">Fim do Gozo</label>
                      <input type="date" value={p.dataGozoFim || ''} onChange={(e) => atualizar(idx, { dataGozoFim: e.target.value })} className="campo-input" />
                    </div>
                    <div>
                      <label className="campo-label">Dias Gozados</label>
                      <input type="number" value={p.diasGozados || ''} onChange={(e) => atualizar(idx, { diasGozados: Number(e.target.value) || null })} className="campo-input" min="0" max="30" placeholder="30" />
                    </div>
                  </div>
                </div>
              )}

              {/* Campo valor pago */}
              {p.pagas && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-3 py-2 mb-3">
                    O valor pago será deduzido do total devido a título de férias neste período.
                  </p>
                  <div className="max-w-xs">
                    <label className="campo-label">Valor Pago (R$)</label>
                    <input
                      type="number"
                      value={p.valorPago || ''}
                      onChange={(e) => atualizar(idx, { valorPago: Number(e.target.value) || null })}
                      className="campo-input"
                      step="0.01" min="0"
                      placeholder="Valor efetivamente pago"
                    />
                    <p className="text-xs text-gray-400 mt-1">Se em branco → presume pagamento integral (nada a deduzir).</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

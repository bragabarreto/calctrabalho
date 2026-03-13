import React, { useEffect, useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { usePeriodosAquisitivos } from '../../hooks/useCalculo.js';

function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_LABELS = {
  pagas: 'Pagas',
  gozadas: 'Gozadas',
  devidas: 'Devidas',
  pendente: 'Pendente',
};

export default function FeriasDetalhadas() {
  const { dados, setPeriodosFerias } = useCalculoStore();
  const { mutateAsync: buscarPeriodos } = usePeriodosAquisitivos();
  const [periodos, setPeriodosLocal] = useState(dados.periodosFerias || []);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    // Carrega os períodos automaticamente ao montar (se não carregados ainda)
    if (periodos.length === 0 && dados.dataAdmissao && dados.dataDispensa) {
      setCarregando(true);
      buscarPeriodos({
        dataAdmissao: dados.dataAdmissao,
        dataDispensa: dados.dataDispensa,
        avisoPrevioTrabalhado: dados.avisoPrevioTrabalhado,
      }).then((res) => {
        setPeriodosLocal(res.periodosFerias || []);
        setPeriodosFerias(res.periodosFerias || []);
      }).catch(() => {}).finally(() => setCarregando(false));
    }
  }, []);

  function atualizar(idx, campo, valor) {
    const novos = periodos.map((p, i) => i === idx ? { ...p, [campo]: valor } : p);
    setPeriodosLocal(novos);
    setPeriodosFerias(novos);
  }

  function toggleStatus(idx, status) {
    const atual = periodos[idx];
    // Proporcional sempre é devido
    if (atual.tipo === 'proporcional') return;
    // Clicou no status já ativo → deseleciona (volta para pendente)
    const novoStatus = atual.status === status ? 'pendente' : status;
    const updates = { status: novoStatus };
    if (novoStatus !== 'gozadas') {
      updates.dataGozo = null;
      updates.diasGozados = null;
    }
    const novos = periodos.map((p, i) => i === idx ? { ...p, ...updates } : p);
    setPeriodosLocal(novos);
    setPeriodosFerias(novos);
  }

  if (carregando) {
    return <div className="py-8 text-center text-gray-400">Calculando períodos aquisitivos...</div>;
  }

  if (periodos.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        Nenhum período aquisitivo encontrado. Verifique as datas do contrato.
      </div>
    );
  }

  return (
    <div>
      <div className="aviso-judicial mb-3">
        <strong>Férias:</strong> Períodos cujo prazo concessivo expirou sem gozo são devidas em dobro (CLT art. 137). O proporcional é sempre devido. Marque o status de cada período.
      </div>

      <div className="space-y-3">
        {periodos.map((p, idx) => {
          const ehProporcional = p.tipo === 'proporcional';
          const ehGozadas = p.status === 'gozadas';
          const ehDevida = p.status === 'devidas';

          return (
            <div key={idx} className={`card p-4 border-l-4 ${
              p.vencidas ? 'border-l-red-400' : ehProporcional ? 'border-l-blue-400' : 'border-l-gray-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Info do período */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-primaria">
                      {ehProporcional
                        ? `Período Proporcional — ${p.avos}/12 avos`
                        : `${p.numero}º Período Aquisitivo`}
                    </span>
                    {p.vencidas && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        Vencidas — Dobro
                      </span>
                    )}
                    {ehProporcional && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        Proporcional
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Aquisitivo:</span>{' '}
                      {fmtData(p.inicioAquisitivo)} a {fmtData(p.fimAquisitivo)}
                    </div>
                    <div>
                      <span className="font-medium">Concessivo:</span>{' '}
                      {fmtData(p.inicioConcessivo)} a {fmtData(p.fimConcessivo)}
                    </div>
                    {ehProporcional && (
                      <div className="col-span-2">
                        <span className="font-medium">Avos:</span> {p.avos}/12
                        {p.diasRestantes >= 15 && ` (${p.meses} meses + ${p.diasRestantes} dias ≥ 15 → +1 mês)`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controles de status */}
                {!ehProporcional && (
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    {['pagas', 'gozadas', 'devidas'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStatus(idx, s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          p.status === s
                            ? s === 'devidas' ? 'bg-orange-500 text-white border-orange-500'
                            : s === 'pagas' ? 'bg-green-500 text-white border-green-500'
                            : 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
                {ehProporcional && (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-orange-500 text-white font-medium">
                    Devidas
                  </span>
                )}
              </div>

              {/* Campos extras para "gozadas" */}
              {ehGozadas && !ehProporcional && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-3 py-2 mb-3">
                    <strong>Gozo presumido:</strong> Se as datas de gozo não forem preenchidas, o sistema presume que as férias foram integralmente gozadas (30 dias) — nenhuma indenização é devida por este período.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="campo-label">Data de Início do Gozo</label>
                      <input
                        type="date"
                        value={p.dataGozo || ''}
                        onChange={(e) => atualizar(idx, 'dataGozo', e.target.value)}
                        className="campo-input"
                      />
                      <p className="text-xs text-gray-400 mt-1">Se após o concessivo → dobro.</p>
                    </div>
                    <div>
                      <label className="campo-label">Data de Fim do Gozo</label>
                      <input
                        type="date"
                        value={p.dataGozoFim || ''}
                        onChange={(e) => atualizar(idx, 'dataGozoFim', e.target.value)}
                        className="campo-input"
                      />
                      <p className="text-xs text-gray-400 mt-1">Opcional — calcula dias automaticamente.</p>
                    </div>
                    <div>
                      <label className="campo-label">Dias Efetivamente Gozados</label>
                      <input
                        type="number"
                        value={p.diasGozados || ''}
                        onChange={(e) => atualizar(idx, 'diasGozados', Number(e.target.value) || null)}
                        className="campo-input"
                        min="0"
                        max="30"
                        placeholder="30 (integral)"
                      />
                      <p className="text-xs text-gray-400 mt-1">Se em branco → 30 dias.</p>
                    </div>
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

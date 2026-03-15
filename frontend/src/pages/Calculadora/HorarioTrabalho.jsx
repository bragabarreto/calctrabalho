import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Calendar, Info } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { useMutation } from '@tanstack/react-query';

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

function toMinutos(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]; // Seg → Dom

function SemanaPadrao({ periodo }) {
  const {
    horaEntrada, horaSaida, intervaloMinutos = 60,
    diasSemana = [1, 2, 3, 4, 5], divisorJornada = 220, padraoApuracao = 'diario',
  } = periodo;

  if (!horaEntrada || !horaSaida) return null;

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  const minLiquidosDia = Math.max(0, (saidaMin - entradaMin) - (intervaloMinutos || 0));

  const horasSemanais = (divisorJornada * 12) / 52;
  const minContratualSemana = horasSemanais * 60;
  const minContratualDia = diasSemana.length > 0 ? minContratualSemana / diasSemana.length : 0;

  if (padraoApuracao === '12x36') {
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-medium text-blue-800 mb-2">Regime 12×36 — Ciclo padrão</p>
        <div className="flex gap-3">
          <div className="flex-1 p-2 bg-blue-100 rounded text-center">
            <p className="text-sm font-bold text-blue-900">12h</p>
            <p className="text-xs text-blue-700">Turno trabalho</p>
            <p className="text-xs text-blue-600 font-mono">{horaEntrada} → {horaSaida}</p>
          </div>
          <div className="flex-1 p-2 bg-gray-100 rounded text-center">
            <p className="text-sm font-bold text-gray-600">36h</p>
            <p className="text-xs text-gray-500">Descanso</p>
            <p className="text-xs text-gray-400">~15 turnos/mês</p>
          </div>
        </div>
      </div>
    );
  }

  let somaDiasMin = 0;
  let somaHEDiariasMin = 0;

  const linhas = ORDEM_DIAS.map((dia) => {
    const trabalha = diasSemana.includes(dia);
    let heMin = 0;
    if (trabalha) {
      somaDiasMin += minLiquidosDia;
      if (padraoApuracao === 'diario' || padraoApuracao === 'misto') {
        heMin = Math.max(0, minLiquidosDia - minContratualDia);
        somaHEDiariasMin += heMin;
      }
    }
    return { dia, trabalha, heMin };
  });

  let heSemanalAdicionalMin = 0;
  if (padraoApuracao === 'semanal') {
    heSemanalAdicionalMin = Math.max(0, somaDiasMin - minContratualSemana);
  } else if (padraoApuracao === 'misto') {
    heSemanalAdicionalMin = Math.max(0, somaDiasMin - minContratualSemana - somaHEDiariasMin);
  }
  const totalHEMin = somaHEDiariasMin + heSemanalAdicionalMin;

  const mostraColHE = padraoApuracao === 'diario' || padraoApuracao === 'misto';

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-600 mb-1.5">Semana padrão</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1.5 text-left text-gray-600">Dia</th>
              <th className="px-2 py-1.5 text-center text-gray-600">Entrada</th>
              <th className="px-2 py-1.5 text-center text-gray-600">Saída</th>
              <th className="px-2 py-1.5 text-center text-gray-600">Horas</th>
              {mostraColHE && <th className="px-2 py-1.5 text-center text-gray-600">HE diária</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ dia, trabalha, heMin }) => (
              <tr key={dia} className={trabalha ? 'hover:bg-blue-50' : 'opacity-40 bg-gray-50'}>
                <td className="px-2 py-1 font-medium">{NOMES_DIAS[dia]}</td>
                <td className="px-2 py-1 text-center font-mono">{trabalha ? horaEntrada : '—'}</td>
                <td className="px-2 py-1 text-center font-mono">{trabalha ? horaSaida : '—'}</td>
                <td className="px-2 py-1 text-center">{trabalha ? formatMin(minLiquidosDia) : 'Folga'}</td>
                {mostraColHE && (
                  <td className={`px-2 py-1 text-center ${heMin > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    {trabalha ? (heMin > 0 ? formatMin(heMin) : '—') : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-medium">
              <td colSpan={3} className="px-2 py-1.5 text-gray-700">Total semana</td>
              <td className="px-2 py-1.5 text-center">{formatMin(somaDiasMin)}</td>
              {mostraColHE && (
                <td className={`px-2 py-1.5 text-center ${somaHEDiariasMin > 0 ? 'text-orange-600' : ''}`}>
                  {somaHEDiariasMin > 0 ? formatMin(somaHEDiariasMin) : '—'}
                </td>
              )}
            </tr>
            {heSemanalAdicionalMin > 0 && (
              <tr className="bg-orange-50">
                <td colSpan={mostraColHE ? 5 : 4} className="px-2 py-1 text-xs text-orange-700">
                  + {formatMin(heSemanalAdicionalMin)} HE semanal (excesso sobre {formatMin(Math.round(minContratualSemana))} contratual)
                </td>
              </tr>
            )}
            {totalHEMin > 0 && (
              <tr className="bg-orange-100">
                <td colSpan={mostraColHE ? 4 : 3} className="px-2 py-1 text-xs font-bold text-orange-800">HE total/semana</td>
                <td className="px-2 py-1 text-center text-xs font-bold text-orange-800">
                  {formatMin(totalHEMin)} ≈ {(totalHEMin / 60).toFixed(2)}h
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      {padraoApuracao === 'semanal' && (
        <p className="text-xs text-gray-400 mt-1">
          HE apuradas somente quando o total semanal excede o limite contratual ({formatMin(Math.round(minContratualSemana))}).
        </p>
      )}
    </div>
  );
}

const PADROES = [
  { value: 'diario', label: 'Diário', desc: 'HE apuradas por dia: excesso sobre limite diário' },
  { value: 'semanal', label: 'Semanal', desc: 'HE apuradas por semana: excesso sobre limite semanal' },
  { value: 'misto', label: 'Misto', desc: 'HE diárias + excesso semanal adicional (Súm. 291 TST)' },
  { value: '12x36', label: '12×36', desc: 'Turnos de 12h com 36h de descanso; HE por turno' },
];

function novoPeriodo(dataAdmissao, dataDispensa) {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    dataInicio: dataAdmissao || '',
    dataFim: dataDispensa || '',
    padraoApuracao: 'diario',
    divisorJornada: 220,
    adicionalHoraExtra: 0.5,
    adicionalHoraNoturna: 0.2,
    modoEntrada: 'medio',
    // Médio
    mediaHorasExtrasDiarias: 0,
    mediaHorasExtrasSemanais: 0,
    mediaHorasExtrasPorTurno: 0,
    mediaHorasNoturnasDiarias: 0,
    // Cartão ponto
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloMinutos: 60,
    diasSemana: [1, 2, 3, 4, 5],
    afastamentos: [],
    // Resultado cartão
    totalHorasExtras: null,
    totalHorasNoturnas: null,
    distribuicaoMensal: null,
  };
}

async function calcularCartaoPonto(payload) {
  const resp = await fetch('/api/calculos/cartao-ponto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
  return json;
}

function FormPeriodo({ periodo, onChange, onRemover, dataAdmissao, dataDispensa, podRemover }) {
  const [aberto, setAberto] = useState(true);
  const { mutateAsync: calcPonto, isPending: calculando } = useMutation({ mutationFn: calcularCartaoPonto });

  function set(campo, valor) {
    onChange({ ...periodo, [campo]: valor });
  }

  function toggleDia(dia) {
    const dias = periodo.diasSemana.includes(dia)
      ? periodo.diasSemana.filter(d => d !== dia)
      : [...periodo.diasSemana, dia].sort();
    set('diasSemana', dias);
  }

  function addAfastamento() {
    set('afastamentos', [...(periodo.afastamentos || []), { inicio: '', fim: '', motivo: '' }]);
  }
  function updAfastamento(idx, campo, valor) {
    set('afastamentos', periodo.afastamentos.map((a, i) => i === idx ? { ...a, [campo]: valor } : a));
  }
  function remAfastamento(idx) {
    set('afastamentos', periodo.afastamentos.filter((_, i) => i !== idx));
  }

  async function calcular() {
    try {
      const res = await calcPonto({
        jornadaDefinida: {
          horaEntrada: periodo.horaEntrada,
          horaSaida: periodo.horaSaida,
          intervaloMinutos: periodo.intervaloMinutos,
          diasSemana: periodo.diasSemana,
        },
        dataInicio: periodo.dataInicio || dataAdmissao,
        dataFim: periodo.dataFim || dataDispensa,
        afastamentos: (periodo.afastamentos || []).filter(a => a.inicio && a.fim),
        divisorJornada: periodo.divisorJornada || 220,
      });
      onChange({
        ...periodo,
        totalHorasExtras: res.totalHorasExtras,
        distribuicaoMensal: res.distribuicaoMensal,
      });
    } catch (e) {
      alert('Erro ao calcular cartão de ponto: ' + e.message);
    }
  }

  const pctHE = Math.round((periodo.adicionalHoraExtra || 0.5) * 100);
  const pctAN = Math.round((periodo.adicionalHoraNoturna || 0.2) * 100);
  const padraoLabel = PADROES.find(p => p.value === periodo.padraoApuracao)?.label || '';

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Cabeçalho do período */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setAberto(!aberto)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm text-gray-800">
            {periodo.dataInicio || 'admissão'} → {periodo.dataFim || 'dispensa'}
          </span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
            {padraoLabel} · {periodo.modoEntrada === 'cartao_ponto' ? 'Cartão ponto' : 'Médio'}
          </span>
          {periodo.totalHorasExtras !== null && (
            <span className="text-xs text-green-700 font-medium shrink-0">
              ≈ {periodo.totalHorasExtras}h HE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {podRemover && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemover(); }}
              className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={14} /></button>
          )}
          {aberto ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {aberto && (
        <div className="p-4 space-y-5">
          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="campo-label">Início do período</label>
              <input type="date" value={periodo.dataInicio} onChange={e => set('dataInicio', e.target.value)}
                className="campo-input" placeholder={dataAdmissao} />
              <p className="text-xs text-gray-400 mt-0.5">Vazio = data de admissão</p>
            </div>
            <div>
              <label className="campo-label">Fim do período</label>
              <input type="date" value={periodo.dataFim} onChange={e => set('dataFim', e.target.value)}
                className="campo-input" placeholder={dataDispensa} />
              <p className="text-xs text-gray-400 mt-0.5">Vazio = data de dispensa</p>
            </div>
          </div>

          {/* Padrão de apuração */}
          <div>
            <label className="campo-label mb-2 block">Padrão de Apuração</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PADROES.map(p => (
                <label key={p.value} className={`flex flex-col gap-1 p-2 rounded-lg border-2 cursor-pointer transition-colors text-xs ${
                  periodo.padraoApuracao === p.value ? 'border-primaria bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-1">
                    <input type="radio" name={`padrao_${periodo.id}`} value={p.value}
                      checked={periodo.padraoApuracao === p.value}
                      onChange={() => set('padraoApuracao', p.value)} />
                    <span className="font-semibold">{p.label}</span>
                  </div>
                  <span className="text-gray-500 leading-tight">{p.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Divisor + adicionais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="campo-label">Divisor (h/mês)</label>
              <input type="number" value={periodo.divisorJornada}
                onChange={e => set('divisorJornada', Number(e.target.value))}
                className="campo-input" step="1" min="100" max="300" />
              <p className="text-xs text-gray-400 mt-0.5">220=44h/sem · 200=40h · 180=36h · 150=bancário</p>
            </div>
            <div>
              <label className="campo-label">Adicional HE (%)</label>
              <div className="flex items-center gap-1">
                <input type="number" value={pctHE}
                  onChange={e => set('adicionalHoraExtra', Number(e.target.value) / 100)}
                  className="campo-input" step="1" min="50" max="200" />
                <span className="text-gray-500 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className="campo-label">Adicional Noturno (%)</label>
              <div className="flex items-center gap-1">
                <input type="number" value={pctAN}
                  onChange={e => set('adicionalHoraNoturna', Number(e.target.value) / 100)}
                  className="campo-input" step="1" min="20" max="100" />
                <span className="text-gray-500 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Modo de entrada */}
          <div>
            <label className="campo-label mb-2 block">Modo de apuração das horas</label>
            <div className="flex gap-3">
              {[
                { value: 'medio', label: 'Por média (informar valores médios)' },
                { value: 'cartao_ponto', label: 'Por cartão de ponto virtual' },
              ].map(m => (
                <label key={m.value} className={`flex-1 flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer text-sm transition-colors ${
                  periodo.modoEntrada === m.value ? 'border-primaria bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name={`modo_${periodo.id}`} value={m.value}
                    checked={periodo.modoEntrada === m.value}
                    onChange={() => set('modoEntrada', m.value)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* MODO MÉDIO */}
          {periodo.modoEntrada === 'medio' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info size={12} /> Informe as médias habituais de horas extras e noturnas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(periodo.padraoApuracao === 'diario' || periodo.padraoApuracao === 'misto') && (
                  <div>
                    <label className="campo-label">Média de HE por dia (h)</label>
                    <input type="number" value={periodo.mediaHorasExtrasDiarias}
                      onChange={e => set('mediaHorasExtrasDiarias', Number(e.target.value))}
                      className="campo-input" step="0.25" min="0" />
                  </div>
                )}
                {(periodo.padraoApuracao === 'semanal' || periodo.padraoApuracao === 'misto') && (
                  <div>
                    <label className="campo-label">Média de HE por semana (h)</label>
                    <input type="number" value={periodo.mediaHorasExtrasSemanais}
                      onChange={e => set('mediaHorasExtrasSemanais', Number(e.target.value))}
                      className="campo-input" step="0.25" min="0" />
                  </div>
                )}
                {periodo.padraoApuracao === '12x36' && (
                  <div>
                    <label className="campo-label">Média de HE por turno de trabalho (h)</label>
                    <input type="number" value={periodo.mediaHorasExtrasPorTurno}
                      onChange={e => set('mediaHorasExtrasPorTurno', Number(e.target.value))}
                      className="campo-input" step="0.25" min="0" />
                    <p className="text-xs text-gray-400 mt-0.5">~15 turnos/mês em regime 12×36</p>
                  </div>
                )}
                <div>
                  <label className="campo-label">Média de horas noturnas por dia (h)</label>
                  <input type="number" value={periodo.mediaHorasNoturnasDiarias}
                    onChange={e => set('mediaHorasNoturnasDiarias', Number(e.target.value))}
                    className="campo-input" step="0.25" min="0" />
                </div>
              </div>
            </div>
          )}

          {/* MODO CARTÃO DE PONTO */}
          {periodo.modoEntrada === 'cartao_ponto' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="campo-label">Hora de entrada</label>
                  <input type="time" value={periodo.horaEntrada}
                    onChange={e => set('horaEntrada', e.target.value)} className="campo-input" />
                </div>
                <div>
                  <label className="campo-label">Hora de saída</label>
                  <input type="time" value={periodo.horaSaida}
                    onChange={e => set('horaSaida', e.target.value)} className="campo-input" />
                </div>
                <div>
                  <label className="campo-label">Intervalo (min)</label>
                  <input type="number" value={periodo.intervaloMinutos}
                    onChange={e => set('intervaloMinutos', Number(e.target.value))}
                    className="campo-input" min="0" max="120" step="15" />
                </div>
              </div>

              <div>
                <label className="campo-label mb-1 block">Dias trabalhados na semana</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => toggleDia(value)}
                      className={`w-12 h-9 rounded text-xs font-medium border transition-colors ${
                        periodo.diasSemana.includes(value)
                          ? 'bg-primaria text-white border-primaria'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <SemanaPadrao periodo={periodo} />

              {/* Afastamentos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="campo-label mb-0">Afastamentos neste período</label>
                  <button type="button" onClick={addAfastamento}
                    className="btn-secundario text-xs py-1 px-2 flex items-center gap-1">
                    <Plus size={11} /> Adicionar
                  </button>
                </div>
                {(periodo.afastamentos || []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-1">Nenhum afastamento.</p>
                ) : (
                  <div className="space-y-1">
                    {(periodo.afastamentos || []).map((a, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <input type="date" value={a.inicio}
                          onChange={e => updAfastamento(idx, 'inicio', e.target.value)}
                          className="campo-input text-sm" />
                        <input type="date" value={a.fim}
                          onChange={e => updAfastamento(idx, 'fim', e.target.value)}
                          className="campo-input text-sm" />
                        <input type="text" value={a.motivo}
                          onChange={e => updAfastamento(idx, 'motivo', e.target.value)}
                          className="campo-input text-sm" placeholder="Motivo" />
                        <button type="button" onClick={() => remAfastamento(idx)}
                          className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" onClick={calcular} disabled={calculando}
                className="btn-secundario w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Calendar size={15} />
                {calculando ? 'Calculando...' : 'Calcular Horas Extras pela Jornada'}
              </button>

              {periodo.totalHorasExtras !== null && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-semibold text-green-800 mb-1">
                    Total apurado: <span className="font-mono">{periodo.totalHorasExtras}h extras</span>
                  </p>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(periodo.distribuicaoMensal || []).slice(0, 6).map(m => (
                      <div key={m.mes} className="flex justify-between">
                        <span>{m.mes}</span>
                        <span>{m.diasTrabalhados} dias · {m.horasExtras}h HE</span>
                      </div>
                    ))}
                    {(periodo.distribuicaoMensal || []).length > 6 && (
                      <p className="text-green-600 italic">
                        ... e mais {periodo.distribuicaoMensal.length - 6} meses
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Média mensal:{' '}
                    <strong>
                      {((periodo.totalHorasExtras) / ((periodo.distribuicaoMensal || []).length || 1)).toFixed(2)}h/mês
                    </strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HorarioTrabalho() {
  const { dados, setDados, setStep } = useCalculoStore();

  const [periodos, setPeriodos] = useState(() => {
    if ((dados.jornadaPeriodos || []).length > 0) return dados.jornadaPeriodos;
    return [novoPeriodo(dados.dataAdmissao, dados.dataDispensa)];
  });

  function addPeriodo() {
    setPeriodos(prev => [...prev, novoPeriodo('', '')]);
  }

  function updatePeriodo(id, updated) {
    setPeriodos(prev => prev.map(p => p.id === id ? updated : p));
  }

  function removePeriodo(id) {
    setPeriodos(prev => prev.filter(p => p.id !== id));
  }

  function salvarEIr(step) {
    setDados({ jornadaPeriodos: periodos });
    setStep(step);
  }

  return (
    <div className="max-w-3xl">
      <div className="aviso-judicial mb-4">
        <strong>Padrão de apuração:</strong> Verifique convenção coletiva e jurisprudência aplicável.
        Súm. 291 TST: horas extras habituais compensadas em regime 2×1 (diário + semanal = misto).
        Divisor bancários: Súm. 431 TST (150h). Padrão CLT: 220h (44h/sem).
      </div>

      {/* Lista de períodos */}
      <div className="space-y-3 mb-4">
        {periodos.map(p => (
          <FormPeriodo
            key={p.id}
            periodo={p}
            onChange={updated => updatePeriodo(p.id, updated)}
            onRemover={() => removePeriodo(p.id)}
            podRemover={periodos.length > 1}
            dataAdmissao={dados.dataAdmissao}
            dataDispensa={dados.dataDispensa}
          />
        ))}
      </div>

      <button type="button" onClick={addPeriodo}
        className="btn-secundario flex items-center gap-2 text-sm mb-6">
        <Plus size={14} /> Adicionar período de jornada
      </button>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={() => salvarEIr(11)}>
          ← Anterior
        </button>
        <button type="button" className="btn-secundario text-gray-400 text-sm" onClick={() => salvarEIr(7)}>
          Pular (sem jornada extra) →
        </button>
        <button type="button" className="btn-primario" onClick={() => salvarEIr(7)}>
          Calcular Verbas →
        </button>
      </div>
    </div>
  );
}

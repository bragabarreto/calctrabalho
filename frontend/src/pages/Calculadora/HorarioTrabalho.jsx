import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Calendar, Info, Settings2 } from 'lucide-react';
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
    horasJornadaPadrao12x36 = 12,
  } = periodo;

  if (!horaEntrada || !horaSaida) return null;

  const entradaMin = toMinutos(horaEntrada);
  const saidaMin = toMinutos(horaSaida);
  const minLiquidosDia = Math.max(0, (saidaMin - entradaMin) - (intervaloMinutos || 0));

  // Relação: divisor = horasSemanais × 5 (Súmula TST 431)
  const horasSemanais = divisorJornada / 5;
  const minContratualSemana = horasSemanais * 60;
  const minContratualDia = diasSemana.length > 0 ? minContratualSemana / diasSemana.length : 0;

  if (padraoApuracao === '12x36') {
    const minEfetivoDia = minLiquidosDia;
    const minPadraoTurno = horasJornadaPadrao12x36 * 60;
    const heMinTurno = Math.max(0, minEfetivoDia - minPadraoTurno);
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-medium text-blue-800 mb-2">Regime 12×36 — Ciclo padrão</p>
        <div className="flex gap-3">
          <div className="flex-1 p-2 bg-blue-100 rounded text-center">
            <p className="text-sm font-bold text-blue-900">{horasJornadaPadrao12x36}h padrão</p>
            <p className="text-xs text-blue-700">Turno contratual</p>
            <p className="text-xs text-blue-600 font-mono">{horaEntrada} → {horaSaida} ({formatMin(minEfetivoDia)} efetivo)</p>
          </div>
          <div className="flex-1 p-2 bg-gray-100 rounded text-center">
            <p className="text-sm font-bold text-gray-600">36h</p>
            <p className="text-xs text-gray-500">Descanso</p>
            <p className="text-xs text-gray-400">~15 turnos/mês</p>
          </div>
        </div>
        {heMinTurno > 0 && (
          <p className="text-xs text-amber-700 mt-2 font-medium">
            HE/turno: {formatMin(heMinTurno)} × ~15 turnos ≈ {formatMin(heMinTurno * 15)}/mês
          </p>
        )}
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
    mediaHEUnidade: 'h',
    mediaHEPeriodo: 'diario',
    mediaANUnidade: 'h',
    mediaANPeriodo: 'diario',
    // Cartão ponto
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloMinutos: 60,
    diasSemana: [1, 2, 3, 4, 5],
    horasJornadaPadrao12x36: 12,
    prorrogacaoNoturna: false,
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

// ── Toggle switch reutilizável ────────────────────────────────────────────────
function Toggle({ value, onChange, label, desc }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
      >
        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </div>
  );
}

// ── Seção colapsável ──────────────────────────────────────────────────────────
function SecaoJornada({ titulo, badge, ativo, onToggleAtivo, children }) {
  const [aberta, setAberta] = useState(false);

  return (
    <div className={`border rounded-lg overflow-hidden ${ativo ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200'}`}>
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${ativo ? 'bg-indigo-50 hover:bg-indigo-100' : 'bg-gray-50 hover:bg-gray-100'}`}
        onClick={() => setAberta(!aberta)}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleAtivo(!ativo); if (!ativo) setAberta(true); }}
            className={`relative inline-flex h-4 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${ativo ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium ${ativo ? 'text-indigo-800' : 'text-gray-700'}`}>{titulo}</span>
          {badge && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{badge}</span>}
        </div>
        {aberta ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </div>
      {aberta && (
        <div className="px-4 py-3 border-t border-gray-200 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function normalizarHorasMedio(periodo) {
  const toH = (v, u) => (u === 'min' ? v / 60 : v);
  const hEPeriodo = periodo.mediaHEPeriodo || 'diario';
  const hEUnidade = periodo.mediaHEUnidade || 'h';
  const hEDia = (() => {
    const raw = toH(periodo.mediaHorasExtrasDiarias || 0, hEUnidade);
    if (hEPeriodo === 'semanal') return raw / 5;
    if (hEPeriodo === 'mensal') return raw / 21.75;
    return raw;
  })();
  const hESem = (() => {
    const raw = toH(periodo.mediaHorasExtrasSemanais || 0, hEUnidade);
    if (hEPeriodo === 'diario') return raw * 5;
    if (hEPeriodo === 'mensal') return raw / 4.33;
    return raw;
  })();
  const anUnidade = periodo.mediaANUnidade || 'h';
  const anPeriodo = periodo.mediaANPeriodo || 'diario';
  const anDia = (() => {
    const raw = toH(periodo.mediaHorasNoturnasDiarias || 0, anUnidade);
    if (anPeriodo === 'semanal') return raw / 5;
    if (anPeriodo === 'mensal') return raw / 21.75;
    return raw;
  })();
  return { heDia: hEDia, heSemana: hESem, anDia };
}

function fmt2(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function FormPeriodo({ periodo, onChange, onRemover, dataAdmissao, dataDispensa, podRemover, salario }) {
  const [aberto, setAberto] = useState(true);
  const [demoMedio, setDemoMedio] = useState(null);
  const { mutateAsync: calcPonto, isPending: calculando } = useMutation({ mutationFn: calcularCartaoPonto });

  function apurarMedio() {
    const { heDia, heSemana, anDia } = normalizarHorasMedio(periodo);
    const div = periodo.divisorJornada || 220;
    const adicHE = periodo.adicionalHoraExtra ?? 0.5;
    const adicAN = periodo.adicionalHoraNoturna ?? 0.2;
    const sal = salario || 0;
    const diasUteis = 21.75;
    let heMensal = 0;
    if (periodo.padraoApuracao === 'diario' || periodo.padraoApuracao === 'misto') heMensal += heDia * diasUteis;
    if (periodo.padraoApuracao === 'semanal' || periodo.padraoApuracao === 'misto') heMensal += heSemana * 4.33;
    if (periodo.padraoApuracao === '12x36') heMensal += (periodo.mediaHorasExtrasPorTurno || 0) * 15;
    const anMensal = anDia * diasUteis;
    const valorHora = sal / div;
    const valorHEMensal = valorHora * (1 + adicHE) * heMensal;
    const valorANMensal = valorHora * adicAN * (60 / 52.5) * anMensal;
    setDemoMedio({ heMensal: +heMensal.toFixed(2), anMensal: +anMensal.toFixed(2), valorHEMensal, valorANMensal, sal, div });
  }

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
                <Info size={12} /> Informe as médias habituais. Selecione a unidade e o período de referência.
              </p>
              {/* Seletores globais de unidade e período para HE */}
              {periodo.padraoApuracao !== '12x36' && (
                <div className="flex flex-wrap gap-3 items-center text-xs text-gray-600">
                  <span className="font-medium">Unidade HE:</span>
                  {['h', 'min'].map(u => (
                    <button key={u} type="button" onClick={() => set('mediaHEUnidade', u)}
                      className={`px-2 py-0.5 rounded border transition-colors ${(periodo.mediaHEUnidade || 'h') === u ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500'}`}>{u}</button>
                  ))}
                  <span className="font-medium ml-2">Período HE:</span>
                  {[['diario','dia'],['semanal','semana'],['mensal','mês']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set('mediaHEPeriodo', v)}
                      className={`px-2 py-0.5 rounded border transition-colors ${(periodo.mediaHEPeriodo || 'diario') === v ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-500'}`}>{l}</button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(periodo.padraoApuracao === 'diario' || periodo.padraoApuracao === 'misto') && (
                  <div>
                    <label className="campo-label">
                      HE por {['semanal','mensal'].includes(periodo.mediaHEPeriodo) ? periodo.mediaHEPeriodo === 'semanal' ? 'semana' : 'mês' : 'dia'} ({periodo.mediaHEUnidade || 'h'})
                    </label>
                    <input type="number" value={periodo.mediaHorasExtrasDiarias}
                      onChange={e => set('mediaHorasExtrasDiarias', Number(e.target.value))}
                      className="campo-input" step={periodo.mediaHEUnidade === 'min' ? 5 : 0.25} min="0" />
                  </div>
                )}
                {(periodo.padraoApuracao === 'semanal' || periodo.padraoApuracao === 'misto') && (
                  <div>
                    <label className="campo-label">
                      HE por {['diario','mensal'].includes(periodo.mediaHEPeriodo) ? periodo.mediaHEPeriodo === 'diario' ? 'dia' : 'mês' : 'semana'} ({periodo.mediaHEUnidade || 'h'})
                    </label>
                    <input type="number" value={periodo.mediaHorasExtrasSemanais}
                      onChange={e => set('mediaHorasExtrasSemanais', Number(e.target.value))}
                      className="campo-input" step={periodo.mediaHEUnidade === 'min' ? 5 : 0.25} min="0" />
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
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <label className="campo-label mb-0">AN por {(periodo.mediaANPeriodo || 'diario') === 'diario' ? 'dia' : (periodo.mediaANPeriodo === 'semanal' ? 'semana' : 'mês')} ({periodo.mediaANUnidade || 'h'})</label>
                    <div className="flex gap-1 ml-auto">
                      {['h','min'].map(u => (
                        <button key={u} type="button" onClick={() => set('mediaANUnidade', u)}
                          className={`px-1.5 py-0 text-xs rounded border transition-colors ${(periodo.mediaANUnidade || 'h') === u ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>{u}</button>
                      ))}
                      {[['diario','d'],['semanal','s'],['mensal','m']].map(([v,l]) => (
                        <button key={v} type="button" onClick={() => set('mediaANPeriodo', v)}
                          className={`px-1.5 py-0 text-xs rounded border transition-colors ${(periodo.mediaANPeriodo || 'diario') === v ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <input type="number" value={periodo.mediaHorasNoturnasDiarias}
                    onChange={e => set('mediaHorasNoturnasDiarias', Number(e.target.value))}
                    className="campo-input" step={periodo.mediaANUnidade === 'min' ? 5 : 0.25} min="0" />
                </div>
              </div>
              <button type="button" onClick={apurarMedio}
                className="btn-secundario w-full flex items-center justify-center gap-2 text-sm">
                <Calendar size={15} /> Apurar Jornada
              </button>
              {demoMedio && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm space-y-1">
                  <p className="font-semibold text-blue-800 mb-1">Apuração estimada (por mês):</p>
                  {demoMedio.heMensal > 0 && (
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Horas Extras — {demoMedio.heMensal}h/mês × {fmt2(demoMedio.sal / demoMedio.div)}/h × {Math.round((periodo.adicionalHoraExtra ?? 0.5) * 100 + 100)}%</span>
                      <span className="font-medium">{fmt2(demoMedio.valorHEMensal)}</span>
                    </div>
                  )}
                  {demoMedio.anMensal > 0 && (
                    <div className="flex justify-between text-xs text-blue-700">
                      <span>Adicional Noturno — {demoMedio.anMensal}h/mês × {Math.round((periodo.adicionalHoraNoturna ?? 0.2) * 100)}%</span>
                      <span className="font-medium">{fmt2(demoMedio.valorANMensal)}</span>
                    </div>
                  )}
                  <p className="text-xs text-blue-500 italic mt-1">Estimativa mensal. Multiplique pelo número de meses do período.</p>
                </div>
              )}
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

              {/* Para 12×36: horas padrão do turno (jornada contratual) */}
              {periodo.padraoApuracao === '12x36' && (
                <div>
                  <label className="campo-label">Horas por turno — padrão contratual (h)</label>
                  <input type="number" value={periodo.horasJornadaPadrao12x36 ?? 12}
                    onChange={e => set('horasJornadaPadrao12x36', Number(e.target.value))}
                    className="campo-input" step="0.5" min="1" max="24" />
                  <p className="text-xs text-gray-400 mt-0.5">HE = horas efetivas trabalhadas − este valor</p>
                </div>
              )}

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

              {/* Prorrogação noturna — art. 73 §5 CLT */}
              <Toggle
                value={periodo.prorrogacaoNoturna || false}
                onChange={v => set('prorrogacaoNoturna', v)}
                label="Prorrogação noturna (CLT art. 73 §5)"
                desc="Horas após 5h, em continuação ao turno noturno, mantêm caráter noturno (ficção legal)"
              />

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
                {calculando ? 'Calculando...' : 'Apurar Jornada'}
              </button>

              {periodo.totalHorasExtras !== null && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-semibold text-green-800 mb-1">
                    Total apurado: <span className="font-mono">{periodo.totalHorasExtras}h extras</span>
                  </p>
                  {salario > 0 && (() => {
                    const div = periodo.divisorJornada || 220;
                    const valorHE = (salario / div) * (1 + (periodo.adicionalHoraExtra ?? 0.5)) * periodo.totalHorasExtras;
                    const numMeses = (periodo.distribuicaoMensal || []).length || 1;
                    return (
                      <p className="text-xs text-green-700 mb-1">
                        Estimativa HE: <strong>{fmt2(valorHE)}</strong>
                        {' '}({fmt2(valorHE / numMeses)}/mês)
                      </p>
                    );
                  })()}
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(periodo.distribuicaoMensal || []).slice(0, 6).map(m => (
                      <div key={m.mes} className="flex justify-between">
                        <span>{m.mes}</span>
                        <span>{m.diasTrabalhados} dias · {m.horasExtras}h HE{m.horasNoturnas > 0 ? ` · ${m.horasNoturnas}h AN` : ''}</span>
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function HorarioTrabalho() {
  const { dados, setDados, setStep } = useCalculoStore();

  const [periodos, setPeriodos] = useState(() => {
    if ((dados.jornadaPeriodos || []).length > 0) return dados.jornadaPeriodos;
    return [novoPeriodo(dados.dataAdmissao, dados.dataDispensa)];
  });

  // ── Estado das verbas adicionais de jornada ────────────────────────────────
  const [adicionalNoturnoOJ97, setAdicionalNoturnoOJ97] = useState(dados.adicionalNoturnoOJ97 || false);

  const [intrajornadaModo, setIntrajornadaModo] = useState(dados.intrajornadaModo || 'automatico');
  const [intervaloIntrajornadaMensalHoras, setIntervaloIntrajornadaMensalHoras] = useState(dados.intervaloIntrajornadaMensalHoras || 0);

  const [intervaloInterjornada, setIntervaloInterjornada] = useState(dados.intervaloInterjornada || false);
  const [mediaInterjornadaMins, setMediaInterjornadaMins] = useState(dados.mediaInterjornadaMins || 0);
  const [mediaInterjornadaPeriodo, setMediaInterjornadaPeriodo] = useState(dados.mediaInterjornadaPeriodo || 'diario');

  const [rsrNaoConcedido, setRsrNaoConcedido] = useState(dados.rsrNaoConcedido || false);
  const [mediaRsrDias, setMediaRsrDias] = useState(dados.mediaRsrDias || 0);
  const [mediaRsrPeriodo, setMediaRsrPeriodo] = useState(dados.mediaRsrPeriodo || 'semanal');

  const [feriadosLaborados, setFeriadosLaborados] = useState(dados.feriadosLaborados || false);
  const [mediaFeriadosDias, setMediaFeriadosDias] = useState(dados.mediaFeriadosDias || 0);
  const [feriadosAdicionais, setFeriadosAdicionais] = useState(dados.feriadosAdicionais || []);

  const [intervaloTermico, setIntervaloTermico] = useState(dados.intervaloTermico || false);
  const [tipoAmbienteTermico, setTipoAmbienteTermico] = useState(dados.tipoAmbienteTermico || 'calor');
  const [minIntervaloTermicoConcedido, setMinIntervaloTermicoConcedido] = useState(dados.minIntervaloTermicoConcedido || 0);

  const [intervaloDigitacao, setIntervaloDigitacao] = useState(dados.intervaloDigitacao || false);
  const [regimeDigitacao, setRegimeDigitacao] = useState(dados.regimeDigitacao || '90min');
  const [horasIntervaloDigitacaoConcedido, setHorasIntervaloDigitacaoConcedido] = useState(dados.horasIntervaloDigitacaoConcedido || 0);

  function addPeriodo() {
    setPeriodos(prev => [...prev, novoPeriodo('', '')]);
  }

  function updatePeriodo(id, updated) {
    setPeriodos(prev => prev.map(p => p.id === id ? updated : p));
  }

  function removePeriodo(id) {
    setPeriodos(prev => prev.filter(p => p.id !== id));
  }

  function addFeriadoAdicional() {
    setFeriadosAdicionais(prev => [...prev, '']);
  }
  function updateFeriado(idx, val) {
    setFeriadosAdicionais(prev => prev.map((f, i) => i === idx ? val : f));
  }
  function removeFeriado(idx) {
    setFeriadosAdicionais(prev => prev.filter((_, i) => i !== idx));
  }

  function salvarEIr(step) {
    // Normaliza os períodos médio: converte unidade/período para os valores esperados pelo backend
    const periodosNormalizados = periodos.map(p => {
      if (p.modoEntrada !== 'medio') return p;
      const toH = (v, u) => u === 'min' ? v / 60 : v;
      const heDia = (() => {
        const raw = toH(p.mediaHorasExtrasDiarias || 0, p.mediaHEUnidade);
        if ((p.mediaHEPeriodo || 'diario') === 'semanal') return raw / 5;
        if ((p.mediaHEPeriodo || 'diario') === 'mensal') return raw / 21.75;
        return raw;
      })();
      const heSem = (() => {
        const raw = toH(p.mediaHorasExtrasSemanais || 0, p.mediaHEUnidade);
        if ((p.mediaHEPeriodo || 'diario') === 'diario') return raw * 5;
        if ((p.mediaHEPeriodo || 'diario') === 'mensal') return raw / 4.33;
        return raw;
      })();
      const anDia = (() => {
        const raw = toH(p.mediaHorasNoturnasDiarias || 0, p.mediaANUnidade);
        if ((p.mediaANPeriodo || 'diario') === 'semanal') return raw / 5;
        if ((p.mediaANPeriodo || 'diario') === 'mensal') return raw / 21.75;
        return raw;
      })();
      return { ...p, mediaHorasExtrasDiarias: +heDia.toFixed(4), mediaHorasExtrasSemanais: +heSem.toFixed(4), mediaHorasNoturnasDiarias: +anDia.toFixed(4) };
    });

    // Normaliza RSR médio para dias/mês
    const mediaRsrDiasMensais = mediaRsrPeriodo === 'semanal' ? mediaRsrDias * 4.33 : mediaRsrDias;
    // Normaliza feriados médio para dias/mês
    const mediaFeriadosDiasMensais = mediaFeriadosDias;
    // Normaliza interjornada médio para minutos/mês
    const mediaInterjornadaMinsMensais = mediaInterjornadaPeriodo === 'diario'
      ? mediaInterjornadaMins * 21.75
      : mediaInterjornadaMins;

    setDados({
      jornadaPeriodos: periodosNormalizados,
      adicionalNoturnoOJ97,
      intrajornadaModo,
      intervaloIntrajornadaMensalHoras,
      intervaloInterjornada,
      mediaInterjornadaMins,
      mediaInterjornadaPeriodo,
      mediaInterjornadaMinsMensais,
      rsrNaoConcedido,
      mediaRsrDias,
      mediaRsrPeriodo,
      mediaRsrDiasMensais,
      feriadosLaborados,
      mediaFeriadosDias,
      mediaFeriadosDiasMensais,
      feriadosAdicionais: feriadosAdicionais.filter(Boolean),
      intervaloTermico,
      tipoAmbienteTermico,
      minIntervaloTermicoConcedido,
      intervaloDigitacao,
      regimeDigitacao,
      horasIntervaloDigitacaoConcedido,
    });
    setStep(step);
  }

  const temCartaoPonto = periodos.some(p => p.modoEntrada === 'cartao_ponto');

  return (
    <div className="max-w-3xl">
      <div className="aviso-judicial mb-4">
        <strong>Padrão de apuração:</strong> Verifique convenção coletiva e jurisprudência aplicável.
        Súm. 291 TST: horas extras habituais compensadas em regime 2×1 (diário + semanal = misto).
        Divisor bancários: Súm. 431 TST (150h). Padrão CLT: 220h (44h/sem).
      </div>

      {/* ── Períodos de jornada ────────────────────────────────────────────── */}
      <h3 className="font-titulo text-sm text-gray-700 mb-2 mt-2">Períodos de Jornada</h3>
      <div className="space-y-3 mb-3">
        {periodos.map(p => (
          <FormPeriodo
            key={p.id}
            periodo={p}
            onChange={updated => updatePeriodo(p.id, updated)}
            onRemover={() => removePeriodo(p.id)}
            podRemover={periodos.length > 1}
            dataAdmissao={dados.dataAdmissao}
            dataDispensa={dados.dataDispensa}
            salario={dados.mediaSalarial || dados.ultimoSalario || 0}
          />
        ))}
      </div>

      <button type="button" onClick={addPeriodo}
        className="btn-secundario flex items-center gap-2 text-sm mb-6">
        <Plus size={14} /> Adicionar período de jornada
      </button>

      {/* ── Verbas de Duração do Trabalho ─────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <Settings2 size={15} className="text-indigo-600" />
        <h3 className="font-titulo text-sm text-gray-700">Verbas de Duração do Trabalho</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Ative as verbas que se aplicam ao caso. Cada verba é apurada conforme a jornada configurada acima.
        Verbas que requerem cartão de ponto são marcadas com *.
      </p>

      <div className="space-y-2 mb-6">

        {/* Adicional Noturno — OJ 97 */}
        <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Adicional Noturno — opções</p>
          <Toggle
            value={adicionalNoturnoOJ97}
            onChange={setAdicionalNoturnoOJ97}
            label="OJ 97 SDI-1 TST — AN compõe base das horas extras"
            desc="Quando ativo, o adicional noturno integra a base de cálculo do valor da hora extra"
          />
        </div>

        {/* Intervalo Intrajornada */}
        <SecaoJornada
          titulo="Intervalo Intrajornada"
          badge="Súm. 437 TST"
          ativo={intrajornadaModo !== 'desabilitado'}
          onToggleAtivo={(v) => setIntrajornadaModo(v ? 'automatico' : 'desabilitado')}
        >
          <p className="text-xs text-gray-500">
            Quando o intervalo concedido é inferior ao mínimo legal (60min para jornadas &gt;6h).
            Natureza indenizatória — sem reflexos (Súm. 437 TST).
          </p>
          <div className="flex gap-3">
            {[
              { value: 'automatico', label: 'Automático (cartão de ponto)*', desc: 'Deriva o déficit dia a dia' },
              { value: 'manual', label: 'Manual (h/mês)', desc: 'Informar total de horas suprimidas' },
            ].map(m => (
              <label key={m.value} className={`flex-1 flex flex-col gap-0.5 p-2 rounded-lg border-2 cursor-pointer text-xs transition-colors ${
                intrajornadaModo === m.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center gap-1">
                  <input type="radio" name="intrajornada_modo" value={m.value}
                    checked={intrajornadaModo === m.value}
                    onChange={() => setIntrajornadaModo(m.value)} />
                  <span className="font-medium">{m.label}</span>
                </div>
                <span className="text-gray-400">{m.desc}</span>
              </label>
            ))}
          </div>
          {intrajornadaModo === 'manual' && (
            <div>
              <label className="campo-label">Horas suprimidas por mês (h)</label>
              <input type="number" value={intervaloIntrajornadaMensalHoras}
                onChange={e => setIntervaloIntrajornadaMensalHoras(Number(e.target.value))}
                className="campo-input" step="0.25" min="0" />
            </div>
          )}
          {intrajornadaModo === 'automatico' && !temCartaoPonto && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">
              * Configure ao menos um período no modo "Cartão de ponto virtual" para usar apuração automática.
            </p>
          )}
        </SecaoJornada>

        {/* Intervalo Interjornada */}
        <SecaoJornada
          titulo="Intervalo Interjornada *"
          badge="CLT art. 66 + OJ 355"
          ativo={intervaloInterjornada}
          onToggleAtivo={setIntervaloInterjornada}
        >
          <p className="text-xs text-gray-500">
            Mínimo de 11 horas consecutivas entre o fim de uma jornada e o início da seguinte (CLT art. 66).
            Violação apurada via cartão de ponto. Natureza indenizatória — sem reflexos (OJ 355 SDI-1 TST).
          </p>
          {!temCartaoPonto && (
            <div className="space-y-2 border border-amber-200 bg-amber-50 rounded p-2">
              <p className="text-xs text-amber-700 font-medium">Sem cartão de ponto — informe a média de minutos de interjornada suprimidos.</p>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="number" value={mediaInterjornadaMins}
                  onChange={e => setMediaInterjornadaMins(Number(e.target.value))}
                  className="campo-input w-24" min="0" step="5" />
                <span className="text-xs text-gray-500">min por</span>
                <select value={mediaInterjornadaPeriodo} onChange={e => setMediaInterjornadaPeriodo(e.target.value)}
                  className="campo-input text-sm w-auto">
                  <option value="diario">dia trabalhado</option>
                  <option value="mensal">mês</option>
                </select>
              </div>
            </div>
          )}
        </SecaoJornada>

        {/* RSR Não Concedido */}
        <SecaoJornada
          titulo="RSR Não Concedido *"
          badge="Súm. 146 TST + OJ 410"
          ativo={rsrNaoConcedido}
          onToggleAtivo={setRsrNaoConcedido}
        >
          <p className="text-xs text-gray-500">
            Trabalho no dia de repouso semanal remunerado = pagamento em dobro (Súmula 146 TST).
            RSR trabalhados apurados via cartão de ponto. Natureza salarial — com reflexos.
          </p>
          {!temCartaoPonto && (
            <div className="space-y-2 border border-amber-200 bg-amber-50 rounded p-2">
              <p className="text-xs text-amber-700 font-medium">Sem cartão de ponto — informe a média de RSR trabalhados.</p>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="number" value={mediaRsrDias}
                  onChange={e => setMediaRsrDias(Number(e.target.value))}
                  className="campo-input w-20" min="0" step="0.5" />
                <span className="text-xs text-gray-500">dias por</span>
                <select value={mediaRsrPeriodo} onChange={e => setMediaRsrPeriodo(e.target.value)}
                  className="campo-input text-sm w-auto">
                  <option value="semanal">semana</option>
                  <option value="mensal">mês</option>
                </select>
              </div>
            </div>
          )}
        </SecaoJornada>

        {/* Feriados Laborados */}
        <SecaoJornada
          titulo="Feriados Laborados *"
          badge="Súm. 146 TST"
          ativo={feriadosLaborados}
          onToggleAtivo={setFeriadosLaborados}
        >
          <p className="text-xs text-gray-500">
            Trabalho em feriado nacional = pagamento em dobro (Súmula 146 TST).
            Feriados nacionais (fixos e móveis) detectados automaticamente.
            Natureza salarial — com reflexos.
          </p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Feriados estaduais/municipais adicionais</p>
              <button type="button" onClick={addFeriadoAdicional}
                className="btn-secundario text-xs py-0.5 px-2 flex items-center gap-1">
                <Plus size={11} /> Adicionar
              </button>
            </div>
            {feriadosAdicionais.length === 0 ? (
              <p className="text-xs text-gray-400">Somente feriados nacionais serão considerados.</p>
            ) : (
              <div className="space-y-1">
                {feriadosAdicionais.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="date" value={f}
                      onChange={e => updateFeriado(idx, e.target.value)}
                      className="campo-input text-sm flex-1" />
                    <button type="button" onClick={() => removeFeriado(idx)}
                      className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!temCartaoPonto && (
            <div className="space-y-2 border border-amber-200 bg-amber-50 rounded p-2">
              <p className="text-xs text-amber-700 font-medium">Sem cartão de ponto — informe a média de feriados laborados por mês.</p>
              <div className="flex gap-2 items-center flex-wrap">
                <input type="number" value={mediaFeriadosDias}
                  onChange={e => setMediaFeriadosDias(Number(e.target.value))}
                  className="campo-input w-20" min="0" step="0.5" />
                <span className="text-xs text-gray-500">dias por mês</span>
              </div>
            </div>
          )}
        </SecaoJornada>

        {/* Intervalo Térmico */}
        <SecaoJornada
          titulo="Intervalo Térmico"
          badge="CLT art. 253 + Súm. 438"
          ativo={intervaloTermico}
          onToggleAtivo={setIntervaloTermico}
        >
          <p className="text-xs text-gray-500">
            20 minutos de descanso para cada 1h40 trabalhado em câmara fria ou ambiente com calor excessivo.
            Natureza salarial — com reflexos (Súmula 438 TST).
          </p>
          <div>
            <label className="campo-label mb-2 block">Tipo de ambiente</label>
            <div className="flex gap-3">
              {[
                { value: 'calor', label: 'Calor excessivo', badge: 'Súm. 438 TST' },
                { value: 'frio', label: 'Câmara fria/frigorífica', badge: 'CLT art. 253' },
              ].map(t => (
                <label key={t.value} className={`flex-1 flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer text-sm transition-colors ${
                  tipoAmbienteTermico === t.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" name="tipo_termico" value={t.value}
                    checked={tipoAmbienteTermico === t.value}
                    onChange={() => setTipoAmbienteTermico(t.value)} />
                  <div>
                    <p className="font-medium text-xs">{t.label}</p>
                    <p className="text-gray-400 text-xs">{t.badge}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="campo-label">Intervalo efetivamente concedido por dia (min)</label>
            <input type="number" value={minIntervaloTermicoConcedido}
              onChange={e => setMinIntervaloTermicoConcedido(Number(e.target.value))}
              className="campo-input" step="5" min="0" />
            <p className="text-xs text-gray-400 mt-0.5">
              O mínimo exigido é 1/5 da jornada diária (ex.: 8h → 96min). Deixe 0 se não concedido.
            </p>
          </div>
        </SecaoJornada>

        {/* Intervalo por Digitação */}
        <SecaoJornada
          titulo="Intervalo por Digitação"
          badge="CLT art. 72 + NR-17"
          ativo={intervaloDigitacao}
          onToggleAtivo={setIntervaloDigitacao}
        >
          <p className="text-xs text-gray-500">
            Trabalho em digitação/datilografia: descanso obrigatório entre ciclos de trabalho.
            Natureza salarial — com reflexos.
          </p>
          <div>
            <label className="campo-label mb-2 block">Regime</label>
            <div className="flex gap-3">
              {[
                { value: '90min', label: '10min / 90min', desc: 'CLT art. 72 — digitação clássica' },
                { value: '50min', label: '10min / 50min', desc: 'NR-17 — operador de caixa/trabalho intenso' },
              ].map(r => (
                <label key={r.value} className={`flex-1 flex flex-col gap-0.5 p-2 rounded-lg border-2 cursor-pointer text-xs transition-colors ${
                  regimeDigitacao === r.value ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center gap-1">
                    <input type="radio" name="regime_digitacao" value={r.value}
                      checked={regimeDigitacao === r.value}
                      onChange={() => setRegimeDigitacao(r.value)} />
                    <span className="font-semibold">{r.label}</span>
                  </div>
                  <span className="text-gray-400">{r.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="campo-label">Horas de intervalo efetivamente concedidas por mês (h)</label>
            <input type="number" value={horasIntervaloDigitacaoConcedido}
              onChange={e => setHorasIntervaloDigitacaoConcedido(Number(e.target.value))}
              className="campo-input" step="0.25" min="0" />
            <p className="text-xs text-gray-400 mt-0.5">Deixe 0 se nenhum intervalo foi concedido.</p>
          </div>
        </SecaoJornada>

      </div>

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

import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';
import { useMutation } from '@tanstack/react-query';

const CAMPOS_PERCENTUAL = new Set(['adicionalHoraExtra', 'adicionalHoraNoturna']);

const DIAS_SEMANA = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

async function calcularCartaoPonto(payload) {
  const resp = await fetch('/api/calculos/cartao-ponto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular cartão de ponto');
  return json;
}

export default function HorarioTrabalho() {
  const { dados, setDados, setStep, tipoFluxo } = useCalculoStore();
  const { mutateAsync: calcularPonto, isPending: calculandoPonto } = useMutation({ mutationFn: calcularCartaoPonto });

  // Modo de apuração de horas extras
  const [modoHE, setModoHE] = useState(dados.modoHorasExtras || 'padrao');

  // Estado local da jornada definida
  const [jornada, setJornada] = useState(dados.jornadaDefinida || {
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloMinutos: 60,
    diasSemana: [1, 2, 3, 4, 5],
  });

  // Afastamentos
  const [afastamentos, setAfastamentos] = useState(dados.periodoAfastamento || []);
  const [resumoPonto, setResumoPonto] = useState(null);

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

  function toggleDiaSemana(dia) {
    setJornada((prev) => {
      const dias = prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia].sort();
      return { ...prev, diasSemana: dias };
    });
  }

  function addAfastamento() {
    setAfastamentos([...afastamentos, { inicio: '', fim: '', motivo: '' }]);
  }
  function updateAfastamento(idx, campo, valor) {
    setAfastamentos(afastamentos.map((a, i) => i === idx ? { ...a, [campo]: valor } : a));
  }
  function removeAfastamento(idx) {
    setAfastamentos(afastamentos.filter((_, i) => i !== idx));
  }

  async function aplicarJornadaDefinida() {
    if (!dados.dataAdmissao || !dados.dataDispensa) {
      alert('Preencha as datas do contrato antes de calcular o cartão de ponto.');
      return;
    }
    try {
      const res = await calcularPonto({
        jornadaDefinida: jornada,
        dataInicio: dados.dataAdmissao,
        dataFim: dados.dataDispensa,
        afastamentos: afastamentos.filter((a) => a.inicio && a.fim),
        divisorJornada: dados.divisorJornada || 220,
      });
      setResumoPonto(res);
      // Atualiza o campo de horas extras mensais com a média mensal
      const meses = res.distribuicaoMensal?.length || 1;
      const mediaHE = res.totalHorasExtras / meses;
      setDados({
        qtdeHorasExtrasMensais: +mediaHE.toFixed(2),
        modoHorasExtras: 'jornada_definida',
        jornadaDefinida: jornada,
        periodoAfastamento: afastamentos,
      });
    } catch (e) {
      alert('Erro ao calcular cartão de ponto: ' + e.message);
    }
  }

  function proximoStep() {
    setDados({
      modoHorasExtras: modoHE,
      jornadaDefinida: modoHE === 'jornada_definida' ? jornada : null,
      periodoAfastamento: afastamentos,
    });
    setStep(7);
  }

  const pctHE = ((dados.adicionalHoraExtra || 0.5) * 100).toFixed(0);
  const pctAN = ((dados.adicionalHoraNoturna || 0.2) * 100).toFixed(0);

  return (
    <div className="max-w-3xl">
      <div className="aviso-judicial mb-4">
        <strong>Divisor:</strong> Verifique CCT/ACT. Súmula 431 TST para bancários (150h). Padrão CLT: 220h (44h/sem).
      </div>

      {/* Parâmetros da Jornada */}
      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Parâmetros da Jornada</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Divisor de Jornada (horas/mês)</label>
            <input type="number" name="divisorJornada" value={dados.divisorJornada} onChange={handleChange}
              className="campo-input" step="1" min="100" max="300" placeholder="220" />
            <p className="text-xs text-gray-400 mt-1">220h (44h/sem), 180h (36h/sem), 200h (40h/sem), 150h (bancários)</p>
          </div>
          <div>
            <label className="campo-label">Adicional de Hora Extra (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" name="adicionalHoraExtra" value={pctHE} onChange={handleChange}
                className="campo-input" step="1" min="50" max="200" placeholder="50" />
              <span className="text-gray-500 text-sm font-medium">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Mínimo CLT: 50%. Domingos/feriados: 100%.</p>
          </div>
        </div>
      </div>

      {/* Modo de apuração de horas extras */}
      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Apuração de Horas Extras</h3>

        <div className="flex gap-4 mb-4">
          {[
            { value: 'padrao', icon: Clock, label: 'Por valor fixo (h/mês)' },
            { value: 'jornada_definida', icon: Calendar, label: 'Por jornada definida (cartão de ponto virtual)' },
          ].map(({ value, icon: Icon, label }) => (
            <label key={value} className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
              modoHE === value ? 'border-primaria bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name="modoHE" value={value} checked={modoHE === value} onChange={() => setModoHE(value)} />
              <Icon size={16} className={modoHE === value ? 'text-primaria' : 'text-gray-400'} />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* Modo padrão */}
        {modoHE === 'padrao' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="campo-label">Horas Extras por Mês</label>
              <input type="number" name="qtdeHorasExtrasMensais" value={dados.qtdeHorasExtrasMensais}
                onChange={handleChange} className="campo-input" step="0.5" min="0" placeholder="0" />
            </div>
            <div>
              <label className="campo-label">Intervalo Intrajornada suprimido (h/mês)</label>
              <input type="number" name="intervaloIntrajornadaMensalHoras" value={dados.intervaloIntrajornadaMensalHoras}
                onChange={handleChange} className="campo-input" step="0.5" min="0" placeholder="0" />
            </div>
          </div>
        )}

        {/* Modo jornada definida */}
        {modoHE === 'jornada_definida' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="campo-label">Horário de Entrada</label>
                <input type="time" value={jornada.horaEntrada}
                  onChange={(e) => setJornada((j) => ({ ...j, horaEntrada: e.target.value }))}
                  className="campo-input" />
              </div>
              <div>
                <label className="campo-label">Horário de Saída</label>
                <input type="time" value={jornada.horaSaida}
                  onChange={(e) => setJornada((j) => ({ ...j, horaSaida: e.target.value }))}
                  className="campo-input" />
              </div>
              <div>
                <label className="campo-label">Intervalo (minutos)</label>
                <input type="number" value={jornada.intervaloMinutos}
                  onChange={(e) => setJornada((j) => ({ ...j, intervaloMinutos: Number(e.target.value) }))}
                  className="campo-input" min="0" max="120" step="15" placeholder="60" />
              </div>
            </div>

            <div>
              <label className="campo-label mb-2 block">Dias da Semana Trabalhados</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SEMANA.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDiaSemana(value)}
                    className={`w-12 h-10 rounded text-xs font-medium border transition-colors ${
                      jornada.diasSemana.includes(value)
                        ? 'bg-primaria text-white border-primaria'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="campo-label mb-0">Períodos de Afastamento</label>
                <button type="button" onClick={addAfastamento}
                  className="btn-secundario text-xs py-1 px-3 flex items-center gap-1">
                  <Plus size={12} /> Adicionar
                </button>
              </div>
              {afastamentos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Nenhum afastamento cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {afastamentos.map((a, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input type="date" value={a.inicio} onChange={(e) => updateAfastamento(idx, 'inicio', e.target.value)} className="campo-input text-sm" />
                      <input type="date" value={a.fim} onChange={(e) => updateAfastamento(idx, 'fim', e.target.value)} className="campo-input text-sm" />
                      <input type="text" value={a.motivo} onChange={(e) => updateAfastamento(idx, 'motivo', e.target.value)} className="campo-input text-sm" placeholder="Motivo" />
                      <button type="button" onClick={() => removeAfastamento(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={aplicarJornadaDefinida}
              disabled={calculandoPonto}
              className="btn-secundario w-full flex items-center justify-center gap-2"
            >
              <Calendar size={16} />
              {calculandoPonto ? 'Calculando cartão de ponto...' : 'Calcular Horas Extras pela Jornada'}
            </button>

            {resumoPonto && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
                <p className="font-semibold text-green-800 mb-2">
                  Total apurado: <span className="font-mono">{resumoPonto.totalHorasExtras}h extras</span>
                </p>
                <div className="space-y-1 text-green-700 text-xs">
                  {resumoPonto.distribuicaoMensal?.slice(0, 5).map((m) => (
                    <div key={m.mes} className="flex justify-between">
                      <span>{m.mes}</span>
                      <span>{m.diasTrabalhados} dias trabalhados — {m.horasExtras}h extras</span>
                    </div>
                  ))}
                  {resumoPonto.distribuicaoMensal?.length > 5 && (
                    <p className="text-green-600 italic">... e mais {resumoPonto.distribuicaoMensal.length - 5} meses</p>
                  )}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Média mensal aplicada ao cálculo: <strong>{(resumoPonto.totalHorasExtras / resumoPonto.distribuicaoMensal.length).toFixed(2)}h/mês</strong>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horas Noturnas */}
      <div className="card p-6 mb-4">
        <h3 className="font-titulo text-lg mb-4 text-primaria">Horas Noturnas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="campo-label">Horas Noturnas por Mês</label>
            <input type="number" name="qtdeHorasNoturnasMensais" value={dados.qtdeHorasNoturnasMensais}
              onChange={handleChange} className="campo-input" step="0.5" min="0" placeholder="0" />
          </div>
          <div>
            <label className="campo-label">Adicional Noturno (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" name="adicionalHoraNoturna" value={pctAN} onChange={handleChange}
                className="campo-input" step="1" min="20" max="100" placeholder="20" />
              <span className="text-gray-500 text-sm font-medium">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Mínimo CLT: 20%. Verificar CCT.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario"
          onClick={() => setStep(tipoFluxo === 'verbas_e_parcelas' ? 5 : 4)}>
          ← Anterior
        </button>
        <button type="button" className="btn-secundario text-gray-400 text-sm"
          onClick={() => setStep(7)}>
          Pular (sem jornada extra) →
        </button>
        <button type="button" className="btn-primario" onClick={proximoStep}>
          Calcular Verbas →
        </button>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Plus, Trash2, Calculator, CheckSquare, Square } from 'lucide-react';
import evalExpr from '../../utils/evalExpr';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function pct(v) {
  return `${((v || 0) * 100).toFixed(1)}%`;
}
function round2(v) {
  return Math.round((v || 0) * 100) / 100;
}

// ─── Helpers de data (timezone local, sem deslocamento UTC) ──────────────────

function parseData(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDataBR(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

// Anos completos entre duas datas
function anosCompletos(from, to) {
  let anos = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const d = to.getDate() - from.getDate();
  if (m < 0 || (m === 0 && d < 0)) anos--;
  return Math.max(0, anos);
}

// Meses completos entre duas datas (sem fração)
function mesesCompletos(from, to) {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m--;
  return Math.max(0, m);
}

// Avos (cada mês completo conta; fração > 14 dias também conta)
function calcularAvos(from, to) {
  let avos = 0;
  let current = new Date(from);
  while (current < to) {
    const prox = new Date(current);
    prox.setMonth(prox.getMonth() + 1);
    if (prox <= to) {
      avos++;
      current = prox;
    } else {
      const diasParciais = Math.round((to - current) / 86400000);
      if (diasParciais > 14) avos++;
      break;
    }
  }
  return avos;
}

// Períodos aquisitivos de férias (integrais + proporcional)
function calcularPeriodosFerias(admDate, dispDate, salario) {
  const periodos = [];
  let current = new Date(admDate);
  let num = 1;

  while (true) {
    const inicioPeriodoSeg = new Date(current);
    inicioPeriodoSeg.setFullYear(inicioPeriodoSeg.getFullYear() + 1);

    if (inicioPeriodoSeg <= dispDate) {
      // Período integral completo
      const fimLabel = new Date(inicioPeriodoSeg);
      fimLabel.setDate(fimLabel.getDate() - 1);
      periodos.push({
        id: `ferias_integral_${num}`,
        nome: `Férias + 1/3 (${num}° Período Integral: ${formatDataBR(current)} – ${formatDataBR(fimLabel)})`,
        valor: round2(salario * (4 / 3)),
        avos: 12,
        tipo: 'integral',
      });
      num++;
      current = inicioPeriodoSeg;
    } else {
      // Período proporcional final
      if (current < dispDate) {
        const avos = calcularAvos(current, dispDate);
        if (avos > 0) {
          periodos.push({
            id: `ferias_prop`,
            nome: `Férias Proporcionais + 1/3 (${avos}/12 avos: ${formatDataBR(current)} – ${formatDataBR(dispDate)})`,
            valor: round2(salario * (avos / 12) * (4 / 3)),
            avos,
            tipo: 'proporcional',
          });
        }
      }
      break;
    }
  }

  return periodos;
}

// Calcula todas as verbas rescisórias estimadas
function calcularVerbasEstimadas(dataAdmissao, dataDispensa, dataAjuizamento, salario) {
  const admDate = parseData(dataAdmissao);
  const dispDate = parseData(dataDispensa);
  const salNum = evalExpr(salario);

  if (!admDate || !dispDate || !salNum || dispDate <= admDate) return [];

  const verbas = [];

  // 1. Aviso Prévio Indenizado (30 + 3 dias/ano, máx 90)
  const anos = anosCompletos(admDate, dispDate);
  const diasAviso = Math.min(30 + anos * 3, 90);
  verbas.push({
    id: 'aviso_previo',
    nome: `Aviso Prévio Indenizado (${diasAviso} dias — ${anos} ano${anos !== 1 ? 's' : ''} completo${anos !== 1 ? 's' : ''} de serviço)`,
    valor: round2((salNum / 30) * diasAviso),
    grupo: 'rescisoria',
  });

  // 2. Férias + 1/3 (todos os períodos aquisitivos)
  const periodosFerias = calcularPeriodosFerias(admDate, dispDate, salNum);
  for (const p of periodosFerias) {
    verbas.push({ ...p, grupo: 'ferias' });
  }

  // 3. FGTS – Depósitos (período imprescrito)
  let fgtsInicio = admDate;
  let labelFgts = '';
  if (dataAjuizamento) {
    const ajuizDate = parseData(dataAjuizamento);
    if (ajuizDate) {
      const prescricaoMarco = new Date(ajuizDate);
      prescricaoMarco.setFullYear(prescricaoMarco.getFullYear() - 5);
      if (prescricaoMarco > admDate) {
        fgtsInicio = prescricaoMarco;
        labelFgts = ` — a partir de ${formatDataBR(prescricaoMarco)}`;
      }
    }
  }
  const mesesFgts = mesesCompletos(fgtsInicio, dispDate);
  if (mesesFgts > 0) {
    verbas.push({
      id: 'fgts_depositos',
      nome: `FGTS – Depósitos (${mesesFgts} meses${labelFgts})`,
      valor: round2(salNum * 0.08 * mesesFgts),
      grupo: 'fgts',
    });
  }

  // 4. Multa Rescisória FGTS 40% (período integral — sem prescrição)
  const mesesTotal = mesesCompletos(admDate, dispDate);
  const fgtsBrutoTotal = salNum * 0.08 * mesesTotal;
  verbas.push({
    id: 'multa_fgts',
    nome: `Indenização Rescisória FGTS – 40% (período integral: ${mesesTotal} meses)`,
    valor: round2(fgtsBrutoTotal * 0.40),
    grupo: 'fgts',
  });

  // 5. Multa art. 477 CLT (= último salário)
  verbas.push({
    id: 'multa_477',
    nome: 'Multa Art. 477 CLT (1 salário)',
    valor: round2(salNum),
    grupo: 'multa',
  });

  return verbas;
}

// ─────────────────────────────────────────────────────────────────────────────

const PARCELAS_PREDEFINIDAS = [
  'Aviso prévio indenizado',
  'Férias + 1/3 constitucional',
  'Depósitos de FGTS',
  'Indenização rescisória FGTS (40%)',
  'Indenização rescisória FGTS (20% – culpa recíproca)',
  'Multa do art. 477 da CLT',
  'Indenização do intervalo intrajornada',
  'Indenização do intervalo interjornada',
  'Indenização vale-transporte',
  'Indenização vale-alimentação',
  'Honorários advocatícios',
  'Personalizada...',
];

export default function SimuladorAcordoPage() {
  const [valorAcordo, setValorAcordo] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [dataDispensa, setDataDispensa] = useState('');
  const [dataAjuizamento, setDataAjuizamento] = useState('');
  const [salario, setSalario] = useState('');
  const [parcelas, setParcelas] = useState([
    { seletor: '', nomeCustom: '', valorRaw: '' },
  ]);
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');
  const [inssEmpregadoEmpresa, setInssEmpregadoEmpresa] = useState(false);
  const [irEmpresa, setIrEmpresa] = useState(false);

  // Verbas rescisórias estimadas — computadas automaticamente quando os campos estão preenchidos
  const verbasEstimadas = useMemo(
    () => calcularVerbasEstimadas(dataAdmissao, dataDispensa, dataAjuizamento, salario),
    [dataAdmissao, dataDispensa, dataAjuizamento, salario]
  );
  const [verbasesSelecionadas, setVerbasesSelecionadas] = useState(new Set());

  function toggleVerbaSelecionada(id) {
    setVerbasesSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selecionarTodas() {
    setVerbasesSelecionadas(new Set(verbasEstimadas.map(v => v.id)));
  }

  function deselecionarTodas() {
    setVerbasesSelecionadas(new Set());
  }

  function adicionarSelecionadasAoAcordo() {
    const selecionadas = verbasEstimadas.filter(v => verbasesSelecionadas.has(v.id));
    if (selecionadas.length === 0) return;

    // Filtra linhas vazias antes de adicionar
    const atuais = parcelas.filter(p => p.seletor || p.nomeCustom || p.valorRaw);
    const novas = selecionadas.map(v => ({
      seletor: 'Personalizada...',
      nomeCustom: v.nome,
      valorRaw: v.valor.toFixed(2),
    }));

    // Se só tinha a linha vazia inicial, substituir
    setParcelas([...atuais, ...novas]);
    setVerbasesSelecionadas(new Set());
  }

  // Condições especiais
  const inssEmpregadoVal = resultado?.inssEmpregado || 0;
  const irVal = resultado?.ir?.valor || 0;
  const deducaoDoEmpregado =
    (inssEmpregadoEmpresa ? 0 : inssEmpregadoVal) + (irEmpresa ? 0 : irVal);
  const liquidoAjustado = Math.max(0, (resultado?.valorAcordo || 0) - deducaoDoEmpregado);
  const custoAdicionalEmpresa =
    (resultado?.inssEmpregador || 0) +
    (inssEmpregadoEmpresa ? inssEmpregadoVal : 0) +
    (irEmpresa ? irVal : 0);
  const custoTotalAcordo = round2((resultado?.valorAcordo || 0) + custoAdicionalEmpresa);

  function addParcela() {
    setParcelas(prev => [...prev, { seletor: '', nomeCustom: '', valorRaw: '' }]);
  }

  function removeParcela(idx) {
    const nova = parcelas.filter((_, i) => i !== idx);
    setParcelas(nova.length > 0 ? nova : [{ seletor: '', nomeCustom: '', valorRaw: '' }]);
  }

  function updateParcela(idx, field, value) {
    setParcelas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function handleValorBlur(idx, raw) {
    const n = evalExpr(raw);
    if (n > 0 && n.toFixed(2) !== raw) {
      updateParcela(idx, 'valorRaw', n.toFixed(2));
    }
  }

  function nomeFinal(p) {
    return p.seletor === 'Personalizada...' ? p.nomeCustom : p.seletor;
  }

  const totalIndenizatorio = useMemo(
    () => parcelas.reduce((sum, p) => sum + evalExpr(p.valorRaw), 0),
    [parcelas]
  );
  const valorAcordoNum = evalExpr(valorAcordo) || 0;
  const restante = Math.max(0, valorAcordoNum - totalIndenizatorio);

  async function calcular() {
    if (!valorAcordoNum) { setErro('Informe o valor do acordo.'); return; }
    setErro('');
    setCalculando(true);
    try {
      const resp = await fetch('/api/calculos/simular-acordo-externo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorAcordo: valorAcordoNum,
          dataAdmissao: dataAdmissao || null,
          dataDispensa: dataDispensa || null,
          salario: evalExpr(salario) || null,
          parcelasIndenizatorias: parcelas
            .filter(p => nomeFinal(p) && evalExpr(p.valorRaw) > 0)
            .map(p => ({ nome: nomeFinal(p), valor: evalExpr(p.valorRaw) })),
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
      setResultado(json.resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCalculando(false);
    }
  }

  const temDadosParaEstimar = dataAdmissao && dataDispensa && evalExpr(salario) > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="font-titulo text-2xl text-primaria mb-1">Simulador de Acordo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Calcule INSS, IR (RRA) e encargos devidos em um acordo trabalhista, discriminando as parcelas indenizatórias.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda — formulário */}
        <div className="space-y-4">

          {/* Dados do Acordo */}
          <div className="card p-5">
            <h3 className="font-titulo text-base mb-3 text-primaria">Dados do Acordo</h3>
            <div className="space-y-3">
              <div>
                <label className="campo-label">Valor Total do Acordo (R$) *</label>
                <input
                  type="text"
                  value={valorAcordo}
                  onChange={e => setValorAcordo(e.target.value)}
                  onBlur={e => {
                    const n = evalExpr(e.target.value);
                    if (n > 0 && n.toFixed(2) !== e.target.value) setValorAcordo(n.toFixed(2));
                  }}
                  className="campo-input font-mono"
                  placeholder="0,00 ou ex.: 5000+1500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="campo-label">Data de Admissão</label>
                  <input
                    type="date"
                    value={dataAdmissao}
                    onChange={e => setDataAdmissao(e.target.value)}
                    className="campo-input"
                  />
                </div>
                <div>
                  <label className="campo-label">Data de Dispensa</label>
                  <input
                    type="date"
                    value={dataDispensa}
                    onChange={e => setDataDispensa(e.target.value)}
                    className="campo-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="campo-label">Último Salário (R$)</label>
                  <input
                    type="text"
                    value={salario}
                    onChange={e => setSalario(e.target.value)}
                    onBlur={e => {
                      const n = evalExpr(e.target.value);
                      if (n > 0 && n.toFixed(2) !== e.target.value) setSalario(n.toFixed(2));
                    }}
                    className="campo-input font-mono"
                    placeholder="Para referência — limite INSS/IR"
                  />
                </div>
                <div>
                  <label className="campo-label">Data de Ajuizamento</label>
                  <input
                    type="date"
                    value={dataAjuizamento}
                    onChange={e => setDataAjuizamento(e.target.value)}
                    className="campo-input"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Define a prescrição quinquenal do FGTS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verbas Rescisórias Estimadas — aparece quando os dados estão preenchidos */}
          {temDadosParaEstimar && (
            <div className="card p-5 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-indigo-600" />
                  <h3 className="font-titulo text-base text-indigo-700">Verbas Rescisórias Estimadas</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selecionarTodas}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Todas
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselecionarTodas}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Nenhuma
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Verbas calculadas para dispensa sem justa causa com base nas datas e salário informados.
                Selecione as que compõem o acordo para adicioná-las à discriminação.
              </p>

              <div className="space-y-2">
                {verbasEstimadas.map(v => {
                  const sel = verbasesSelecionadas.has(v.id);
                  return (
                    <label
                      key={v.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors select-none ${
                        sel ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleVerbaSelecionada(v.id)}
                        className={`mt-0.5 shrink-0 ${sel ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        {sel ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => toggleVerbaSelecionada(v.id)}>
                        <span className="text-sm text-gray-700 leading-snug">{v.nome}</span>
                      </div>
                      <span className="font-mono text-sm font-semibold shrink-0 text-gray-800">
                        {fmt(v.valor)}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400 italic">
                  * Estimativa com salário constante. Aviso prévio, férias e multa FGTS calculados sobre todo o período; FGTS depósitos limitados ao período imprescrito.
                </p>
                <button
                  type="button"
                  onClick={adicionarSelecionadasAoAcordo}
                  disabled={verbasesSelecionadas.size === 0}
                  className="btn-primario text-xs py-1.5 px-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={12} className="inline mr-1" />
                  Adicionar ({verbasesSelecionadas.size})
                </button>
              </div>
            </div>
          )}

          {/* Parcelas indenizatórias */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-titulo text-base text-primaria">Discriminação das Parcelas Indenizatórias</h3>
              <button
                type="button"
                onClick={addParcela}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="aviso-judicial mb-3 text-xs">
              Informe as parcelas de natureza <strong>indenizatória</strong> — estas não sofrem
              incidência de INSS e IR. O saldo restante será considerado salarial.
            </div>

            <div className="space-y-3">
              {parcelas.map((p, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 items-center"
                  style={{ gridTemplateColumns: '1fr 9rem 1.5rem' }}
                >
                  {/* Coluna nome */}
                  {p.seletor !== 'Personalizada...' ? (
                    <select
                      value={p.seletor}
                      onChange={e => updateParcela(idx, 'seletor', e.target.value)}
                      className="campo-input w-full text-sm"
                    >
                      <option value="">— selecionar parcela —</option>
                      {PARCELAS_PREDEFINIDAS.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1 min-w-0">
                      <input
                        type="text"
                        value={p.nomeCustom}
                        onChange={e => updateParcela(idx, 'nomeCustom', e.target.value)}
                        className="campo-input flex-1 text-sm min-w-0"
                        placeholder="Descrição da parcela..."
                      />
                      <button
                        type="button"
                        onClick={() => updateParcela(idx, 'seletor', '')}
                        title="Voltar à lista"
                        className="text-gray-400 hover:text-gray-600 shrink-0 text-xs leading-none"
                      >✕</button>
                    </div>
                  )}

                  {/* Coluna valor */}
                  <input
                    type="text"
                    value={p.valorRaw}
                    onChange={e => updateParcela(idx, 'valorRaw', e.target.value)}
                    onBlur={e => handleValorBlur(idx, e.target.value)}
                    className="campo-input w-full text-right font-mono text-sm"
                    placeholder="0,00"
                  />

                  {/* Coluna excluir */}
                  {parcelas.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeParcela(idx)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>

            {/* Barra de progresso */}
            {valorAcordoNum > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Parcelas indenizatórias: {fmt(totalIndenizatorio)}</span>
                  <span>Saldo salarial: {fmt(restante)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      totalIndenizatorio > valorAcordoNum ? 'bg-red-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, valorAcordoNum > 0 ? (totalIndenizatorio / valorAcordoNum) * 100 : 0)}%` }}
                  />
                </div>
                {totalIndenizatorio > valorAcordoNum && (
                  <p className="text-xs text-red-600 mt-1">⚠ Parcelas indenizatórias superam o valor do acordo.</p>
                )}
              </div>
            )}
          </div>

          {/* Condições especiais */}
          <div className="card p-5">
            <h3 className="font-titulo text-base mb-3 text-primaria">Condições Especiais do Acordo</h3>
            <div className="space-y-3">
              {[
                {
                  id: 'inss', label: 'INSS do empregado a cargo da empresa',
                  sub: resultado ? `Cota do empregado (${fmt(inssEmpregadoVal)}) assumida pelo reclamado` : 'Calcule primeiro para ver o valor',
                  value: inssEmpregadoEmpresa, set: setInssEmpregadoEmpresa,
                },
                {
                  id: 'ir', label: 'IR do empregado a cargo da empresa',
                  sub: resultado ? `IR estimado (${fmt(irVal)}) assumido pelo reclamado` : 'Calcule primeiro para ver o valor',
                  value: irEmpresa, set: setIrEmpresa,
                },
              ].map(({ id, label, sub, value, set }) => (
                <label key={id} className="flex items-start gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => set(v => !v)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{erro}</p>}

          <button
            type="button"
            onClick={calcular}
            disabled={calculando || !valorAcordoNum}
            className="btn-primario w-full py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calculando ? 'Calculando...' : '⚖ Calcular Encargos do Acordo'}
          </button>
        </div>

        {/* Coluna direita — resultado */}
        <div>
          {resultado ? (
            <div className="space-y-4">
              {/* Composição do acordo */}
              <div className="card p-5">
                <h3 className="font-titulo text-base mb-3 text-primaria">Composição do Acordo</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
                    <span className="text-gray-600">Valor total do acordo</span>
                    <span className="font-mono font-bold">{fmt(resultado.valorAcordo)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
                    <span className="text-amber-700">(-) Parcelas indenizatórias</span>
                    <span className="font-mono text-amber-700">({fmt(resultado.totalIndenizatorio)})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
                    <span className="text-blue-700 font-semibold">= Base salarial (INSS/IR incidem)</span>
                    <span className="font-mono font-bold text-blue-700">{fmt(resultado.baseSalarial)}</span>
                  </div>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                      Salarial: {pct(resultado.pctSalarial)}
                    </span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      Indenizatório: {pct(resultado.pctIndenizatorio)}
                    </span>
                    {resultado.periodoMeses > 1 && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                        {resultado.periodoMeses} meses (RRA)
                      </span>
                    )}
                  </div>
                  {/* Discriminação das parcelas indenizatórias */}
                  {resultado.parcelasIndenizatorias?.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 mb-2">Parcelas informadas:</p>
                      <div className="space-y-1">
                        {resultado.parcelasIndenizatorias.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-600">
                            <span className="truncate mr-2">{p.nome}</span>
                            <span className="font-mono shrink-0">{fmt(p.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Encargos */}
              <div className="card p-5">
                <h3 className="font-titulo text-base mb-3 text-primaria">Encargos Previdenciários e Fiscais</h3>
                <div className="space-y-2">
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-2">
                    <p className="text-xs font-semibold text-orange-700 mb-1">A deduzir do crédito do Reclamante</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">INSS Empregado (tabela progressiva 2025)</span>
                        <span className="font-mono text-orange-700 font-semibold">({fmt(resultado.inssEmpregado)})</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">IR Estimado — RRA (art. 12-A Lei 7.713/88)</span>
                        <span className="font-mono text-orange-700 font-semibold">({fmt(resultado.ir?.valor)})</span>
                      </div>
                      {resultado.ir?.aliquotaEfetiva > 0 && (
                        <p className="text-xs text-gray-400">Alíquota efetiva IR: {resultado.ir.aliquotaEfetiva?.toFixed(2)}%</p>
                      )}
                    </div>
                    <div className="flex justify-between py-1.5 mt-2 border-t border-orange-200 text-sm font-bold">
                      <span>Total a deduzir do crédito</span>
                      <span className="font-mono text-orange-800">({fmt(resultado.totalEncargosEmpregado)})</span>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Custo adicional do Reclamado</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">INSS Patronal (20% sobre base salarial)</span>
                      <span className="font-mono text-red-700 font-semibold">{fmt(resultado.inssEmpregador)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Art. 22 Lei 8.212/91 — não integra o valor do acordo</p>
                  </div>
                </div>
              </div>

              {/* Líquido ao Reclamante */}
              <div className="card p-5 border-2 border-gray-800">
                <h3 className="font-titulo text-base mb-3 text-primaria">Resumo Final</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span>Valor do acordo</span>
                    <span className="font-mono font-semibold">{fmt(resultado.valorAcordo)}</span>
                  </div>
                  {deducaoDoEmpregado > 0 ? (
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-orange-700">(-) Retido na fonte do empregado</span>
                      <span className="font-mono text-orange-700">({fmt(deducaoDoEmpregado)})</span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-1 border-b border-gray-100 text-green-700 text-xs italic">
                      <span>Sem retenções na fonte (encargos a cargo da empresa)</span>
                      <span>—</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 bg-green-50 rounded px-3 font-bold text-green-800 mt-1">
                    <span>Valor líquido ao Reclamante</span>
                    <span className="font-mono text-lg">{fmt(liquidoAjustado)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 rounded px-3 text-red-800 mt-1">
                    <span>+ Encargos a cargo do Reclamado</span>
                    <span className="font-mono font-semibold">{fmt(custoAdicionalEmpresa)}</span>
                  </div>
                  {(inssEmpregadoEmpresa || irEmpresa) && (
                    <div className="text-xs text-gray-500 px-3 space-y-0.5">
                      <p>INSS patronal: {fmt(resultado.inssEmpregador)}</p>
                      {inssEmpregadoEmpresa && <p>+ INSS empregado assumido: {fmt(inssEmpregadoVal)}</p>}
                      {irEmpresa && <p>+ IR assumido: {fmt(irVal)}</p>}
                    </div>
                  )}
                  <div className="flex justify-between py-2 bg-gray-800 text-white rounded px-3 font-bold mt-1">
                    <span>Custo total do acordo para o Reclamado</span>
                    <span className="font-mono">{fmt(custoTotalAcordo)}</span>
                  </div>
                </div>

                {resultado.ir?.memoria?.formula && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Cálculo IR (RRA)</p>
                    <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-600 break-words">
                      {resultado.ir.memoria.formula}
                    </p>
                  </div>
                )}
              </div>

              <div className="aviso-judicial text-xs">
                Simulação estimativa. O cálculo exato de INSS e IR em liquidações trabalhistas depende de perícia
                contábil e das particularidades de cada caso. IR calculado pelo método RRA (art. 12-A da Lei 7.713/88).
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">⚖</p>
              <p className="font-semibold text-gray-500">Preencha os dados e clique em Calcular</p>
              <p className="text-xs mt-2">O sistema calculará INSS, IR (RRA) e o líquido ao trabalhador</p>
              {temDadosParaEstimar && (
                <p className="text-xs mt-2 text-indigo-500">
                  ✓ Verbas rescisórias estimadas disponíveis na coluna esquerda
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

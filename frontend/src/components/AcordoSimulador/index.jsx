import { useState, useMemo } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

// Tabela INSS 2025 progressiva
const INSS_TABELA = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];
const INSS_TETO = 908.86;

// Tabela IR 2025 mensal
const IR_TABELA = [
  { ate: 2259.20, aliquota: 0,     deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3751.05, aliquota: 0.15,  deducao: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Infinity, aliquota: 0.275, deducao: 896.00 },
];

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

/**
 * Parser de descida recursiva para expressões matemáticas simples (+, -, *, /, parênteses).
 * Não usa eval nem Function — compatível com CSP restrito.
 */
function evalExpr(raw) {
  if (!raw || !String(raw).trim()) return 0;
  const str = String(raw).replace(',', '.').trim();

  const tokens = [];
  let i = 0;
  while (i < str.length) {
    if (/\s/.test(str[i])) { i++; continue; }
    if (/[\d.]/.test(str[i])) {
      let num = '';
      while (i < str.length && /[\d.]/.test(str[i])) num += str[i++];
      tokens.push({ t: 'n', v: parseFloat(num) });
    } else if (/[+\-*/()]/.test(str[i])) {
      tokens.push({ t: 'o', v: str[i++] });
    } else {
      return parseFloat(str) || 0;
    }
  }

  let pos = 0;
  const peek = () => (pos < tokens.length ? tokens[pos] : null);
  const consume = () => tokens[pos++];

  function expr() {
    let left = term();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = consume().v;
      left = op === '+' ? left + term() : left - term();
    }
    return left;
  }
  function term() {
    let left = factor();
    while (peek() && (peek().v === '*' || peek().v === '/')) {
      const op = consume().v;
      const r = factor();
      left = op === '*' ? left * r : (r !== 0 ? left / r : 0);
    }
    return left;
  }
  function factor() {
    const t = peek();
    if (!t) return 0;
    if (t.v === '(') { consume(); const v = expr(); if (peek()?.v === ')') consume(); return v; }
    if (t.t === 'n') { consume(); return t.v; }
    if (t.v === '-') { consume(); return -factor(); }
    return 0;
  }

  try {
    const result = expr();
    if (isFinite(result)) return Math.round(result * 100) / 100;
  } catch (_) {}
  return parseFloat(str) || 0;
}

function calcINSS(base) {
  let inss = 0;
  let baseAnt = 0;
  for (const f of INSS_TABELA) {
    if (base <= baseAnt) break;
    const faixaBase = Math.min(base, f.ate) - baseAnt;
    if (faixaBase > 0) inss += faixaBase * f.aliquota;
    baseAnt = f.ate;
    if (base <= f.ate) break;
  }
  return Math.round(Math.min(inss, INSS_TETO) * 100) / 100;
}

function calcIR_RRA(baseTributavel, meses) {
  if (!baseTributavel || baseTributavel <= 0) return 0;
  const m = Math.max(1, Math.min(meses || 1, 12));
  const mensal = baseTributavel / m;
  let faixa = IR_TABELA.find(f => mensal <= f.ate) || IR_TABELA[IR_TABELA.length - 1];
  const irMensal = mensal * faixa.aliquota - faixa.deducao;
  return Math.round(Math.max(0, irMensal) * m * 100) / 100;
}

/**
 * AcordoSimulador — apura INSS e IR sobre o valor do acordo conforme OJ 376 SDI-1 TST
 *
 * Props:
 *   percentualSalarial {number}  — fração salarial do cálculo original (0–1)
 *   verbas             {Array}   — verbas do resultado para pré-popular parcelas indenizatórias
 *   lapsoMeses         {number}  — meses do contrato (para RRA)
 */
export default function AcordoSimulador({ percentualSalarial, verbas, lapsoMeses }) {
  const [valorAcordo, setValorAcordo] = useState('');
  const [modoDiscriminacao, setModoDiscriminacao] = useState(false);

  // Parcelas indenizatórias discriminadas no acordo
  const [parcelas, setParcelas] = useState(() =>
    (verbas || [])
      .filter(v => v.natureza === 'indenizatoria' && !v.excluida && v.valor > 0)
      .map(v => {
        const match = PARCELAS_PREDEFINIDAS.find(
          o => o !== 'Personalizada...' &&
               o.toLowerCase().includes((v.nome || '').toLowerCase().slice(0, 10))
        );
        return {
          id: v.codigo,
          seletor: match || 'Personalizada...',
          nomeCustom: match ? '' : (v.nome || ''),
          valorRaw: String(v.valor),
        };
      })
  );

  const valorAcordoNum = evalExpr(valorAcordo) || 0;

  // Soma das parcelas indenizatórias discriminadas
  const totalIndenizatorio = useMemo(
    () => parcelas.reduce((acc, p) => acc + evalExpr(p.valorRaw), 0),
    [parcelas]
  );

  // Saldo salarial remanescente (não pode ser negativo)
  const saldoSalarial = Math.max(0, valorAcordoNum - totalIndenizatorio);

  // Quando não há discriminação manual, usa percentual salarial do cálculo original
  const baseSalarialAcordo = modoDiscriminacao
    ? saldoSalarial
    : Math.round(valorAcordoNum * (percentualSalarial || 0) * 100) / 100;

  const baseIndenizatoriaAcordo = valorAcordoNum - baseSalarialAcordo;

  // INSS sobre a base salarial
  const inssEmpregado = calcINSS(baseSalarialAcordo);
  const inssEmpregador = Math.round(baseSalarialAcordo * 0.20 * 100) / 100;
  const inssTotal = Math.round((inssEmpregado + inssEmpregador) * 100) / 100;

  // IR (RRA) sobre base salarial - INSS empregado
  const baseTributavel = Math.max(0, baseSalarialAcordo - inssEmpregado);
  const irEstimado = calcIR_RRA(baseTributavel, lapsoMeses);

  const valorLiquido = Math.max(0, valorAcordoNum - inssEmpregado - irEstimado);

  // ── Gerenciamento das parcelas ──────────────────────────────────────────────
  function addParcela() {
    setParcelas(prev => [...prev, { id: `manual_${Date.now()}`, seletor: '', nomeCustom: '', valorRaw: '' }]);
  }

  function removeParcela(id) {
    setParcelas(prev => prev.filter(p => p.id !== id));
  }

  function updateParcela(id, campo, valor) {
    setParcelas(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  }

  function handleValorBlur(id, raw) {
    const n = evalExpr(raw);
    if (n > 0 && n.toFixed(2) !== raw) {
      updateParcela(id, 'valorRaw', n.toFixed(2));
    }
  }

  return (
    <div className="card p-6 mb-4 border-2 border-indigo-200">
      <h4 className="font-titulo text-lg mb-1 text-primaria">
        Simulação de Acordo
        <span className="ml-2 text-xs font-normal bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">OJ 376 SDI-1 TST</span>
      </h4>
      <p className="text-xs text-gray-400 mb-4">
        A contribuição previdenciária sobre o acordo respeita a proporcionalidade entre parcelas salariais e
        indenizatórias deferidas na condenação (OJ 376 SDI-1 TST).
      </p>

      {/* Valor do acordo */}
      <div className="flex items-end gap-4 mb-4 flex-wrap">
        <div>
          <label className="campo-label">Valor do Acordo (R$)</label>
          <input
            type="text"
            value={valorAcordo}
            onChange={e => setValorAcordo(e.target.value)}
            onBlur={e => {
              const n = evalExpr(e.target.value);
              if (n > 0 && String(n) !== e.target.value) setValorAcordo(n.toFixed(2));
            }}
            className="campo-input w-44 text-right font-mono text-lg"
            placeholder="0,00 ou ex.: 5000+1500"
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            % salarial no cálculo: {pct(percentualSalarial)}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            % indenizatório: {pct(1 - (percentualSalarial || 0))}
          </span>
        </div>
      </div>

      {valorAcordoNum > 0 && (
        <>
          {/* Toggle modo discriminação */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <button
              type="button"
              onClick={() => setModoDiscriminacao(v => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${modoDiscriminacao ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${modoDiscriminacao ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {modoDiscriminacao ? 'Discriminação manual das parcelas' : 'Proporcionalidade automática do cálculo'}
              </p>
              <p className="text-xs text-gray-400">
                {modoDiscriminacao
                  ? 'Especifique as parcelas indenizatórias do acordo linha a linha'
                  : `Base salarial = ${pct(percentualSalarial)} × ${fmt(valorAcordoNum)} = ${fmt(baseSalarialAcordo)}`}
              </p>
            </div>
          </div>

          {/* Tabela de discriminação manual */}
          {modoDiscriminacao && (
            <div className="mb-4">
              <p className="campo-label mb-2">Parcelas indenizatórias discriminadas no acordo</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 font-medium text-gray-600" style={{ width: '58%' }}>Natureza / Descrição</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600" style={{ width: '32%' }}>Valor (R$)</th>
                      <th style={{ width: '10%' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((p) => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-2 py-1">
                          <select
                            value={p.seletor}
                            onChange={e => updateParcela(p.id, 'seletor', e.target.value)}
                            className="campo-input w-full text-sm py-1"
                          >
                            <option value="">— selecionar parcela —</option>
                            {PARCELAS_PREDEFINIDAS.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                          {p.seletor === 'Personalizada...' && (
                            <input
                              type="text"
                              value={p.nomeCustom}
                              onChange={e => updateParcela(p.id, 'nomeCustom', e.target.value)}
                              className="campo-input w-full text-sm py-1 mt-1"
                              placeholder="Descreva a parcela..."
                              autoFocus
                            />
                          )}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={p.valorRaw}
                            onChange={e => updateParcela(p.id, 'valorRaw', e.target.value)}
                            onBlur={e => handleValorBlur(p.id, e.target.value)}
                            className="campo-input w-full text-right font-mono text-sm py-1"
                            placeholder="0,00 ou 1000+500"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeParcela(p.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Saldo salarial remanescente */}
                    <tr className="border-t-2 border-blue-200 bg-blue-50">
                      <td className="px-3 py-2 font-semibold text-blue-800">Saldo Salarial Remanescente</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-blue-800">
                        {saldoSalarial < 0
                          ? <span className="text-red-600">{fmt(saldoSalarial)} (parcelas excedem o acordo!)</span>
                          : fmt(saldoSalarial)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-3 py-2">
                        <button
                          type="button"
                          onClick={addParcela}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          <PlusCircle size={14} />
                          Adicionar parcela indenizatória
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Resumo da apuração */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="campo-label">Base Salarial do Acordo</p>
              <p className="font-mono font-bold text-blue-800">{fmt(baseSalarialAcordo)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="campo-label">Base Indenizatória</p>
              <p className="font-mono font-bold text-amber-800">{fmt(baseIndenizatoriaAcordo)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
              <p className="campo-label">INSS Empregado (sobre base salarial)</p>
              <p className="font-mono font-bold text-orange-700">{fmt(inssEmpregado)}</p>
              <p className="text-xs text-gray-400">tabela progressiva 2025</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="campo-label">INSS Empregador (20%)</p>
              <p className="font-mono font-bold text-red-700">{fmt(inssEmpregador)}</p>
              <p className="text-xs text-gray-400">art. 22 Lei 8.212/91</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="campo-label">INSS Total (emp. + patr.)</p>
              <p className="font-mono font-bold text-red-900">{fmt(inssTotal)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
              <p className="campo-label">IR Estimado (RRA)</p>
              <p className="font-mono font-bold text-orange-700">{fmt(irEstimado)}</p>
              <p className="text-xs text-gray-400">art. 12-A Lei 7.713/88</p>
            </div>
          </div>

          {/* Total líquido estimado */}
          <div className="grid grid-cols-3 gap-3 text-sm bg-indigo-900 text-white rounded-lg px-4 py-3">
            <div>
              <p className="text-xs opacity-70">Valor Bruto do Acordo</p>
              <p className="font-mono font-bold text-lg">{fmt(valorAcordoNum)}</p>
            </div>
            <div>
              <p className="text-xs opacity-70">(-) INSS Empregado + IR</p>
              <p className="font-mono font-bold text-lg text-red-300">({fmt(inssEmpregado + irEstimado)})</p>
            </div>
            <div>
              <p className="text-xs opacity-70">Valor Líquido Estimado (Exequente)</p>
              <p className="font-mono font-bold text-xl text-green-300">{fmt(valorLiquido)}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Valores estimados — confirme com o perito contábil. A retenção de IR e INSS é responsabilidade do
            devedor/empregador (art. 46 Lei 8.541/92 e art. 30 Lei 8.212/91).
          </p>
        </>
      )}
    </div>
  );
}

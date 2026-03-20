import { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function pct(v) {
  return `${((v || 0) * 100).toFixed(1)}%`;
}

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

export default function SimuladorAcordoPage() {
  const [valorAcordo, setValorAcordo] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [dataDispensa, setDataDispensa] = useState('');
  const [salario, setSalario] = useState('');
  const [parcelas, setParcelas] = useState([
    { seletor: '', nomeCustom: '', valorRaw: '' },
  ]);
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');

  function addParcela() {
    setParcelas(prev => [...prev, { seletor: '', nomeCustom: '', valorRaw: '' }]);
  }

  function removeParcela(idx) {
    setParcelas(prev => prev.filter((_, i) => i !== idx));
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="font-titulo text-2xl text-primaria mb-1">Simulador de Acordo</h2>
      <p className="text-sm text-gray-500 mb-6">
        Calcule INSS, IR (RRA) e encargos devidos em um acordo trabalhista, discriminando as parcelas indenizatórias.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda — formulário */}
        <div className="space-y-4">

          {/* Valor do acordo */}
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
            </div>
          </div>

          {/* Parcelas indenizatórias */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-titulo text-base text-primaria">Parcelas Indenizatórias</h3>
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
                  className="grid gap-2 items-start"
                  style={{ gridTemplateColumns: '1fr 9rem 1.5rem' }}
                >
                  {/* Coluna nome */}
                  <div className="min-w-0 space-y-1">
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
                    {p.seletor === 'Personalizada...' && (
                      <input
                        type="text"
                        value={p.nomeCustom}
                        onChange={e => updateParcela(idx, 'nomeCustom', e.target.value)}
                        className="campo-input w-full text-sm"
                        placeholder="Descreva a parcela..."
                        autoFocus
                      />
                    )}
                  </div>

                  {/* Coluna valor */}
                  <input
                    type="text"
                    value={p.valorRaw}
                    onChange={e => updateParcela(idx, 'valorRaw', e.target.value)}
                    onBlur={e => handleValorBlur(idx, e.target.value)}
                    className="campo-input w-full text-right font-mono text-sm"
                    placeholder="0,00 ou 1000+200"
                  />

                  {/* Coluna excluir */}
                  {parcelas.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeParcela(idx)}
                      className="text-red-400 hover:text-red-600 mt-2"
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
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-orange-700">(-) INSS + IR (retidos na fonte)</span>
                    <span className="font-mono text-orange-700">({fmt(resultado.totalEncargosEmpregado)})</span>
                  </div>
                  <div className="flex justify-between py-2 bg-green-50 rounded px-3 font-bold text-green-800 mt-1">
                    <span>Valor líquido ao Reclamante</span>
                    <span className="font-mono text-lg">{fmt(resultado.liquidoEmpregado)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-red-50 rounded px-3 text-red-800 mt-1">
                    <span>+ INSS Patronal (custo do Reclamado)</span>
                    <span className="font-mono font-semibold">{fmt(resultado.inssEmpregador)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-gray-800 text-white rounded px-3 font-bold mt-1">
                    <span>Custo total do acordo para o Reclamado</span>
                    <span className="font-mono">{fmt(resultado.valorAcordo + resultado.inssEmpregador)}</span>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

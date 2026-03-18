import React, { useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function pct(v) {
  return `${((v || 0) * 100).toFixed(1)}%`;
}

export default function SimuladorAcordoPage() {
  const [valorAcordo, setValorAcordo] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [dataDispensa, setDataDispensa] = useState('');
  const [salario, setSalario] = useState('');
  const [parcelas, setParcelas] = useState([
    { nome: '', valor: '' },
  ]);
  const [resultado, setResultado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState('');

  function addParcela() {
    setParcelas(prev => [...prev, { nome: '', valor: '' }]);
  }

  function removeParcela(idx) {
    setParcelas(prev => prev.filter((_, i) => i !== idx));
  }

  function updateParcela(idx, field, value) {
    setParcelas(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  // Total indenizatório em tempo real
  const totalIndenizatorio = useMemo(
    () => parcelas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0),
    [parcelas]
  );
  const valorAcordoNum = parseFloat(valorAcordo) || 0;
  const baseSalarialPrevia = Math.max(0, valorAcordoNum - totalIndenizatorio);
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
          salario: parseFloat(salario) || null,
          parcelasIndenizatorias: parcelas
            .filter(p => p.nome && parseFloat(p.valor) > 0)
            .map(p => ({ nome: p.nome, valor: parseFloat(p.valor) })),
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
                  type="number"
                  value={valorAcordo}
                  onChange={e => setValorAcordo(e.target.value)}
                  className="campo-input font-mono"
                  step="0.01" min="0"
                  placeholder="0,00"
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
                  type="number"
                  value={salario}
                  onChange={e => setSalario(e.target.value)}
                  className="campo-input font-mono"
                  step="0.01" min="0"
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
              Informe as parcelas de natureza <strong>indenizatória</strong> (FGTS, multa rescisória, indenização por dano moral, etc.) — estas não sofrem incidência de INSS e IR. O saldo restante será considerado salarial.
            </div>
            <div className="space-y-2">
              {parcelas.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={p.nome}
                    onChange={e => updateParcela(idx, 'nome', e.target.value)}
                    className="campo-input flex-1 text-sm"
                    placeholder="Nome da parcela (ex.: Multa FGTS 40%)"
                  />
                  <input
                    type="number"
                    value={p.valor}
                    onChange={e => updateParcela(idx, 'valor', e.target.value)}
                    className="campo-input w-36 text-right font-mono text-sm"
                    step="0.01" min="0"
                    placeholder="R$ 0,00"
                  />
                  {parcelas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParcela(idx)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
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
                    style={{ width: `${Math.min(100, (totalIndenizatorio / valorAcordoNum) * 100)}%` }}
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

                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-2">
                    <p className="text-xs font-semibold text-red-700 mb-1">Custo adicional do Reclamado</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">INSS Patronal (20% sobre base salarial)</span>
                      <span className="font-mono text-red-700 font-semibold">{fmt(resultado.inssEmpregador)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Art. 22 Lei 8.212/91 — não integra o valor do acordo</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">FGTS (informativo — já incluído no acordo)</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">FGTS s/ base salarial (8%)</span>
                      <span className="font-mono text-gray-700">{fmt(resultado.fgts)}</span>
                    </div>
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

                {/* Fórmula IR */}
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
                Simulação estimativa. O cálculo exato de INSS e IR em liquidações trabalhistas depende de perícia contábil e das particularidades de cada caso. IR calculado pelo método RRA (art. 12-A da Lei 7.713/88).
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

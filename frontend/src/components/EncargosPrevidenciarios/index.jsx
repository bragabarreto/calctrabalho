import React, { useState, useMemo } from 'react';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

export default function EncargosPrevidenciarios({ encargos, verbas }) {
  const [prevPrivAtiva, setPrevPrivAtiva] = useState(false);
  const [aliquotaPrevPrivEmpregado, setAliquotaPrevPrivEmpregado] = useState('');
  const [aliquotaPrevPrivEmpregador, setAliquotaPrevPrivEmpregador] = useState('');
  const [verbasSelPrevPriv, setVerbasSelPrevPriv] = useState({});

  const toggleVerbaPrevPriv = (codigo) =>
    setVerbasSelPrevPriv((prev) => ({ ...prev, [codigo]: !prev[codigo] }));

  const basePrevPriv = useMemo(
    () =>
      (verbas || [])
        .filter((v) => !v.excluida && verbasSelPrevPriv[v.codigo])
        .reduce((acc, v) => acc + v.valor, 0),
    [verbas, verbasSelPrevPriv]
  );

  const aliqEmpregadoNum =
    parseFloat(String(aliquotaPrevPrivEmpregado).replace(',', '.')) / 100 || 0;
  const aliqEmpregadorNum =
    parseFloat(String(aliquotaPrevPrivEmpregador).replace(',', '.')) / 100 || 0;
  const prevPrivEmpregado = Math.round(basePrevPriv * aliqEmpregadoNum * 100) / 100;
  const prevPrivEmpregador = Math.round(basePrevPriv * aliqEmpregadorNum * 100) / 100;

  const verbasComValor = (verbas || []).filter((v) => !v.excluida && v.valor > 0);

  return (
    <div className="card p-6 mb-4">
      <h4 className="font-titulo text-lg mb-1 text-primaria">
        Encargos Previdenciários e Fiscais
        <span className="ml-2 text-xs font-normal text-gray-400">
          (informativo — não deduzido automaticamente)
        </span>
      </h4>

      {/* Composição salarial / indenizatória */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          Parcelas salariais: {pct(encargos.pctSalarial)} — {fmt(encargos.baseSalarial)}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Parcelas indenizatórias: {pct(encargos.pctIndenizatorio)} — {fmt(encargos.baseIndenizatoria)}
        </span>
      </div>

      {/* INSS empregado + empregador + IR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm mb-3">
        <div>
          <p className="campo-label">Base INSS</p>
          <p className="font-mono">{fmt(encargos.baseInss)}</p>
          <p className="text-xs text-gray-400 mt-0.5">(verbas c/ incid. INSS)</p>
        </div>
        <div>
          <p className="campo-label">INSS Empregado</p>
          <p className="font-mono text-orange-700 font-semibold">{fmt(encargos.inssEmpregado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">tabela progressiva 2025</p>
        </div>
        <div>
          <p className="campo-label">INSS Empregador</p>
          <p className="font-mono text-red-700 font-semibold">{fmt(encargos.inssEmpregador)}</p>
          <p className="text-xs text-gray-400 mt-0.5">20% patronal — art. 22 Lei 8.212/91</p>
        </div>
        <div>
          <p className="campo-label">INSS Total</p>
          <p className="font-mono text-red-900 font-bold">
            {fmt((encargos.inssEmpregado || 0) + (encargos.inssEmpregador || 0))}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">empregado + empregador</p>
        </div>
        <div>
          <p className="campo-label">Base IR (RRA)</p>
          <p className="font-mono">{fmt(encargos.baseTributavel)}</p>
          <p className="text-xs text-gray-400 mt-0.5">base INSS − INSS empregado</p>
        </div>
        <div>
          <p className="campo-label">IR Estimado (RRA)</p>
          <p className="font-mono text-orange-700 font-semibold">{fmt(encargos.irRetido?.valor)}</p>
          <p className="text-xs text-gray-400 mt-0.5">art. 12-A Lei 7.713/88</p>
        </div>
      </div>

      {/* Referência: Teto de Contribuição e Contribuição Máxima INSS */}
      <div className="flex gap-4 mb-3 flex-wrap">
        <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs">
          <span className="text-gray-500">Teto de contribuição (SC):</span>{' '}
          <span className="font-mono font-semibold text-slate-700">R$ 8.157,41</span>
          <span className="text-gray-400 ml-1">— Portaria MPS/MF 6/2025</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs">
          <span className="text-gray-500">Contribuição máxima (progressiva):</span>{' '}
          <span className="font-mono font-semibold text-slate-700">R$ 908,86</span>
          <span className="text-gray-400 ml-1">— EC 103/2019</span>
        </div>
      </div>

      {/* Memórias de cálculo INSS/IR */}
      <div className="space-y-1 mb-4">
        {encargos.memoria?.inssEmpregado && (
          <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-600">
            INSS Empregado: {encargos.memoria.inssEmpregado}
          </p>
        )}
        {encargos.irRetido?.memoria?.formula && (
          <p className="text-xs font-mono bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-600">
            IR (RRA): {encargos.irRetido.memoria.formula}
          </p>
        )}
      </div>

      {/* Previdência Privada */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setPrevPrivAtiva((v) => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              prevPrivAtiva ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
                prevPrivAtiva ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="text-sm font-semibold text-gray-700">Previdência Privada</span>
          {prevPrivAtiva && (
            <span className="text-xs text-gray-400">(empregado + empregador)</span>
          )}
        </div>

        {prevPrivAtiva && (
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="campo-label">Alíquota Empregado (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={aliquotaPrevPrivEmpregado}
                  onChange={(e) => setAliquotaPrevPrivEmpregado(e.target.value)}
                  className="campo-input w-28 text-right font-mono"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="campo-label">Alíquota Empregador (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={aliquotaPrevPrivEmpregador}
                  onChange={(e) => setAliquotaPrevPrivEmpregador(e.target.value)}
                  className="campo-input w-28 text-right font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <p className="campo-label mb-1">Verbas que compõem a base de incidência</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-100 rounded p-2 bg-gray-50">
                {verbasComValor.map((v) => (
                  <label
                    key={v.codigo}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={!!verbasSelPrevPriv[v.codigo]}
                      onChange={() => toggleVerbaPrevPriv(v.codigo)}
                      className="accent-indigo-600"
                    />
                    <span className="flex-1">{v.nome}</span>
                    <span className="font-mono text-gray-500">{fmt(v.valor)}</span>
                  </label>
                ))}
              </div>
            </div>

            {basePrevPriv > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div>
                  <p className="campo-label">Base de Cálculo</p>
                  <p className="font-mono font-semibold">{fmt(basePrevPriv)}</p>
                </div>
                <div>
                  <p className="campo-label">
                    Contribuição Empregado ({aliquotaPrevPrivEmpregado || 0}%)
                  </p>
                  <p className="font-mono font-semibold text-indigo-700">{fmt(prevPrivEmpregado)}</p>
                </div>
                <div>
                  <p className="campo-label">
                    Contribuição Empregador ({aliquotaPrevPrivEmpregador || 0}%)
                  </p>
                  <p className="font-mono font-semibold text-indigo-700">{fmt(prevPrivEmpregador)}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">{encargos.memoria?.aviso}</p>
    </div>
  );
}

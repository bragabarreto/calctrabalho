import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useComparacao } from '../../hooks/useComparacao.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function calcularTotalSim(verbas) {
  return verbas.filter((v) => v.valor_considerado).reduce((a, v) => a + parseFloat(v.valor_bruto), 0);
}

function getCelulaCss(valor, min, max) {
  if (valor === max && max > 0) return 'maior';
  if (valor === min && min < max) return 'menor';
  return '';
}

export default function ComparacaoPainel() {
  const { id } = useParams();
  const { data, isLoading, error } = useComparacao(id);

  const { simulacoes, todasVerbas, totais } = useMemo(() => {
    if (!data?.simulacoes) return { simulacoes: [], todasVerbas: [], totais: [] };

    const sims = data.simulacoes;

    // Coletar todos os códigos de verbas únicos (na ordem do primeiro cenário)
    const codigosVistos = new Set();
    const todasVerbas = [];
    for (const sim of sims) {
      for (const v of sim.verbas) {
        if (!codigosVistos.has(v.codigo)) {
          codigosVistos.add(v.codigo);
          todasVerbas.push({ codigo: v.codigo, nome: v.nome, natureza: v.natureza });
        }
      }
    }

    const totais = sims.map((s) => calcularTotalSim(s.verbas));

    return { simulacoes: sims, todasVerbas, totais };
  }, [data]);

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error.message}</div>;
  if (!data) return null;

  function getValor(sim, codigo) {
    const v = sim.verbas.find((v) => v.codigo === codigo);
    return v && v.valor_considerado ? parseFloat(v.valor_bruto) : 0;
  }

  const valoresPorCodigo = todasVerbas.map((verba) => {
    const vals = simulacoes.map((s) => getValor(s, verba.codigo));
    return { ...verba, valores: vals, max: Math.max(...vals), min: Math.min(...vals.filter((v) => v > 0)) || 0 };
  });

  const minTotal = Math.min(...totais.filter((t) => t > 0)) || 0;
  const maxTotal = Math.max(...totais);

  return (
    <div className="p-6">
      <div className="bg-primaria text-white px-6 py-4 -mx-6 -mt-6 mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-titulo text-2xl">{data.comparacao.nome}</h2>
          <p className="text-blue-200 text-sm mt-1">{simulacoes.length} cenários comparados</p>
        </div>
        <Link to="/comparacao" className="text-blue-200 hover:text-white text-sm">← Voltar</Link>
      </div>

      <div className="aviso-judicial mb-4">
        Células em <span className="font-bold" style={{ color: '#2d6a4f' }}>verde</span> = maior valor da linha.
        Células em <span className="font-bold" style={{ color: '#c53030' }}>vermelho</span> = menor valor (excluindo zeros).
      </div>

      <div className="card overflow-x-auto">
        <table className="tabela-memoria tabela-comparacao">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Verba</th>
              <th style={{ width: '8%' }}>Nat.</th>
              {simulacoes.map((s) => (
                <th key={s.id} className="text-right" style={{ width: `${57 / simulacoes.length}%` }}>
                  {s.nome.length > 25 ? s.nome.slice(0, 23) + '…' : s.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {valoresPorCodigo.filter((v) => v.max > 0).map((verba) => (
              <tr key={verba.codigo}>
                <td className="text-sm">{verba.nome}</td>
                <td className="text-xs">
                  <span className={verba.natureza === 'salarial' ? 'natureza-sal' : 'natureza-ind'}
                    style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem',
                      background: verba.natureza === 'salarial' ? '#e8f0fe' : '#fef3c7',
                      color: verba.natureza === 'salarial' ? '#1a3a5c' : '#92400e' }}>
                    {verba.natureza}
                  </span>
                </td>
                {verba.valores.map((val, i) => (
                  <td key={i} className={`valor-monetario text-right text-sm ${getCelulaCss(val, verba.min, verba.max)}`}>
                    {val > 0 ? formatBRL(val) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#1a3a5c', color: 'white' }}>
              <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700 }}>TOTAL LÍQUIDO</td>
              {totais.map((t, i) => (
                <td key={i} className={`valor-monetario text-right font-bold ${getCelulaCss(t, minTotal, maxTotal)}`}
                  style={{ backgroundColor: t === maxTotal ? '#2d6a4f' : t === minTotal && t < maxTotal ? '#c53030' : 'inherit' }}>
                  {formatBRL(t)}
                </td>
              ))}
            </tr>
            <tr style={{ backgroundColor: '#e8ecf0' }}>
              <td colSpan={2} className="text-xs text-gray-500 px-3 py-2">Diferença (maior − menor)</td>
              <td colSpan={simulacoes.length} className="text-right px-3 py-2">
                <span className="valor-monetario text-sm font-semibold">
                  {formatBRL(maxTotal - minTotal)}
                  {minTotal > 0 && maxTotal > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      ({(((maxTotal - minTotal) / minTotal) * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSimulacao } from '../../hooks/useSimulacao.js';
import MemoriaCalculo from '../../components/MemoriaCalculo/index.jsx';
import ExportBar from '../../components/ExportBar/index.jsx';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export default function HistoricoDetalhe() {
  const { id } = useParams();
  const { data, isLoading, error } = useSimulacao(id);

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (error) return <div className="p-8 text-red-500">Erro: {error.message}</div>;
  if (!data) return null;

  const { simulacao: s, verbas } = data;

  // Reconstruir o objeto resultado para o componente MemoriaCalculo
  const verbasFormatadas = verbas.map((v) => ({
    codigo: v.codigo,
    nome: v.nome,
    categoria: v.categoria,
    natureza: v.natureza,
    incideFgts: v.incide_fgts,
    incideInss: v.incide_inss,
    valor: parseFloat(v.valor_bruto),
    excluida: !v.valor_considerado,
    memoria: v.memoria_calculo || {},
    ordemExibicao: v.ordem_exibicao,
  }));

  const subtotal = verbasFormatadas.filter((v) => !v.excluida).reduce((a, v) => a + v.valor, 0);
  const deducoes = { fgtsDepositado: parseFloat(s.fgts_depositado), valorPago: parseFloat(s.valor_pago), total: parseFloat(s.fgts_depositado) + parseFloat(s.valor_pago) };
  const total = Math.max(0, subtotal - deducoes.total);
  const honorarios = total * parseFloat(s.percentual_honorarios);

  return (
    <div className="p-6 max-w-5xl">
      <div className="bg-primaria text-white px-6 py-4 -mx-6 -mt-6 mb-6 flex justify-between items-center">
        <div>
          <h2 className="font-titulo text-2xl">{s.nome}</h2>
          {s.numero_processo && <p className="text-blue-200 text-sm mt-1">Processo: {s.numero_processo}</p>}
        </div>
        <Link to="/historico" className="text-blue-200 hover:text-white text-sm">← Voltar</Link>
      </div>

      <div className="flex justify-end mb-4">
        <ExportBar salvoId={id} />
      </div>

      <div className="card mb-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-titulo text-lg text-primaria">Memória de Cálculo</h4>
        </div>
        <MemoriaCalculo
          verbas={verbasFormatadas}
          subtotal={subtotal}
          deducoes={deducoes}
          total={total}
          honorarios={honorarios}
          totalComHonorarios={total + honorarios}
        />
      </div>
    </div>
  );
}

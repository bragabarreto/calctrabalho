import React, { useState, useMemo } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import MemoriaCalculo from '../../components/MemoriaCalculo/index.jsx';
import ExportBar from '../../components/ExportBar/index.jsx';
import AcordoSimulador from '../../components/AcordoSimulador/index.jsx';
import EncargosPrevidenciarios from '../../components/EncargosPrevidenciarios/index.jsx';
import { useSalvarSimulacao } from '../../hooks/useCalculo.js';

const MODALIDADES = {
  sem_justa_causa: 'Dispensa sem Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  culpa_reciproca: 'Culpa Recíproca',
};

const ORDEM = ['sem_justa_causa', 'pedido_demissao', 'culpa_reciproca'];

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function ColoredValue({ valor, max, min }) {
  if (valor === max && max !== min)
    return <span className="text-green-600 font-bold">{formatBRL(valor)}</span>;
  if (valor === min && max !== min)
    return <span className="text-red-500">{formatBRL(valor)}</span>;
  return <span>{formatBRL(valor)}</span>;
}

/**
 * Aplica verbasExcluidas e verbasEditadas sobre o array de verbas de uma modalidade.
 * Retorna o array transformado + totais reativos.
 */
function computarModalidade(verbas, deducoes, dadosCalculo) {
  const { verbasExcluidas, verbasEditadas, percentualHonorarios, honorariosPericiais, aplicarCustas } = dadosCalculo;
  const verbasExibidas = (verbas || []).map((v) => {
    const edit = verbasEditadas?.[v.codigo];
    return {
      ...v,
      excluida: (verbasExcluidas || []).includes(v.codigo) ? true : v.excluida,
      valor: edit?.valor !== undefined ? Number(edit.valor) : v.valor,
      nome: edit?.nome !== undefined ? edit.nome : v.nome,
    };
  });
  const subtotal = verbasExibidas.filter((v) => !v.excluida).reduce((acc, v) => acc + v.valor, 0);
  const total = Math.max(0, subtotal - (deducoes?.total || 0));
  const pctHon = percentualHonorarios ?? 0.15;
  const honorarios = Math.round(total * pctHon * 100) / 100;
  const honPericiais = honorariosPericiais || 0;
  const custas = aplicarCustas ? Math.round(total * 0.02 * 100) / 100 : 0;
  const totalComHonorarios = Math.round((total + honorarios + honPericiais + custas) * 100) / 100;
  return { verbasExibidas, subtotal, total, honorarios, custas, totalComHonorarios };
}

export default function ResultadoTriplo() {
  const { resultadosTriplos, dados, setStep, toggleVerbaExcluida, setVerbasEditadas } =
    useCalculoStore();
  const { mutateAsync: salvar } = useSalvarSimulacao();
  const [abaAtiva, setAbaAtiva] = useState('sem_justa_causa');
  const [salvoIds, setSalvoIds] = useState({});
  const [salvandoId, setSalvandoId] = useState(null);
  const [mostrarAcordo, setMostrarAcordo] = useState(false);

  // Computa verbas e totais reativos para todas as modalidades em um único useMemo
  const computado = useMemo(() => {
    const dadosCalculo = {
      verbasExcluidas: dados.verbasExcluidas,
      verbasEditadas: dados.verbasEditadas,
      percentualHonorarios: dados.percentualHonorarios,
      honorariosPericiais: dados.honorariosPericiaisValor || 0,
      aplicarCustas: dados.aplicarCustas,
    };
    const result = {};
    for (const mod of ORDEM) {
      result[mod] = computarModalidade(
        resultadosTriplos?.[mod]?.verbas,
        resultadosTriplos?.[mod]?.deducoes,
        dadosCalculo
      );
    }
    return result;
  }, [
    resultadosTriplos,
    dados.verbasExcluidas,
    dados.verbasEditadas,
    dados.percentualHonorarios,
    dados.honorariosPericiaisValor,
    dados.aplicarCustas,
  ]);

  async function handleSalvar() {
    setSalvandoId(abaAtiva);
    try {
      const resp = await salvar({
        nome: (dados.nomeSimulacao || 'Simulação') + ' — ' + (MODALIDADES[abaAtiva] || abaAtiva),
        modalidade: abaAtiva,
        dados,
        resultado: resultadosTriplos[abaAtiva],
        numeroProcesso: dados.numeroProcesso,
        varaNome: dados.varaNome,
        observacoes: dados.observacoes,
      });
      setSalvoIds((prev) => ({ ...prev, [abaAtiva]: resp.id }));
      return resp.id;
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
      return null;
    } finally {
      setSalvandoId(null);
    }
  }

  if (!resultadosTriplos) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum resultado disponível. Volte e calcule.</p>
        <button className="btn-primario mt-4" onClick={() => setStep(8)}>
          ← Voltar
        </button>
      </div>
    );
  }

  const totaisLiquidos = ORDEM.map((m) => computado[m]?.total || 0);
  const maxTotal = Math.max(...totaisLiquidos);
  const minTotal = Math.min(...totaisLiquidos);

  const resultadoAtivo = resultadosTriplos[abaAtiva];
  const compAtivo = computado[abaAtiva];

  const AVISOS = [
    'Atenção: verifique o marco prescricional (5 anos antes do ajuizamento — EC 45/2004).',
    'Este sistema é uma ferramenta de SIMULAÇÃO. Os valores não substituem a liquidação judicial oficial.',
  ];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="font-titulo text-xl text-primaria">
              {dados.nomeSimulacao || 'Comparativo de Cenários'}
            </h3>
            {dados.numeroProcesso && (
              <p className="text-sm text-gray-500 mt-1">Processo: {dados.numeroProcesso}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <ExportBar salvoId={salvoIds[abaAtiva]} onSalvar={handleSalvar} />
        </div>
      </div>

      {/* Tabela comparativa de totais — usa valores recomputados reativamente */}
      <div className="card p-6 mb-4">
        <h4 className="font-titulo text-lg mb-4 text-primaria">Comparativo — Totais Líquidos</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Modalidade</th>
                <th className="text-right py-2 text-gray-500 font-medium">Subtotal</th>
                <th className="text-right py-2 text-gray-500 font-medium">(-) Deduções</th>
                <th className="text-right py-2 text-gray-500 font-medium font-bold">
                  Total Líquido
                </th>
                <th className="text-right py-2 text-gray-500 font-medium">+ Honorários</th>
              </tr>
            </thead>
            <tbody>
              {ORDEM.map((mod) => {
                const r = resultadosTriplos[mod];
                const c = computado[mod];
                if (!r) return null;
                return (
                  <tr
                    key={mod}
                    className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${
                      abaAtiva === mod ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setAbaAtiva(mod)}
                  >
                    <td className="py-3 font-medium">{MODALIDADES[mod]}</td>
                    <td className="py-3 text-right font-mono">{formatBRL(c.subtotal)}</td>
                    <td className="py-3 text-right font-mono text-red-400">
                      - {formatBRL(r.deducoes?.total)}
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      <ColoredValue valor={c.total} max={maxTotal} min={minTotal} />
                    </td>
                    <td className="py-3 text-right font-mono text-gray-400">
                      {formatBRL(c.honorarios)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Clique em uma linha para ver a memória de cálculo detalhada.
          <span className="text-green-600 ml-2">■ maior valor</span>
          <span className="text-red-400 ml-2">■ menor valor</span>
        </p>
      </div>

      {/* Abas de resultado detalhado */}
      <div className="card mb-4">
        <div className="flex border-b border-gray-100">
          {ORDEM.map((mod) => (
            <button
              key={mod}
              onClick={() => setAbaAtiva(mod)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                abaAtiva === mod
                  ? 'border-b-2 border-primaria text-primaria'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {MODALIDADES[mod]}
            </button>
          ))}
        </div>

        {resultadoAtivo && (
          <div className="p-4">
            {/* Dados do Contrato — por modalidade */}
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-white">
              <h5 className="font-titulo text-sm text-primaria mb-3">
                Dados do Contrato — {MODALIDADES[abaAtiva]}
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="campo-label">Data de Admissão</p>
                  <p className="font-mono text-xs">
                    {dados.dataAdmissao
                      ? new Date(dados.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="campo-label">Data de Dispensa</p>
                  <p className="font-mono text-xs">
                    {dados.dataDispensa
                      ? new Date(dados.dataDispensa + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="campo-label">Remuneração Base</p>
                  <p className="font-mono text-xs font-semibold">
                    {formatBRL(dados.ultimoSalario)}
                    {dados.comissoes > 0 ? ` + com. ${formatBRL(dados.comissoes)}` : ''}
                    {dados.gorjetas > 0 ? ` + gorj. ${formatBRL(dados.gorjetas)}` : ''}
                  </p>
                </div>
                <div>
                  <p className="campo-label">Aviso Prévio</p>
                  <p className="font-mono text-xs">
                    {dados.avisoPrevioTrabalhado ? 'Trabalhado' : 'Indenizado'}
                    {resultadoAtivo.temporal
                      ? ` — ${resultadoAtivo.temporal.diasAvisoPrevio} dias`
                      : ''}
                  </p>
                </div>
                {resultadoAtivo.temporal?.dataEncerramentoComAviso && (
                  <div>
                    <p className="campo-label">Término c/ aviso</p>
                    <p className="font-mono text-xs">
                      {new Date(
                        resultadoAtivo.temporal.dataEncerramentoComAviso
                      ).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                {resultadoAtivo.temporal?.marcoPrescricional && (
                  <div>
                    <p className="campo-label">Marco Prescricional</p>
                    <p className="font-mono text-xs">
                      {new Date(resultadoAtivo.temporal.marcoPrescricional).toLocaleDateString(
                        'pt-BR'
                      )}
                    </p>
                  </div>
                )}
                {resultadoAtivo.temporal && (
                  <div>
                    <p className="campo-label">Lapso s/ aviso</p>
                    <p className="font-mono text-xs">
                      {resultadoAtivo.temporal.lapsoSemAviso?.meses} meses
                    </p>
                  </div>
                )}
                {resultadoAtivo.temporal && (
                  <div>
                    <p className="campo-label">Lapso c/ aviso</p>
                    <p className="font-mono text-xs">
                      {resultadoAtivo.temporal.lapsoComAviso?.meses} meses
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Encargos Previdenciários e Fiscais — por aba */}
            {resultadoAtivo.encargosEmpregado &&
              resultadoAtivo.encargosEmpregado.baseInss > 0 && (
                <EncargosPrevidenciarios
                  encargos={resultadoAtivo.encargosEmpregado}
                  verbas={compAtivo.verbasExibidas}
                />
              )}

            {/* Memória de cálculo */}
            <div className="px-2 py-2 border-b border-gray-100 mb-2">
              <h5 className="font-titulo text-base text-primaria">
                Memória de Cálculo — {MODALIDADES[abaAtiva]}
              </h5>
              <p className="text-xs text-gray-400 mt-0.5">
                Desmarque INCL. para excluir parcela. Use "Editar valores" para ajustar manualmente.
                Clique na verba para ver a fórmula.
              </p>
            </div>
            <MemoriaCalculo
              verbas={compAtivo.verbasExibidas}
              subtotal={compAtivo.subtotal}
              deducoes={resultadoAtivo.deducoes}
              total={compAtivo.total}
              honorarios={compAtivo.honorarios}
              honorariosPericiais={resultadoAtivo.honorariosPericiais || 0}
              custas={compAtivo.custas}
              totalComHonorarios={compAtivo.totalComHonorarios}
              onToggle={toggleVerbaExcluida}
              onSalvarEdicao={(edits) => setVerbasEditadas(edits)}
              apenasComValor
            />

            {/* Total sem juros */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-800 text-white rounded-lg mt-4">
              <span className="font-semibold text-sm">
                Total devido pelo Reclamado (sem juros)
              </span>
              <span className="font-mono font-bold">{formatBRL(compAtivo.totalComHonorarios)}</span>
            </div>

            {/* Juros ADC 58 STF */}
            {resultadoAtivo.juros && resultadoAtivo.juros.valor > 0 && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-900 mb-1">
                  Juros e Correção (ADC 58 STF / Lei 14.905/2024)
                  {resultadoAtivo.juros.estimado && (
                    <span className="ml-2 text-xs font-normal text-amber-600">(estimado)</span>
                  )}
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  Apurado até:{' '}
                  {resultadoAtivo.juros.dataApuracao
                    ? new Date(
                        resultadoAtivo.juros.dataApuracao + 'T12:00:00'
                      ).toLocaleDateString('pt-BR')
                    : resultadoAtivo.juros.memoria?.dataApuracao || '—'}.
                </p>
                {resultadoAtivo.juros.fases?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {resultadoAtivo.juros.fases.map((f, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs bg-white/60 rounded px-2 py-1"
                      >
                        <span className="text-gray-600 truncate pr-2">{f.descricao}</span>
                        <span className="font-mono font-semibold text-blue-800 shrink-0">
                          {f.percentual >= 0 ? '+' : ''}
                          {f.percentual?.toFixed(4)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="campo-label">Taxa Total</p>
                    <p className="font-mono">{resultadoAtivo.juros.percentual?.toFixed(4)}%</p>
                  </div>
                  <div>
                    <p className="campo-label">Valor dos Juros</p>
                    <p className="font-mono font-bold text-blue-800">
                      {formatBRL(resultadoAtivo.juros.valor)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-blue-900 text-white rounded px-4 py-2">
                  <span className="font-bold text-sm">Total devido pelo Reclamado com Juros</span>
                  <span className="font-mono font-bold">
                    {formatBRL(
                      (compAtivo.totalComHonorarios || 0) + (resultadoAtivo.juros.valor || 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão e simulador de acordo — OJ 376 SDI-1 TST */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setMostrarAcordo((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg border-2 font-semibold transition-colors ${
            mostrarAcordo
              ? 'bg-indigo-700 border-indigo-700 text-white'
              : 'bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          {mostrarAcordo
            ? '▲ Ocultar Simulação de Acordo'
            : '⚖ Simular Acordo (OJ 376 SDI-1 TST)'}
        </button>
      </div>

      {mostrarAcordo && resultadoAtivo && (
        <AcordoSimulador
          percentualSalarial={resultadoAtivo.percentualSalarial || 0}
          verbas={compAtivo.verbasExibidas}
          lapsoMeses={
            resultadoAtivo.temporal?.lapsoComAviso?.meses ||
            resultadoAtivo.temporal?.lapsoSemAviso?.meses ||
            1
          }
        />
      )}

      {/* Avisos legais */}
      <div className="space-y-2 mb-4">
        {AVISOS.map((a, i) => (
          <div key={i} className="aviso-judicial">
            {a}
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button className="btn-secundario" onClick={() => setStep(8)}>
          ← Editar Multas/Despesas
        </button>
        <button className="btn-secundario" onClick={() => setStep(1)}>
          Nova Simulação
        </button>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import MemoriaCalculo from '../../components/MemoriaCalculo/index.jsx';
import ExportBar from '../../components/ExportBar/index.jsx';
import AcordoSimulador from '../../components/AcordoSimulador/index.jsx';
import EncargosPrevidenciarios from '../../components/EncargosPrevidenciarios/index.jsx';
import { useSalvarSimulacao } from '../../hooks/useCalculo.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function LinhaResumo({ label, valor, cor = 'normal', sublabel }) {
  const corMap = {
    normal: 'text-gray-700',
    verde: 'text-green-700 font-semibold',
    vermelho: 'text-red-700',
    azul: 'text-blue-700 font-semibold',
    negativo: 'text-amber-700',
  };
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-gray-100 gap-2">
      <div>
        <span className={`text-sm ${corMap[cor]}`}>{label}</span>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
      <span className={`font-mono text-sm font-semibold shrink-0 ${corMap[cor]}`}>
        {formatBRL(valor)}
      </span>
    </div>
  );
}

const AVISOS = [
  { id: 'prescricao', texto: 'Atenção: verifique o marco prescricional (5 anos antes do ajuizamento — EC 45/2004 e Súmula 308 TST).' },
  { id: 'insalubridade', texto: 'Base de cálculo do adicional de insalubridade: salário mínimo (Súmula 228 STF/TST). Verifique CCT.' },
  { id: 'fgts', texto: 'Valores de FGTS calculados com base nos dados informados. Para valor exato, utilize extrato FGTS/CAIXA.' },
  { id: 'aviso', texto: 'Este sistema é uma ferramenta de SIMULAÇÃO. Os valores não substituem a liquidação judicial oficial.' },
];

const MODALIDADE_LABELS = {
  sem_justa_causa: 'Dispensa sem Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  culpa_reciproca: 'Culpa Recíproca',
  rescisao_indireta: 'Rescisão Indireta (art. 483 CLT)',
  justa_causa: 'Dispensa por Justa Causa',
};

export default function Resultado() {
  const { resultado, dados, setStep, toggleVerbaExcluida, setVerbasEditadas, resetar } = useCalculoStore();
  const { mutateAsync: salvar } = useSalvarSimulacao();
  const [salvoId, setSalvoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarAcordo, setMostrarAcordo] = useState(false);
  const [mostrarDadosContrato, setMostrarDadosContrato] = useState(false);

  // Aplica overrides de verbasExcluidas e verbasEditadas sobre as verbas do resultado
  const verbasExibidas = useMemo(
    () =>
      (resultado?.verbas || []).map((v) => {
        const edit = dados.verbasEditadas?.[v.codigo];
        return {
          ...v,
          excluida: dados.verbasExcluidas?.includes(v.codigo) ? true : v.excluida,
          valor: edit?.valor !== undefined ? Number(edit.valor) : v.valor,
          nome: edit?.nome !== undefined ? edit.nome : v.nome,
        };
      }),
    [resultado?.verbas, dados.verbasExcluidas, dados.verbasEditadas]
  );

  // Recomputa totais a partir das verbas derivadas
  const subtotalComputado = useMemo(
    () => verbasExibidas.filter((v) => !v.excluida).reduce((acc, v) => acc + v.valor, 0),
    [verbasExibidas]
  );
  const totalComputado = useMemo(() => {
    const deducoes = resultado?.deducoes?.total || 0;
    return Math.max(0, subtotalComputado - deducoes);
  }, [subtotalComputado, resultado?.deducoes?.total]);

  const pctHonorarios = dados.percentualHonorarios ?? 0.15;
  const honorariosComputado = useMemo(
    () => Math.round(totalComputado * pctHonorarios * 100) / 100,
    [totalComputado, pctHonorarios]
  );
  const honorariosPericiaisComputado = resultado?.honorariosPericiais || 0;
  const custasComputadas = useMemo(
    () => (dados.aplicarCustas ? Math.round(totalComputado * 0.02 * 100) / 100 : 0),
    [totalComputado, dados.aplicarCustas]
  );
  const totalComHonorariosComputado = useMemo(
    () => Math.round((totalComputado + honorariosComputado) * 100) / 100,
    [totalComputado, honorariosComputado]
  );
  const despesasProcessuais = useMemo(
    () => Math.round((honorariosPericiaisComputado + custasComputadas) * 100) / 100,
    [honorariosPericiaisComputado, custasComputadas]
  );

  const jurosValor = resultado?.juros?.valor || 0;
  const encargos = resultado?.encargosEmpregado;

  // FGTS total (verbas com código 'fgts' ou 'multa_fgts' e reflexos)
  const fgtsTotal = useMemo(
    () => verbasExibidas
      .filter((v) => !v.excluida && /fgts/i.test(v.codigo))
      .reduce((acc, v) => acc + v.valor, 0),
    [verbasExibidas]
  );

  const totalGeralDevido = useMemo(() => {
    const patronal = encargos?.inssEmpregador || 0;
    return Math.round((totalComHonorariosComputado + despesasProcessuais + jurosValor + patronal) * 100) / 100;
  }, [totalComHonorariosComputado, despesasProcessuais, jurosValor, encargos]);

  if (!resultado) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Nenhum resultado disponível. Volte e calcule.</p>
        <button className="btn-primario mt-4" onClick={() => setStep(8)}>← Voltar</button>
      </div>
    );
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      const resp = await salvar({
        nome: dados.nomeSimulacao || `Simulação ${new Date().toLocaleDateString('pt-BR')}`,
        modalidade: dados.modalidade,
        dados,
        resultado,
        numeroProcesso: dados.numeroProcesso,
        varaNome: dados.varaNome,
        observacoes: dados.observacoes,
      });
      setSalvoId(resp.id);
      return resp.id;
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
      return null;
    } finally {
      setSalvando(false);
    }
  }

  const t = resultado.temporal;

  // Prescrição quinquenal: aplica quando o marco (ajuizamento − 5 anos) é posterior à admissão
  const marcoPrescricional = t?.marcoPrescricional ? new Date(t.marcoPrescricional + 'T12:00:00') : null;
  const dataAdmissaoDate = dados.dataAdmissao ? new Date(dados.dataAdmissao + 'T12:00:00') : null;
  const temPrescricao = marcoPrescricional && dataAdmissaoDate && marcoPrescricional > dataAdmissaoDate;
  const dataInicioCalculo = temPrescricao ? marcoPrescricional : dataAdmissaoDate;
  const fmtDate = (d) => d ? d.toLocaleDateString('pt-BR') : '—';

  return (
    <div className="max-w-5xl space-y-4">

      {/* ── 1. HEADER ── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="font-titulo text-xl text-primaria">
              {dados.nomeSimulacao || 'Resultado do Cálculo'}
            </h3>
            {dados.numeroProcesso && (
              <p className="text-sm text-gray-500 mt-1">Processo: {dados.numeroProcesso}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {MODALIDADE_LABELS[dados.modalidade] || dados.modalidade} —{' '}
              calculado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Início do cálculo:{' '}
              <span className="font-mono font-semibold">{fmtDate(dataInicioCalculo)}</span>
              {temPrescricao && (
                <span className="ml-2 text-amber-700">(marco prescricional)</span>
              )}
            </p>
          </div>
          <ExportBar salvoId={salvoId} onSalvar={handleSalvar} />
        </div>

        {/* Aviso de prescrição quinquenal */}
        {temPrescricao && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
            <span className="text-amber-500 text-base mt-0.5">⚠</span>
            <div className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Prescrição quinquenal aplicada</span> — o contrato de trabalho teve início em{' '}
              <span className="font-mono font-semibold">{fmtDate(dataAdmissaoDate)}</span>, mas somente os últimos 5 anos
              anteriores ao ajuizamento (
              <span className="font-mono font-semibold">
                {dados.dataAjuizamento ? new Date(dados.dataAjuizamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
              </span>
              ) são exigíveis. O cálculo apura verbas a partir de{' '}
              <span className="font-mono font-semibold">{fmtDate(marcoPrescricional)}</span>{' '}
              (art. 7º, XXIX CF — EC 45/2004 — Súmula 308 TST).
            </div>
          </div>
        )}
      </div>

      {/* ── 2. DADOS DO CONTRATO + PRAZOS (colapsável) ── */}
      <div className="card">
        <button
          type="button"
          onClick={() => setMostrarDadosContrato(v => !v)}
          className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-titulo text-base text-primaria">Dados do Contrato e Prazos</span>
          <span className="text-gray-400 text-xs">{mostrarDadosContrato ? '▲ ocultar' : '▼ expandir'}</span>
        </button>
        {mostrarDadosContrato && (
          <div className="px-6 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
              <div><p className="campo-label">Admissão</p>
                <p className="font-mono">{fmtDate(dataAdmissaoDate)}</p></div>
              <div><p className="campo-label">Dispensa</p>
                <p className="font-mono">{dados.dataDispensa ? new Date(dados.dataDispensa + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
              <div><p className="campo-label">Ajuizamento</p>
                <p className="font-mono">{dados.dataAjuizamento ? new Date(dados.dataAjuizamento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
              <div><p className="campo-label">Último Salário</p>
                <p className="font-mono font-semibold">{formatBRL(dados.ultimoSalario)}</p></div>
              <div className={temPrescricao ? 'col-span-2 bg-amber-50 rounded p-2 border border-amber-200' : ''}>
                <p className="campo-label">Início do cálculo</p>
                <p className="font-mono font-semibold">{fmtDate(dataInicioCalculo)}</p>
                {temPrescricao && <p className="text-xs text-amber-700 mt-0.5">Marco prescricional (5 anos antes do ajuizamento)</p>}
              </div>
              {t && <>
                <div><p className="campo-label">Aviso Prévio</p>
                  <p className="font-mono">{dados.avisoPrevioTrabalhado ? 'Trabalhado' : 'Indenizado'} — {t?.diasAvisoPrevio ?? '—'} dias</p></div>
                <div><p className="campo-label">Lapso c/ aviso</p>
                  <p className="font-mono">{t.lapsoComAviso?.meses} meses</p></div>
                <div><p className="campo-label">Lapso s/ aviso</p>
                  <p className="font-mono">{t.lapsoSemAviso?.meses} meses</p></div>
                <div><p className="campo-label">Término c/ aviso</p>
                  <p className="font-mono">{t.dataEncerramentoComAviso ? new Date(t.dataEncerramentoComAviso).toLocaleDateString('pt-BR') : '—'}</p></div>
              </>}
              {(dados.comissoes > 0 || dados.gorjetas > 0) && (
                <div className="col-span-2 sm:col-span-4"><p className="campo-label">Composição Salarial</p>
                  <p className="font-mono text-xs">
                    Salário: {formatBRL(dados.ultimoSalario)}
                    {dados.comissoes > 0 && ` + Comissões: ${formatBRL(dados.comissoes)}`}
                    {dados.gorjetas > 0 && ` + Gorjetas: ${formatBRL(dados.gorjetas)}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. VERBAS TRABALHISTAS ── */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-titulo text-lg text-primaria">Verbas Trabalhistas</h4>
          <p className="text-xs text-gray-400 mt-1">
            Clique em uma verba para ver a fórmula detalhada. Desmarque INCL. para excluir. Use "Editar valores" para ajustar manualmente.
          </p>
        </div>
        <MemoriaCalculo
          verbas={verbasExibidas}
          subtotal={subtotalComputado}
          deducoes={resultado.deducoes}
          total={totalComputado}
          honorarios={honorariosComputado}
          honorariosPericiais={0}
          custas={0}
          totalComHonorarios={totalComHonorariosComputado}
          onToggle={toggleVerbaExcluida}
          onSalvarEdicao={(edits) => setVerbasEditadas(edits)}
        />
      </div>

      {/* Linha de total verbas + honorários */}
      <div className="flex justify-between items-center px-6 py-4 bg-gray-800 text-white rounded-lg">
        <span className="font-bold text-base">Subtotal Verbas + Honorários Advocatícios</span>
        <span className="font-mono font-bold text-lg">{formatBRL(totalComHonorariosComputado)}</span>
      </div>

      {/* ── 4. DESPESAS PROCESSUAIS ── */}
      {(custasComputadas > 0 || honorariosPericiaisComputado > 0) && (
        <div className="card p-6">
          <h4 className="font-titulo text-lg mb-3 text-primaria">Despesas Processuais</h4>
          <div className="space-y-1">
            {custasComputadas > 0 && (
              <LinhaResumo label="Custas Processuais (2% sobre o total líquido)" valor={custasComputadas} />
            )}
            {honorariosPericiaisComputado > 0 && (
              <LinhaResumo label="Honorários Periciais" valor={honorariosPericiaisComputado} />
            )}
            {despesasProcessuais > 0 && (
              <div className="flex justify-between items-center py-2 bg-gray-100 rounded px-3 mt-2">
                <span className="font-semibold text-sm text-gray-800">Total Despesas Processuais</span>
                <span className="font-mono font-bold text-gray-800">{formatBRL(despesasProcessuais)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. ENCARGOS PREVIDENCIÁRIOS E FISCAIS ── */}
      {encargos && encargos.baseInss > 0 && (
        <EncargosPrevidenciarios encargos={encargos} verbas={verbasExibidas} />
      )}

      {/* ── 6. JUROS E CORREÇÃO MONETÁRIA ── */}
      {resultado.juros && resultado.juros.valor > 0 && (
        <div className="card p-6">
          <h4 className="font-titulo text-lg mb-1 text-primaria">
            Juros e Correção Monetária (ADC 58 STF / Lei 14.905/2024)
            {resultado.juros.estimado && (
              <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">estimado</span>
            )}
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Apurado até:{' '}
            {resultado.juros.dataApuracao
              ? new Date(resultado.juros.dataApuracao + 'T12:00:00').toLocaleDateString('pt-BR')
              : resultado.juros.memoria?.dataApuracao || '—'}.
            {resultado.juros.memoria?.dataEncerramento && ` Início: ${resultado.juros.memoria.dataEncerramento}.`}
          </p>

          {resultado.juros.fases?.length > 0 && (
            <div className="space-y-2 mb-4">
              {resultado.juros.fases.map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-4 py-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-gray-700 text-xs leading-snug">{f.descricao}</p>
                      <p className="text-xs text-gray-400">{f.periodo}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-blue-700 text-sm">
                        {f.percentual >= 0 ? '+' : ''}{f.percentual?.toFixed(4)}%
                      </p>
                      {f.estimado && <span className="text-xs text-amber-600">estimado</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
            <div><p className="campo-label">Base de Cálculo</p>
              <p className="font-mono">{formatBRL(totalComHonorariosComputado)}</p>
            </div>
            <div><p className="campo-label">Taxa Total Acumulada</p>
              <p className="font-mono">{resultado.juros.percentual?.toFixed(4)}%</p>
            </div>
            <div><p className="campo-label">Valor dos Juros/Correção</p>
              <p className="font-mono font-bold text-blue-700">{formatBRL(resultado.juros.valor)}</p>
            </div>
          </div>
          {resultado.juros.estimado && (
            <p className="text-xs text-amber-600 mt-1">{resultado.juros.memoria?.aviso}</p>
          )}
        </div>
      )}

      {/* ── 7. RESUMO GERAL DO CÁLCULO ── */}
      <div className="card p-6 border-2 border-gray-800">
        <h4 className="font-titulo text-lg mb-4 text-primaria">Resumo Geral do Cálculo</h4>

        {/* Bloco do reclamante */}
        <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-2">Crédito do Reclamante</p>
        <div className="space-y-0.5 mb-4">
          <LinhaResumo label="Total Líquido das Verbas Trabalhistas" valor={totalComputado} />
          <LinhaResumo label={`(+) Honorários Advocatícios (${((pctHonorarios) * 100).toFixed(0)}%)`} valor={honorariosComputado} />
          {encargos?.inssEmpregado > 0 && (
            <LinhaResumo
              label="(−) INSS a deduzir do crédito do autor"
              valor={-encargos.inssEmpregado}
              cor="negativo"
              sublabel="Tabela progressiva 2025 — a reter na fonte"
            />
          )}
          {encargos?.irRetido?.valor > 0 && (
            <LinhaResumo
              label="(−) IR Estimado a deduzir do crédito do autor"
              valor={-encargos.irRetido.valor}
              cor="negativo"
              sublabel="RRA — art. 12-A Lei 7.713/88"
            />
          )}
          {fgtsTotal > 0 && (
            <LinhaResumo
              label="FGTS + Multa Rescisória (a recolher à CAIXA)"
              valor={fgtsTotal}
              sublabel="Valor devido ao FGTS — não integra o crédito do reclamante"
            />
          )}
        </div>

        {/* Bloco total pelo reclamado */}
        <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide mb-2 border-t pt-3">Total Devido pelo Reclamado</p>
        <div className="space-y-0.5 mb-4">
          <LinhaResumo label="Subtotal Verbas + Honorários Advocatícios" valor={totalComHonorariosComputado} />
          {encargos?.inssEmpregador > 0 && (
            <LinhaResumo
              label="(+) INSS Patronal (20% sobre parcelas salariais)"
              valor={encargos.inssEmpregador}
              sublabel="Art. 22 Lei 8.212/91 — custo do empregador"
            />
          )}
          {despesasProcessuais > 0 && (
            <LinhaResumo label="(+) Despesas Processuais (custas + periciais)" valor={despesasProcessuais} />
          )}
          {jurosValor > 0 && (
            <LinhaResumo
              label="(+) Juros e Correção Monetária (ADC 58 STF)"
              valor={jurosValor}
              cor="azul"
            />
          )}
        </div>

        <div className="flex justify-between items-center py-3 bg-gray-900 text-white rounded-lg px-4">
          <span className="font-bold text-base tracking-wide">TOTAL GERAL DEVIDO PELO RECLAMADO</span>
          <div className="text-right">
            <p className="font-mono font-bold text-xl">{formatBRL(totalGeralDevido)}</p>
            {jurosValor > 0 && (
              <p className="text-xs text-blue-300 mt-0.5">incl. juros/correção: {formatBRL(jurosValor)}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 8. SIMULAÇÃO DE ACORDO ── */}
      <div>
        <button
          type="button"
          onClick={() => setMostrarAcordo((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg border-2 font-semibold transition-colors ${
            mostrarAcordo
              ? 'bg-indigo-700 border-indigo-700 text-white'
              : 'bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          {mostrarAcordo ? '▲ Ocultar Simulação de Acordo' : '⚖ Simular Acordo (OJ 376 SDI-1 TST)'}
        </button>
      </div>

      {mostrarAcordo && (
        <AcordoSimulador
          percentualSalarial={resultado.percentualSalarial || 0}
          verbas={verbasExibidas}
          lapsoMeses={
            resultado.temporal?.lapsoComAviso?.meses ||
            resultado.temporal?.lapsoSemAviso?.meses || 1
          }
        />
      )}

      {/* ── 9. ERROS DE PARCELAS (ex: histórico do reclamante ausente) ── */}
      {resultado.errosParcelas?.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="font-semibold text-sm text-red-700">⚠ Parcelas não calculadas por erro de configuração</p>
          {resultado.errosParcelas.map((e, i) => (
            <div key={i} className="text-xs text-red-700 bg-white border border-red-100 rounded px-3 py-2">
              <span className="font-medium">{e.parcelaNome}:</span>{' '}{e.erro}
            </div>
          ))}
        </div>
      )}

      {/* ── 10. AVISOS LEGAIS ── */}
      <div className="space-y-2">
        {AVISOS.map((a) => (
          <div key={a.id} className="aviso-judicial">{a.texto}</div>
        ))}
      </div>

      <div className="flex justify-between pb-4">
        <button className="btn-secundario" onClick={() => setStep(8)}>← Editar Multas/Despesas</button>
        <button className="btn-secundario" onClick={resetar}>Nova Simulação</button>
      </div>
    </div>
  );
}

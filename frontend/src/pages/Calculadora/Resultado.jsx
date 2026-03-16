import React, { useState, useMemo } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import MemoriaCalculo from '../../components/MemoriaCalculo/index.jsx';
import ExportBar from '../../components/ExportBar/index.jsx';
import AcordoSimulador from '../../components/AcordoSimulador/index.jsx';
import { useSalvarSimulacao } from '../../hooks/useCalculo.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function CardInfo({ label, valor, cor }) {
  const cores = {
    azul: 'bg-blue-50 border-blue-200 text-blue-900',
    verde: 'bg-green-50 border-green-200 text-green-900',
    escuro: 'bg-blue-900 border-blue-900 text-white',
    laranja: 'bg-amber-50 border-amber-200 text-amber-900',
    rosa: 'bg-pink-50 border-pink-200 text-pink-900',
  };
  const cls = cores[cor] || 'bg-gray-50 border-gray-200 text-gray-800';
  return (
    <div className={`card p-4 border ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-mono text-lg font-bold mt-1">{formatBRL(valor)}</p>
    </div>
  );
}

const AVISOS = [
  { id: 'prescricao', texto: 'Atenção: verifique o marco prescricional (5 anos antes do ajuizamento — EC 45/2004 e Súmula 308 TST).' },
  { id: 'insalubridade', texto: 'Base de cálculo do adicional de insalubridade: salário mínimo (Súmula 228 STF/TST). Verifique CCT.' },
  { id: 'fgts', texto: 'Valores de FGTS calculados com base nos dados informados. Para valor exato, utilize extrato FGTS/CAIXA.' },
  { id: 'aviso', texto: 'Este sistema é uma ferramenta de SIMULAÇÃO. Os valores não substituem a liquidação judicial oficial.' },
];

// ─── Encargos Previdenciários e Fiscais ────────────────────────────────────
function EncargosPrevidenciarios({ encargos, verbas }) {
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

  // Previdência Privada
  const [prevPrivAtiva, setPrevPrivAtiva] = useState(false);
  const [aliquotaPrevPrivEmpregado, setAliquotaPrevPrivEmpregado] = useState('');
  const [aliquotaPrevPrivEmpregador, setAliquotaPrevPrivEmpregador] = useState('');
  const [verbasSelPrevPriv, setVerbasSelPrevPriv] = useState({});

  const toggleVerbaPrevPriv = (codigo) =>
    setVerbasSelPrevPriv(prev => ({ ...prev, [codigo]: !prev[codigo] }));

  const basePrevPriv = useMemo(() =>
    (verbas || []).filter(v => !v.excluida && verbasSelPrevPriv[v.codigo]).reduce((acc, v) => acc + v.valor, 0),
    [verbas, verbasSelPrevPriv]
  );
  const aliqEmpregadoNum = parseFloat(String(aliquotaPrevPrivEmpregado).replace(',', '.')) / 100 || 0;
  const aliqEmpregadorNum = parseFloat(String(aliquotaPrevPrivEmpregador).replace(',', '.')) / 100 || 0;
  const prevPrivEmpregado = Math.round(basePrevPriv * aliqEmpregadoNum * 100) / 100;
  const prevPrivEmpregador = Math.round(basePrevPriv * aliqEmpregadorNum * 100) / 100;

  const verbasComValor = (verbas || []).filter(v => !v.excluida && v.valor > 0);

  return (
    <div className="card p-6 mb-4">
      <h4 className="font-titulo text-lg mb-1 text-primaria">
        Encargos Previdenciários e Fiscais
        <span className="ml-2 text-xs font-normal text-gray-400">(informativo — não deduzido automaticamente)</span>
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

      {/* INSS empregado + empregador */}
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
          <p className="font-mono text-red-900 font-bold">{fmt((encargos.inssEmpregado || 0) + (encargos.inssEmpregador || 0))}</p>
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
            onClick={() => setPrevPrivAtiva(v => !v)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${prevPrivAtiva ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${prevPrivAtiva ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm font-semibold text-gray-700">Previdência Privada</span>
          {prevPrivAtiva && <span className="text-xs text-gray-400">(empregado + empregador)</span>}
        </div>

        {prevPrivAtiva && (
          <div className="space-y-4">
            {/* Alíquotas */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="campo-label">Alíquota Empregado (%)</label>
                <input
                  type="number"
                  min="0" max="100" step="0.01"
                  value={aliquotaPrevPrivEmpregado}
                  onChange={e => setAliquotaPrevPrivEmpregado(e.target.value)}
                  className="campo-input w-28 text-right font-mono"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="campo-label">Alíquota Empregador (%)</label>
                <input
                  type="number"
                  min="0" max="100" step="0.01"
                  value={aliquotaPrevPrivEmpregador}
                  onChange={e => setAliquotaPrevPrivEmpregador(e.target.value)}
                  className="campo-input w-28 text-right font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Seleção de verbas */}
            <div>
              <p className="campo-label mb-1">Verbas que compõem a base de incidência</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-100 rounded p-2 bg-gray-50">
                {verbasComValor.map(v => (
                  <label key={v.codigo} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white rounded px-1 py-0.5">
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

            {/* Resultado */}
            {basePrevPriv > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div>
                  <p className="campo-label">Base de Cálculo</p>
                  <p className="font-mono font-semibold">{fmt(basePrevPriv)}</p>
                </div>
                <div>
                  <p className="campo-label">Contribuição Empregado ({aliquotaPrevPrivEmpregado || 0}%)</p>
                  <p className="font-mono font-semibold text-indigo-700">{fmt(prevPrivEmpregado)}</p>
                </div>
                <div>
                  <p className="campo-label">Contribuição Empregador ({aliquotaPrevPrivEmpregador || 0}%)</p>
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

export default function Resultado() {
  const { resultado, dados, setStep, toggleVerbaExcluida } = useCalculoStore();
  const { mutateAsync: salvar } = useSalvarSimulacao();
  const [salvoId, setSalvoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mostrarAcordo, setMostrarAcordo] = useState(false);

  // Aplica overrides de verbasExcluidas do store sobre as verbas do resultado
  const verbasExibidas = useMemo(() =>
    (resultado?.verbas || []).map(v => ({
      ...v,
      excluida: dados.verbasExcluidas?.includes(v.codigo) ? true : v.excluida,
    })),
    [resultado?.verbas, dados.verbasExcluidas]
  );

  // Recomputa totais a partir das verbas derivadas (reflete toggles imediatamente)
  const subtotalComputado = useMemo(() =>
    verbasExibidas.filter(v => !v.excluida).reduce((acc, v) => acc + v.valor, 0),
    [verbasExibidas]
  );
  const totalComputado = useMemo(() => {
    const deducoes = resultado?.deducoes?.total || 0;
    return Math.max(0, subtotalComputado - deducoes);
  }, [subtotalComputado, resultado?.deducoes?.total]);
  const pctHonorarios = dados.percentualHonorarios ?? 0.15;
  const honorariosComputado = useMemo(() => Math.round(totalComputado * pctHonorarios * 100) / 100, [totalComputado, pctHonorarios]);
  const honorariosPericiaisComputado = resultado?.honorariosPericiais || 0;
  const custasComputadas = useMemo(() =>
    dados.aplicarCustas ? Math.round(totalComputado * 0.02 * 100) / 100 : 0,
    [totalComputado, dados.aplicarCustas]
  );
  const totalComHonorariosComputado = useMemo(() =>
    Math.round((totalComputado + honorariosComputado + honorariosPericiaisComputado + custasComputadas) * 100) / 100,
    [totalComputado, honorariosComputado, honorariosPericiaisComputado, custasComputadas]
  );

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

  const MODALIDADE_LABELS = {
    sem_justa_causa: 'Dispensa sem Justa Causa',
    pedido_demissao: 'Pedido de Demissão',
    culpa_reciproca: 'Culpa Recíproca',
    rescisao_indireta: 'Rescisão Indireta (art. 483 CLT)',
    justa_causa: 'Dispensa por Justa Causa',
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="card p-6 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="font-titulo text-xl text-primaria">
              {dados.nomeSimulacao || 'Resultado do Cálculo'}
            </h3>
            {dados.numeroProcesso && (
              <p className="text-sm text-gray-500 mt-1">Processo: {dados.numeroProcesso}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              Calculado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <ExportBar salvoId={salvoId} onSalvar={handleSalvar} />
        </div>
      </div>

      {/* Resumo temporal */}
      {t && (
        <div className="card p-6 mb-4">
          <h4 className="font-titulo text-lg mb-3 text-primaria">Apuração dos Prazos</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="campo-label">Admissão</p>
              <p className="font-mono">{t.dataAdmissao ? new Date(t.dataAdmissao).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            <div><p className="campo-label">Dispensa</p>
              <p className="font-mono">{t.dataDispensa ? new Date(t.dataDispensa).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            <div><p className="campo-label">Marco Prescricional</p>
              <p className="font-mono">{t.marcoPrescricional ? new Date(t.marcoPrescricional).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
            <div><p className="campo-label">Aviso Prévio</p>
              <p className="font-mono">{t.diasAvisoPrevio} dias</p>
            </div>
            <div><p className="campo-label">Lapso c/ aviso</p>
              <p className="font-mono">{t.lapsoComAviso?.meses} meses</p>
            </div>
            <div><p className="campo-label">Lapso s/ aviso</p>
              <p className="font-mono">{t.lapsoSemAviso?.meses} meses</p>
            </div>
            <div><p className="campo-label">Dias úteis (6d)</p>
              <p className="font-mono">{t.diasUteis6d}</p>
            </div>
            <div><p className="campo-label">Dias úteis (5d)</p>
              <p className="font-mono">{t.diasUteis5d}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dados do Contrato */}
      <div className="card p-6 mb-4">
        <h4 className="font-titulo text-lg mb-3 text-primaria">Dados do Contrato</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="campo-label">Data de Admissão</p>
            <p className="font-mono">{dados.dataAdmissao ? new Date(dados.dataAdmissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
          </div>
          <div>
            <p className="campo-label">Data de Dispensa</p>
            <p className="font-mono">{dados.dataDispensa ? new Date(dados.dataDispensa + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
          </div>
          <div>
            <p className="campo-label">Modalidade</p>
            <p className="font-mono text-xs">{MODALIDADE_LABELS[dados.modalidade] || dados.modalidade}</p>
          </div>
          <div>
            <p className="campo-label">Aviso Prévio</p>
            <p className="font-mono">{dados.avisoPrevioTrabalhado ? 'Trabalhado' : 'Indenizado'}</p>
          </div>
          {t && (
            <div>
              <p className="campo-label">Término do Contrato</p>
              <p className="font-mono">{t.dataEncerramentoComAviso ? new Date(t.dataEncerramentoComAviso).toLocaleDateString('pt-BR') : '—'}</p>
            </div>
          )}
          <div>
            <p className="campo-label">Último Salário</p>
            <p className="font-mono font-semibold">{formatBRL(dados.ultimoSalario)}</p>
          </div>
          {(dados.comissoes > 0 || dados.gorjetas > 0) && (
            <div className="sm:col-span-2">
              <p className="campo-label">Composição Salarial</p>
              <p className="font-mono text-xs">
                Salário: {formatBRL(dados.ultimoSalario)}
                {dados.comissoes > 0 && ` + Comissões: ${formatBRL(dados.comissoes)}`}
                {dados.gorjetas > 0 && ` + Gorjetas: ${formatBRL(dados.gorjetas)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <CardInfo label="Subtotal Condenação" valor={subtotalComputado} cor="azul" />
        <CardInfo label="(-) Deduções" valor={resultado.deducoes?.total} cor="laranja" />
        <CardInfo label="Total Líquido" valor={totalComputado} cor="verde" />
        <CardInfo label="Total sem Juros" valor={totalComHonorariosComputado} cor="escuro" />
      </div>

      {/* Demonstrativo de honorários */}
      {(resultado.honorarios > 0 || resultado.honorariosPericiais > 0 || resultado.custas > 0) && (
        <div className="card p-6 mb-4">
          <h4 className="font-titulo text-lg mb-3 text-primaria">Demonstrativo de Honorários e Despesas</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Total Líquido (base)</span>
              <span className="font-mono font-semibold">{formatBRL(resultado.total)}</span>
            </div>
            {resultado.honorarios > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600">
                  Honorários Advocatícios ({((dados.percentualHonorarios || 0.15) * 100).toFixed(0)}%)
                </span>
                <span className="font-mono text-pink-700 font-semibold">+ {formatBRL(resultado.honorarios)}</span>
              </div>
            )}
            {resultado.honorariosPericiais > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600">Honorários Periciais</span>
                <span className="font-mono text-pink-700">+ {formatBRL(resultado.honorariosPericiais)}</span>
              </div>
            )}
            {resultado.custas > 0 && (
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-600">Custas Processuais (2%)</span>
                <span className="font-mono text-pink-700">+ {formatBRL(resultado.custas)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 bg-gray-800 text-white rounded px-3 mt-2">
              <span className="font-bold">Subtotal (sem juros)</span>
              <span className="font-mono font-bold text-lg">{formatBRL(resultado.totalComHonorarios)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Encargos Previdenciários e Fiscais (INSS + IR — informativo) */}
      {resultado.encargosEmpregado && resultado.encargosEmpregado.baseInss > 0 && (
        <EncargosPrevidenciarios encargos={resultado.encargosEmpregado} verbas={verbasExibidas} />
      )}

      {/* Memória de cálculo */}
      <div className="card mb-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-titulo text-lg text-primaria">Memória de Cálculo</h4>
          <p className="text-xs text-gray-400 mt-1">
            Clique em uma verba para ver a fórmula detalhada. Desmarque para excluir do cálculo.
          </p>
        </div>
        <MemoriaCalculo
          verbas={verbasExibidas}
          subtotal={subtotalComputado}
          deducoes={resultado.deducoes}
          total={totalComputado}
          honorarios={honorariosComputado}
          honorariosPericiais={honorariosPericiaisComputado}
          custas={custasComputadas}
          totalComHonorarios={totalComHonorariosComputado}
          onToggle={toggleVerbaExcluida}
        />
      </div>

      {/* Total sem juros — antes da apuração de juros */}
      <div className="flex justify-between items-center px-6 py-4 bg-gray-800 text-white rounded-lg mb-4">
        <span className="font-bold text-lg">Total devido pelo Reclamado (sem juros)</span>
        <span className="font-mono font-bold text-xl">{formatBRL(totalComHonorariosComputado)}</span>
      </div>

      {/* Juros ADC 58 STF — posicionados após memória de cálculo */}
      {resultado.juros && resultado.juros.valor > 0 && (
        <div className="card p-6 mb-4">
          <h4 className="font-titulo text-lg mb-1 text-primaria">
            Juros e Correção Monetária (ADC 58 STF / Lei 14.905/2024)
            {resultado.juros.estimado && (
              <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">estimado</span>
            )}
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Apurado até: {resultado.juros.dataApuracao
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
            <div>
              <p className="campo-label">Base de Cálculo</p>
              <p className="font-mono">{formatBRL(resultado.totalComHonorarios)}</p>
            </div>
            <div>
              <p className="campo-label">Taxa Total Acumulada</p>
              <p className="font-mono">{resultado.juros.percentual?.toFixed(4)}%</p>
            </div>
            <div>
              <p className="campo-label">Valor dos Juros/Correção</p>
              <p className="font-mono font-bold text-blue-700">{formatBRL(resultado.juros.valor)}</p>
            </div>
          </div>
          {resultado.juros.estimado && (
            <p className="text-xs text-amber-600 mt-1">{resultado.juros.memoria?.aviso}</p>
          )}
          <div className="mt-4 flex justify-between items-center bg-blue-900 text-white rounded-lg px-6 py-3">
            <span className="font-bold text-lg">Total devido pelo Reclamado com Juros</span>
            <span className="font-mono font-bold text-xl">{formatBRL((resultado.totalComHonorarios || 0) + (resultado.juros.valor || 0))}</span>
          </div>
        </div>
      )}

      {/* Botão e simulador de acordo — OJ 376 SDI-1 TST */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setMostrarAcordo(v => !v)}
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
          lapsoMeses={resultado.temporal?.lapsoComAviso?.meses || resultado.temporal?.lapsoSemAviso?.meses || 1}
        />
      )}

      {/* Avisos legais */}
      <div className="space-y-2 mb-4">
        {AVISOS.map((a) => (
          <div key={a.id} className="aviso-judicial">{a.texto}</div>
        ))}
      </div>

      <div className="flex justify-between">
        <button className="btn-secundario" onClick={() => setStep(8)}>← Editar Multas/Despesas</button>
        <button className="btn-secundario" onClick={() => setStep(1)}>Nova Simulação</button>
      </div>
    </div>
  );
}

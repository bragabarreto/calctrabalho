import React, { useState } from 'react';
import { useCalculoStore } from '../../store/calculoStore.js';
import MemoriaCalculo from '../../components/MemoriaCalculo/index.jsx';
import ExportBar from '../../components/ExportBar/index.jsx';
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

export default function Resultado() {
  const { resultado, dados, setStep, toggleVerbaExcluida } = useCalculoStore();
  const { mutateAsync: salvar } = useSalvarSimulacao();
  const [salvoId, setSalvoId] = useState(null);
  const [salvando, setSalvando] = useState(false);

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
        <CardInfo label="Subtotal Condenação" valor={resultado.subtotal} cor="azul" />
        <CardInfo label="(-) Deduções" valor={resultado.deducoes?.total} cor="laranja" />
        <CardInfo label="Total Líquido" valor={resultado.total} cor="verde" />
        <CardInfo label="Total sem Juros" valor={resultado.totalComHonorarios} cor="escuro" />
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

      {/* Encargos do Empregado (INSS + IR — informativo) */}
      {resultado.encargosEmpregado && resultado.encargosEmpregado.baseInss > 0 && (
        <div className="card p-6 mb-4">
          <h4 className="font-titulo text-lg mb-3 text-primaria">
            Encargos do Empregado (informativo)
            <span className="ml-2 text-xs font-normal text-gray-400">não deduzido automaticamente</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <p className="campo-label">Base INSS</p>
              <p className="font-mono">{formatBRL(resultado.encargosEmpregado.baseInss)}</p>
            </div>
            <div>
              <p className="campo-label">INSS Empregado</p>
              <p className="font-mono text-orange-700 font-semibold">{formatBRL(resultado.encargosEmpregado.inssEmpregado)}</p>
            </div>
            <div>
              <p className="campo-label">Base IR (RRA)</p>
              <p className="font-mono">{formatBRL(resultado.encargosEmpregado.baseTributavel)}</p>
            </div>
            <div>
              <p className="campo-label">IR Retido (est.)</p>
              <p className="font-mono text-orange-700 font-semibold">{formatBRL(resultado.encargosEmpregado.irRetido?.valor)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{resultado.encargosEmpregado.memoria?.aviso}</p>
        </div>
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
          verbas={resultado.verbas}
          subtotal={resultado.subtotal}
          deducoes={resultado.deducoes}
          total={resultado.total}
          honorarios={resultado.honorarios}
          honorariosPericiais={resultado.honorariosPericiais}
          custas={resultado.custas}
          totalComHonorarios={resultado.totalComHonorarios}
          onToggle={toggleVerbaExcluida}
        />
      </div>

      {/* Total sem juros — antes da apuração de juros */}
      <div className="flex justify-between items-center px-6 py-4 bg-gray-800 text-white rounded-lg mb-4">
        <span className="font-bold text-lg">Total devido pelo Reclamado (sem juros)</span>
        <span className="font-mono font-bold text-xl">{formatBRL(resultado.totalComHonorarios)}</span>
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

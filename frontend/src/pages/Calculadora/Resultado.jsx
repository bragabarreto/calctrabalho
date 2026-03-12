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
      alert('Simulação salva com sucesso!');
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  const t = resultado.temporal;

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

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <CardInfo label="Subtotal Condenação" valor={resultado.subtotal} cor="azul" />
        <CardInfo label="(-) Deduções" valor={resultado.deducoes?.total} cor="laranja" />
        <CardInfo label="Total Líquido" valor={resultado.total} cor="verde" />
        <CardInfo label="Total Devido pelo Reclamado" valor={resultado.totalComHonorarios} cor="escuro" />
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
            <div className="flex justify-between items-center py-2 bg-blue-900 text-white rounded px-3 mt-2">
              <span className="font-bold">Total Devido pelo Reclamado</span>
              <span className="font-mono font-bold text-lg">{formatBRL(resultado.totalComHonorarios)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Juros de mora SELIC */}
      {resultado.juros && resultado.juros.valor > 0 && (
        <div className="card p-6 mb-4">
          <h4 className="font-titulo text-lg mb-3 text-primaria">
            Juros de Mora (SELIC desde o Ajuizamento)
            {resultado.juros.estimado && (
              <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">estimado</span>
            )}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <p className="campo-label">Base de Cálculo</p>
              <p className="font-mono">{formatBRL(resultado.total)}</p>
            </div>
            <div>
              <p className="campo-label">Taxa Acumulada</p>
              <p className="font-mono">{resultado.juros.percentual?.toFixed(4)}%</p>
            </div>
            <div>
              <p className="campo-label">Dias Úteis</p>
              <p className="font-mono">{resultado.juros.diasUteis}</p>
            </div>
            <div>
              <p className="campo-label">Valor dos Juros</p>
              <p className="font-mono font-bold text-blue-700">{formatBRL(resultado.juros.valor)}</p>
            </div>
          </div>
          {resultado.juros.memoria?.periodoCalculado && (
            <p className="text-xs text-gray-400">Período: {resultado.juros.memoria.periodoCalculado}</p>
          )}
          {resultado.juros.estimado && (
            <p className="text-xs text-amber-600 mt-1">{resultado.juros.memoria?.aviso}</p>
          )}
          <div className="mt-3 flex justify-between items-center bg-blue-50 border border-blue-200 rounded px-4 py-2 text-sm">
            <span className="font-semibold text-blue-900">Total Líquido + Juros (referência)</span>
            <span className="font-mono font-bold text-blue-900">{formatBRL((resultado.total || 0) + (resultado.juros.valor || 0))}</span>
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

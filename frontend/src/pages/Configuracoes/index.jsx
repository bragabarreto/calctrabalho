import React, { useState, useEffect } from 'react';
import { Trash2, BookOpen, Plus, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useParcelas, useCriarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
import ParcelaEditor from '../../components/ParcelaEditor/index.jsx';

const TABS = [
  { id: 'legais', label: 'Parâmetros Legais' },
  { id: 'verbas', label: 'Parâmetros das Verbas' },
  { id: 'biblioteca', label: 'Biblioteca de Parcelas' },
];

// IPCA mensal 2024-2025 calculado do índice IBGE (variável 2266, base dez/1993=100)
const IPCA_MENSAL = [
  { mes: 'Fev/2024', valor: 0.83 }, { mes: 'Mar/2024', valor: 0.16 },
  { mes: 'Abr/2024', valor: 0.38 }, { mes: 'Mai/2024', valor: 0.46 },
  { mes: 'Jun/2024', valor: 0.21 }, { mes: 'Jul/2024', valor: 0.38 },
  { mes: 'Ago/2024', valor: -0.02 }, { mes: 'Set/2024', valor: 0.44 },
  { mes: 'Out/2024', valor: 0.56 }, { mes: 'Nov/2024', valor: 0.39 },
  { mes: 'Dez/2024', valor: 0.52 }, { mes: 'Jan/2025', valor: 0.16 },
  { mes: 'Fev/2025', valor: 1.31 }, { mes: 'Mar/2025', valor: 0.56 },
  { mes: 'Abr/2025', valor: 0.43 }, { mes: 'Mai/2025', valor: 0.26 },
  { mes: 'Jun/2025', valor: 0.24 }, { mes: 'Jul/2025', valor: 0.26 },
  { mes: 'Ago/2025', valor: -0.11 }, { mes: 'Set/2025', valor: 0.48 },
  { mes: 'Out/2025', valor: 0.09 }, { mes: 'Nov/2025', valor: 0.18 },
  { mes: 'Dez/2025', valor: 0.33 },
];

const IPCA_ANUAL = [
  { ano: 2021, valor: 10.06 }, { ano: 2022, valor: 5.79 },
  { ano: 2023, valor: 4.62 }, { ano: 2024, valor: 4.39 },
  { ano: 2025, valor: 4.27 },
];

const SALARIO_MINIMO = [
  { vigencia: 'Jan/2021', valor: 1100.00 },
  { vigencia: 'Jan/2022', valor: 1212.00 },
  { vigencia: 'Jan/2023', valor: 1302.00 },
  { vigencia: 'Mai/2023', valor: 1320.00 },
  { vigencia: 'Jan/2024', valor: 1412.00 },
  { vigencia: 'Jan/2025', valor: 1518.00 },
];

const VERBAS_PADRAO = [
  { nome: 'Saldo Salarial', natureza: 'salarial', fgts: true, inss: true, formula: 'Salário ÷ dias_mês × dias_trabalhados' },
  { nome: 'Aviso Prévio Indenizado', natureza: 'salarial', fgts: true, inss: true, formula: '30 + 3/ano (máx 90 dias) × salário/30' },
  { nome: 'Férias Vencidas + 1/3', natureza: 'salarial', fgts: true, inss: false, formula: 'Salário × períodos × 4/3' },
  { nome: 'Férias Proporcionais + 1/3', natureza: 'salarial', fgts: true, inss: false, formula: 'Salário × (avos/12) × 4/3' },
  { nome: '13º Salário Integral', natureza: 'salarial', fgts: true, inss: true, formula: 'Salário × 1 (integral por ano)' },
  { nome: '13º Salário Proporcional', natureza: 'salarial', fgts: true, inss: true, formula: 'Salário ÷ 12 × avos' },
  { nome: 'Horas Extras', natureza: 'salarial', fgts: true, inss: true, formula: 'Valor-hora × (1 + adicional%) × h/mês × meses' },
  { nome: 'Adicional Noturno', natureza: 'salarial', fgts: true, inss: true, formula: 'Valor-hora × adicional% × h/mês × meses' },
  { nome: 'Adicional de Insalubridade', natureza: 'salarial', fgts: true, inss: true, formula: 'Salário-mínimo × grau% (10%/20%/40%)' },
  { nome: 'Adicional de Periculosidade', natureza: 'salarial', fgts: true, inss: true, formula: 'Salário × 30%' },
  { nome: 'Intervalo Intrajornada', natureza: 'salarial', fgts: true, inss: true, formula: 'Valor-hora × horas_suprimidas × meses' },
  { nome: 'Dano Moral / Indenização', natureza: 'indenizatória', fgts: false, inss: false, formula: 'Valor fixo informado' },
  { nome: 'Multa FGTS (40%/20%)', natureza: 'indenizatória', fgts: false, inss: false, formula: 'FGTS-bruto × 40% (SJC/RI) ou 20% (CR)' },
  { nome: 'Multa Art. 467 CLT', natureza: 'indenizatória', fgts: false, inss: false, formula: '50% das verbas incontroversas selecionadas' },
  { nome: 'Multa Art. 477 CLT', natureza: 'indenizatória', fgts: false, inss: false, formula: '1 salário por atraso na rescisão' },
];

const FREQUENCIA_LABELS = {
  horaria: 'Horária', diaria_6d: 'Diária 6d', diaria_5d: 'Diária 5d',
  mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual', unica: 'Única',
};

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ---- ABA PARÂMETROS LEGAIS ----
function TabLegais() {
  const [selic, setSelic] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function buscarSelic() {
    setCarregando(true);
    try {
      const resp = await fetch('https://brasilapi.com.br/api/taxas/v1');
      const data = await resp.json();
      const s = data.find((t) => t.nome === 'SELIC' || t.nome === 'Selic');
      if (s) setSelic(s.valor);
    } catch {
      setSelic(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { buscarSelic(); }, []);

  return (
    <div className="space-y-5">
      {/* Salário Mínimo */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-3 text-primaria">Salário Mínimo (últimos 5 anos)</h3>
        <table className="tabela-memoria">
          <thead><tr><th>Vigência</th><th className="text-right">Valor</th></tr></thead>
          <tbody>
            {[...SALARIO_MINIMO].reverse().map((s) => (
              <tr key={s.vigencia}>
                <td>{s.vigencia}</td>
                <td className="text-right font-mono font-semibold">{formatBRL(s.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Fonte: MTE / Decreto Federal. Para 2026, aguardar publicação oficial.</p>
      </div>

      {/* SELIC */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-titulo text-lg text-primaria">Taxa SELIC (Banco Central)</h3>
          <button
            onClick={buscarSelic}
            disabled={carregando}
            className="btn-secundario flex items-center gap-1 text-sm py-1 px-3"
          >
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
        {selic != null ? (
          <div className="flex items-center gap-3">
            <div className="text-4xl font-mono font-bold text-primaria">{selic.toFixed(2)}%</div>
            <div className="text-sm text-gray-500">
              <p>a.a. — taxa vigente</p>
              <p className="text-xs">Definida pelo COPOM / BACEN</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">{carregando ? 'Buscando...' : 'Não foi possível obter a taxa atual.'}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">Fonte: BrasilAPI / Banco Central do Brasil. Utilizada para cálculo de juros de mora.</p>
      </div>

      {/* IPCA Mensal */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-1 text-primaria">IPCA — Variação Mensal (2024–2025)</h3>
        <p className="text-xs text-gray-400 mb-3">Fonte: IBGE — Índice Nacional de Preços ao Consumidor Amplo</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {IPCA_MENSAL.map((m) => (
            <div key={m.mes} className={`text-center p-2 rounded border ${m.valor < 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs text-gray-500 leading-tight">{m.mes}</p>
              <p className={`font-mono font-bold text-sm ${m.valor < 0 ? 'text-green-700' : m.valor > 0.5 ? 'text-red-600' : 'text-gray-700'}`}>
                {m.valor > 0 ? '+' : ''}{m.valor.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* IPCA Anual */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-3 text-primaria">IPCA — Variação Anual (últimos 5 anos)</h3>
        <table className="tabela-memoria">
          <thead><tr><th>Ano</th><th className="text-right">Acumulado</th><th className="text-center">Tendência</th></tr></thead>
          <tbody>
            {[...IPCA_ANUAL].reverse().map((a, i, arr) => {
              const anterior = arr[i + 1];
              const subiu = anterior && a.valor > anterior.valor;
              const desceu = anterior && a.valor < anterior.valor;
              return (
                <tr key={a.ano}>
                  <td className="font-semibold">{a.ano}</td>
                  <td className="text-right font-mono font-bold">{a.valor.toFixed(2)}%</td>
                  <td className="text-center">
                    {subiu && <TrendingUp size={16} className="inline text-red-500" />}
                    {desceu && <TrendingDown size={16} className="inline text-green-500" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Fonte: IBGE. * 2025 estimado com base em dados disponíveis.</p>
      </div>

      {/* INSS 2025 */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-3 text-primaria">Tabela INSS 2025 (Progressiva)</h3>
        <table className="tabela-memoria">
          <thead><tr><th>Faixa</th><th className="text-right">Até (R$)</th><th className="text-center">Alíquota</th></tr></thead>
          <tbody>
            <tr><td>1ª faixa</td><td className="text-right font-mono">1.518,00</td><td className="text-center">7,5%</td></tr>
            <tr><td>2ª faixa</td><td className="text-right font-mono">2.793,88</td><td className="text-center">9,0%</td></tr>
            <tr><td>3ª faixa</td><td className="text-right font-mono">4.190,83</td><td className="text-center">12,0%</td></tr>
            <tr><td>4ª faixa (teto)</td><td className="text-right font-mono">8.157,41</td><td className="text-center">14,0%</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan={2} className="text-sm text-gray-500">Contribuição máxima mensal</td><td className="text-center font-mono font-semibold">R$ 908,86</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-400 mt-2">Fonte: Portaria MPS nº 1.419/2024. Tabela progressiva — alíquota incide sobre cada faixa separadamente.</p>
      </div>

      {/* Outros Parâmetros */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-3 text-primaria">Demais Parâmetros Legais</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="campo-label">Multa FGTS (Disp. s/ Justa Causa)</span><p className="font-mono">40%</p></div>
          <div><span className="campo-label">Multa FGTS (Culpa Recíproca)</span><p className="font-mono">20%</p></div>
          <div><span className="campo-label">Prescrição Trabalhista</span><p className="font-mono">5 anos (EC 45/2004)</p></div>
          <div><span className="campo-label">Aviso Prévio Base</span><p className="font-mono">30 dias + 3/ano (máx 90)</p></div>
          <div><span className="campo-label">Custas Processuais</span><p className="font-mono">2% do valor da condenação</p></div>
          <div><span className="campo-label">Honorários Advocatícios</span><p className="font-mono">5% a 15% (art. 791-A CLT)</p></div>
        </div>
      </div>

      <div className="aviso-judicial">
        Parâmetros legais são atualizados periodicamente. A taxa SELIC é buscada ao vivo. IPCA e salário mínimo seguem as últimas publicações oficiais disponíveis. Sempre verifique a legislação vigente antes de usar em atos processuais.
      </div>
    </div>
  );
}

// ---- ABA PARÂMETROS DAS VERBAS ----
function TabVerbas() {
  const { data: parcelasCustom = [] } = useParcelas();

  return (
    <div className="space-y-4">
      <div className="aviso-judicial">
        Tabela de referência com todas as parcelas calculadas pelo sistema (padrão + biblioteca). Mostra base de cálculo, natureza e incidências conforme CLT/TST.
      </div>

      {/* Verbas do sistema */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="font-semibold text-sm text-gray-700">Verbas do Sistema (padrão)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="tabela-memoria">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Verba</th>
                <th className="text-center" style={{ width: '12%' }}>Natureza</th>
                <th className="text-center" style={{ width: '7%' }}>FGTS</th>
                <th className="text-center" style={{ width: '7%' }}>INSS</th>
                <th style={{ width: '44%' }}>Fórmula / Base de Cálculo</th>
              </tr>
            </thead>
            <tbody>
              {VERBAS_PADRAO.map((v) => (
                <tr key={v.nome}>
                  <td className="text-sm font-medium">{v.nome}</td>
                  <td className="text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.natureza === 'salarial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>{v.natureza}</span>
                  </td>
                  <td className="text-center text-xs">{v.fgts ? '✓' : '—'}</td>
                  <td className="text-center text-xs">{v.inss ? '✓' : '—'}</td>
                  <td className="text-xs text-gray-600 font-mono">{v.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parcelas da biblioteca */}
      {parcelasCustom.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <h4 className="font-semibold text-sm text-blue-800">Parcelas da Biblioteca (personalizadas)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="tabela-memoria">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th className="text-center">Natureza</th>
                  <th className="text-center">Frequência</th>
                  <th className="text-center">FGTS</th>
                  <th className="text-center">INSS</th>
                  <th className="text-right">Valor Base</th>
                </tr>
              </thead>
              <tbody>
                {parcelasCustom.map((p) => (
                  <tr key={p.id}>
                    <td className="text-sm font-medium">{p.nome}</td>
                    <td className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        p.natureza === 'salarial' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>{p.natureza}</span>
                    </td>
                    <td className="text-center text-xs">{FREQUENCIA_LABELS[p.frequencia] || p.frequencia}</td>
                    <td className="text-center text-xs">{p.incide_fgts ? '✓' : '—'}</td>
                    <td className="text-center text-xs">{p.incide_inss ? '✓' : '—'}</td>
                    <td className="text-right text-xs font-mono">
                      {p.valor_base ? formatBRL(Number(p.valor_base)) : p.percentual_base ? `${(p.percentual_base * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- ABA BIBLIOTECA DE PARCELAS ----
function TabBiblioteca() {
  const { data: parcelas = [], isLoading } = useParcelas();
  const { mutateAsync: excluir } = useExcluirParcela();
  const { mutateAsync: criar } = useCriarParcela();
  const [editorAberto, setEditorAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(null);

  async function handleExcluir(id) {
    if (!window.confirm('Remover esta parcela da biblioteca?')) return;
    setExcluindo(id);
    try { await excluir(id); } catch (e) { alert('Erro ao excluir: ' + e.message); }
    finally { setExcluindo(null); }
  }

  async function handleCriar(form) {
    try { await criar(form); setEditorAberto(false); }
    catch (e) { alert('Erro ao salvar: ' + e.message); }
  }

  return (
    <div className="space-y-4">
      {editorAberto && (
        <ParcelaEditor
          parcela={null}
          titulo="Nova Parcela na Biblioteca"
          onSalvar={handleCriar}
          onCancelar={() => setEditorAberto(false)}
        />
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primaria" />
            <h3 className="font-titulo text-lg text-primaria">Parcelas Salvas</h3>
          </div>
          <button type="button" className="btn-primario flex items-center gap-2 text-sm" onClick={() => setEditorAberto(true)}>
            <Plus size={16} /> Nova Parcela
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : parcelas.length === 0 ? (
          <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma parcela salva na biblioteca.</p>
            <p className="text-xs mt-1">Crie uma parcela e ela ficará disponível em todos os cálculos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {parcelas.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.nome}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${p.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {p.natureza}
                    </span>
                    <span className="text-xs text-gray-400">{FREQUENCIA_LABELS[p.frequencia] || p.frequencia}</span>
                    {p.valor_base && <span className="text-xs text-gray-400">{formatBRL(Number(p.valor_base))}</span>}
                    {p.percentual_base && <span className="text-xs text-gray-400">{(p.percentual_base * 100).toFixed(1)}%</span>}
                    <span className="text-xs text-gray-300">
                      {[p.incide_fgts && 'FGTS', p.incide_inss && 'INSS', p.incide_ir && 'IR'].filter(Boolean).join(' · ') || 'Sem incidências'}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => handleExcluir(p.id)} disabled={excluindo === p.id}
                  className="text-red-400 hover:text-red-600 p-1 flex-shrink-0" title="Remover">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="aviso-judicial">
        Parcelas salvas ficam disponíveis em todos os cálculos na etapa de Parcelas Personalizadas.
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [abaAtiva, setAbaAtiva] = useState('legais');

  return (
    <div className="p-6">
      <div className="bg-primaria text-white px-6 py-4 -mx-6 -mt-6 mb-6">
        <h2 className="font-titulo text-2xl">Configurações</h2>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setAbaAtiva(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              abaAtiva === tab.id ? 'border-primaria text-primaria' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl">
        {abaAtiva === 'legais' && <TabLegais />}
        {abaAtiva === 'verbas' && <TabVerbas />}
        {abaAtiva === 'biblioteca' && <TabBiblioteca />}
      </div>
    </div>
  );
}

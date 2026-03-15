import React, { useState, useEffect } from 'react';
import { Trash2, BookOpen, Plus, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { useParcelas, useCriarParcela, useAtualizarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
import { useSalarioMinimo, useSalvarSalarioMinimo, useRemoverSalarioMinimo } from '../../hooks/useSalarioMinimo.js';
import { useIpcaE, useSalvarIpcaE, useRemoverIpcaE, useBacenSyncIpcaE } from '../../hooks/useIpcaE.js';
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

// Meses para o select de mes_ano
const MESES = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const ANOS = Array.from({ length: 80 }, (_, i) => String(1994 + i));

function nomeMes(mesAno) {
  if (!mesAno) return '';
  const [y, m] = mesAno.split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[Number(m) - 1]}/${y}`;
}

function SalarioMinimoAdmin() {
  const { data: valores = [], isLoading } = useSalarioMinimo();
  const { mutateAsync: salvar } = useSalvarSalarioMinimo();
  const { mutateAsync: remover } = useRemoverSalarioMinimo();

  const anoAtual = String(new Date().getFullYear());
  const [verTodos, setVerTodos] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [mesSel, setMesSel] = useState('01');
  const [anoSel, setAnoSel] = useState(anoAtual);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [erro, setErro] = useState('');

  const exibidos = verTodos ? valores : valores.slice(0, 12);

  async function handleSalvar(e) {
    e.preventDefault();
    const mesAno = `${anoSel}-${mesSel}`;
    if (!valor) { setErro('Informe o valor.'); return; }
    const v = Number(valor.replace(',', '.'));
    if (isNaN(v) || v <= 0) { setErro('Valor inválido.'); return; }
    setSalvando(true);
    setErro('');
    try {
      await salvar({ mes_ano: mesAno, valor: v });
      setValor('');
      setFormAberto(false);
    } catch (ex) {
      setErro(ex.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(ma) {
    if (!window.confirm(`Remover ${nomeMes(ma)}?`)) return;
    setRemovendo(ma);
    try { await remover(ma); } catch (ex) { alert(ex.message); }
    finally { setRemovendo(null); }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-titulo text-lg text-primaria">Salário Mínimo — Histórico</h3>
        <button
          type="button"
          className="btn-primario flex items-center gap-1 text-sm py-1 px-3"
          onClick={() => setFormAberto((v) => !v)}
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {formAberto && (
        <form onSubmit={handleSalvar} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-3">Novo registro (ou atualizar existente)</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="campo-label">Mês/Ano</label>
              <div className="flex gap-1">
                <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="campo-input">
                  {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={anoSel} onChange={(e) => setAnoSel(e.target.value)} className="campo-input">
                  {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="campo-label">Valor (R$)</label>
              <input
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="ex: 1518,00"
                className="campo-input"
              />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="btn-primario text-sm py-1 px-4">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => { setFormAberto(false); setErro(''); }} className="btn-secundario text-sm py-1 px-4">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : valores.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum registro. Adicione o primeiro acima.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tabela-memoria">
              <thead>
                <tr>
                  <th>Vigência</th>
                  <th className="text-right">Valor</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {exibidos.map((s) => (
                  <tr key={s.mes_ano}>
                    <td>{nomeMes(s.mes_ano)}</td>
                    <td className="text-right font-mono font-semibold">{formatBRL(Number(s.valor))}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemover(s.mes_ano)}
                        disabled={removendo === s.mes_ano}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {valores.length > 12 && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className="mt-2 text-sm text-primaria flex items-center gap-1 hover:underline"
            >
              {verTodos ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver todos ({valores.length} registros)</>}
            </button>
          )}
        </>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Fonte: MTE / Decreto Federal. Clique em "Adicionar" para inserir ou atualizar um mês.
      </p>
    </div>
  );
}

function IpcaEAdmin() {
  const { data: valores = [], isLoading } = useIpcaE();
  const { mutateAsync: salvar } = useSalvarIpcaE();
  const { mutateAsync: remover } = useRemoverIpcaE();
  const { mutateAsync: bacenSync, isPending: sincronizando } = useBacenSyncIpcaE();

  const anoAtual = String(new Date().getFullYear());
  const [verTodos, setVerTodos] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [mesSel, setMesSel] = useState('01');
  const [anoSel, setAnoSel] = useState(anoAtual);
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [erro, setErro] = useState('');
  const [msgSync, setMsgSync] = useState('');

  const exibidos = verTodos ? valores : valores.slice(0, 12);

  async function handleSalvar(e) {
    e.preventDefault();
    const mesAno = `${anoSel}-${mesSel}`;
    if (!valor) { setErro('Informe o valor.'); return; }
    const v = Number(valor.replace(',', '.'));
    if (isNaN(v)) { setErro('Valor inválido.'); return; }
    setSalvando(true); setErro('');
    try {
      await salvar({ mes_ano: mesAno, valor: v });
      setValor(''); setFormAberto(false);
    } catch (ex) { setErro(ex.message); }
    finally { setSalvando(false); }
  }

  async function handleRemover(ma) {
    if (!window.confirm(`Remover ${nomeMes(ma)}?`)) return;
    setRemovendo(ma);
    try { await remover(ma); } catch (ex) { alert(ex.message); }
    finally { setRemovendo(null); }
  }

  async function handleBacenSync() {
    setMsgSync('');
    try {
      const r = await bacenSync();
      setMsgSync(`Sincronizado: ${r.atualizados} registros atualizados.`);
    } catch (ex) { setMsgSync('Erro: ' + ex.message); }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-titulo text-lg text-primaria">IPCA-E — Histórico Mensal</h3>
        <div className="flex gap-2">
          <button type="button" className="btn-secundario flex items-center gap-1 text-sm py-1 px-3"
            onClick={handleBacenSync} disabled={sincronizando}>
            <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
            {sincronizando ? 'Sincronizando...' : 'Atualizar via BACEN'}
          </button>
          <button type="button" className="btn-primario flex items-center gap-1 text-sm py-1 px-3"
            onClick={() => setFormAberto((v) => !v)}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {msgSync && <p className="text-xs text-green-700 bg-green-50 p-2 rounded mb-3">{msgSync}</p>}

      {formAberto && (
        <form onSubmit={handleSalvar} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-800 mb-3">Novo registro (ou atualizar existente)</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="campo-label">Mês/Ano</label>
              <div className="flex gap-1">
                <select value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="campo-input">
                  {MESES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={anoSel} onChange={(e) => setAnoSel(e.target.value)} className="campo-input">
                  {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="campo-label">Valor (%)</label>
              <input type="text" value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="ex: 0,42" className="campo-input" />
            </div>
          </div>
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="btn-primario text-sm py-1 px-4">
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={() => { setFormAberto(false); setErro(''); }} className="btn-secundario text-sm py-1 px-4">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : valores.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum registro. Clique em "Atualizar via BACEN" para importar o histórico.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tabela-memoria">
              <thead>
                <tr>
                  <th>Vigência</th>
                  <th className="text-right">IPCA-E (%)</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {exibidos.map((s) => (
                  <tr key={s.mes_ano}>
                    <td>{nomeMes(s.mes_ano)}</td>
                    <td className={`text-right font-mono font-semibold ${Number(s.valor) < 0 ? 'text-green-700' : Number(s.valor) > 0.8 ? 'text-red-600' : ''}`}>
                      {Number(s.valor) > 0 ? '+' : ''}{Number(s.valor).toFixed(4)}%
                    </td>
                    <td>
                      <button type="button" onClick={() => handleRemover(s.mes_ano)} disabled={removendo === s.mes_ano}
                        className="text-red-400 hover:text-red-600 p-1" title="Remover">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {valores.length > 12 && (
            <button type="button" onClick={() => setVerTodos((v) => !v)}
              className="mt-2 text-sm text-primaria flex items-center gap-1 hover:underline">
              {verTodos ? <><ChevronUp size={14} /> Ver menos</> : <><ChevronDown size={14} /> Ver todos ({valores.length} registros)</>}
            </button>
          )}
        </>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Fonte: BACEN — Série 10764. Usado no cálculo de juros pré-judiciais (ADC 58 STF).
        Clique em "Atualizar via BACEN" para importar os últimos 7 anos automaticamente.
      </p>
    </div>
  );
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
      <SalarioMinimoAdmin />

      <IpcaEAdmin />

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
        <h3 className="font-titulo text-lg mb-3 text-primaria">Tabela INSS 2026 (Progressiva)</h3>
        <table className="tabela-memoria">
          <thead><tr><th>Faixa</th><th className="text-right">Até (R$)</th><th className="text-center">Alíquota</th></tr></thead>
          <tbody>
            <tr><td>1ª faixa</td><td className="text-right font-mono">1.621,00</td><td className="text-center">7,5%</td></tr>
            <tr><td>2ª faixa</td><td className="text-right font-mono">2.902,84</td><td className="text-center">9,0%</td></tr>
            <tr><td>3ª faixa</td><td className="text-right font-mono">4.354,27</td><td className="text-center">12,0%</td></tr>
            <tr><td>4ª faixa (teto)</td><td className="text-right font-mono">8.475,55</td><td className="text-center">14,0%</td></tr>
          </tbody>
          <tfoot>
            <tr><td colSpan={2} className="text-sm text-gray-500">Contribuição máxima mensal</td><td className="text-center font-mono font-semibold">R$ 951,62</td></tr>
          </tfoot>
        </table>
        <p className="text-xs text-gray-400 mt-2">Fonte: Decreto nº 12.797/2025. Tabela progressiva — alíquota incide sobre cada faixa separadamente.</p>
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

// Converte registro DB (snake_case) para form (camelCase) para pré-preencher ParcelaEditor
function mapParcelaBDParaForm(p) {
  return {
    nome: p.nome,
    descricao: p.descricao || '',
    natureza: p.natureza,
    periodoTipo: p.periodo_tipo,
    periodoInicio: p.periodo_inicio,
    periodoFim: p.periodo_fim,
    frequencia: p.frequencia,
    tipoValor: p.tipo_valor,
    valorBase: p.valor_base,
    percentualBase: p.percentual_base ? p.percentual_base * 100 : null,
    percentualAdicional: p.percentual_adicional ? p.percentual_adicional * 100 : 0,
    geraReflexos: p.gera_reflexos ?? false,
    reflexosEm: p.reflexos_em || [],
    incideInss: p.incide_inss,
    incideIr: p.incide_ir,
    incideFgts: p.incide_fgts,
    templateId: p.template_id,
  };
}

// ---- ABA BIBLIOTECA DE PARCELAS ----
function TabBiblioteca() {
  const { data: parcelas = [], isLoading } = useParcelas();
  const { mutateAsync: excluir } = useExcluirParcela();
  const { mutateAsync: criar } = useCriarParcela();
  const { mutateAsync: atualizar } = useAtualizarParcela();

  // editorCtx: null | { mode: 'nova' } | { mode: 'editar', parcela }
  const [editorCtx, setEditorCtx] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);

  async function handleExcluir(id) {
    if (!window.confirm('Remover esta parcela da biblioteca?')) return;
    setExcluindo(id);
    try { await excluir(id); } catch (e) { alert('Erro ao excluir: ' + e.message); }
    finally { setExcluindo(null); }
  }

  async function handleSalvar(form) {
    setSalvando(true);
    try {
      if (editorCtx?.mode === 'editar') {
        await atualizar({ id: editorCtx.parcela.id, ...form });
      } else {
        await criar(form);
      }
      setEditorCtx(null);
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {editorCtx && (
        <ParcelaEditor
          parcela={editorCtx.mode === 'editar' ? mapParcelaBDParaForm(editorCtx.parcela) : null}
          titulo={editorCtx.mode === 'editar' ? `Editar: ${editorCtx.parcela.nome}` : 'Nova Parcela na Biblioteca'}
          onSalvar={handleSalvar}
          onCancelar={() => setEditorCtx(null)}
        />
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primaria" />
            <h3 className="font-titulo text-lg text-primaria">Parcelas Salvas</h3>
          </div>
          <button type="button" className="btn-primario flex items-center gap-2 text-sm" onClick={() => setEditorCtx({ mode: 'nova' })}>
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
                <button type="button" onClick={() => setEditorCtx({ mode: 'editar', parcela: p })}
                  className="text-gray-400 hover:text-primaria p-1 flex-shrink-0" title="Editar">
                  <Edit2 size={16} />
                </button>
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

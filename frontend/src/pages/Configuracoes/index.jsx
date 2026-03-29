import React, { useState } from 'react';
import { Trash2, BookOpen, Plus, RefreshCw, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight, Edit2, Copy } from 'lucide-react';
import { useParcelas, useCriarParcela, useAtualizarParcela, useExcluirParcela } from '../../hooks/useParcelas.js';
import { useSalarioMinimo, useSalvarSalarioMinimo, useRemoverSalarioMinimo } from '../../hooks/useSalarioMinimo.js';
import { useIpcaE, useSalvarIpcaE, useRemoverIpcaE, useBacenSyncIpcaE } from '../../hooks/useIpcaE.js';
import { useSelic, useSalvarSelic, useRemoverSelic, useBacenSyncSelic } from '../../hooks/useSelic.js';
import { useInssParametros, useSalvarInssVigencia, useRemoverInssVigencia } from '../../hooks/useInssParametros.js';
import ParcelaEditor from '../../components/ParcelaEditor/index.jsx';
import {
  FREQUENCIA_LABELS,
  GRUPOS_PADRAO,
  TEMPLATES_PADRAO,
  CATEGORIAS_TEMATICAS,
  TEMPLATE_ID_PARA_GRUPO,
  mapParcelaBDParaForm,
} from '../../data/parcelasTemplates.js';

const TABS = [
  { id: 'legais', label: 'Parâmetros Legais' },
  { id: 'selic', label: 'Selic' },
  { id: 'inss', label: 'INSS' },
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

function SelicAdmin() {
  const { data: valores = [], isLoading } = useSelic();
  const { mutateAsync: salvar } = useSalvarSelic();
  const { mutateAsync: remover } = useRemoverSelic();
  const { mutateAsync: bacenSync, isPending: sincronizando } = useBacenSyncSelic();

  const anoAtual = String(new Date().getFullYear());
  const [verTodos, setVerTodos] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [mesSel, setMesSel] = useState('01');
  const [anoSel, setAnoSel] = useState(anoAtual);
  const [taxaMensal, setTaxaMensal] = useState('');
  const [taxaAnual, setTaxaAnual] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [erro, setErro] = useState('');
  const [msgSync, setMsgSync] = useState('');

  const exibidos = verTodos ? valores : valores.slice(0, 12);

  async function handleSalvar(e) {
    e.preventDefault();
    const mesAno = `${anoSel}-${mesSel}`;
    if (!taxaMensal && !taxaAnual) { setErro('Informe pelo menos uma taxa.'); return; }
    const tm = taxaMensal ? Number(taxaMensal.replace(',', '.')) : null;
    const ta = taxaAnual ? Number(taxaAnual.replace(',', '.')) : null;
    if (taxaMensal && (isNaN(tm))) { setErro('Taxa mensal inválida.'); return; }
    if (taxaAnual && (isNaN(ta))) { setErro('Taxa anual inválida.'); return; }
    setSalvando(true); setErro('');
    try {
      const dados = { mes_ano: mesAno };
      if (tm !== null) dados.taxa_mensal = tm;
      if (ta !== null) dados.taxa_anual = ta;
      await salvar(dados);
      setTaxaMensal(''); setTaxaAnual(''); setFormAberto(false);
    } catch (ex) { setErro(ex.message); }
    finally { setSalvando(false); }
  }

  async function handleRemover(ma) {
    if (!window.confirm(`Remover Selic de ${nomeMes(ma)}?`)) return;
    setRemovendo(ma);
    try { await remover(ma); } catch (ex) { alert(ex.message); }
    finally { setRemovendo(null); }
  }

  async function handleBacenSync() {
    setMsgSync('');
    try {
      const r = await bacenSync();
      setMsgSync(`Sincronizado: ${r.atualizados || r.inseridos || 0} registros atualizados.`);
    } catch (ex) { setMsgSync('Erro: ' + ex.message); }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-titulo text-lg text-primaria">Taxa SELIC -- Historico Mensal</h3>
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
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="campo-label">Mes/Ano</label>
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
              <label className="campo-label">Taxa Mensal (%)</label>
              <input type="text" value={taxaMensal} onChange={(e) => setTaxaMensal(e.target.value)}
                placeholder="ex: 0,83" className="campo-input" />
            </div>
            <div>
              <label className="campo-label">Taxa Anual (%)</label>
              <input type="text" value={taxaAnual} onChange={(e) => setTaxaAnual(e.target.value)}
                placeholder="ex: 13,25" className="campo-input" />
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
        <p className="text-sm text-gray-400">Nenhum registro. Clique em "Atualizar via BACEN" para importar o historico.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="tabela-memoria">
              <thead>
                <tr>
                  <th>Vigencia</th>
                  <th className="text-right">Taxa Mensal (%)</th>
                  <th className="text-right">Taxa Anual (%)</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {exibidos.map((s) => (
                  <tr key={s.mes_ano}>
                    <td>{nomeMes(s.mes_ano)}</td>
                    <td className="text-right font-mono font-semibold">
                      {s.taxa_mensal != null ? `${Number(s.taxa_mensal).toFixed(4)}%` : '--'}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {s.taxa_anual != null ? `${Number(s.taxa_anual).toFixed(2)}%` : '--'}
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
        Fonte: BACEN -- Serie 4390 (mensal). Utilizada para calculo de juros de mora (ADC 58 STF, fase pos-judicial).
        Clique em "Atualizar via BACEN" para importar automaticamente.
      </p>
    </div>
  );
}

function InssParametrosAdmin() {
  const { data: vigencias = [], isLoading } = useInssParametros();
  const { mutateAsync: salvarVigencia } = useSalvarInssVigencia();
  const { mutateAsync: removerVigencia } = useRemoverInssVigencia();

  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(null);
  const [formAberto, setFormAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [vigenciaAberta, setVigenciaAberta] = useState(null);
  const [editandoFaixa, setEditandoFaixa] = useState(null); // { vigIdx, faixaIdx }
  const [faixaEdit, setFaixaEdit] = useState({ limite_superior: '', aliquota: '' });

  // Formulario nova vigencia
  const [novaData, setNovaData] = useState('');
  const [novasFaixas, setNovasFaixas] = useState([
    { faixa_ordem: 1, limite_superior: '', aliquota: '7.5' },
    { faixa_ordem: 2, limite_superior: '', aliquota: '9' },
    { faixa_ordem: 3, limite_superior: '', aliquota: '12' },
    { faixa_ordem: 4, limite_superior: '', aliquota: '14' },
  ]);

  function copiarUltimaVigencia() {
    if (vigencias.length === 0) return;
    const ultima = vigencias[0]; // assumindo que vem ordenado desc
    const faixas = ultima.faixas || [];
    if (faixas.length > 0) {
      setNovasFaixas(faixas.map((f) => ({
        faixa_ordem: f.faixa_ordem,
        limite_superior: String(f.limite_superior || ''),
        aliquota: String(f.aliquota || ''),
      })));
    }
  }

  function handleNovaFaixaChange(idx, campo, valor) {
    setNovasFaixas((prev) => prev.map((f, i) => i === idx ? { ...f, [campo]: valor } : f));
  }

  async function handleSalvarNovaVigencia(e) {
    e.preventDefault();
    if (!novaData) { setErro('Informe a data de inicio da vigencia.'); return; }
    const faixasNum = novasFaixas.map((f) => ({
      faixa_ordem: f.faixa_ordem,
      limite_superior: Number(String(f.limite_superior).replace(',', '.')),
      aliquota: Number(String(f.aliquota).replace(',', '.')),
    }));
    const invalida = faixasNum.find((f) => isNaN(f.limite_superior) || isNaN(f.aliquota) || f.limite_superior <= 0 || f.aliquota <= 0);
    if (invalida) { setErro('Preencha todos os limites e aliquotas com valores validos.'); return; }
    setSalvando(true); setErro('');
    try {
      await salvarVigencia({ vigencia_inicio: novaData, faixas: faixasNum });
      setFormAberto(false);
      setNovaData('');
      setNovasFaixas([
        { faixa_ordem: 1, limite_superior: '', aliquota: '7.5' },
        { faixa_ordem: 2, limite_superior: '', aliquota: '9' },
        { faixa_ordem: 3, limite_superior: '', aliquota: '12' },
        { faixa_ordem: 4, limite_superior: '', aliquota: '14' },
      ]);
    } catch (ex) { setErro(ex.message); }
    finally { setSalvando(false); }
  }

  async function handleRemoverVigencia(vigenciaInicio) {
    const label = new Date(vigenciaInicio + 'T00:00:00').toLocaleDateString('pt-BR');
    if (!window.confirm(`Remover vigencia de ${label} e todas as suas faixas?`)) return;
    setRemovendo(vigenciaInicio);
    try { await removerVigencia(vigenciaInicio); } catch (ex) { alert(ex.message); }
    finally { setRemovendo(null); }
  }

  function iniciarEdicaoFaixa(vigIdx, faixaIdx, faixa) {
    setEditandoFaixa({ vigIdx, faixaIdx });
    setFaixaEdit({
      limite_superior: String(faixa.limite_superior || ''),
      aliquota: String(faixa.aliquota || ''),
    });
  }

  async function salvarEdicaoFaixa(vigencia) {
    if (!editandoFaixa) return;
    const { faixaIdx } = editandoFaixa;
    const faixas = [...(vigencia.faixas || [])];
    faixas[faixaIdx] = {
      ...faixas[faixaIdx],
      limite_superior: Number(String(faixaEdit.limite_superior).replace(',', '.')),
      aliquota: Number(String(faixaEdit.aliquota).replace(',', '.')),
    };
    setSalvando(true);
    try {
      await salvarVigencia({
        vigencia_inicio: vigencia.vigencia_inicio,
        faixas: faixas.map((f) => ({
          faixa_ordem: f.faixa_ordem,
          limite_superior: Number(f.limite_superior),
          aliquota: Number(f.aliquota),
        })),
      });
      setEditandoFaixa(null);
    } catch (ex) { alert(ex.message); }
    finally { setSalvando(false); }
  }

  function calcContribuicaoMaxima(faixas) {
    if (!faixas || faixas.length === 0) return 0;
    const sorted = [...faixas].sort((a, b) => a.faixa_ordem - b.faixa_ordem);
    let total = 0;
    let anterior = 0;
    for (const f of sorted) {
      const lim = Number(f.limite_superior) || 0;
      const aliq = Number(f.aliquota) || 0;
      total += (lim - anterior) * (aliq / 100);
      anterior = lim;
    }
    return total;
  }

  function formatData(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('pt-BR');
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-titulo text-lg text-primaria">INSS -- Tabela Progressiva por Vigencia</h3>
        <button type="button" className="btn-primario flex items-center gap-1 text-sm py-1 px-3"
          onClick={() => { setFormAberto((v) => !v); if (!formAberto) copiarUltimaVigencia(); }}>
          <Plus size={14} /> Nova Vigencia
        </button>
      </div>

      {formAberto && (
        <form onSubmit={handleSalvarNovaVigencia} className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-800">Nova vigencia INSS</p>
            {vigencias.length > 0 && (
              <button type="button" onClick={copiarUltimaVigencia}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Copy size={12} /> Copiar ultima vigencia
              </button>
            )}
          </div>
          <div className="mb-3">
            <label className="campo-label">Data de inicio da vigencia</label>
            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="campo-input w-48" />
          </div>
          <div className="overflow-x-auto mb-3">
            <table className="tabela-memoria">
              <thead>
                <tr>
                  <th>Faixa</th>
                  <th className="text-right">Limite Superior (R$)</th>
                  <th className="text-right">Aliquota (%)</th>
                </tr>
              </thead>
              <tbody>
                {novasFaixas.map((f, idx) => (
                  <tr key={f.faixa_ordem}>
                    <td className="font-medium">{f.faixa_ordem}a faixa{f.faixa_ordem === 4 ? ' (teto)' : ''}</td>
                    <td>
                      <input type="text" value={f.limite_superior}
                        onChange={(e) => handleNovaFaixaChange(idx, 'limite_superior', e.target.value)}
                        placeholder="ex: 1518,00" className="campo-input text-right font-mono" />
                    </td>
                    <td>
                      <input type="text" value={f.aliquota}
                        onChange={(e) => handleNovaFaixaChange(idx, 'aliquota', e.target.value)}
                        placeholder="ex: 7,5" className="campo-input text-right font-mono" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className="btn-primario text-sm py-1 px-4">
              {salvando ? 'Salvando...' : 'Salvar Vigencia'}
            </button>
            <button type="button" onClick={() => { setFormAberto(false); setErro(''); }} className="btn-secundario text-sm py-1 px-4">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : vigencias.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma vigencia cadastrada. Clique em "Nova Vigencia" para adicionar.</p>
      ) : (
        <div className="space-y-3">
          {vigencias.map((vig, vigIdx) => {
            const faixas = vig.faixas || [];
            const contribMax = calcContribuicaoMaxima(faixas);
            const teto = faixas.length > 0 ? Math.max(...faixas.map((f) => Number(f.limite_superior) || 0)) : 0;
            const isAberta = vigenciaAberta === vigIdx;

            return (
              <div key={vig.vigencia_inicio} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => setVigenciaAberta(isAberta ? null : vigIdx)}
                >
                  <div className="flex items-center gap-3">
                    {isAberta ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    <span className="font-medium text-sm">Vigencia: {formatData(vig.vigencia_inicio)}</span>
                    <span className="text-xs text-gray-400">{faixas.length} faixas</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Teto: {formatBRL(teto)}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">Contrib. max: {formatBRL(contribMax)}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoverVigencia(vig.vigencia_inicio); }}
                    disabled={removendo === vig.vigencia_inicio}
                    className="text-red-400 hover:text-red-600 p-1" title="Remover vigencia">
                    <Trash2 size={14} />
                  </button>
                </div>

                {isAberta && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="tabela-memoria">
                        <thead>
                          <tr>
                            <th>Faixa</th>
                            <th className="text-right">Limite Superior (R$)</th>
                            <th className="text-center">Aliquota (%)</th>
                            <th style={{ width: 80 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {faixas.sort((a, b) => a.faixa_ordem - b.faixa_ordem).map((f, faixaIdx) => {
                            const isEditando = editandoFaixa?.vigIdx === vigIdx && editandoFaixa?.faixaIdx === faixaIdx;
                            return (
                              <tr key={f.faixa_ordem}>
                                <td className="font-medium">{f.faixa_ordem}a faixa{f.faixa_ordem === faixas.length ? ' (teto)' : ''}</td>
                                <td className="text-right font-mono">
                                  {isEditando ? (
                                    <input type="text" value={faixaEdit.limite_superior}
                                      onChange={(e) => setFaixaEdit((p) => ({ ...p, limite_superior: e.target.value }))}
                                      className="campo-input text-right font-mono w-32" />
                                  ) : formatBRL(Number(f.limite_superior))}
                                </td>
                                <td className="text-center font-mono">
                                  {isEditando ? (
                                    <input type="text" value={faixaEdit.aliquota}
                                      onChange={(e) => setFaixaEdit((p) => ({ ...p, aliquota: e.target.value }))}
                                      className="campo-input text-center font-mono w-20" />
                                  ) : `${Number(f.aliquota).toFixed(1)}%`}
                                </td>
                                <td className="text-right">
                                  {isEditando ? (
                                    <div className="flex gap-1 justify-end">
                                      <button type="button" onClick={() => salvarEdicaoFaixa(vig)}
                                        disabled={salvando} className="text-xs text-green-600 hover:text-green-800 font-medium">
                                        OK
                                      </button>
                                      <button type="button" onClick={() => setEditandoFaixa(null)}
                                        className="text-xs text-gray-400 hover:text-gray-600">
                                        X
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => iniciarEdicaoFaixa(vigIdx, faixaIdx, f)}
                                      className="text-gray-400 hover:text-primaria p-1" title="Editar faixa">
                                      <Edit2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={2} className="text-sm text-gray-500">Contribuicao maxima mensal</td>
                            <td className="text-center font-mono font-semibold">{formatBRL(contribMax)}</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="text-sm text-gray-500">Teto de contribuicao (limite 4a faixa)</td>
                            <td className="text-center font-mono font-semibold">{formatBRL(teto)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        Fonte: Portarias do Ministerio da Previdencia Social. Tabela progressiva -- aliquota incide sobre cada faixa separadamente.
      </p>
    </div>
  );
}

// ---- ABA SELIC ----
function TabSelic() {
  return (
    <div className="space-y-5">
      <SelicAdmin />
      <div className="aviso-judicial">
        A taxa Selic e utilizada para calculo de juros de mora na fase pos-judicial e, desde a ADC 58 do STF, como indice de atualizacao monetaria dos debitos trabalhistas a partir de sua vigencia. Mantenha os dados atualizados via sincronizacao com o BACEN.
      </div>
    </div>
  );
}

// ---- ABA INSS ----
function TabInss() {
  return (
    <div className="space-y-5">
      <InssParametrosAdmin />
      <div className="aviso-judicial">
        A tabela progressiva do INSS e atualizada anualmente por portaria do Ministerio da Previdencia Social. A aliquota incide sobre cada faixa de salario separadamente (calculo progressivo). Sempre verifique a portaria vigente.
      </div>
    </div>
  );
}

// ---- ABA PARAMETROS LEGAIS ----
function SincronizarTodosButton() {
  const { mutateAsync: syncIpca, isPending: sincIpca } = useBacenSyncIpcaE();
  const { mutateAsync: syncSelic, isPending: sincSelic } = useBacenSyncSelic();
  const [msg, setMsg] = useState('');
  const sincronizando = sincIpca || sincSelic;

  async function handleSyncTodos() {
    setMsg('');
    try {
      const [rIpca, rSelic] = await Promise.all([syncIpca(), syncSelic()]);
      const ipcaCount = rIpca.atualizados || 0;
      const selicCount = rSelic.atualizados || rSelic.inseridos || 0;
      setMsg(`Sincronizacao concluida: IPCA-E (${ipcaCount} registros), Selic (${selicCount} registros).`);
    } catch (ex) {
      setMsg('Erro na sincronizacao: ' + ex.message);
    }
  }

  return (
    <div className="card p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm text-blue-800">Sincronizacao com o Banco Central</h4>
          <p className="text-xs text-blue-600 mt-0.5">Atualiza IPCA-E e Selic de uma so vez via API do BACEN.</p>
        </div>
        <button type="button" onClick={handleSyncTodos} disabled={sincronizando}
          className="btn-primario flex items-center gap-2 text-sm py-2 px-4">
          <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
          {sincronizando ? 'Sincronizando...' : 'Sincronizar Todos'}
        </button>
      </div>
      {msg && <p className="text-xs text-green-700 bg-green-50 p-2 rounded mt-2">{msg}</p>}
    </div>
  );
}

function TabLegais() {
  return (
    <div className="space-y-5">
      <SincronizarTodosButton />

      <SalarioMinimoAdmin />

      <IpcaEAdmin />

      {/* IPCA Mensal */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-1 text-primaria">IPCA -- Variacao Mensal (2024-2025)</h3>
        <p className="text-xs text-gray-400 mb-3">Fonte: IBGE -- Indice Nacional de Precos ao Consumidor Amplo</p>
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
        <h3 className="font-titulo text-lg mb-3 text-primaria">IPCA -- Variacao Anual (ultimos 5 anos)</h3>
        <table className="tabela-memoria">
          <thead><tr><th>Ano</th><th className="text-right">Acumulado</th><th className="text-center">Tendencia</th></tr></thead>
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
        <p className="text-xs text-gray-400 mt-2">Fonte: IBGE. * 2025 estimado com base em dados disponiveis.</p>
      </div>

      {/* Outros Parametros */}
      <div className="card p-6">
        <h3 className="font-titulo text-lg mb-3 text-primaria">Demais Parametros Legais</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="campo-label">Multa FGTS (Disp. s/ Justa Causa)</span><p className="font-mono">40%</p></div>
          <div><span className="campo-label">Multa FGTS (Culpa Reciproca)</span><p className="font-mono">20%</p></div>
          <div><span className="campo-label">Prescricao Trabalhista</span><p className="font-mono">5 anos (EC 45/2004)</p></div>
          <div><span className="campo-label">Aviso Previo Base</span><p className="font-mono">30 dias + 3/ano (max 90)</p></div>
          <div><span className="campo-label">Custas Processuais</span><p className="font-mono">2% do valor da condenacao</p></div>
          <div><span className="campo-label">Honorarios Advocaticios</span><p className="font-mono">5% a 15% (art. 791-A CLT)</p></div>
        </div>
      </div>

      <div className="aviso-judicial">
        Parametros legais sao atualizados periodicamente. IPCA-E e Selic podem ser sincronizados com o BACEN. Salario minimo segue as ultimas publicacoes oficiais. Para gerenciar Selic e INSS em detalhes, use as abas dedicadas. Sempre verifique a legislacao vigente antes de usar em atos processuais.
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
// ---- ABA BIBLIOTECA DE PARCELAS ----
function TabBiblioteca() {
  const { data: parcelas = [], isLoading } = useParcelas();
  const { mutateAsync: excluir } = useExcluirParcela();
  const { mutateAsync: criar } = useCriarParcela();
  const { mutateAsync: atualizar } = useAtualizarParcela();

  const [editorCtx, setEditorCtx] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [gruposAbertos, setGruposAbertos] = useState({});

  function toggleGrupo(grupoId) {
    setGruposAbertos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  }

  // Set de templateIds que já têm versão customizada salva na biblioteca
  const templateIdsSalvos = new Set(
    parcelas.map(p => p.template_id).filter(Boolean)
  );

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
      } else if (editorCtx?.mode === 'personalizar') {
        await criar({ ...form, templateId: editorCtx.template._templateId });
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

  // Resolve grupo de um template ou parcela DB
  function grupoDeTemplate(templateId) {
    const tpl = TEMPLATES_PADRAO.find(t => t._templateId === templateId);
    if (tpl) return tpl.grupo;
    const grupoLabel = TEMPLATE_ID_PARA_GRUPO[templateId];
    if (grupoLabel) {
      const g = GRUPOS_PADRAO.find(gp => gp.label === grupoLabel);
      if (g) return g.id;
    }
    return null;
  }

  // Renderiza card de template built-in (somente leitura)
  function TemplateRow({ t }) {
    const customizado = templateIdsSalvos.has(t._templateId);
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg ${customizado ? 'bg-gray-50 opacity-60' : 'border border-gray-200 hover:bg-gray-50'}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{t.nome}</p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">modelo</span>
            {customizado && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-200 text-blue-700">personalizado</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{t.descricao}</p>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${t.natureza === 'salarial' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
              {t.natureza}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
              {FREQUENCIA_LABELS[t.frequencia] || t.frequencia}
            </span>
            {t.geraReflexos && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-600">com reflexos</span>}
          </div>
        </div>
        {!customizado && (
          <button
            type="button"
            onClick={() => setEditorCtx({ mode: 'personalizar', template: t })}
            className="text-gray-400 hover:text-primaria p-1 flex-shrink-0"
            title="Personalizar e salvar na biblioteca"
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>
    );
  }

  // Renderiza card de parcela salva no BD
  function ParcelaSalvaRow({ p }) {
    return (
      <div className="flex items-center gap-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{p.nome}</p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-200 text-blue-700">personalizado</span>
          </div>
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
    );
  }

  return (
    <div className="space-y-4">
      {editorCtx && (
        <ParcelaEditor
          parcela={
            editorCtx.mode === 'editar'
              ? mapParcelaBDParaForm(editorCtx.parcela)
              : editorCtx.mode === 'personalizar'
              ? editorCtx.template
              : null
          }
          titulo={
            editorCtx.mode === 'editar'
              ? `Editar: ${editorCtx.parcela.nome}`
              : editorCtx.mode === 'personalizar'
              ? `Personalizar: ${editorCtx.template.nome}`
              : 'Nova Parcela na Biblioteca'
          }
          onSalvar={handleSalvar}
          salvando={salvando}
          onCancelar={() => setEditorCtx(null)}
        />
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primaria" />
            <h3 className="font-titulo text-lg text-primaria">Biblioteca de Parcelas</h3>
          </div>
          <button type="button" className="btn-primario flex items-center gap-2 text-sm" onClick={() => setEditorCtx({ mode: 'nova' })}>
            <Plus size={16} /> Nova Parcela
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Modelos pré-configurados por tema. Clique no lápis para personalizar e salvar na biblioteca. Parcelas personalizadas ficam disponíveis em todos os cálculos.
        </p>

        {isLoading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : (
          <>
            {/* Grupos temáticos */}
            {GRUPOS_PADRAO.map((grupo) => {
              const templatesDoGrupo = TEMPLATES_PADRAO.filter(t => t.grupo === grupo.id);
              const parcelasSalvasDoGrupo = parcelas.filter(p => {
                if (!p.template_id) return false;
                return grupoDeTemplate(p.template_id) === grupo.id;
              });
              const total = templatesDoGrupo.length + parcelasSalvasDoGrupo.filter(p =>
                !templatesDoGrupo.some(t => t._templateId === p.template_id)
              ).length;
              if (total === 0) return null;

              const aberto = Boolean(gruposAbertos[grupo.id]);
              return (
                <div key={grupo.id} className="border border-gray-200 rounded-lg mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(grupo.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-sm text-gray-700">
                      {grupo.label}
                      <span className="ml-2 text-xs text-gray-400 font-normal">({total})</span>
                    </span>
                    {aberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </button>
                  {aberto && (
                    <div className="px-4 pb-4 space-y-2">
                      {templatesDoGrupo.map(t => <TemplateRow key={t._templateId} t={t} />)}
                      {/* Parcelas DB deste grupo que NÃO têm template correspondente nos built-in */}
                      {parcelasSalvasDoGrupo
                        .filter(p => !templatesDoGrupo.some(t => t._templateId === p.template_id))
                        .map(p => <ParcelaSalvaRow key={p.id} p={p} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Minhas Parcelas — parcelas salvas sem template_id */}
            {(() => {
              const minhasParcelas = parcelas.filter(p => !p.template_id);
              if (minhasParcelas.length === 0) return null;
              const aberto = Boolean(gruposAbertos['_minhas']);
              return (
                <div className="border border-gray-200 rounded-lg mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGrupo('_minhas')}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-sm text-gray-700">
                      Minhas Parcelas
                      <span className="ml-2 text-xs text-gray-400 font-normal">({minhasParcelas.length})</span>
                    </span>
                    {aberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </button>
                  {aberto && (
                    <div className="px-4 pb-4 space-y-2">
                      {minhasParcelas.map(p => <ParcelaSalvaRow key={p.id} p={p} />)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Outras Parcelas — parcelas DB com template_id que não mapeia para nenhum grupo */}
            {(() => {
              const outrasParcelas = parcelas.filter(p =>
                p.template_id && !grupoDeTemplate(p.template_id)
              );
              if (outrasParcelas.length === 0) return null;
              const aberto = Boolean(gruposAbertos['_outras']);
              return (
                <div className="border border-gray-200 rounded-lg mb-2">
                  <button
                    type="button"
                    onClick={() => toggleGrupo('_outras')}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 rounded-lg"
                  >
                    <span className="font-medium text-sm text-gray-700">
                      Outras Parcelas
                      <span className="ml-2 text-xs text-gray-400 font-normal">({outrasParcelas.length})</span>
                    </span>
                    {aberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </button>
                  {aberto && (
                    <div className="px-4 pb-4 space-y-2">
                      {outrasParcelas.map(p => <ParcelaSalvaRow key={p.id} p={p} />)}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div className="aviso-judicial">
        Parcelas personalizadas ficam disponíveis em todos os cálculos na etapa de Parcelas Personalizadas.
        Modelos pré-configurados são somente leitura — clique no lápis para criar uma versão customizada.
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
        {abaAtiva === 'selic' && <TabSelic />}
        {abaAtiva === 'inss' && <TabInss />}
        {abaAtiva === 'verbas' && <TabVerbas />}
        {abaAtiva === 'biblioteca' && <TabBiblioteca />}
      </div>
    </div>
  );
}

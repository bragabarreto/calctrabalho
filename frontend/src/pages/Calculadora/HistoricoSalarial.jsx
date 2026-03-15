import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Sparkles, X, TrendingUp, Upload } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

function formatBRL(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

/** '2020-01' → '01/2020' (formato numérico compacto) */
function fmtComp(data) {
  if (!data) return '—';
  const [ano, mes] = data.split('-');
  return `${mes}/${ano}`;
}

/** Devolve o mês anterior no formato 'YYYY-MM' */
function mesAnterior(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Resolve sobreposições entre faixas.
 */
function resolverFaixas(faixas) {
  const sorted = [...faixas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  return sorted.map((f, i) => {
    const next = sorted[i + 1];
    let fimEfetivo = f.fim;
    if (next && (!f.fim || f.fim >= next.inicio)) {
      fimEfetivo = mesAnterior(next.inicio);
    }
    const sobreposicao = f.fim && next && f.fim >= next.inicio;
    return { ...f, fimEfetivo, sobreposicao };
  });
}

function FormFaixa({ onAdicionar, minMes, maxMes }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [valor, setValor] = useState('');

  function submit() {
    if (!inicio || !valor) return;
    onAdicionar({ inicio, fim: fim || null, valor: parseFloat(valor) });
    setInicio(''); setFim(''); setValor('');
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Adicionar faixa
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="campo-label">Início * <span className="text-gray-400 font-normal">(mês/ano)</span></label>
          <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo-input" min={minMes} max={maxMes} />
        </div>
        <div>
          <label className="campo-label">Fim <span className="text-gray-400 font-normal">(vazio = vigente)</span></label>
          <input type="month" value={fim} onChange={(e) => setFim(e.target.value)} className="campo-input" min={minMes || inicio} max={maxMes} />
        </div>
        <div>
          <label className="campo-label">Valor (R$) *</label>
          <input
            type="number" value={valor} onChange={(e) => setValor(e.target.value)}
            className="campo-input" step="0.01" min="0" placeholder="0,00"
          />
        </div>
      </div>
      <button
        type="button" onClick={submit}
        disabled={!inicio || !valor}
        className="btn-secundario flex items-center gap-1 text-sm mt-2 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar faixa
      </button>
    </div>
  );
}

function TabelaFaixas({ faixas, onRemover }) {
  const resolvidas = resolverFaixas(faixas);
  const temSobreposicao = resolvidas.some((f) => f.sobreposicao);

  if (faixas.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-2">Nenhuma faixa cadastrada.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-1 text-gray-500 font-medium text-xs">Início</th>
            <th className="text-left py-1 text-gray-500 font-medium text-xs pl-2">Fim cad.</th>
            <th className="text-left py-1 text-gray-500 font-medium text-xs pl-2">Fim efetivo</th>
            <th className="text-right py-1 text-gray-500 font-medium text-xs">Valor</th>
            <th className="w-6"></th>
          </tr>
        </thead>
        <tbody>
          {resolvidas.map((f, idx) => (
            <tr key={idx} className={`border-b border-gray-50 ${f.sobreposicao ? 'bg-amber-50' : ''}`}>
              <td className="py-1 font-mono text-xs">{fmtComp(f.inicio)}</td>
              <td className="py-1 pl-2 font-mono text-xs text-gray-500">
                {f.fim ? fmtComp(f.fim) : <span className="italic text-gray-400">vigente</span>}
              </td>
              <td className="py-1 pl-2 font-mono text-xs">
                {f.fimEfetivo
                  ? <span className={f.sobreposicao ? 'text-amber-700 font-medium' : ''}>{fmtComp(f.fimEfetivo)}</span>
                  : <span className="italic text-green-600">vigente</span>}
              </td>
              <td className="py-1 text-right font-mono font-semibold text-xs">{formatBRL(f.valor)}</td>
              <td className="py-1">
                <button type="button" onClick={() => onRemover(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {temSobreposicao && (
        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <AlertCircle size={11} />
          Sobreposição detectada — fim efetivo da faixa anterior ajustado automaticamente.
        </p>
      )}
    </div>
  );
}

/** Modal de importação de histórico salarial via análise de texto */
function ModalImportarIA({ onImportar, onFechar }) {
  const [texto, setTexto] = useState('');
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [selecionados, setSelecionados] = useState({});
  const [erro, setErro] = useState('');

  async function analisar() {
    if (!texto.trim()) return;
    setAnalisando(true); setErro(''); setResultados(null);
    try {
      const resp = await fetch('/api/calculos/parse-historico-salarial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro || 'Erro na análise');
      const res = json.resultados || [];
      setResultados(res);
      // Pré-selecionar todos
      const sel = {};
      res.forEach((_, i) => { sel[i] = true; });
      setSelecionados(sel);
    } catch (e) {
      setErro(e.message);
    } finally {
      setAnalisando(false);
    }
  }

  function importar() {
    if (!resultados) return;
    const faixas = resultados
      .filter((_, i) => selecionados[i])
      .map(r => ({ inicio: r.mesAno, fim: null, valor: r.valor }));
    if (faixas.length > 0) onImportar(faixas);
    onFechar();
  }

  const numSel = Object.values(selecionados).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primaria" />
            <h3 className="font-semibold text-gray-800">Importar Histórico via Texto</h3>
          </div>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="campo-label">Cole o texto com o histórico salarial</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="campo-input min-h-[120px] font-mono text-xs"
              placeholder={'Exemplos aceitos:\n• Jan/2022: R$ 3.500,00\n• 01/2022 R$ 3.500,00\n• 2022-01 3500.00\n• janeiro 2022 - 3.500,00'}
            />
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <button type="button" onClick={analisar} disabled={analisando || !texto.trim()}
            className="btn-primario w-full flex items-center justify-center gap-2 disabled:opacity-50">
            <Sparkles size={16} />
            {analisando ? 'Analisando...' : 'Analisar texto'}
          </button>

          {resultados !== null && (
            <div>
              {resultados.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">Nenhum dado encontrado. Tente um formato diferente.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">{resultados.length} registros encontrados</p>
                    <button type="button" className="text-xs text-primaria hover:underline"
                      onClick={() => {
                        const all = resultados.every((_, i) => selecionados[i]);
                        const novo = {};
                        resultados.forEach((_, i) => { novo[i] = !all; });
                        setSelecionados(novo);
                      }}>
                      {resultados.every((_, i) => selecionados[i]) ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {resultados.map((r, i) => (
                      <label key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={!!selecionados[i]}
                          onChange={() => setSelecionados(p => ({ ...p, [i]: !p[i] }))} />
                        <span className="font-mono text-xs text-gray-600 w-20">{r.mesAno}</span>
                        <span className="font-mono text-sm font-semibold text-gray-800">{formatBRL(r.valor)}</span>
                      </label>
                    ))}
                  </div>
                  <button type="button" onClick={importar} disabled={numSel === 0}
                    className="btn-primario w-full mt-3 disabled:opacity-50">
                    Importar {numSel} {numSel === 1 ? 'registro' : 'registros'} como faixas
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal de importação de histórico salarial via arquivo (PDF/xlsx/imagem) usando IA */
function ModalImportarArquivo({ onImportarParcelas, onFechar }) {
  const [arquivo, setArquivo] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [selecionados, setSelecionados] = useState({});
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);

  async function processar() {
    if (!arquivo) return;
    setProcessando(true); setErro(''); setResultados(null);
    try {
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      const resp = await fetch('/api/calculos/parse-historico-arquivo', { method: 'POST', body: formData });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.erro || 'Erro ao processar arquivo');
      const res = json.resultados || [];
      setResultados(res);
      const sel = {};
      res.forEach((_, i) => { sel[i] = true; });
      setSelecionados(sel);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  function importar() {
    if (!resultados) return;
    const grupos = {};
    resultados.forEach((r, i) => {
      if (!selecionados[i]) return;
      const key = r.descricao || 'Histórico Importado';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(r);
    });
    const parcelas = Object.entries(grupos).map(([nome, registros]) => ({
      id: `parc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      nome,
      faixas: consolidarFaixas(registros),
    }));
    if (parcelas.length > 0) onImportarParcelas(parcelas);
    onFechar();
  }

  const rubricas = resultados ? [...new Set(resultados.map(r => r.descricao || 'Histórico Importado'))] : [];
  const numSel = Object.values(selecionados).filter(Boolean).length;
  const gruposSel = new Set(
    (resultados || []).filter((_, i) => selecionados[i]).map(r => r.descricao || 'Histórico Importado')
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-primaria" />
            <h3 className="font-semibold text-gray-800">Importar Histórico via Arquivo</h3>
          </div>
          <button type="button" onClick={onFechar} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Zona de upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              arquivo ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-primaria hover:bg-blue-50'
            }`}
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setArquivo(f); setResultados(null); } }}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files[0]; if (f) { setArquivo(f); setResultados(null); } }}
            />
            {arquivo ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-700 font-medium text-sm">{arquivo.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setArquivo(null); setResultados(null); }}
                  className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </div>
            ) : (
              <>
                <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Clique ou arraste um arquivo</p>
                <p className="text-xs text-gray-400 mt-1">PDF, Excel, CSV, JPG, PNG, WebP — máx. 10 MB</p>
              </>
            )}
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <button type="button" onClick={processar} disabled={processando || !arquivo}
            className="btn-primario w-full flex items-center justify-center gap-2 disabled:opacity-50">
            <Sparkles size={16} />
            {processando ? 'Processando com IA...' : 'Processar com IA'}
          </button>

          {resultados !== null && (
            <div>
              {resultados.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">Nenhum dado encontrado no arquivo.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {resultados.length} registros · {rubricas.length} {rubricas.length === 1 ? 'rubrica' : 'rubricas'}
                    </p>
                    <button type="button" className="text-xs text-primaria hover:underline"
                      onClick={() => {
                        const all = resultados.every((_, i) => selecionados[i]);
                        const novo = {};
                        resultados.forEach((_, i) => { novo[i] = !all; });
                        setSelecionados(novo);
                      }}>
                      {resultados.every((_, i) => selecionados[i]) ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                    {rubricas.map(rubrica => {
                      const itens = resultados.map((r, i) => ({ ...r, _idx: i }))
                        .filter(r => (r.descricao || 'Histórico Importado') === rubrica);
                      return (
                        <div key={rubrica}>
                          <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {rubrica}
                          </div>
                          {itens.map(r => (
                            <label key={r._idx} className="flex items-center gap-3 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                              <input type="checkbox" checked={!!selecionados[r._idx]}
                                onChange={() => setSelecionados(p => ({ ...p, [r._idx]: !p[r._idx] }))} />
                              <span className="font-mono text-xs text-gray-600 w-20">{r.mesAno}</span>
                              <span className="font-mono text-sm font-semibold text-gray-800">{formatBRL(r.valor)}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {numSel} {numSel === 1 ? 'registro selecionado' : 'registros selecionados'} →{' '}
                    {gruposSel.size} {gruposSel.size === 1 ? 'rubrica será criada' : 'rubricas serão criadas'}
                  </p>
                  <button type="button" onClick={importar} disabled={numSel === 0}
                    className="btn-primario w-full mt-3 disabled:opacity-50">
                    Importar {numSel} {numSel === 1 ? 'registro' : 'registros'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Painel de uma parcela dentro do histórico */
function ParcelaPanel({ parcela, histId, onUpdate, onRemover, minMes, maxMes }) {
  const [aberta, setAberta] = useState(false);
  const [modalIA, setModalIA] = useState(false);

  function addFaixa(faixa) {
    const novasFaixas = [...(parcela.faixas || []), faixa].sort((a, b) => a.inicio.localeCompare(b.inicio));
    onUpdate({ ...parcela, faixas: novasFaixas });
  }

  function addFaixas(faixas) {
    const existentes = parcela.faixas || [];
    const mesSet = new Set(existentes.map(f => f.inicio));
    const novas = faixas.filter(f => !mesSet.has(f.inicio));
    const merged = [...existentes, ...novas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    onUpdate({ ...parcela, faixas: merged });
  }

  function removeFaixa(idx) {
    onUpdate({ ...parcela, faixas: parcela.faixas.filter((_, i) => i !== idx) });
  }

  const ultimoValor = parcela.faixas?.length > 0 ? parcela.faixas[parcela.faixas.length - 1].valor : null;

  return (
    <>
      {modalIA && (
        <ModalImportarIA
          onImportar={addFaixas}
          onFechar={() => setModalIA(false)}
        />
      )}
      <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setAberta(!aberta)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm text-gray-800 truncate">{parcela.nome}</span>
            {parcela.faixas?.length > 0 && (
              <span className="text-xs text-gray-400 shrink-0">
                {parcela.faixas.length} {parcela.faixas.length === 1 ? 'faixa' : 'faixas'}
                {ultimoValor !== null && (
                  <span className="ml-1 text-gray-600 font-medium">· {formatBRL(ultimoValor)}/mês (atual)</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setModalIA(true); }}
              className="text-primaria hover:text-blue-700 p-0.5 flex items-center gap-1 text-xs"
              title="Importar via IA"
            >
              <Sparkles size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemover(); }}
              className="text-red-400 hover:text-red-600 p-0.5"
              title="Remover parcela"
            >
              <Trash2 size={13} />
            </button>
            {aberta ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
        {aberta && (
          <div className="p-3">
            <TabelaFaixas faixas={parcela.faixas || []} onRemover={removeFaixa} />
            <FormFaixa onAdicionar={addFaixa} minMes={minMes} maxMes={maxMes} />
          </div>
        )}
      </div>
    </>
  );
}

/** Formulário para adicionar nova parcela */
function FormParcela({ onAdicionar }) {
  const [nome, setNome] = useState('');

  function submit() {
    if (!nome.trim()) return;
    onAdicionar({ id: `parc_${Date.now()}`, nome: nome.trim(), faixas: [] });
    setNome('');
  }

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="campo-input flex-1"
        placeholder="Nome da rubrica (ex: Salário Base, Adicional de Função...)"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!nome.trim()}
        className="btn-secundario flex items-center gap-1 text-sm shrink-0 disabled:opacity-40"
      >
        <Plus size={14} /> Adicionar
      </button>
    </div>
  );
}

/** Consolida array de {mesAno, valor} em faixas com períodos de mesmo valor */
function consolidarFaixas(registros) {
  if (!registros.length) return [];
  const faixas = [];
  let faixaAtual = { inicio: registros[0].mesAno, fim: null, valor: registros[0].valor };
  for (let i = 1; i < registros.length; i++) {
    if (Number(registros[i].valor) !== Number(faixaAtual.valor)) {
      faixaAtual.fim = registros[i - 1].mesAno;
      faixas.push(faixaAtual);
      faixaAtual = { inicio: registros[i].mesAno, fim: null, valor: Number(registros[i].valor) };
    }
  }
  faixaAtual.fim = null;
  faixas.push(faixaAtual);
  return faixas;
}

export default function HistoricoSalarial({ dataAdmissao, dataDispensa }) {
  const { dados, setDados } = useCalculoStore();
  const historicos = dados.historicosSalariais || [
    { id: 'reclamante', titulo: 'Reclamante', fixo: true, parcelas: [] },
  ];
  const [expandido, setExpandido] = useState(null);
  const [carregandoSM, setCarregandoSM] = useState(false);
  const [modalArquivoHistId, setModalArquivoHistId] = useState(null);

  const minMes = dataAdmissao ? dataAdmissao.slice(0, 7) : undefined; // 'YYYY-MM'
  const maxMes = dataDispensa ? dataDispensa.slice(0, 7) : undefined; // 'YYYY-MM'

  function setHistoricos(nova) {
    setDados({ historicosSalariais: nova });
  }

  function addHistorico() {
    const novo = { id: `hist_${Date.now()}`, titulo: 'Novo Histórico', fixo: false, parcelas: [] };
    setHistoricos([...historicos, novo]);
    setExpandido(novo.id);
  }

  function removeHistorico(id) {
    setHistoricos(historicos.filter((h) => h.id !== id));
    if (expandido === id) setExpandido(null);
  }

  async function usarSalarioMinimo() {
    if (!dataAdmissao || !dataDispensa) {
      alert('Informe as datas de admissão e dispensa nos Dados do Contrato primeiro.');
      return;
    }
    const ok = window.confirm(
      `Criar rubrica "Salário Base" no histórico do Reclamante com os valores do salário mínimo vigente de ${dataAdmissao.slice(0, 7).split('-').reverse().join('/')} a ${dataDispensa.slice(0, 7).split('-').reverse().join('/')}?\n\nSe já existir uma rubrica "Salário Base", ela será substituída.`
    );
    if (!ok) return;
    setCarregandoSM(true);
    try {
      const res = await fetch(`/api/salario-minimo/faixas?inicio=${dataAdmissao}&fim=${dataDispensa}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || 'Erro ao buscar salário mínimo');
      const faixas = consolidarFaixas(json.faixas || []);
      if (!faixas.length) {
        alert('Nenhum dado de salário mínimo encontrado para o período informado.');
        return;
      }
      const novaParcela = {
        id: `parc_salario_base_${Date.now()}`,
        nome: 'Salário Base',
        faixas,
      };
      const reclamante = historicos.find(h => h.id === 'reclamante');
      if (!reclamante) return;
      const parcelasAtualizadas = [
        ...(reclamante.parcelas || []).filter(p => p.nome !== 'Salário Base'),
        novaParcela,
      ];
      setHistoricos(historicos.map(h =>
        h.id === 'reclamante' ? { ...h, parcelas: parcelasAtualizadas } : h
      ));
      setExpandido('reclamante');
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setCarregandoSM(false);
    }
  }

  function updateTitulo(id, titulo) {
    setHistoricos(historicos.map((h) => h.id === id ? { ...h, titulo } : h));
  }

  function addParcela(histId, parcela) {
    setHistoricos(historicos.map((h) =>
      h.id === histId ? { ...h, parcelas: [...(h.parcelas || []), parcela] } : h
    ));
  }

  function updateParcela(histId, parcelaId, parcelaAtualizada) {
    setHistoricos(historicos.map((h) =>
      h.id === histId
        ? { ...h, parcelas: h.parcelas.map((p) => p.id === parcelaId ? parcelaAtualizada : p) }
        : h
    ));
  }

  function removeParcela(histId, parcelaId) {
    setHistoricos(historicos.map((h) =>
      h.id === histId
        ? { ...h, parcelas: h.parcelas.filter((p) => p.id !== parcelaId) }
        : h
    ));
  }

  function addParcelas(histId, novasParcelas) {
    setHistoricos(historicos.map((h) =>
      h.id === histId ? { ...h, parcelas: [...(h.parcelas || []), ...novasParcelas] } : h
    ));
  }

  return (
    <div className="space-y-3">
      {modalArquivoHistId && (
        <ModalImportarArquivo
          onImportarParcelas={(parcelas) => addParcelas(modalArquivoHistId, parcelas)}
          onFechar={() => setModalArquivoHistId(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Registre a evolução de cada rubrica ao longo do contrato. Use como base de cálculo nas parcelas mensais.
          {minMes && maxMes && (
            <span className="ml-1 font-medium text-gray-600">Período: {minMes.split('-').reverse().join('/')} a {maxMes.split('-').reverse().join('/')}</span>
          )}
        </p>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            type="button"
            onClick={usarSalarioMinimo}
            disabled={carregandoSM}
            title="Gerar histórico Reclamante com salário mínimo do período"
            className="btn-secundario flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <TrendingUp size={14} />
            {carregandoSM ? 'Buscando...' : 'Usar Sal. Mínimo'}
          </button>
          <button type="button" onClick={addHistorico}
            className="btn-secundario flex items-center gap-2 text-sm">
            <Plus size={14} /> Novo Histórico
          </button>
        </div>
      </div>

      {historicos.map((h) => {
        const isOpen = expandido === h.id;
        const totalParcelas = (h.parcelas || []).length;

        return (
          <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandido(isOpen ? null : h.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {h.fixo && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Principal
                  </span>
                )}
                <span className="font-semibold text-sm text-gray-800 truncate">{h.titulo}</span>
                <span className="text-xs text-gray-400 shrink-0">
                  {totalParcelas} {totalParcelas === 1 ? 'rubrica' : 'rubricas'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {!h.fixo && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); removeHistorico(h.id); }}
                    className="text-red-400 hover:text-red-600 p-1" title="Remover histórico">
                    <Trash2 size={14} />
                  </button>
                )}
                {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="p-4">
                {!h.fixo && (
                  <div className="mb-4">
                    <label className="campo-label">Nome do Histórico</label>
                    <input
                      type="text" value={h.titulo}
                      onChange={(e) => updateTitulo(h.id, e.target.value)}
                      className="campo-input"
                      placeholder="Ex: Paradigma, Salário da Categoria..."
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Rubricas / Parcelas
                  </p>
                  {h.fixo && (
                    <p className="text-xs text-gray-400 mb-2">
                      Cada rubrica representa um componente salarial do reclamante com sua evolução histórica.
                      Para usar como base de cálculo em parcelas mensais, selecione <strong>{h.titulo} → [rubrica]</strong>.
                    </p>
                  )}

                  {(h.parcelas || []).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">
                      Nenhuma rubrica cadastrada.
                    </p>
                  )}

                  {(h.parcelas || []).map((parcela) => (
                    <ParcelaPanel
                      key={parcela.id}
                      parcela={parcela}
                      histId={h.id}
                      onUpdate={(p) => updateParcela(h.id, parcela.id, p)}
                      onRemover={() => removeParcela(h.id, parcela.id)}
                      minMes={minMes}
                      maxMes={maxMes}
                    />
                  ))}

                  <FormParcela onAdicionar={(p) => addParcela(h.id, p)} />
                  <button
                    type="button"
                    onClick={() => setModalArquivoHistId(h.id)}
                    className="btn-secundario flex items-center gap-2 text-sm mt-2"
                  >
                    <Upload size={14} /> Importar por Arquivo (IA)
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

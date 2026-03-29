import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useCalculoStore } from '../../store/calculoStore.js';

// Templates que requerem configuração de jornada (parâmetros tratados na aba Jornada)
const PARCELAS_JORNADA_IDS = ['tpl_horas_extras', 'tpl_noturno', 'tpl_intervalo'];

// Templates de insalubridade e periculosidade que populam campos especiais do store
const TEMPLATE_INSALUBRIDADE = 'tpl_insalubridade';
const TEMPLATE_PERICULOSIDADE = 'tpl_periculosidade';

function CampoData({ label, value, onChange }) {
  return (
    <div>
      <label className="campo-label text-xs">{label}</label>
      <input
        type="date"
        className="campo-input text-sm"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function CardParcela({ parcela, idx, onUpdate, dadosContrato, setDados }) {
  const [expandido, setExpandido] = useState(true);
  const isJornada = PARCELAS_JORNADA_IDS.includes(parcela._templateId);
  const isInsalubridade = parcela._templateId === TEMPLATE_INSALUBRIDADE;
  const isPericulosidade = parcela._templateId === TEMPLATE_PERICULOSIDADE;

  function handleValorBase(v) {
    onUpdate(idx, { ...parcela, valorBase: v === '' ? null : Number(v) });
  }

  function handlePercentualBase(v) {
    onUpdate(idx, { ...parcela, percentualBase: v === '' ? null : Number(v) });
  }

  function handlePeriodo(campo, v) {
    onUpdate(idx, { ...parcela, [campo]: v || null });
  }

  // Para insalubridade: populamos os campos especiais do store
  function handleInsalubridade(campo, v) {
    setDados({ [campo]: v ? (campo === 'adicionalInsalubridadePercentual' ? Number(v) / 100 : v) : undefined });
  }

  // Para periculosidade: populamos os campos especiais do store
  function handlePericulosidade(campo, v) {
    setDados({ [campo]: v ? (campo === 'adicionalPericulosidadePercentual' ? Number(v) / 100 : v) : undefined });
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer select-none"
        onClick={() => setExpandido(!expandido)}
      >
        <Settings size={16} className="text-primaria shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{parcela.nome}</p>
          <p className="text-xs text-gray-400">
            {parcela.natureza} · {parcela.frequencia}
            {parcela.valorBase ? ` · R$ ${Number(parcela.valorBase).toFixed(2)}` : ''}
            {parcela.percentualBase ? ` · ${parcela.percentualBase}%` : ''}
          </p>
        </div>
        {expandido ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>

      {expandido && (
        <div className="px-4 py-4 space-y-3">
          {/* Parcelas de jornada — configuradas na aba Jornada */}
          {isJornada && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Esta parcela requer a configuração da jornada de trabalho. Os parâmetros (horas, divisor e adicional) serão definidos na próxima aba <strong>Jornada</strong>.
              </p>
            </div>
          )}

          {/* Insalubridade — popula campos especiais do store */}
          {isInsalubridade && (
            <>
              <div>
                <label className="campo-label text-xs">Percentual do Adicional (%)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[10, 20, 40].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleInsalubridade('adicionalInsalubridadePercentual', pct)}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${
                        Math.round((dadosContrato.adicionalInsalubridadePercentual || 0) * 100) === pct
                          ? 'border-primaria bg-blue-50 text-primaria font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {pct}% {pct === 10 ? '(Mínimo)' : pct === 20 ? '(Médio)' : '(Máximo)'}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Ou informe outro percentual:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="campo-input text-sm w-24"
                    value={Math.round((dadosContrato.adicionalInsalubridadePercentual || 0) * 100) || ''}
                    onChange={e => handleInsalubridade('adicionalInsalubridadePercentual', e.target.value)}
                    placeholder="%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoData
                  label="Início da exposição"
                  value={dadosContrato.dataInicioInsalubridade}
                  onChange={v => handleInsalubridade('dataInicioInsalubridade', v)}
                />
                <CampoData
                  label="Fim da exposição (deixe em branco se até a dispensa)"
                  value={dadosContrato.dataFimInsalubridade}
                  onChange={v => handleInsalubridade('dataFimInsalubridade', v)}
                />
              </div>
            </>
          )}

          {/* Periculosidade — popula campos especiais do store */}
          {isPericulosidade && (
            <>
              <div>
                <label className="campo-label text-xs">Percentual do Adicional (%)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[30].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePericulosidade('adicionalPericulosidadePercentual', pct)}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${
                        Math.round((dadosContrato.adicionalPericulosidadePercentual || 0) * 100) === pct
                          ? 'border-primaria bg-blue-50 text-primaria font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {pct}% (padrão CLT)
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Ou informe outro percentual (CCT):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="campo-input text-sm w-24"
                    value={Math.round((dadosContrato.adicionalPericulosidadePercentual || 0) * 100) || ''}
                    onChange={e => handlePericulosidade('adicionalPericulosidadePercentual', e.target.value)}
                    placeholder="%"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CampoData
                  label="Início da atividade perigosa"
                  value={dadosContrato.dataInicioPericulosidade}
                  onChange={v => handlePericulosidade('dataInicioPericulosidade', v)}
                />
                <CampoData
                  label="Fim da atividade perigosa (deixe em branco se até a dispensa)"
                  value={dadosContrato.dataFimPericulosidade}
                  onChange={v => handlePericulosidade('dataFimPericulosidade', v)}
                />
              </div>
            </>
          )}

          {/* Parcelas com período específico */}
          {!isJornada && !isInsalubridade && !isPericulosidade && parcela.periodoTipo === 'especifico' && (
            <div className="grid grid-cols-2 gap-3">
              <CampoData label="Início do período" value={parcela.periodoInicio} onChange={v => handlePeriodo('periodoInicio', v)} />
              <CampoData label="Fim do período" value={parcela.periodoFim} onChange={v => handlePeriodo('periodoFim', v)} />
            </div>
          )}

          {/* Parcelas com valor fixo */}
          {!isJornada && !isInsalubridade && !isPericulosidade && parcela.tipoValor === 'fixo' && (
            <div>
              <label className="campo-label text-xs">Valor mensal (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="campo-input text-sm"
                value={parcela.valorBase ?? ''}
                onChange={e => handleValorBase(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          {/* Parcelas com percentual configurável (não jornada, não ins/peric) */}
          {!isJornada && !isInsalubridade && !isPericulosidade &&
            (parcela.tipoValor === 'percentual_salario' || parcela.tipoValor === 'percentual_sm') && (
            <div>
              <label className="campo-label text-xs">
                Percentual ({parcela.tipoValor === 'percentual_sm' ? '% do salário mínimo' : '% do salário'})
              </label>
              <input
                type="number"
                min="0"
                max="200"
                step="0.5"
                className="campo-input text-sm"
                value={parcela.percentualBase ?? ''}
                onChange={e => handlePercentualBase(e.target.value)}
                placeholder="%"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConfigurarParcelas() {
  const { dados, setDados, setStep } = useCalculoStore();
  const [parcelasLocais, setParcelasLocais] = useState(dados.parcelasPersonalizadas || []);
  const [abaAtiva, setAbaAtiva] = useState(0);

  // Determinar se precisa de aba Jornada
  const precisaJornada = parcelasLocais.some(p => PARCELAS_JORNADA_IDS.includes(p._templateId));

  function onNext() {
    setDados({ parcelasPersonalizadas: parcelasLocais });
    setStep(precisaJornada ? 6 : 7);
  }

  function onBack() {
    setDados({ parcelasPersonalizadas: parcelasLocais });
    setStep(5);
  }

  function handleUpdateParcela(idx, updated) {
    const novas = parcelasLocais.map((p, i) => i === idx ? updated : p);
    setParcelasLocais(novas);
  }

  // Sincronizar se store mudar externamente
  useEffect(() => {
    setParcelasLocais(dados.parcelasPersonalizadas || []);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (parcelasLocais.length === 0) {
    return (
      <div className="max-w-3xl">
        <div className="card p-6 mb-4 text-center text-gray-400">
          <p className="text-sm">Nenhuma parcela selecionada. Volte e adicione parcelas ao cálculo.</p>
        </div>
        <div className="flex justify-between">
          <button type="button" className="btn-secundario" onClick={onBack}>← Anterior</button>
          <button type="button" className="btn-primario" onClick={onNext}>Próximo →</button>
        </div>
      </div>
    );
  }

  const abaIdx = Math.min(abaAtiva, parcelasLocais.length - 1);

  return (
    <div className="max-w-3xl">
      <div className="card mb-4 overflow-hidden">
        {/* Abas — uma por parcela */}
        <div className="flex border-b overflow-x-auto bg-gray-50">
          {parcelasLocais.map((p, i) => (
            <button
              key={p._localId || p.id || i}
              type="button"
              onClick={() => setAbaAtiva(i)}
              className={`px-4 py-3 text-sm font-medium shrink-0 border-b-2 transition-colors whitespace-nowrap ${
                i === abaIdx
                  ? 'border-primaria text-primaria bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {i + 1}. {p.nome}
            </button>
          ))}
        </div>

        {/* Conteúdo da aba ativa */}
        <div className="p-4">
          <CardParcela
            key={parcelasLocais[abaIdx]?._localId || parcelasLocais[abaIdx]?.id || abaIdx}
            parcela={parcelasLocais[abaIdx]}
            idx={abaIdx}
            onUpdate={handleUpdateParcela}
            dadosContrato={dados}
            setDados={setDados}
          />
        </div>

        {/* Navegação entre abas */}
        {parcelasLocais.length > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <button
              type="button"
              className="btn-secundario text-xs py-1.5 px-3 disabled:opacity-40"
              disabled={abaIdx === 0}
              onClick={() => setAbaAtiva(abaIdx - 1)}
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">{abaIdx + 1} / {parcelasLocais.length}</span>
            <button
              type="button"
              className="btn-secundario text-xs py-1.5 px-3 disabled:opacity-40"
              disabled={abaIdx === parcelasLocais.length - 1}
              onClick={() => setAbaAtiva(abaIdx + 1)}
            >
              Próxima →
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button type="button" className="btn-secundario" onClick={onBack}>← Anterior</button>
        <button type="button" className="btn-primario" onClick={onNext}>
          {precisaJornada ? 'Próximo: Jornada →' : 'Próximo →'}
        </button>
      </div>
    </div>
  );
}

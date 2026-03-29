import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import LegalTooltip from '../LegalTooltip';

function formatBRL(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

const MEMORIA_LABELS = {
  base: 'Base de cálculo',
  baseGts: 'Base FGTS',
  baseFgts: 'Base FGTS',
  base13: 'Base 13º',
  baseFerias: 'Base férias',
  valorHoraNormal: 'Valor hora normal',
  valorHora: 'Valor hora (c/ adicional)',
  adicionalHora: 'Adicional por hora',
  heFixo: 'HE s/ salário fixo',
  heComissoes: 'HE s/ comissões',
  mediaHeMensal: 'Média HE mensal',
  mediaANMensal: 'Média adicional noturno mensal',
  mediaInsMensal: 'Média insalubridade mensal',
  mediaPerMensal: 'Média periculosidade mensal',
  mesesFerias: 'Meses p/ férias (avos)',
  meses13: 'Meses p/ 13º',
  meses: 'Meses trabalhados',
  mesesTrabalhados: 'Meses trabalhados',
  mesesCompletos: 'Meses completos',
  mesesEfetivos: 'Meses efetivos',
  diasRestantes: 'Dias restantes',
  diasNoMes: 'Dias no mês',
  dias: 'Dias',
  diasAviso: 'Dias de aviso prévio',
  avos: 'Avos (fração do período)',
  qtde: 'Quantidade de períodos',
  aliquota: 'Alíquota',
  percentual: 'Percentual',
  multiplicador: 'Multiplicador',
  modalidade: 'Modalidade',
  criterio: 'Critério legal',
  regraQuinze: 'Regra dos 15 dias',
  prorrogacaoNoturna: 'Prorrogação noturna',
  oj97: 'OJ 97 SDI-1 TST',
  descontoPagoParcialmente: 'Desconto (pago parcialmente)',
  integralizado: 'FGTS integralizado',
  depositado: 'FGTS depositado',
  fgtsBruto: 'FGTS bruto (sem depósito)',
  divisorJornada: 'Divisor de jornada',
  adicionalHE: 'Adicional HE',
  horasExtrasMensais: 'Horas extras mensais',
  horasNoturnas: 'Horas noturnas',
  adicionalNoturno: 'Adicional noturno',
  comissoes: 'Comissões',
  salarioBase: 'Salário base',
  percentualPericulosidade: 'Percentual',
};

const VALOR_KEYS = new Set([
  'base', 'baseGts', 'baseFgts', 'base13', 'baseFerias',
  'valorHoraNormal', 'valorHora', 'adicionalHora',
  'heFixo', 'heComissoes', 'mediaHeMensal', 'mediaANMensal', 'mediaInsMensal', 'mediaPerMensal',
  'descontoPagoParcialmente', 'depositado', 'fgtsBruto',
]);

const PCT_KEYS = new Set(['aliquota', 'percentual']);

// Keys handled separately — not shown in scalar loop
const HIDDEN_KEYS = new Set([
  'formula', 'motivo', 'distribuicaoMensal', 'itens', 'detalhes',
  'fundamentoLegal', 'componentes', 'periodo', 'periodosDetalhados',
  'usouHistorico',
]);

function formatDate(d) {
  if (!d) return '—';
  // Handles YYYY-MM-DD or YYYY-MM
  const parts = String(d).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return d;
}

function formatMemoriaValue(key, val) {
  if (val === null || val === undefined) return '—';
  if (PCT_KEYS.has(key)) {
    const num = parseFloat(val);
    if (!isNaN(num) && num <= 1) return `${(num * 100).toFixed(2)}%`;
    return String(val);
  }
  if (VALOR_KEYS.has(key)) {
    const num = parseFloat(val);
    if (!isNaN(num)) return formatBRL(num);
  }
  // Auto-detect: numeric keys that look like monetary values (> 1 or contain decimal)
  if (typeof val === 'number' && (String(val).includes('.') || val > 100)) {
    // Could be a monetary value — but only if the key suggests it
    if (/valor|salario|base|total|bruto|liquido|desconto|depositado/i.test(key)) {
      return formatBRL(val);
    }
  }
  return String(val);
}

function VerbaRow({ verba, onToggle, modoEdicao, getNomeVerba, getValorVerba, editarVerba }) {
  const [expandida, setExpandida] = useState(false);
  const [mostrarDistribuicao, setMostrarDistribuicao] = useState(false);
  const isZero = modoEdicao ? getValorVerba(verba) === 0 : verba.valor === 0;
  const isExcluida = verba.excluida;

  return (
    <>
      <tr className={isExcluida || isZero ? 'opacity-40' : ''}>
        <td>
          {modoEdicao ? (
            <input
              type="text"
              className="campo-input text-xs py-1 px-2 w-40"
              value={getNomeVerba(verba)}
              onChange={e => editarVerba(verba.codigo, 'nome', e.target.value)}
            />
          ) : (
            <div>
              <button
                className="flex items-center gap-1 text-left text-sm w-full"
                onClick={() => setExpandida(!expandida)}
              >
                {expandida ? <ChevronDown size={14} className="flex-shrink-0" /> : <ChevronRight size={14} className="flex-shrink-0" />}
                <span className="font-medium">{verba.nome}</span>
                <LegalTooltip codigo={verba.codigo} />
              </button>
              {verba.memoria?.criterio && (
                <span className="inline-block text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 mt-1">
                  {verba.memoria.criterio}
                </span>
              )}
            </div>
          )}
        </td>
        <td className="text-center text-xs">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            verba.natureza === 'salarial'
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}>
            {verba.natureza === 'salarial' ? 'salarial' : 'indeniz.'}
          </span>
        </td>
        <td className="text-center text-xs text-gray-500">{verba.incideFgts ? '✓' : '—'}</td>
        <td className="text-center text-xs text-gray-500">{verba.incideInss ? '✓' : '—'}</td>
        <td className="text-right font-mono font-semibold text-gray-800 pr-2">
          {modoEdicao ? (
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-gray-400">R$</span>
              <input
                type="number"
                className="campo-input text-xs py-1 px-2 w-28 font-mono text-right"
                value={getValorVerba(verba)}
                step="0.01"
                min="0"
                onChange={e => editarVerba(verba.codigo, 'valor', e.target.value)}
              />
            </div>
          ) : (
            formatBRL(verba.valor)
          )}
        </td>
        <td className="text-center">
          <input
            type="checkbox"
            checked={!isExcluida}
            onChange={() => onToggle && onToggle(verba.codigo)}
            className="cursor-pointer accent-blue-600"
            title={isExcluida ? 'Incluir verba' : 'Excluir verba'}
          />
        </td>
      </tr>
      {!modoEdicao && expandida && verba.memoria && (
        <tr>
          <td colSpan={6} className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <div className="text-xs text-slate-600 space-y-2">
              {/* Fundamento Legal */}
              {verba.memoria.fundamentoLegal && (
                <span className="inline-block bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                  {verba.memoria.fundamentoLegal}
                </span>
              )}

              {/* Fórmula */}
              {verba.memoria.formula && (
                <p className="font-mono bg-white border border-slate-200 rounded px-3 py-2 text-slate-700 break-words">
                  {verba.memoria.formula}
                </p>
              )}
              {verba.memoria.motivo && (
                <p className="italic text-slate-500">{verba.memoria.motivo}</p>
              )}

              {/* Período */}
              {verba.memoria.periodo && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium">
                    Período: {formatDate(verba.memoria.periodo.inicio)} a {formatDate(verba.memoria.periodo.fim)}
                    {verba.memoria.periodo.meses ? ` (${verba.memoria.periodo.meses} meses)` : ''}
                  </span>
                </div>
              )}

              {/* Composição da Base */}
              {verba.memoria.componentes && Object.keys(verba.memoria.componentes).length > 0 && (
                <div className="bg-white border border-slate-200 rounded p-2">
                  <p className="font-semibold text-slate-700 mb-1">Composição da Base</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5">
                    {Object.entries(verba.memoria.componentes).map(([k, v]) => (
                      <p key={k} className="flex gap-1">
                        <span className="text-slate-500">{MEMORIA_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
                        <span className="font-mono font-medium">{formatMemoriaValue(k, v)}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Campos escalares da memória */}
              {Object.entries(verba.memoria)
                .filter(([k]) => !HIDDEN_KEYS.has(k))
                .map(([k, v]) => {
                  if (typeof v === 'object' && v !== null) return null;
                  const label = MEMORIA_LABELS[k] || k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
                  const displayVal = formatMemoriaValue(k, v);
                  return (
                    <p key={k} className="flex gap-1 flex-wrap">
                      <span className="font-medium text-slate-700">{label}:</span>
                      <span className="font-mono">{displayVal}</span>
                    </p>
                  );
                })}

              {/* Períodos detalhados (férias/13º por período) */}
              {verba.memoria.periodosDetalhados?.length > 0 && (
                <div className="mt-1">
                  <p className="font-semibold text-slate-700 mb-1">Detalhamento por Período</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-slate-200 rounded">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left px-3 py-1.5 font-medium text-slate-700">Período / Ano</th>
                          <th className="text-right px-3 py-1.5 font-medium text-slate-700">Bruto</th>
                          <th className="text-right px-3 py-1.5 font-medium text-slate-700">Pago</th>
                          <th className="text-right px-3 py-1.5 font-medium text-slate-700">Devido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verba.memoria.periodosDetalhados.map((d, i) => (
                          <tr key={i} className="border-t border-slate-100 hover:bg-white">
                            <td className="px-3 py-1 text-slate-600">
                              {d.periodo || d.anoReferencia || `#${d.numero || i + 1}`}
                            </td>
                            <td className="px-3 py-1 text-right font-mono text-slate-600">{formatBRL(d.bruto)}</td>
                            <td className="px-3 py-1 text-right font-mono text-amber-700">
                              {d.valorPago > 0 ? `(${formatBRL(d.valorPago)})` : '—'}
                            </td>
                            <td className="px-3 py-1 text-right font-mono font-medium text-slate-700">{formatBRL(d.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Demonstrativo mensal para parcelas calculadas sobre histórico salarial */}
              {verba.memoria.distribuicaoMensal?.length > 0 && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarDistribuicao(v => !v)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    {mostrarDistribuicao ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {mostrarDistribuicao ? 'Ocultar demonstrativo mensal' : `Ver demonstrativo mensal (${verba.memoria.distribuicaoMensal.length} meses)`}
                  </button>
                  {mostrarDistribuicao && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs border border-slate-200 rounded">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="text-left px-3 py-1.5 font-medium text-slate-700">Competência</th>
                            <th className="text-right px-3 py-1.5 font-medium text-slate-700">Salário Base</th>
                            <th className="text-right px-3 py-1.5 font-medium text-slate-700">Valor Parcela</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verba.memoria.distribuicaoMensal.map((m) => {
                            const comp = m.mes || m.competencia;
                            return (
                              <tr key={comp} className="border-t border-slate-100 hover:bg-white">
                                <td className="px-3 py-1 font-mono text-slate-600">
                                  {comp.split('-').reverse().join('/')}
                                </td>
                                <td className="px-3 py-1 text-right font-mono text-slate-600">
                                  {formatBRL(m.valorBase || m.salarioBase)}
                                </td>
                                <td className="px-3 py-1 text-right font-mono font-medium text-slate-700">
                                  {formatBRL(m.valor)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300 bg-slate-100">
                            <td colSpan={2} className="px-3 py-1.5 font-bold text-slate-700">Total</td>
                            <td className="px-3 py-1.5 text-right font-bold font-mono text-slate-800">
                              {formatBRL(verba.memoria.distribuicaoMensal.reduce((s, m) => s + (m.valor || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MemoriaCalculo({
  verbas = [],
  subtotal = 0,
  deducoes = {},
  total = 0,
  honorarios = 0,
  honorariosPericiais = 0,
  custas = 0,
  totalComHonorarios = 0,
  onToggle,
  apenasComValor = true,
  onSalvarEdicao,
}) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [verbasEditadas, setVerbasEditadas] = useState({});

  function getValorVerba(v) {
    return verbasEditadas[v.codigo]?.valor !== undefined
      ? Number(verbasEditadas[v.codigo].valor)
      : v.valor;
  }

  function getNomeVerba(v) {
    return verbasEditadas[v.codigo]?.nome !== undefined
      ? verbasEditadas[v.codigo].nome
      : v.nome;
  }

  function editarVerba(codigo, campo, valor) {
    setVerbasEditadas(prev => ({
      ...prev,
      [codigo]: { ...prev[codigo], [campo]: valor }
    }));
  }

  // Recalcula subtotal com verbas editadas
  const subtotalEditado = (verbas || [])
    .filter(v => !v.excluida && getValorVerba(v) > 0)
    .reduce((acc, v) => acc + getValorVerba(v), 0);

  const totalEditado = Math.max(0, subtotalEditado - (deducoes?.total || 0));

  const verbasVisiveis = mostrarTodas
    ? verbas
    : verbas.filter((v) => !apenasComValor || v.valor > 0 || v.excluida);

  const subtotalExibido = modoEdicao ? subtotalEditado : subtotal;
  const totalExibido = modoEdicao ? totalEditado : total;

  return (
    <div className="overflow-x-auto">
      {/* Barra de controles */}
      <div className="flex items-center justify-between px-2 pb-2">
        {apenasComValor && (
          <button
            type="button"
            onClick={() => setMostrarTodas((v) => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            {mostrarTodas ? 'Ocultar verbas sem valor' : `Mostrar todas as verbas (${verbas.length})`}
          </button>
        )}
        {!apenasComValor && <span />}
        <button
          type="button"
          onClick={() => {
            if (modoEdicao) {
              setVerbasEditadas({});
            }
            setModoEdicao(v => !v);
          }}
          className={`text-xs px-3 py-1 rounded border font-medium transition-colors ${
            modoEdicao
              ? 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
              : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✏️ {modoEdicao ? 'Editando...' : 'Editar valores'}
        </button>
      </div>

      <table className="tabela-memoria">
        <thead>
          <tr>
            <th style={{ width: '36%' }}>Verba / Parcela</th>
            <th className="text-center" style={{ width: '11%' }}>Natureza</th>
            <th className="text-center" style={{ width: '7%' }}>FGTS</th>
            <th className="text-center" style={{ width: '7%' }}>INSS</th>
            <th className="text-right" style={{ width: '20%' }}>Valor</th>
            <th className="text-center" style={{ width: '7%' }}>Incl.</th>
          </tr>
        </thead>
        <tbody>
          {verbasVisiveis.map((v) => (
            <VerbaRow
              key={v.codigo}
              verba={v}
              onToggle={onToggle}
              modoEdicao={modoEdicao}
              getNomeVerba={getNomeVerba}
              getValorVerba={getValorVerba}
              editarVerba={editarVerba}
            />
          ))}
        </tbody>
        <tfoot>
          {/* Subtotal das verbas */}
          <tr style={{ backgroundColor: '#e8eaf6', borderTop: '2px solid #5c6bc0' }}>
            <td colSpan={4} className="font-bold text-indigo-900 pl-2 py-2">Subtotal da Condenação</td>
            <td className="text-right font-bold text-indigo-900 font-mono pr-2 py-2">{formatBRL(subtotalExibido)}</td>
            <td />
          </tr>

          {/* Deduções */}
          {deducoes.valorPago > 0 && (
            <tr style={{ backgroundColor: '#fff8e1' }}>
              <td colSpan={4} className="pl-6 text-sm text-amber-800">(-) Valor Pago na Rescisão</td>
              <td className="text-right font-mono text-amber-800 pr-2">({formatBRL(deducoes.valorPago)})</td>
              <td />
            </tr>
          )}
          {deducoes.deducoesGlobaisTotal > 0 && (
            <tr style={{ backgroundColor: '#fff8e1' }}>
              <td colSpan={4} className="pl-6 text-sm text-amber-800">(-) Compensações / Adiantamentos</td>
              <td className="text-right font-mono text-amber-800 pr-2">({formatBRL(deducoes.deducoesGlobaisTotal)})</td>
              <td />
            </tr>
          )}

          {/* Total após deduções */}
          <tr style={{ backgroundColor: '#e8f5e9', borderTop: '2px solid #66bb6a' }}>
            <td colSpan={4} className="font-bold text-green-900 pl-2 py-2">Total Líquido (após deduções)</td>
            <td className="text-right font-bold text-green-900 font-mono pr-2 py-2">{formatBRL(totalExibido)}</td>
            <td />
          </tr>

          {/* Honorários e Despesas */}
          {honorarios > 0 && (
            <tr style={{ backgroundColor: '#fce4ec' }}>
              <td colSpan={4} className="pl-6 text-sm font-semibold text-pink-900">
                (+) Honorários Advocatícios
              </td>
              <td className="text-right font-mono font-semibold text-pink-900 pr-2">{formatBRL(honorarios)}</td>
              <td />
            </tr>
          )}
          {honorariosPericiais > 0 && (
            <tr style={{ backgroundColor: '#fce4ec' }}>
              <td colSpan={4} className="pl-6 text-sm text-pink-800">
                (+) Honorários Periciais
              </td>
              <td className="text-right font-mono text-pink-800 pr-2">{formatBRL(honorariosPericiais)}</td>
              <td />
            </tr>
          )}
          {custas > 0 && (
            <tr style={{ backgroundColor: '#fce4ec' }}>
              <td colSpan={4} className="pl-6 text-sm text-pink-800">
                (+) Custas Processuais (2%)
              </td>
              <td className="text-right font-mono text-pink-800 pr-2">{formatBRL(custas)}</td>
              <td />
            </tr>
          )}

          {/* Total devido pelo reclamado */}
          <tr style={{ backgroundColor: '#1a3a5c', color: 'white', borderTop: '3px solid #0d2744' }}>
            <td colSpan={4} className="font-bold text-base pl-2 py-3 tracking-wide">TOTAL DEVIDO PELO RECLAMADO</td>
            <td className="text-right font-bold text-xl font-mono pr-2 py-3">{formatBRL(totalComHonorarios)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Rodapé de ações no modo edição */}
      {modoEdicao && (
        <div className="flex gap-2 justify-end px-4 py-3 border-t border-gray-100 bg-amber-50">
          <button
            type="button"
            onClick={() => { setVerbasEditadas({}); setModoEdicao(false); }}
            className="btn-secundario text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { onSalvarEdicao?.(verbasEditadas); setModoEdicao(false); }}
            className="btn-primario text-sm"
          >
            Salvar Edições
          </button>
        </div>
      )}
    </div>
  );
}

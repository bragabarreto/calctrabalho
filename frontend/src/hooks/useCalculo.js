import { useMutation } from '@tanstack/react-query';

// Filtra e converte tipos do store para o formato esperado pelo backend (schemaDadosContrato)
export function prepararDadosContrato(dados) {
  const toNum = (v, def = null) =>
    v === '' || v === null || v === undefined ? def : Number(v);
  const toDate = (v) => (v === '' || v === null || v === undefined ? null : v);

  return {
    // Datas
    dataAdmissao: dados.dataAdmissao,
    dataDispensa: dados.dataDispensa,
    dataAjuizamento: dados.dataAjuizamento,
    dataPgtoRescisorio: toDate(dados.dataPgtoRescisorio),
    avisoPrevioTrabalhado: Boolean(dados.avisoPrevioTrabalhado),

    // Remuneração
    ultimoSalario: toNum(dados.ultimoSalario),
    mediaSalarial: toNum(dados.mediaSalarial),
    comissoes: toNum(dados.comissoes, 0),
    gorjetas: toNum(dados.gorjetas, 0),
    salariosMesesAtrasados: toNum(dados.salariosMesesAtrasados, 0),
    comissoesMesesAtrasados: toNum(dados.comissoesMesesAtrasados, 0),
    gorjetasMesesAtrasados: toNum(dados.gorjetasMesesAtrasados, 0),

    // Férias e 13º
    qtdeFeriasVencidasDobradas: toNum(dados.qtdeFeriasVencidasDobradas, 0),
    qtdeFeriasVencidasSimples: toNum(dados.qtdeFeriasVencidasSimples, 0),
    qtdeDecimoTerceiroVencidos: toNum(dados.qtdeDecimoTerceiroVencidos, 0),

    // Jornada
    divisorJornada: toNum(dados.divisorJornada, 220),
    adicionalHoraExtra: toNum(dados.adicionalHoraExtra, 0.5),
    qtdeHorasExtrasMensais: toNum(dados.qtdeHorasExtrasMensais, 0),
    intervaloIntrajornadaMensalHoras: toNum(dados.intervaloIntrajornadaMensalHoras, 0),
    adicionalHoraNoturna: toNum(dados.adicionalHoraNoturna, 0.2),
    qtdeHorasNoturnasMensais: toNum(dados.qtdeHorasNoturnasMensais, 0),

    // Adicionais
    adicionalInsalubridadePercentual: toNum(dados.adicionalInsalubridadePercentual, 0),
    dataInicioInsalubridade: toDate(dados.dataInicioInsalubridade),
    dataFimInsalubridade: toDate(dados.dataFimInsalubridade),
    adicionalPericulosidadePercentual: toNum(dados.adicionalPericulosidadePercentual, 0),
    dataInicioPericulosidade: toDate(dados.dataInicioPericulosidade),
    dataFimPericulosidade: toDate(dados.dataFimPericulosidade),

    valorDanoMoral: toNum(dados.valorDanoMoral, 0),

    // Deduções
    fgtsDepositado: toNum(dados.fgtsDepositado, 0),
    fgtsIntegralizado: Boolean(dados.fgtsIntegralizado),
    valorPago: toNum(dados.valorPago, 0),
    percentualHonorarios: toNum(dados.percentualHonorarios, 0.15),

    // Afastamentos: derive mesesAfastamento from periodosAfastamento
    mesesAfastamento: (() => {
      const periodos = dados.periodosAfastamento || [];
      if (periodos.length === 0) return toNum(dados.mesesAfastamento, 0);
      // Sum months of each period
      let totalDias = 0;
      for (const p of periodos) {
        if (!p.inicio || !p.fim) continue;
        const ini = new Date(p.inicio);
        const fim = new Date(p.fim);
        totalDias += (fim - ini) / (1000 * 60 * 60 * 24);
      }
      return Math.round(totalDias / 30);
    })(),
    diasAfastamento: toNum(dados.diasAfastamento, 0),
    periodosAfastamento: (dados.periodosAfastamento || []).map((p) => ({ inicio: p.inicio, fim: p.fim })),

    // Verbas excluídas (inclui saldo_salarial se já foi pago)
    verbasExcluidas: (() => {
      const base = dados.verbasExcluidas || [];
      if (dados.saldoSalarialPago && !base.includes('saldo_salarial')) {
        return [...base, 'saldo_salarial'];
      }
      return base;
    })(),

    // Acordo
    valorAcordo: toNum(dados.valorAcordo),
    tipoAcordo: dados.tipoAcordo || null,
    tipoDevedor: dados.tipoDevedor || null,
    valorLiquidoExequente: toNum(dados.valorLiquidoExequente),
    contribuicaoSocialLiquidacao: toNum(dados.contribuicaoSocialLiquidacao),

    // Parcelas personalizadas — apenas campos do schema Joi (strip _templateId, descricao, etc.)
    parcelasPersonalizadas: (dados.parcelasPersonalizadas || []).map(p => ({
      ...(p.id ? { id: p.id } : {}),
      nome: p.nome,
      natureza: p.natureza,
      periodoTipo: p.periodoTipo || 'contrato',
      periodoInicio: p.periodoInicio || null,
      periodoFim: p.periodoFim || null,
      frequencia: p.frequencia,
      tipoValor: p.tipoValor || 'fixo',
      valorBase: p.valorBase != null ? Number(p.valorBase) : null,
      percentualBase: p.percentualBase != null ? Number(p.percentualBase) : null,
      percentualAdicional: Number(p.percentualAdicional) || 0,
      geraReflexos: Boolean(p.geraReflexos),
      reflexosEm: p.reflexosEm || [],
      incideInss: Boolean(p.incideInss),
      incideIr: Boolean(p.incideIr),
      incideFgts: Boolean(p.incideFgts),
      incidePrevidenciaPrivada: Boolean(p.incidePrevidenciaPrivada),
      ...(p.aliquotaPrevidenciaPrivada != null ? { aliquotaPrevidenciaPrivada: Number(p.aliquotaPrevidenciaPrivada) } : {}),
      baseHistoricoId: p.baseHistoricoId || null,
      templateId: p._templateId || p.templateId || null,
    })),

    // Deduções detalhadas
    deducoesGlobais: dados.deducoesGlobais || [],
    deducoesPorVerba: dados.deducoesPorVerba || [],

    // Multa Art. 467 CLT
    aplicarMulta467: dados.aplicarMulta467 || false,
    multa467BaseVerbas: dados.multa467BaseVerbas || [],

    // Períodos de férias e 13o (arrays com status definido pelo usuário)
    periodosFerias: dados.periodosFerias || [],
    // Derivar contagem de férias dos períodos detalhados (se disponíveis)
    // Períodos marcados como excluídos (ex: prescritos) são ignorados
    ...(() => {
      const pf = dados.periodosFerias || [];
      if (pf.length === 0) return {};
      const ativos = pf.filter(p => !p.excluida);
      const integrais = ativos.filter(p => p.tipo === 'integral');
      const proporcionalFerias = ativos.find(p => p.tipo === 'proporcional');

      // Dobradas: vencidas + não gozadas + (não pagas OU pagas com valor parcial)
      const dobradas = integrais.filter(p =>
        p.vencidas && !p.gozadas && (!p.pagas || (p.pagas && parseFloat(p.valorPago) > 0))
      );
      // Integrais simples: todos os integrais devidos que NÃO são dobrados
      // Inclui: não vencidos não pagos, gozados não pagos, vencidos gozados não pagos, parcialmente pagos
      const simples = integrais.filter(p => {
        if (p.vencidas && !p.gozadas) return false; // estes vão para dobradas
        return !p.pagas || (p.pagas && parseFloat(p.valorPago) > 0);
      });

      return {
        qtdeFeriasVencidasDobradas: dobradas.length,
        qtdeFeriasVencidasSimples: simples.length,
        feriasDeducaoPagas: integrais
          .filter(p => p.pagas && parseFloat(p.valorPago) > 0)
          .reduce((sum, p) => sum + parseFloat(p.valorPago), 0),
        feriasProporcionaisPagas: proporcionalFerias?.pagas || false,
        valorPagoFeriasProporcionais: proporcionalFerias?.pagas ? (Number(proporcionalFerias.valorPago) || 0) : 0,
      };
    })(),
    periodosDecimoTerceiro: dados.periodosDecimoTerceiro || [],
    // Derivar qtdeDecimoTerceiroVencidos dos períodos detalhados (se disponíveis)
    // Períodos excluídos (prescritos) e pagos não contam
    ...(() => {
      const pd = dados.periodosDecimoTerceiro || [];
      if (pd.length === 0) return {};
      const ativos = pd.filter(p => !p.excluido);
      // Devidos = 'devido' + 'pago' com valor parcial (pagamento parcial → ainda há saldo)
      const integraisDevidos = ativos.filter(p =>
        p.tipo === 'integral' && (p.status !== 'pago' || parseFloat(p.valorPago) > 0)
      ).length;
      // Soma dos valores já pagos parcialmente (integrais marcados como 'pago' mas com valor < integral)
      const valorPagoParcialDecimo = ativos
        .filter(p => p.tipo === 'integral' && p.status === 'pago' && parseFloat(p.valorPago) > 0)
        .reduce((sum, p) => sum + (parseFloat(p.valorPago) || 0), 0);
      // Proporcional
      const proporcionalDecimo = ativos.find(p => p.tipo === 'proporcional');
      const decimoProporcionalPago = proporcionalDecimo?.status === 'pago';
      const valorPagoDecimoTerceiroProporcional = decimoProporcionalPago ? (parseFloat(proporcionalDecimo.valorPago) || 0) : 0;
      return { qtdeDecimoTerceiroVencidos: integraisDevidos, valorPagoParcialDecimo,
               decimoProporcionalPago, valorPagoDecimoTerceiroProporcional };
    })(),

    // Honorários e despesas processuais
    percentualHonorarios: toNum(dados.percentualHonorarios, 0.15),
    aplicarHonorariosPericiais: Boolean(dados.aplicarHonorariosPericiais),
    honorariosPericiaisValor: toNum(dados.honorariosPericiaisValor, 0),
    aplicarCustas: Boolean(dados.aplicarCustas),

    // Históricos salariais (estrutura em dois níveis: history → parcelas → faixas)
    historicosSalariais: (dados.historicosSalariais || []).map((h) => ({
      id: h.id,
      titulo: h.titulo,
      fixo: Boolean(h.fixo),
      parcelas: (h.parcelas || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        faixas: (p.faixas || []).map((faixa) => ({
          inicio: faixa.inicio,
          fim: faixa.fim || null,
          valor: Number(faixa.valor) || 0,
        })),
      })),
    })),

    // Jornada multi-período — apenas campos do schema Joi
    jornadaPeriodos: (dados.jornadaPeriodos || []).map(p => ({
      id: p.id,
      dataInicio: p.dataInicio || null,
      dataFim: p.dataFim || null,
      padraoApuracao: p.padraoApuracao || 'diario',
      divisorJornada: Number(p.divisorJornada) || 220,
      adicionalHoraExtra: Number(p.adicionalHoraExtra) || 0.5,
      adicionalHoraNoturna: Number(p.adicionalHoraNoturna) || 0.2,
      modoEntrada: p.modoEntrada || 'medio',
      mediaHorasExtrasDiarias: Number(p.mediaHorasExtrasDiarias) || 0,
      mediaHorasExtrasSemanais: Number(p.mediaHorasExtrasSemanais) || 0,
      mediaHorasExtrasPorTurno: Number(p.mediaHorasExtrasPorTurno) || 0,
      mediaHorasNoturnasDiarias: Number(p.mediaHorasNoturnasDiarias) || 0,
      horaEntrada: p.horaEntrada || null,
      horaSaida: p.horaSaida || null,
      intervaloMinutos: Number(p.intervaloMinutos) || 60,
      diasSemana: p.diasSemana || [1, 2, 3, 4, 5],
      horasJornadaPadrao12x36: Number(p.horasJornadaPadrao12x36) || 12,
      horariosPorDia: p.horariosPorDia || null,
      escalaPattern: p.escalaPattern || null,
      afastamentos: (p.afastamentos || []).map(a => ({ inicio: a.inicio, fim: a.fim, motivo: a.motivo })),
      totalHorasExtras: p.totalHorasExtras != null ? Number(p.totalHorasExtras) : null,
      totalHorasNoturnas: p.totalHorasNoturnas != null ? Number(p.totalHorasNoturnas) : null,
    })),

    // Bases de cálculo dos atrasados
    salarioAtrasadoBase: dados.salarioAtrasadoBase || 'ultimo_salario',
    salarioAtrasadoHistoricoId: dados.salarioAtrasadoHistoricoId || null,
    comissaoAtrasadaBase: dados.comissaoAtrasadaBase || 'media',
    comissaoAtrasadoHistoricoId: dados.comissaoAtrasadoHistoricoId || null,
    gorjetaAtrasadaBase: dados.gorjetaAtrasadaBase || 'media',
    gorjetaAtrasadoHistoricoId: dados.gorjetaAtrasadoHistoricoId || null,
    saldoSalarialPago: Boolean(dados.saldoSalarialPago),

    tipoFluxo: dados.tipoFluxo || 'verbas_rescisórias',
  };
}

async function simular(dadosBrutos, modalidade) {
  const resp = await fetch('/api/calculos/simular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dados: prepararDadosContrato(dadosBrutos), modalidade }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
  return json.resultado;
}

async function salvarSimulacao(payload) {
  const resp = await fetch('/api/simulacoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      dados: prepararDadosContrato(payload.dados),
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao salvar');
  return json;
}

async function simularMultiplo(dadosBrutos) {
  const resp = await fetch('/api/calculos/simular-multiplo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dados: prepararDadosContrato(dadosBrutos) }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao calcular');
  return json.resultados;
}

async function buscarPeriodosAquisitivos({ dataAdmissao, dataDispensa, avisoPrevioTrabalhado }) {
  const resp = await fetch('/api/calculos/periodos-aquisitivos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataAdmissao, dataDispensa, avisoPrevioTrabalhado }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.erro || 'Erro ao buscar períodos');
  return json;
}

export function useSimular() {
  return useMutation({ mutationFn: ({ dados, modalidade }) => simular(dados, modalidade) });
}

export function useSimularMultiplo() {
  return useMutation({ mutationFn: ({ dados }) => simularMultiplo(dados) });
}

export function usePeriodosAquisitivos() {
  return useMutation({ mutationFn: buscarPeriodosAquisitivos });
}

export function useSalvarSimulacao() {
  return useMutation({ mutationFn: salvarSimulacao });
}

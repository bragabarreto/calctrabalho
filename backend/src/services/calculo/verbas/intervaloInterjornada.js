'use strict';

const { round2 } = require('../../../utils/formatacao');

/**
 * Intervalo Interjornada (CLT art. 66 + OJ 355 SDI-1 TST)
 *
 * Regra: mínimo 11 horas consecutivas de descanso entre o fim de uma jornada
 * e o início da seguinte.
 *
 * Violação: as horas faltantes são tratadas como horas extras indenizatórias.
 * Natureza: INDENIZATÓRIA — sem reflexos (RSR, férias, 13º, FGTS, aviso prévio).
 *
 * Requer cartão de ponto (modo cartao_ponto). Sem cartão, retorna 0.
 */
function calcularIntervaloInterjornada(dados, temporal, diasCartao) {
  if (dados.verbasExcluidas?.includes('intervalo_interjornada')) {
    return { valor: 0, excluida: true, memoria: { motivo: 'Excluída do cálculo' } };
  }
  if (!dados.intervaloInterjornada) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Intervalo interjornada não habilitado' } };
  }
  if (!diasCartao || diasCartao.length === 0) {
    return { valor: 0, excluida: false, memoria: { motivo: 'Requer cartão de ponto (modoEntrada = cartao_ponto)' } };
  }

  const M = dados.mediaSalarial || dados.ultimoSalario || 0;
  const D = dados.divisorJornada || 220;
  const adicional = dados.adicionalHoraExtra ?? 0.5;
  const MIN_REPOUSO = 11 * 60; // 660 minutos

  // Filtra apenas dias efetivamente trabalhados (não afastados, não férias)
  const diasTrabalhados = diasCartao
    .filter(d => d.trabalhado && !d.afastado && !d.ferias)
    .sort((a, b) => a.data.localeCompare(b.data));

  let minViolacaoTotal = 0;
  let qtdeViolacoes = 0;

  for (let i = 1; i < diasTrabalhados.length; i++) {
    const anterior = diasTrabalhados[i - 1];
    const atual = diasTrabalhados[i];

    // Verifica se são dias consecutivos (ou próximos o suficiente para haver violação)
    // Calcula o intervalo entre o fim do dia anterior e o início do dia atual
    // minSaida do anterior + minutos até o início do atual
    // Se o dia atual é imediatamente o próximo dia trabalhado, o repouso é:
    //   (1440 - anterior.minSaida) + atual.minEntrada + (diasEntre - 1) * 1440
    const dataAnterior = new Date(anterior.data);
    const dataAtual = new Date(atual.data);
    const diasEntre = Math.round((dataAtual - dataAnterior) / (1000 * 60 * 60 * 24));

    // Só verifica violação quando os dias são consecutivos (1 dia de diferença)
    // Para dias com mais de 1 dia de diferença, o repouso é garantidamente > 11h
    if (diasEntre === 1) {
      const minRepouso = (1440 - anterior.minSaida) + atual.minEntrada;
      if (minRepouso < MIN_REPOUSO) {
        const violacao = MIN_REPOUSO - minRepouso;
        minViolacaoTotal += violacao;
        qtdeViolacoes++;
      }
    }
  }

  if (minViolacaoTotal === 0) {
    return {
      valor: 0,
      excluida: false,
      memoria: { motivo: 'Nenhuma violação de intervalo interjornada detectada no cartão de ponto' },
    };
  }

  const horasViolacao = +(minViolacaoTotal / 60).toFixed(4);
  const valorHora = round2((M / D) * (1 + adicional));
  const valor = round2(valorHora * horasViolacao);

  return {
    valor,
    excluida: false,
    natureza: 'indenizatoria',
    memoria: {
      formula: `${qtdeViolacoes} violação(ões) × ${(minViolacaoTotal / qtdeViolacoes).toFixed(0)} min médios = ${horasViolacao}h × R$ ${valorHora.toFixed(2)}/h = R$ ${valor.toFixed(2)}`,
      qtdeViolacoes,
      totalMinViolacao: minViolacaoTotal,
      horasViolacao,
      valorHora,
      aviso: 'Natureza indenizatória — sem reflexos (OJ 355 SDI-1 TST + CLT art. 66)',
    },
  };
}

module.exports = { calcularIntervaloInterjornada };

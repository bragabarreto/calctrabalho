'use strict';

// Testes sem date-fns: dias construídos manualmente para evitar dependência do cartaoPontoVirtual
const { calcularIntervaloIntrajornada } = require('./src/services/calculo/verbas/intervaloIntrajornada');
const { calcularIntervaloInterjornada } = require('./src/services/calculo/verbas/intervaloInterjornada');
const { calcularRSRNaoConcedido, calcularFeriadosLaborados } = require('./src/services/calculo/verbas/rsrFeriados');
const { calcularIntervaloTermico } = require('./src/services/calculo/verbas/intervaloTermico');
const { calcularIntervaloDigitacao } = require('./src/services/calculo/verbas/intervaloDigitacao');

let ok = 0, fail = 0;
function assert(label, got, expected) {
  if (Math.abs(got - expected) < 0.01) {
    console.log('  OK', label, '=', got);
    ok++;
  } else {
    console.log('  FALHOU', label, '| esperado:', expected, '| obtido:', got);
    fail++;
  }
}
function assertBool(label, got, expected) {
  if (got === expected) {
    console.log('  OK', label, '=', got);
    ok++;
  } else {
    console.log('  FALHOU', label, '| esperado:', expected, '| obtido:', got);
    fail++;
  }
}

// ─── Helper: cria um dia trabalhado com intervalo ─────────────────────────────
function mkDia(data, diaSemana, opts = {}) {
  const entrada = opts.entrada ?? 480;      // 08:00
  const saida   = opts.saida   ?? 1020;     // 17:00
  const intervalo = opts.intervalo ?? 60;
  const brutos = saida - entrada;
  const minIntervaloMinimo = brutos > 360 ? 60 : (brutos > 240 ? 15 : 0);
  return {
    data,
    diaSemana,
    afastado: false,
    ferias: false,
    trabalhado: opts.trabalhado !== false,
    ehFeriado: opts.ehFeriado ?? false,
    ehRSR: opts.ehRSR ?? false,
    minEntrada: entrada,
    minSaida: saida,
    minBrutosDia: brutos,
    minLiquidosDia: brutos - intervalo,
    minContratualDia: opts.contratual ?? 480,
    intervaloMinutos: intervalo,
    minIntervaloMinimo,
    minIntervaloDeficit: Math.max(0, minIntervaloMinimo - intervalo),
    minNoturnosDia: opts.noturnos ?? 0,
  };
}

// ─── Teste 1: Intervalo Intrajornada automático ───────────────────────────────
console.log('\n=== Teste 1: Intervalo Intrajornada automático (5 dias × 30min deficit) ===');
// entrada 08:00, saída 17:00 = 9h bruto; intervalo concedido 30min; mínimo legal 60min → deficit 30min/dia
const diasIntra = [
  mkDia('2025-01-06', 1, { intervalo: 30 }),
  mkDia('2025-01-07', 2, { intervalo: 30 }),
  mkDia('2025-01-08', 3, { intervalo: 30 }),
  mkDia('2025-01-09', 4, { intervalo: 30 }),
  mkDia('2025-01-10', 5, { intervalo: 30 }),
];
// Verifica que o helper calculou certo
assertBool('d0.minIntervaloDeficit=30', diasIntra[0].minIntervaloDeficit, 30);
assertBool('d0.minIntervaloMinimo=60', diasIntra[0].minIntervaloMinimo, 60);

const dadosIntra = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  mesesAfastamento: 0,
  intrajornadaModo: 'automatico',
};
const temporal1 = { lapsoSemAviso: { meses: 12 } };
const r1 = calcularIntervaloIntrajornada(dadosIntra, temporal1, diasIntra);
console.log('  Valor intrajornada:', r1.valor);
console.log('  Natureza:', r1.natureza);
// 5 dias × 30min = 150min = 2.5h
// valorHora = (3300/220) × 1.5 = 15 × 1.5 = 22.50/h
// valor = 22.50 × 2.5 = 56.25
assertBool('natureza = indenizatoria', r1.natureza, 'indenizatoria');
assert('valor (5 dias × 30min × R$22.5/h)', r1.valor, 56.25);

// ─── Teste 2: Intervalo Interjornada ─────────────────────────────────────────
console.log('\n=== Teste 2: Intervalo Interjornada (saída 23h, entrada 6h) ===');
// Seg a Sex com saída 23:00 (1380min) e entrada 06:00 (360min)
// gap = (1440 - 1380) + 360 = 60 + 360 = 420min = 7h < 11h (660min) → violação = 240min = 4h
// 4 pares consecutivos (seg-ter, ter-qua, qua-qui, qui-sex) → 4 violações × 4h = 16h total
const diasInter = [
  mkDia('2025-01-06', 1, { entrada: 360, saida: 1380, intervalo: 60 }),
  mkDia('2025-01-07', 2, { entrada: 360, saida: 1380, intervalo: 60 }),
  mkDia('2025-01-08', 3, { entrada: 360, saida: 1380, intervalo: 60 }),
  mkDia('2025-01-09', 4, { entrada: 360, saida: 1380, intervalo: 60 }),
  mkDia('2025-01-10', 5, { entrada: 360, saida: 1380, intervalo: 60 }),
];
const dadosInter = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  intervaloInterjornada: true,
};
const temporal2 = { lapsoSemAviso: { meses: 12 } };
const r2 = calcularIntervaloInterjornada(dadosInter, temporal2, diasInter);
console.log('  Qtde violações:', r2.memoria?.qtdeViolacoes);
console.log('  Horas violação:', r2.memoria?.horasViolacao);
console.log('  Valor:', r2.valor);
assertBool('natureza = indenizatoria', r2.natureza, 'indenizatoria');
assert('qtde violações (4 pares)', r2.memoria?.qtdeViolacoes, 4);
assert('horas violação total (4×4h=16h)', r2.memoria?.horasViolacao, 16);
// valorHora = (3300/220) × 1.5 = 22.5/h
// valor = 22.5 × 16 = 360
assert('valor (22.5 × 16h)', r2.valor, 360);

// ─── Teste 3: RSR não concedido ───────────────────────────────────────────────
console.log('\n=== Teste 3: RSR Não Concedido (Dom + Sab trabalhados) ===');
// Dois dias RSR trabalhados: Dom 05/01 e Sab 11/01
const diasRSR = [
  mkDia('2025-01-05', 0, { ehRSR: true }),   // Domingo
  mkDia('2025-01-06', 1),
  mkDia('2025-01-07', 2),
  mkDia('2025-01-08', 3),
  mkDia('2025-01-09', 4),
  mkDia('2025-01-10', 5),
  mkDia('2025-01-11', 6, { ehRSR: true }),   // Sábado
];
const dadosRSR = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  rsrNaoConcedido: true,
};
const temporal3 = { lapsoSemAviso: { meses: 12 }, lapsoComAviso: { mesesRestantes: 1, diasRestantes: 0 }, mesesUltimoAno: 1, diasUltimoAno: 0, diasAvisoPrevio: 30 };
const r3 = calcularRSRNaoConcedido(dadosRSR, temporal3, diasRSR);
console.log('  Qtde dias RSR:', r3.memoria?.qtdeDias);
console.log('  Valor:', r3.valor);
// 2 dias RSR × (3300/30) = 2 × 110 = 220
assert('qtde dias RSR', r3.memoria?.qtdeDias, 2);
assert('valor RSR (2 × 110)', r3.valor, 220);

// ─── Teste 4: Feriados laborados ─────────────────────────────────────────────
console.log('\n=== Teste 4: Feriados Laborados (01/01/2025) ===');
const diasFer = [
  mkDia('2025-01-01', 3, { ehFeriado: true }),  // Confraternização
  mkDia('2025-01-02', 4),
  mkDia('2025-01-03', 5),
];
const dadosFer = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  feriadosLaborados: true,
};
const r4 = calcularFeriadosLaborados(dadosFer, temporal3, diasFer);
console.log('  Qtde feriados:', r4.memoria?.qtdeDias);
console.log('  Valor:', r4.valor);
// 1 feriado × (3300/30) = 110
assert('qtde feriados', r4.memoria?.qtdeDias, 1);
assert('valor feriado laborado (3300/30 = 110)', r4.valor, 110);

// ─── Teste 5: Intervalo Térmico ───────────────────────────────────────────────
console.log('\n=== Teste 5: Intervalo Térmico (8h jornada, nenhum intervalo concedido) ===');
const dadosTerm = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  mesesAfastamento: 0,
  intervaloTermico: true,
  tipoAmbienteTermico: 'calor',
  minIntervaloTermicoConcedido: 0,
  minJornadaDia: 480,   // 8h
};
const temporal5 = { lapsoSemAviso: { meses: 12 } };
const r5 = calcularIntervaloTermico(dadosTerm, temporal5);
console.log('  Valor:', r5.valor);
console.log('  Formula:', r5.memoria?.formula);
// minIntervaloDiario = 480/5 = 96min/dia
// horasDeficitMes = (96/60) × 21.75 = 34.8h/mês
// valorHora = (3300/220) × 1.5 = 22.5/h
// valor = 22.5 × 34.8 × 12 = 9396
assertBool('natureza = salarial', r5.natureza, 'salarial');
assert('minIntervaloDiario = 96', r5.memoria?.minIntervaloDiario, 96);
assert('valor térmico (22.5 × 34.8 × 12)', r5.valor, 9396);

// ─── Teste 6: Intervalo por Digitação (90min) ─────────────────────────────────
console.log('\n=== Teste 6: Intervalo Digitação 90min (8h jornada, nada concedido) ===');
const dadosDigit = {
  mediaSalarial: 3300,
  divisorJornada: 220,
  adicionalHoraExtra: 0.5,
  mesesAfastamento: 0,
  intervaloDigitacao: true,
  regimeDigitacao: '90min',
  horasIntervaloDigitacaoConcedido: 0,
  minJornadaDia: 480,   // 8h
};
const r6 = calcularIntervaloDigitacao(dadosDigit, temporal5);
console.log('  Ciclos/dia:', r6.memoria?.ciclosPorDia);
console.log('  Min intervalo/dia:', r6.memoria?.minIntervaloDiario);
console.log('  Valor:', r6.valor);
// ciclosPorDia = floor(480/90) = 5
// minIntervaloDiario = 5 × 10 = 50min/dia
// horasDeficitMes = (50/60) × 21.75 = 18.125h/mês
// valor = 22.5 × 18.125 × 12 = 4893.75
assertBool('natureza = salarial', r6.natureza, 'salarial');
assert('ciclos por dia = 5', r6.memoria?.ciclosPorDia, 5);
assert('min intervalo diario = 50', r6.memoria?.minIntervaloDiario, 50);
assert('valor digitação (22.5 × 18.125 × 12)', r6.valor, 4893.75);

// ─── Resumo ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════');
console.log('Resultado:', ok, 'OK |', fail, 'FALHOU');
if (fail === 0) console.log('Todos os testes passaram!');

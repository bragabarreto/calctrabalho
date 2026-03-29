'use strict';

const { round2 } = require('../../utils/formatacao');

/**
 * OJ 394 SDI-1 TST (IRR-10169-57.2013.5.05.0024, decisão de 20/03/2023)
 *
 * Para fatos geradores a partir de 20/03/2023, a majoração do RSR
 * pela integração de horas extras habitualmente prestadas repercute
 * no cálculo de férias, 13º salário, aviso prévio e FGTS.
 *
 * Este módulo aplica um segundo passo (cascata) sobre os reflexos
 * já calculados no modo flat, ajustando férias, 13º, aviso prévio e FGTS
 * para incluir o RSR majorado na base.
 *
 * @param {Object} verbas   - Objeto de verbas do motor
 * @param {Object} reflexos - Objeto de reflexos já calculados (flat)
 * @param {Object} temporal - Resultado de calcularTemporais
 * @param {Object} dados    - Dados do contrato
 * @param {string} modalidade - Modalidade de rescisão
 */
function aplicarCascataOJ394(verbas, reflexos, temporal, dados, modalidade) {
  // Chaves de reflexo que possuem RSR e precisam de cascata
  const chavesComRSR = [
    'horasExtras',
    'adicionalNoturno',
    'intervaloTermico',
    'intervaloDigitacao',
  ];

  const meses = temporal.lapsoSemAviso?.meses || 1;
  const mesesFerias = temporal.mesesUltimoAno + (temporal.diasUltimoAno >= 15 ? 1 : 0);
  const meses13 = (temporal.lapsoComAviso?.mesesRestantes || 0) + ((temporal.lapsoComAviso?.diasRestantes || 0) >= 15 ? 1 : 0);

  for (const chave of chavesComRSR) {
    const ref = reflexos[chave];
    if (!ref || !ref.rsr || ref.rsr.valor === 0) continue;

    const rsrTotal = ref.rsr.valor;
    const rsrMediaMensal = meses > 0 ? round2(rsrTotal / meses) : 0;
    if (rsrMediaMensal === 0) continue;

    // ---- Incremento em Férias: RSR media mensal × (meses/12) × 4/3 ----
    if (ref.ferias) {
      const incrementoFerias = round2(rsrMediaMensal * (mesesFerias / 12) * (4 / 3));
      const valorAnterior = ref.ferias.valor;
      ref.ferias.valor = round2(valorAnterior + incrementoFerias);
      ref.ferias.memoria = {
        ...ref.ferias.memoria,
        formulaOJ394: `OJ 394: + R$ ${rsrMediaMensal.toFixed(2)} (RSR/mês) × (${mesesFerias}/12) × 4/3 = + R$ ${incrementoFerias.toFixed(2)}`,
        criterio: 'OJ 394 SDI-1 TST — RSR majorado integra base de férias (a partir de 20/03/2023)',
        incrementoCascata: incrementoFerias,
        valorAnteriorFlat: valorAnterior,
      };
    }

    // ---- Incremento em 13º: RSR media mensal / 12 × meses13 ----
    if (ref.decimoTerceiro) {
      const incremento13 = round2((rsrMediaMensal / 12) * meses13);
      const valorAnterior = ref.decimoTerceiro.valor;
      ref.decimoTerceiro.valor = round2(valorAnterior + incremento13);
      ref.decimoTerceiro.memoria = {
        ...ref.decimoTerceiro.memoria,
        formulaOJ394: `OJ 394: + (R$ ${rsrMediaMensal.toFixed(2)} / 12) × ${meses13} = + R$ ${incremento13.toFixed(2)}`,
        criterio: 'OJ 394 SDI-1 TST — RSR majorado integra base de 13º (a partir de 20/03/2023)',
        incrementoCascata: incremento13,
        valorAnteriorFlat: valorAnterior,
      };
    }

    // ---- Incremento em Aviso Prévio: RSR media mensal × (dias/30) ----
    if (ref.avisoPrevio && ref.avisoPrevio.valor > 0) {
      const incrementoAP = round2(rsrMediaMensal * (temporal.diasAvisoPrevio / 30));
      const valorAnterior = ref.avisoPrevio.valor;
      ref.avisoPrevio.valor = round2(valorAnterior + incrementoAP);
      ref.avisoPrevio.memoria = {
        ...ref.avisoPrevio.memoria,
        formulaOJ394: `OJ 394: + R$ ${rsrMediaMensal.toFixed(2)} × (${temporal.diasAvisoPrevio}/30) = + R$ ${incrementoAP.toFixed(2)}`,
        criterio: 'OJ 394 SDI-1 TST — RSR majorado integra base de aviso prévio (a partir de 20/03/2023)',
        incrementoCascata: incrementoAP,
        valorAnteriorFlat: valorAnterior,
      };
    }

    // ---- Recalcular FGTS com novos valores de férias, 13º e aviso prévio ----
    if (ref.fgts) {
      const verbaValor = verbas[chave]?.valor || 0;
      const novosReflexos = (ref.rsr?.valor || 0) + (ref.ferias?.valor || 0) + (ref.decimoTerceiro?.valor || 0);
      const novaBaseFgts = verbaValor + novosReflexos;
      const novoFgts = round2(novaBaseFgts * 0.08);
      const valorAnterior = ref.fgts.valor;
      ref.fgts.valor = novoFgts;
      ref.fgts.memoria = {
        ...ref.fgts.memoria,
        formulaOJ394: `OJ 394: FGTS recalculado — (R$ ${novaBaseFgts.toFixed(2)}) × 8% = R$ ${novoFgts.toFixed(2)}`,
        criterio: 'OJ 394 SDI-1 TST — FGTS recalculado com RSR cascateado',
        valorAnteriorFlat: valorAnterior,
      };

      // Recalcular multa FGTS
      if (ref.mulFgts) {
        const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
        const novaMulFgts = round2(novoFgts * pctMul);
        ref.mulFgts.valor = novaMulFgts;
        ref.mulFgts.memoria = {
          ...ref.mulFgts.memoria,
          formulaOJ394: `OJ 394: R$ ${novoFgts.toFixed(2)} × ${(pctMul * 100).toFixed(0)}% = R$ ${novaMulFgts.toFixed(2)}`,
        };
      }
    }
  }

  // ---- Parcelas custom que têm RSR ----
  for (const pc of (verbas.parcelasCustom || [])) {
    if (!pc.reflexos?.rsr || pc.reflexos.rsr.valor === 0) continue;

    const rsrTotal = pc.reflexos.rsr.valor;
    const rsrMedia = meses > 0 ? round2(rsrTotal / meses) : 0;
    if (rsrMedia === 0) continue;

    if (pc.reflexos.ferias) {
      const inc = round2(rsrMedia * (mesesFerias / 12) * (4 / 3));
      pc.reflexos.ferias.valor = round2(pc.reflexos.ferias.valor + inc);
      pc.reflexos.ferias.memoria = { ...pc.reflexos.ferias.memoria, formulaOJ394: `OJ 394: + R$ ${inc.toFixed(2)}` };
    }
    if (pc.reflexos.decimoTerceiro) {
      const inc = round2((rsrMedia / 12) * meses13);
      pc.reflexos.decimoTerceiro.valor = round2(pc.reflexos.decimoTerceiro.valor + inc);
      pc.reflexos.decimoTerceiro.memoria = { ...pc.reflexos.decimoTerceiro.memoria, formulaOJ394: `OJ 394: + R$ ${inc.toFixed(2)}` };
    }
    if (pc.reflexos.fgts && pc.reflexos.fgts.valor > 0) {
      const novaBase = pc.valor + (pc.reflexos.rsr?.valor || 0) + (pc.reflexos.ferias?.valor || 0) + (pc.reflexos.decimoTerceiro?.valor || 0);
      const novoFgts = round2(novaBase * 0.08);
      pc.reflexos.fgts.valor = novoFgts;
      pc.reflexos.fgts.memoria = { ...pc.reflexos.fgts.memoria, formulaOJ394: `OJ 394: recalculado = R$ ${novoFgts.toFixed(2)}` };
      if (pc.reflexos.mulFgts) {
        const pctMul = { sem_justa_causa: 0.40, rescisao_indireta: 0.40, culpa_reciproca: 0.20 }[modalidade] || 0;
        pc.reflexos.mulFgts.valor = round2(novoFgts * pctMul);
      }
    }
  }
}

module.exports = { aplicarCascataOJ394 };

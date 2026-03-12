'use strict';

const db = require('../config/database');
const { calcular } = require('../services/calculo/engine');
const { v4: uuidv4 } = require('uuid');

async function criar(req, res, next) {
  try {
    const { nome, descricao, modalidade, dados, resultado: resultadoExterno, numeroProcesso, varaNome, observacoes, tags } = req.body;

    const resultado = resultadoExterno || await calcular(dados, modalidade);

    const id = uuidv4();
    await db.query(
      `INSERT INTO simulacoes (
        id, nome, descricao, modalidade,
        data_admissao, data_dispensa, data_ajuizamento, data_pgto_rescisorio,
        aviso_previo_trabalhado, ultimo_salario, media_salarial,
        comissoes_media_mensal, gorjetas_media_mensal,
        salarios_atrasados_meses, comissoes_atrasadas_meses,
        qtde_ferias_vencidas_simples, qtde_ferias_vencidas_dobradas,
        qtde_decimo_terceiro_vencidos, divisor_jornada,
        adicional_hora_extra, qtde_horas_extras_mensais,
        intervalo_intrajornada_mensal_horas,
        adicional_hora_noturna, qtde_horas_noturnas_mensais,
        adicional_insalubridade_percentual, adicional_periculosidade_percentual,
        fgts_depositado, valor_pago, percentual_honorarios,
        meses_afastamento, verbas_excluidas, numero_processo, vara_numero, observacoes, tags
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35
      )`,
      [
        id, nome, descricao || null, modalidade,
        dados.dataAdmissao, dados.dataDispensa, dados.dataAjuizamento, dados.dataPgtoRescisorio || null,
        dados.avisoPrevioTrabalhado || false, dados.ultimoSalario, dados.mediaSalarial || null,
        dados.comissoes || 0, dados.gorjetas || 0,
        dados.salariosMesesAtrasados || 0, dados.comissoesMesesAtrasados || 0,
        dados.qtdeFeriasVencidasSimples || 0, dados.qtdeFeriasVencidasDobradas || 0,
        dados.qtdeDecimoTerceiroVencidos || 0, dados.divisorJornada || 220,
        dados.adicionalHoraExtra || 0.5, dados.qtdeHorasExtrasMensais || 0,
        dados.intervaloIntrajornadaMensalHoras || 0,
        dados.adicionalHoraNoturna || 0.2, dados.qtdeHorasNoturnasMensais || 0,
        dados.adicionalInsalubridadePercentual || 0, dados.adicionalPericulosidadePercentual || 0,
        dados.fgtsDepositado || 0, dados.valorPago || 0, dados.percentualHonorarios || 0.15,
        dados.mesesAfastamento || 0, dados.verbasExcluidas || [],
        numeroProcesso || null, varaNome || null, observacoes || null, tags || []
      ]
    );

    // Salvar verbas resultado
    for (const verba of resultado.verbas) {
      await db.query(
        `INSERT INTO resultado_verbas (simulacao_id, codigo, nome, categoria, natureza, incide_fgts, incide_inss, valor_bruto, valor_considerado, memoria_calculo, formula_descricao, ordem_exibicao)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id, verba.codigo, verba.nome, verba.categoria, verba.natureza,
          verba.incideFgts, verba.incideInss, verba.valor, !verba.excluida,
          JSON.stringify(verba.memoria), verba.memoria?.formula || null, verba.ordemExibicao
        ]
      );
    }

    res.status(201).json({ sucesso: true, id, resultado });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { processo, modalidade, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (processo) { params.push(`%${processo}%`); where += ` AND numero_processo ILIKE $${params.length}`; }
    if (modalidade) { params.push(modalidade); where += ` AND modalidade = $${params.length}`; }

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT id, nome, descricao, modalidade, numero_processo, vara_numero, criado_em,
              ultimo_salario, data_admissao, data_dispensa
       FROM simulacoes ${where}
       ORDER BY criado_em DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await db.query(`SELECT COUNT(*) FROM simulacoes ${where}`, params.slice(0, -2));
    const total = parseInt(countRows[0].count);

    res.json({ sucesso: true, dados: rows, total, pagina: parseInt(page), totalPaginas: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT * FROM simulacoes WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ erro: 'Simulação não encontrada' });

    const { rows: verbas } = await db.query(
      'SELECT * FROM resultado_verbas WHERE simulacao_id = $1 ORDER BY ordem_exibicao',
      [id]
    );

    res.json({ sucesso: true, simulacao: rows[0], verbas });
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await db.query('DELETE FROM simulacoes WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ erro: 'Simulação não encontrada' });
    res.json({ sucesso: true, mensagem: 'Simulação excluída' });
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, obter, excluir };

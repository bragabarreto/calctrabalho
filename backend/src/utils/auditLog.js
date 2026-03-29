'use strict';

const db = require('../config/database');

/**
 * Registra alteração em índice/parâmetro na tabela de auditoria.
 *
 * @param {string} tabela - Nome da tabela alterada (ex: 'inss_parametros', 'selic_historico')
 * @param {string} acao - Tipo da ação: 'insert', 'update', 'delete'
 * @param {Object|null} dadosAnteriores - Estado anterior (null para insert)
 * @param {Object|null} dadosNovos - Estado novo (null para delete)
 * @param {string} [usuario='sistema'] - Identificador do autor da alteração
 */
async function registrarAlteracao(tabela, acao, dadosAnteriores, dadosNovos, usuario = 'sistema') {
  try {
    await db.query(
      `INSERT INTO indices_audit_log (tabela, acao, dados_anteriores, dados_novos, usuario)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        tabela,
        acao,
        dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dadosNovos ? JSON.stringify(dadosNovos) : null,
        usuario,
      ]
    );
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err.message);
  }
}

module.exports = { registrarAlteracao };

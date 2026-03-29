'use strict';

function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);

  if (err.isJoi) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: err.details.map(d => d.message),
    });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    erro: err.message || 'Erro interno do servidor',
    codigo: err.code || 'ERRO_INTERNO',
  });
}

function notFound(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFound };

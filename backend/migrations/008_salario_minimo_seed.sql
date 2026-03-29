-- Migration 008: Seed do histórico de salário mínimo (1994-2026)
-- Valores conforme legislação brasileira. Usuário pode atualizar via painel.

INSERT INTO salario_minimo_historico (mes_ano, valor)
SELECT
  DATE_TRUNC('month', gs)::date AS mes_ano,
  CASE
    WHEN gs >= '2026-01-01' THEN 1518.00
    WHEN gs >= '2025-01-01' THEN 1518.00
    WHEN gs >= '2024-01-01' THEN 1412.00
    WHEN gs >= '2023-05-01' THEN 1320.00
    WHEN gs >= '2023-01-01' THEN 1302.00
    WHEN gs >= '2022-01-01' THEN 1212.00
    WHEN gs >= '2021-01-01' THEN 1100.00
    WHEN gs >= '2020-01-01' THEN 1045.00
    WHEN gs >= '2019-01-01' THEN 998.00
    WHEN gs >= '2018-01-01' THEN 954.00
    WHEN gs >= '2017-01-01' THEN 937.00
    WHEN gs >= '2016-01-01' THEN 880.00
    WHEN gs >= '2015-01-01' THEN 788.00
    WHEN gs >= '2014-01-01' THEN 724.00
    WHEN gs >= '2013-01-01' THEN 678.00
    WHEN gs >= '2012-01-01' THEN 622.00
    WHEN gs >= '2011-03-01' THEN 545.00
    WHEN gs >= '2011-01-01' THEN 540.00
    WHEN gs >= '2010-01-01' THEN 510.00
    WHEN gs >= '2009-02-01' THEN 465.00
    WHEN gs >= '2008-03-01' THEN 415.00
    WHEN gs >= '2007-04-01' THEN 380.00
    WHEN gs >= '2006-04-01' THEN 350.00
    WHEN gs >= '2005-05-01' THEN 300.00
    WHEN gs >= '2004-05-01' THEN 260.00
    WHEN gs >= '2003-04-01' THEN 240.00
    WHEN gs >= '2002-04-01' THEN 200.00
    WHEN gs >= '2001-04-01' THEN 180.00
    WHEN gs >= '2000-04-01' THEN 151.00
    WHEN gs >= '1999-05-01' THEN 136.00
    WHEN gs >= '1998-05-01' THEN 130.00
    WHEN gs >= '1997-05-01' THEN 120.00
    WHEN gs >= '1996-05-01' THEN 112.00
    WHEN gs >= '1995-05-01' THEN 100.00
    WHEN gs >= '1994-12-01' THEN 100.00
    WHEN gs >= '1994-09-01' THEN 70.00
    ELSE 64.79
  END AS valor
FROM generate_series('1994-07-01'::date, '2026-12-01'::date, '1 month'::interval) gs
ON CONFLICT (mes_ano) DO UPDATE SET valor = EXCLUDED.valor;

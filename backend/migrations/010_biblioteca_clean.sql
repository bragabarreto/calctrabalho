-- Migration 010: Reconstrói a biblioteca de parcelas sem duplicatas
-- Idempotente: apaga tudo eh_biblioteca=TRUE e recria a lista canônica.
-- Isso garante que mesmo re-execuções (modelo do servidor) produzam sempre
-- o mesmo conjunto de itens, sem duplicidades com os TEMPLATES_PADRAO do frontend.

DELETE FROM parcelas_personalizadas WHERE eh_biblioteca = TRUE;

INSERT INTO parcelas_personalizadas (
  nome, descricao, natureza, frequencia, tipo_valor,
  percentual_base, percentual_adicional,
  gera_reflexos, reflexos_em,
  incide_inss, incide_ir, incide_fgts,
  eh_biblioteca, template_id
) VALUES

-- ── Duração do Trabalho ───────────────────────────────────────────────────
('Prontidão',
 'Art. 244 §3º CLT. Empregado permanece nas dependências do empregador aguardando. Remunerado em 2/3 das horas.',
 'salarial', 'mensal', 'fixo',
 NULL, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true, 'tpl_prontidao'),

('Intervalo Interjornada',
 'Art. 66 CLT / Súm. 110 TST. Mínimo 11h entre jornadas. Pós-Reforma Trabalhista (Lei 13.467/17): natureza indenizatória.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_intervalo_inter'),

-- ── Remuneração e Benefícios ──────────────────────────────────────────────
('Comissões / Gorjetas',
 'Arts. 457 e 458 CLT / Súm. 93 TST. Integram salário com reflexos em RSR, férias, 13º, FGTS e aviso.',
 'salarial', 'mensal', 'fixo',
 NULL, 0,
 true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'],
 true, true, true, true, 'tpl_comissoes'),

('RSR/DSR sobre Variáveis',
 'Súm. 172 TST. Repouso semanal sobre comissões, horas extras e demais variáveis. Padrão: 1/6 (16,67%).',
 'salarial', 'mensal', 'percentual_salario',
 0.1667, 0,
 true, ARRAY['ferias','decimo_terceiro','fgts'],
 true, true, true, true, 'tpl_dsr_variaveis'),

('PLR / Participação nos Lucros e Resultados',
 'Lei 10.101/2000. Não integra salário. Não incide INSS/FGTS. Incide IR por tabela específica. Por semestre.',
 'indenizatoria', 'semestral', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, true, false, true, 'tpl_plr'),

('Ajuda de Custo',
 'Art. 457 §2º CLT. Parcela indenizatória para ressarcimento de despesas. Não integra salário.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_ajuda_custo'),

('Quebra de Caixa',
 'Súm. 247 TST. Indenização para cobertura de diferenças de caixa. Natureza indenizatória.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_quebra_caixa'),

-- ── Função e Cargo ────────────────────────────────────────────────────────
('Gratificação de Função',
 'Adicional pelo exercício de cargo de confiança ou função gratificada. Reflexos integrais (art. 62, II, CLT).',
 'salarial', 'mensal', 'percentual_salario',
 0.2000, 0,
 true, ARRAY['rsr','ferias','decimo_terceiro','fgts','aviso_previo'],
 true, true, true, true, 'tpl_gratificacao_func'),

-- ── Verbas Rescisórias ────────────────────────────────────────────────────
('Aviso Prévio Indenizado',
 'Art. 487 CLT / RE 576.967 STF. Natureza indenizatória. Não incide INSS, IR nem FGTS.',
 'indenizatoria', 'unica', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_aviso_indenizado'),

('Multa do art. 477 da CLT',
 'Art. 477 §8º CLT. Equivale a 1 salário (acrescido de adicionais habituais) por atraso no pagamento das verbas rescisórias.',
 'indenizatoria', 'unica', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_multa_477'),

('Multa do art. 467 da CLT',
 'Art. 467 CLT. 50% sobre verbas rescisórias incontroverses não pagas na data da rescisão.',
 'indenizatoria', 'unica', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_multa_467'),

-- ── Responsabilidade Civil ────────────────────────────────────────────────
('Indenização por Danos Morais',
 'Arts. 223-A a 223-G CLT / art. 5º X CF. Valor único, natureza indenizatória. Não incide INSS/IR/FGTS.',
 'indenizatoria', 'unica', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_dano_moral'),

('Vale-Transporte Não Fornecido',
 'Lei 7.418/85. Diferença entre valor devido e valor pago. Natureza indenizatória.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_vale_transporte'),

('Vale-Refeição / Alimentação (indenizatório — PAT)',
 'Lei 6.321/76 / PAT. Natureza indenizatória quando vinculado ao PAT. Não incide INSS/IR/FGTS.',
 'indenizatoria', 'mensal', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_vale_refeicao_pat'),

('Pensionamento / Indenização por Incapacidade',
 'Arts. 949–950 CC. % de incapacidade × último salário. Natureza indenizatória.',
 'indenizatoria', 'mensal', 'percentual_salario',
 1.0000, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_pensionamento'),

('Indenização por Estabilidade Provisória',
 'Gestante, CIPA, acidentado, dirigente sindical etc. Salários do período de estabilidade.',
 'indenizatoria', 'unica', 'fixo',
 NULL, 0,
 false, ARRAY[]::text[],
 false, false, false, true, 'tpl_estabilidade');

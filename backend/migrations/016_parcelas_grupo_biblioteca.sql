-- Migration 016: Adiciona grupo_biblioteca nas parcelas personalizadas
-- Permite que TODAS as parcelas (originais e criadas pelo usuário) sejam
-- classificadas nos mesmos grupos temáticos, sem distinção.

ALTER TABLE parcelas_personalizadas
  ADD COLUMN IF NOT EXISTS grupo_biblioteca VARCHAR(50);

-- Mapeia parcelas existentes para seus grupos temáticos baseado no template_id

-- Duração do Trabalho
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'duracao'
WHERE template_id IN (
  'tpl_horas_extras', 'tpl_horas_extras_100', 'tpl_noturno',
  'tpl_sobreaviso', 'tpl_prontidao', 'tpl_intervalo',
  'tpl_intervalo_inter', 'tpl_feriados'
);

-- Meio Ambiente do Trabalho
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'meio_ambiente'
WHERE template_id IN (
  'tpl_insalubridade', 'tpl_insalubridade_min', 'tpl_insalubridade_med',
  'tpl_insalubridade_max', 'tpl_periculosidade'
);

-- Função e Cargo
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'funcao'
WHERE template_id IN (
  'tpl_desvio_funcao', 'tpl_gratificacao_funcao'
);

-- Remuneração e Benefícios
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'remuneracao'
WHERE template_id IN (
  'tpl_equiparacao', 'tpl_anuenio', 'tpl_comissoes_retidas',
  'tpl_gorjetas_retidas', 'tpl_adicional_transferencia',
  'tpl_diferencas_salariais', 'tpl_comissoes', 'tpl_dsr_variaveis',
  'tpl_vale_refeicao_sal', 'tpl_rsr_dsr'
);

-- Verbas Rescisórias
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'rescisao'
WHERE template_id IN (
  'tpl_aviso_indenizado', 'tpl_multa_477', 'tpl_multa_467'
);

-- Responsabilidade Civil / Benefícios indenizatórios
UPDATE parcelas_personalizadas SET grupo_biblioteca = 'responsabilidade'
WHERE template_id IN (
  'tpl_dano_moral', 'tpl_vale_transporte', 'tpl_ajuda_custo',
  'tpl_quebra_caixa', 'tpl_plr', 'tpl_vale_refeicao_pat',
  'tpl_ticket_alimentacao', 'tpl_pensionamento', 'tpl_estabilidade'
);

-- Parcelas sem template_id que já existiam (criadas antes desta migration)
-- Vão para 'remuneracao' como padrão seguro (podem ser movidas depois pelo usuário)
UPDATE parcelas_personalizadas
SET grupo_biblioteca = 'remuneracao'
WHERE grupo_biblioteca IS NULL AND template_id IS NULL AND ativo = TRUE;

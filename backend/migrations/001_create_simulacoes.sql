-- =============================================================
-- MIGRATION 001: Tabela principal de simulações
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  modalidade VARCHAR(50) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),

  -- DADOS DO CONTRATO
  data_admissao DATE NOT NULL,
  data_dispensa DATE NOT NULL,
  data_ajuizamento DATE NOT NULL,
  data_pgto_rescisorio DATE,
  aviso_previo_trabalhado BOOLEAN DEFAULT FALSE,

  -- REMUNERAÇÃO BASE
  ultimo_salario NUMERIC(12,2) NOT NULL,
  media_salarial NUMERIC(12,2),
  comissoes_media_mensal NUMERIC(12,2) DEFAULT 0,
  gorjetas_media_mensal NUMERIC(12,2) DEFAULT 0,
  salarios_atrasados_meses INTEGER DEFAULT 0,
  comissoes_atrasadas_meses INTEGER DEFAULT 0,

  -- FÉRIAS E 13º
  qtde_ferias_vencidas_simples INTEGER DEFAULT 0,
  qtde_ferias_vencidas_dobradas INTEGER DEFAULT 0,
  qtde_decimo_terceiro_vencidos INTEGER DEFAULT 0,

  -- JORNADA DE TRABALHO
  divisor_jornada NUMERIC(6,2) DEFAULT 220,
  adicional_hora_extra NUMERIC(4,3) DEFAULT 0.5,
  qtde_horas_extras_mensais NUMERIC(6,2) DEFAULT 0,
  intervalo_intrajornada_mensal_horas NUMERIC(6,2) DEFAULT 0,
  adicional_hora_noturna NUMERIC(4,3) DEFAULT 0.2,
  qtde_horas_noturnas_mensais NUMERIC(6,2) DEFAULT 0,

  -- ADICIONAIS
  adicional_insalubridade_percentual NUMERIC(5,4) DEFAULT 0,
  data_inicio_insalubridade DATE,
  data_fim_insalubridade DATE,
  adicional_periculosidade_percentual NUMERIC(5,4) DEFAULT 0,
  data_inicio_periculosidade DATE,
  data_fim_periculosidade DATE,

  -- PARCELAS GENÉRICAS (salariais)
  parcela_generica_salarial_mensal NUMERIC(12,2) DEFAULT 0,
  parcela_generica_salarial_diaria_6d NUMERIC(12,2) DEFAULT 0,
  parcela_generica_salarial_diaria_5d NUMERIC(12,2) DEFAULT 0,

  -- PARCELAS GENÉRICAS (indenizatórias)
  parcela_generica_indenizatoria_mensal NUMERIC(12,2) DEFAULT 0,
  parcela_generica_indenizatoria_diaria_6d NUMERIC(12,2) DEFAULT 0,
  parcela_generica_indenizatoria_diaria_5d NUMERIC(12,2) DEFAULT 0,
  parcela_generica_indenizatoria_unica NUMERIC(12,2) DEFAULT 0,

  -- DEDUÇÕES
  fgts_depositado NUMERIC(12,2) DEFAULT 0,
  valor_pago NUMERIC(12,2) DEFAULT 0,

  -- HONORÁRIOS
  percentual_honorarios NUMERIC(5,4) DEFAULT 0.15,

  -- AFASTAMENTOS
  meses_afastamento INTEGER DEFAULT 0,
  dias_afastamento INTEGER DEFAULT 0,

  -- VERBAS EXCLUÍDAS
  verbas_excluidas TEXT[] DEFAULT '{}',

  -- ACORDO
  valor_acordo NUMERIC(12,2),
  tipo_acordo VARCHAR(50),
  valor_liquido_exequente NUMERIC(12,2),
  contribuicao_social_liquidacao NUMERIC(12,2),

  -- METADADOS
  numero_processo VARCHAR(50),
  vara_numero VARCHAR(100),
  observacoes TEXT,
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_simulacoes_criado_em ON simulacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_simulacoes_modalidade ON simulacoes(modalidade);
CREATE INDEX IF NOT EXISTS idx_simulacoes_numero_processo ON simulacoes(numero_processo);

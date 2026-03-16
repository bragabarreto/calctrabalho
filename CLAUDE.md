# CLAUDE.md — CalcTrabalho

Sistema web para simulação de cálculos trabalhistas brasileiros.
**Uso:** Gabinete Judicial | **Stack:** Node.js + PostgreSQL + React

---

## Como rodar o projeto

```bash
# 1. Banco de dados (Docker)
docker-compose up -d

# 2. Backend (porta 3001)
cd backend
cp .env.example .env   # ou: copy .env.example .env (Windows CMD)
npm install
npm run migrate
npm run seed
npm run dev

# 3. Frontend (porta 5173)
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

---

## Arquitetura

```
calctrabalho/
├── backend/src/
│   ├── server.js                    # Entry point Express
│   ├── config/
│   │   ├── database.js              # Pool de conexão PostgreSQL
│   │   └── constants.js             # Alíquotas e limites legais
│   ├── routes/                      # calculos, simulacoes, comparacoes, pdf
│   ├── controllers/                 # Lógica de cada rota
│   ├── services/
│   │   ├── calculo/
│   │   │   ├── engine.js            # Motor central de cálculo
│   │   │   └── verbas/              # Um arquivo por verba trabalhista
│   │   └── pdf/                     # Geração de relatório PDF (Puppeteer)
│   ├── middlewares/                 # Validação Joi, errorHandler
│   └── utils/                       # Datas, formatação, auditoria
├── backend/migrations/              # SQL de criação das tabelas (14+)
├── backend/seeds/                   # Dados históricos (SM, Selic, feriados)
└── frontend/src/
    ├── pages/
    │   ├── Calculadora/             # Formulário multi-step (5 etapas)
    │   ├── Historico/               # Lista e detalhe de simulações
    │   ├── Comparacao/              # Painel comparativo (até 4 cenários)
    │   └── Configuracoes/           # Tabelas legais vigentes
    ├── components/
    │   ├── MemoriaCalculo/          # Tabela auditável com fórmulas expansíveis
    │   └── ExportBar/               # Salvar simulação e exportar PDF
    ├── hooks/                       # useCalculo, useSimulacao, useComparacao
    └── store/calculoStore.js        # Estado global (Zustand)
```

---

## API REST

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/calculos/simular | Calcular sem salvar |
| POST | /api/simulacoes | Salvar simulação |
| GET | /api/simulacoes | Listar com filtros |
| GET | /api/simulacoes/:id | Detalhe completo |
| DELETE | /api/simulacoes/:id | Excluir |
| POST | /api/comparacoes | Criar comparação |
| GET | /api/comparacoes/:id | Painel comparativo |
| POST | /api/pdf/gerar/:id | Gerar PDF |
| GET | /api/health | Status da API |

---

## Funcionalidades implementadas

- Calculadora 5 etapas: Contrato → Verbas → Adicionais → Jornada → Resultado
- Modalidades de rescisão: sem justa causa, justa causa, culpa recíproca, rescisão indireta, pedido de demissão
- 15+ verbas com reflexos automáticos (RSR, férias, 13º, FGTS)
- Aviso prévio proporcional (30 + 3 dias/ano, máx 90 — art. 487 CLT)
- Prescrição quinquenal automática (EC 45/2004)
- ADC 58 STF — 3 fases de correção (IPCA-E até jun/2009, SELIC, IPCA)
- Comparação de até 4 cenários (destaque automático maior/menor)
- Exportação PDF com memória de cálculo completa (Puppeteer)
- Integração Claude AI para importação de histórico salarial (PDF/XLSX/CSV)
- Seeds: salário mínimo 1994–2026, Selic 1994–2026, feriados nacionais 2000–2030

---

## Regras de domínio importantes

- **Insalubridade** calcula sobre salário mínimo histórico (Súmula 228 TST/STF)
- **Divisor de jornada** padrão: 220h mensais (verificar CCT — Súmula 431 TST para bancários)
- **Prescrição:** marco de 5 anos (EC 45/2004, Súmula 308 TST)
- **Reflexos de horas extras** incidem em RSR, férias + 1/3, 13º e FGTS
- **Multa art. 467 CLT:** 50% sobre verbas incontroversas não pagas na rescisão
- **Multa art. 477 CLT:** 1 salário por atraso nas verbas rescisórias

---

## Tecnologias

**Backend:** Express 4, PostgreSQL (pg), Claude AI (anthropic), Puppeteer, Joi, Winston, Jest
**Frontend:** React 18, Vite, Tailwind CSS, Zustand, TanStack Query, React Hook Form
**Infra:** Docker Compose (PostgreSQL + PgAdmin), Railway (deploy)

---

## Parâmetros legais vigentes

- Salário mínimo 2025: R$ 1.518,00
- Salário mínimo 2026: R$ 1.622,00 (projeção)
- INSS teto 2025: R$ 908,86
- FGTS: 8% sobre remuneração
- Multa rescisória FGTS: 40% (sem justa causa / rescisão indireta), 20% (culpa recíproca)

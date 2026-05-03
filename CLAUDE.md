# Orçavi — Guia de Contexto para Claude

## O que é o Orçavi
SaaS de controle financeiro pessoal e familiar. Produto brasileiro, freemium, foco em simplicidade e design moderno. Slogan: "Onde seu dinheiro aparece".

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilo | Tailwind CDN (config inline no index.html) + inline styles |
| Banco | Supabase (Postgres) |
| Auth | Supabase Auth (Google OAuth) |
| Backend API | Node.js serverless no Vercel (`orcavi-api`) |
| Pagamentos | Mercado Pago (assinaturas recorrentes) |
| IA | Claude via Anthropic API |
| Icons | Lucide React |
| Charts | Recharts |
| Fonte | Plus Jakarta Sans |

## Repositórios e deploys

| Repo | Deploy | URL |
|---|---|---|
| `NatanSunelaitis/orcavi-web` | Vercel | `orcavi-web.vercel.app` |
| `NatanSunelaitis/orcavi-api` | Vercel | `orcavi-api.vercel.app` |

**Paths locais:**
- Frontend: `C:/Users/natan/Documents/02_Desenvolvimento/FinanceControl`
- Backend: `C:/Users/natan/Documents/02_Desenvolvimento/orcavi-api`

## Supabase
- URL: `https://kyiusbquepuqtdwtmpid.supabase.co`
- Anon key: `sb_publishable_7YK20rLqTMymJ0g9wh6mdQ_5R8m-fIf`
- Service role key: no Vercel como `SUPABASE_SERVICE_ROLE_KEY`

---

## Design System — Tokens principais

```
Primary:    #7C5CFC (violeta)
Sidebar:    #1A1A2E (azul escuro)
Income:     #059669 (verde)
Expense:    #DC4F3A (vermelho)
Family:     #2E86AB (azul)
Pet:        #E8875A (laranja)
BG:         #F5F3FF (violeta claro)
```

---

## Planos e regras de negócio

### Free
- Máx 50 transações/mês
- Máx 2 contas
- Máx 3 metas
- Simulador e dashboard liberados
- Cartões, Dívidas, Família, IA bloqueados

### Pro — R$9,90/mês (14 dias grátis)
- Tudo ilimitado
- Cartões de crédito
- Controle de dívidas

### Família — R$17,90/mês (14 dias grátis)
- Tudo do Pro
- Até 5 membros + pets
- Carteira compartilhada e divisão de despesas
- WhatsApp IA (powered by Claude)

**Hook de plano:** `usePlan()` vem do `context/PlanContext.tsx` — NUNCA do hook `hooks/usePlan.ts` (obsoleto). O Provider está em `App.tsx` envolto no `PlanProvider`.

**Enforcement:** itens de nav bloqueados redirecionam para `/pricing`. A pricing page detecta plano atual e mostra banner + opção de cancelar.

### Cupons (`promo_codes` table)
- `BETA2025` → Pro 90 dias (50 usos)
- `TESTER` → Pro 30 dias (ilimitado)
- `FAMILIA30` → Família 30 dias (20 usos)
- `LAUNCH50` → 50% desconto (100 usos)

---

## Banco de dados — Tabelas principais

```sql
profiles         -- user_id, plan, plan_expires_at, role
accounts         -- user_id, name, type, balance, color
transactions     -- user_id, account_id, amount, type, category, date, is_paid,
                 -- goal_id, is_recurring, recurring_interval,
                 -- installment_total, installment_current, parent_transaction_id
goals            -- user_id, name, target_amount, current_amount, target_date,
                 -- image_url, account_id, pix_key
credit_cards     -- user_id, name, last4, credit_limit, closing_day, due_day, color
card_transactions-- card_id, user_id, description, amount, category, date,
                 -- installment_total, installment_current
debts            -- user_id, name, creditor, total_amount, paid_amount,
                 -- monthly_installment, remaining_installments, due_day, interest_rate
family_groups    -- name, admin_id
family_members   -- group_id, user_id(nullable), name, avatar, color, is_pet, role
shared_expenses  -- group_id, created_by, description, amount, category, date
expense_splits   -- expense_id, member_id, percentage, amount, is_paid
promo_codes      -- code, type, plan, discount_percent, free_days, max_uses, uses_count
subscriptions    -- user_id, plan, status, provider, provider_subscription_id
tickets          -- user_id, subject, description, status, priority
ticket_messages  -- ticket_id, sender_id, is_admin, message
```

**Importante:** todas as tabelas têm RLS ativo. Cada usuário só acessa seus próprios dados.

---

## Estrutura de arquivos — Frontend

```
FinanceControl/
├── App.tsx                      # Rotas + providers (AuthProvider > PlanProvider > FinanceProvider)
├── index.html                   # Tailwind CDN + config de cores + fontes
├── index.css                    # CSS variables Orçavi + spinner
├── config/
│   └── plans.ts                 # FONTE ÚNICA de preços, limites e features
├── context/
│   ├── AuthContext.tsx          # useAuth() — user.uid, user.email, user.displayName, user.photoURL
│   ├── FinanceContext.tsx       # useFinance() — accounts, transactions, goals + CRUD
│   └── PlanContext.tsx          # usePlan() — plan, isPro, isFamily, isFree, limits, hasAccess()
├── hooks/
│   └── useToast.tsx
├── lib/
│   └── supabase.ts              # createClient com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── services/
│   └── supabaseService.ts       # Toda lógica de CRUD (accounts, transactions, goals)
├── components/
│   ├── Layout.tsx               # Sidebar dinâmico por plano + badge plano + upgrade banner
│   ├── Login.tsx                # Google OAuth via Supabase redirect
│   ├── Dashboard.tsx            # KPIs, gráficos, resumo mensal
│   ├── Transactions.tsx         # CRUD completo + parcelas + recorrência
│   ├── Accounts.tsx             # CRUD de contas bancárias
│   ├── Goals.tsx                # Metas + contribuições
│   ├── Simulator.tsx            # Simulador de comprometimento de renda
│   ├── Pricing.tsx              # Página de planos + cupons + gestão de assinatura
│   ├── CreditCards.tsx          # Cartões + lançamentos (Pro)
│   ├── Debts.tsx                # Dívidas + parcelas (Pro)
│   ├── Family.tsx               # Grupo familiar + divisão de despesas (Família)
│   └── WhatsAppAI.tsx           # Chat IA conectado ao orcavi-api (Família)
└── types.ts                     # Account, Transaction, Goal, enums
```

## Estrutura de arquivos — Backend (orcavi-api)

```
orcavi-api/
├── lib/
│   ├── supabase.ts              # Service role client (acesso total)
│   └── auth.ts                  # getAuthUser(), requireAuth(), requirePlan()
├── api/
│   ├── health.ts                # GET /api/health
│   ├── webhook-payment.ts       # POST /api/webhook-payment (MP)
│   ├── whatsapp-ai.ts           # POST /api/whatsapp-ai (Claude)
│   ├── send-email.ts            # POST /api/send-email (Resend)
│   ├── subscriptions/
│   │   └── create.ts            # POST /api/subscriptions/create (MP preapproval)
│   └── admin/
│       └── grant-plan.ts        # POST /api/admin/grant-plan
└── vercel.json
```

---

## Variáveis de ambiente

### orcavi-web (.env.local)
```
VITE_SUPABASE_URL=https://kyiusbquepuqtdwtmpid.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_7YK20rLqTMymJ0g9wh6mdQ_5R8m-fIf
VITE_API_URL=https://orcavi-api.vercel.app
```

### orcavi-api (Vercel env vars)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
MP_ACCESS_TOKEN              # TEST-... em sandbox, produção sem prefixo
MP_PUBLIC_KEY                # TEST-... em sandbox
MP_PAYER_EMAIL_OVERRIDE      # só em teste (email do comprador de teste)
INTERNAL_API_KEY             # orcavi-internal-2025-secret
RESEND_API_KEY               # para envio de emails
ANTHROPIC_API_KEY            # para WhatsApp IA
```

---

## Padrões de código

### Autenticação
```typescript
const { user } = useAuth();  // user.uid, user.email, user.displayName, user.photoURL
```

### Planos
```typescript
const { isPro, isFamily, isFree, hasAccess } = usePlan();
// Nunca usar: import { usePlan } from '../hooks/usePlan' (obsoleto)
// Sempre usar: import { usePlan } from '../context/PlanContext'
```

### Supabase no frontend
```typescript
import { supabase } from '../lib/supabase';
const { data } = await supabase.from('table').select('*').eq('user_id', user.uid);
```

### API calls ao backend
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
fetch(`${API_URL}/api/endpoint`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Deploy
```bash
# Frontend: push para main do orcavi-web → Vercel auto-deploya
# Backend: push para master do orcavi-api → Vercel auto-deploya
git add . && git commit -m "feat: ..." && git push
```

---

## Status atual do produto

### Implementado ✅
- Login Google OAuth
- Dashboard com KPIs e gráficos reais
- CRUD completo: Transações, Contas, Metas
- Parcelamento e recorrência de transações
- Simulador de comprometimento de renda
- Cartões de crédito com lançamentos
- Dívidas com registro de pagamentos
- Família com membros, pets e divisão de despesas
- WhatsApp IA (Claude) com contexto real das finanças
- Sistema de planos (Free/Pro/Família)
- Sidebar dinâmico por plano
- Página de pricing com cupons
- Mercado Pago subscriptions integrado
- Webhook de pagamento configurado
- Endpoint admin grant-plan
- Deploy frontend e backend no Vercel

### Pendente 🔲
- Painel admin (métricas, usuários, chamados)
- Domínio próprio orcavi.com.br
- PWA / mobile
- Envio de email (Resend — endpoint criado, falta `RESEND_API_KEY`)
- ANTHROPIC_API_KEY no Vercel (IA ainda não funciona em produção)
- Enforcement de limites Free no frontend (50 tx/mês, 2 contas, 3 metas)
- Tela de suporte/chamados para usuários

---

## Como trabalhar comigo (Claude) de forma eficiente

1. **Sempre leia este CLAUDE.md antes de qualquer tarefa** — ele é o contexto mestre.
2. **Informe qual repositório** você vai alterar (orcavi-web ou orcavi-api).
3. **Para novas features**, confirme o plano exigido antes de implementar.
4. **Para bugs**, descreva o erro + qual tela/rota + o que esperava vs o que aconteceu.
5. **Para mudanças de regras de negócio**, atualize este arquivo junto.
6. **Commits**: sempre faço push automático — o Vercel deploya em ~1 min.
7. **Contexto de plano**: `usePlan()` do `PlanContext` — nunca do hook isolado.

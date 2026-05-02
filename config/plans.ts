// Fonte única de verdade para planos, preços e limites
// Para mudar um preço ou limite, altere aqui — reflete em todo o app

export const PLANS = {
  free: {
    id: 'free',
    name: 'Grátis',
    price: 0,
    priceLabel: 'Grátis',
    description: 'Para começar a organizar suas finanças',
    color: '#6B6B9A',
    limits: {
      transactionsPerMonth: 50,
      accounts: 2,
      goals: 3,
    },
    features: [
      'Até 50 transações por mês',
      'Até 2 contas',
      'Até 3 metas',
      'Simulador financeiro',
      'Dashboard completo',
    ],
    locked: [
      'Cartões de crédito',
      'Controle de dívidas',
      'Finanças em família',
      'Assistente IA',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.90,
    priceLabel: 'R$9,90',
    description: 'Para quem leva finanças a sério',
    color: '#7C5CFC',
    trialDays: 14,
    limits: {
      transactionsPerMonth: Infinity,
      accounts: Infinity,
      goals: Infinity,
    },
    features: [
      'Transações ilimitadas',
      'Contas ilimitadas',
      'Metas ilimitadas',
      'Cartões de crédito',
      'Controle de dívidas',
      'Relatórios em CSV',
      '14 dias grátis para testar',
    ],
    locked: [
      'Finanças em família',
      'Assistente IA no WhatsApp',
    ],
  },

  family: {
    id: 'family',
    name: 'Família',
    price: 17.90,
    priceLabel: 'R$17,90',
    description: 'Para toda a família em um só lugar',
    color: '#059669',
    trialDays: 14,
    limits: {
      transactionsPerMonth: Infinity,
      accounts: Infinity,
      goals: Infinity,
      familyMembers: 5,
    },
    features: [
      'Tudo do plano Pro',
      'Até 5 membros + pets',
      'Carteira compartilhada',
      'Divisão automática de gastos',
      'Assistente IA no WhatsApp',
      '14 dias grátis para testar',
    ],
    locked: [],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Hierarquia de planos (free < pro < family)
const PLAN_ORDER: Record<PlanId, number> = { free: 0, pro: 1, family: 2 };

export function planHasAccess(userPlan: PlanId, requiredPlan: PlanId): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[requiredPlan];
}

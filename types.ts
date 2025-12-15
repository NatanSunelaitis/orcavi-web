export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  GOAL_CONTRIBUTION = 'GOAL_CONTRIBUTION'
}

export enum AccountType {
  CHECKING = 'Conta Corrente',
  SAVINGS = 'Poupança',
  INVESTMENT = 'Investimento',
  WALLET = 'Carteira Física'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
}

export enum RecurrenceFrequency {
  DAILY = 'Diária',
  WEEKLY = 'Semanal',
  MONTHLY = 'Mensal',
  YEARLY = 'Anual'
}

export interface Recurrence {
  isRecurring: boolean;
  frequency?: RecurrenceFrequency;
  endDate?: string; // ISO String - quando parar de gerar
  parentTransactionId?: string; // ID da transação original
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO String
  type: TransactionType;
  category: string;
  accountId: string;
  isPaid: boolean;
  goalId?: string; // ID da meta (se for destinado para meta)
  installments?: {
    current: number;
    total: number;
    parentTransactionId?: string;
  };
  recurrence?: Recurrence;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  imageUrl?: string;
  accountId?: string;
  pixKey?: string;
}

export const CATEGORIES = {
  [TransactionType.EXPENSE]: [
    'Moradia', 'Transporte', 'Alimentação', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Serviços', 'Outros'
  ],
  [TransactionType.INCOME]: [
    'Salário', 'Freelance', 'Investimentos', 'Reembolso', 'Presente', 'Outros'
  ],
  [TransactionType.GOAL_CONTRIBUTION]: [
    'Contribuição para Meta'
  ]
};

export interface SimulationResult {
  canAfford: boolean;
  newCommitmentRate: number;
  currentCommitmentRate: number;
  monthlyImpact: number;
  recommendation: 'RECOMMENDED' | 'WARNING' | 'NOT_RECOMMENDED';
}
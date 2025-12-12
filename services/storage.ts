import { Account, AccountType, Transaction, TransactionType, Goal } from '../types';

const STORAGE_KEYS = {
  ACCOUNTS: 'fcp_accounts',
  TRANSACTIONS: 'fcp_transactions',
  GOALS: 'fcp_goals',
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Banco Principal', type: AccountType.CHECKING, balance: 3200, color: 'bg-blue-500' },
  { id: '2', name: 'Reserva Emergência', type: AccountType.SAVINGS, balance: 15000, color: 'bg-green-500' },
  { id: '3', name: 'Carteira', type: AccountType.WALLET, balance: 150, color: 'bg-slate-500' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 't1', description: 'Salário Mensal', amount: 5000, date: new Date().toISOString(), type: TransactionType.INCOME, category: 'Salário', accountId: '1', isPaid: true },
  { id: 't2', description: 'Freelance Design', amount: 1200, date: new Date().toISOString(), type: TransactionType.INCOME, category: 'Freelance', accountId: '1', isPaid: true },
  { id: 't3', description: 'Aluguel', amount: 1800, date: new Date().toISOString(), type: TransactionType.EXPENSE, category: 'Moradia', accountId: '1', isPaid: true },
  { id: 't4', description: 'Supermercado Semanal', amount: 450, date: new Date().toISOString(), type: TransactionType.EXPENSE, category: 'Alimentação', accountId: '1', isPaid: true },
  { id: 't5', description: 'Combustível', amount: 200, date: new Date().toISOString(), type: TransactionType.EXPENSE, category: 'Transporte', accountId: '3', isPaid: true },
  { id: 't6', description: 'Internet', amount: 120, date: new Date().toISOString(), type: TransactionType.EXPENSE, category: 'Serviços', accountId: '1', isPaid: false },
];

const INITIAL_GOALS: Goal[] = [
  { id: 'g1', name: 'Viagem Europa', targetAmount: 15000, currentAmount: 5000, deadline: '2025-12-31' },
  { id: 'g2', name: 'MacBook Pro', targetAmount: 12000, currentAmount: 2000, deadline: '2025-06-30' },
];

export const storageService = {
  getAccounts: (): Account[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(data);
  },

  saveAccounts: (accounts: Account[]) => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  },

  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getGoals: (): Goal[] => {
    const data = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
      return INITIAL_GOALS;
    }
    return JSON.parse(data);
  },

  saveGoals: (goals: Goal[]) => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  addTransaction: (transaction: Omit<Transaction, 'id'>) => {
    const transactions = storageService.getTransactions();
    const newTransaction = { ...transaction, id: generateId() };
    transactions.push(newTransaction);
    storageService.saveTransactions(transactions);
    
    // Update account balance
    const accounts = storageService.getAccounts();
    const accountIndex = accounts.findIndex(a => a.id === transaction.accountId);
    if (accountIndex >= 0) {
      if (transaction.type === TransactionType.INCOME) {
        accounts[accountIndex].balance += transaction.amount;
      } else {
        accounts[accountIndex].balance -= transaction.amount;
      }
      storageService.saveAccounts(accounts);
    }
    return newTransaction;
  },

  addAccount: (account: Omit<Account, 'id'>) => {
    const accounts = storageService.getAccounts();
    const newAccount = { ...account, id: generateId() };
    accounts.push(newAccount);
    storageService.saveAccounts(accounts);
    return newAccount;
  }
};
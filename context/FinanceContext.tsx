import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Transaction, Goal } from '../types';
import { firestoreService } from '../services/firestore';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  loading: boolean;
  refreshData: () => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  toggleTransactionPaid: (id: string, isPaid: boolean) => Promise<void>;
  addAccount: (a: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addGoal: (g: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contributeToGoal: (id: string, amount: number, accountId: string) => Promise<void>;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, description: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    if (!user) {
      setAccounts([]);
      setTransactions([]);
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [accountsData, transactionsData, goalsData] = await Promise.all([
        firestoreService.getAccounts(user.uid),
        firestoreService.getTransactions(user.uid),
        firestoreService.getGoals(user.uid)
      ]);
      setAccounts(accountsData);
      setTransactions(transactionsData);
      setGoals(goalsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  // ============ TRANSACTIONS ============
  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    if (!user) return;
    await firestoreService.addTransaction(user.uid, t);
    await refreshData();
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    await firestoreService.updateTransaction(user.uid, id, updates);
    await refreshData();
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    await firestoreService.deleteTransaction(user.uid, id);
    await refreshData();
  };

  const toggleTransactionPaid = async (id: string, isPaid: boolean) => {
    if (!user) return;
    await firestoreService.toggleTransactionPaid(user.uid, id, isPaid);
    await refreshData();
  };

  // ============ ACCOUNTS ============
  const addAccount = async (a: Omit<Account, 'id'>) => {
    if (!user) return;
    await firestoreService.addAccount(user.uid, a);
    await refreshData();
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    if (!user) return;
    await firestoreService.updateAccount(user.uid, id, updates);
    await refreshData();
  };

  const deleteAccount = async (id: string) => {
    if (!user) return;
    await firestoreService.deleteAccount(user.uid, id);
    await refreshData();
  };

  // ============ GOALS ============
  const addGoal = async (g: Omit<Goal, 'id'>) => {
    if (!user) return;
    await firestoreService.addGoal(user.uid, g);
    await refreshData();
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    if (!user) return;
    await firestoreService.updateGoal(user.uid, id, updates);
    await refreshData();
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    await firestoreService.deleteGoal(user.uid, id);
    await refreshData();
  };

  const contributeToGoal = async (id: string, amount: number, accountId: string) => {
    if (!user) return;
    await firestoreService.contributeToGoal(user.uid, id, amount, accountId);
    await refreshData();
  };

  // ============ TRANSFER ============
  const transferBetweenAccounts = async (fromId: string, toId: string, amount: number, description: string) => {
    if (!user) return;
    await firestoreService.transferBetweenAccounts(user.uid, fromId, toId, amount, description);
    await refreshData();
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        goals,
        loading,
        refreshData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        toggleTransactionPaid,
        addAccount,
        updateAccount,
        deleteAccount,
        addGoal,
        updateGoal,
        deleteGoal,
        contributeToGoal,
        transferBetweenAccounts
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

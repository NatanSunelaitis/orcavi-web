import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Account, Transaction, Goal, TransactionType, RecurrenceFrequency } from '../types';
import { addMonths, addWeeks, addDays, addYears, isBefore, parseISO } from 'date-fns';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const firestoreService = {
  // ============ ACCOUNTS ============
  async getAccounts(userId: string): Promise<Account[]> {
    try {
      const accountsRef = collection(db, 'users', userId, 'accounts');
      const snapshot = await getDocs(accountsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      return [];
    }
  },

  async addAccount(userId: string, account: Omit<Account, 'id'>): Promise<Account> {
    const id = generateId();
    const newAccount = { ...account, id };
    await setDoc(doc(db, 'users', userId, 'accounts', id), newAccount);
    return newAccount;
  },

  async updateAccount(userId: string, accountId: string, updates: Partial<Account>): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'accounts', accountId), updates);
  },

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'accounts', accountId));
  },

  // ============ TRANSACTIONS ============
  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const snapshot = await getDocs(query(transactionsRef, orderBy('date', 'desc')));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  },

  async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      const id = generateId();
      const newTransaction = { ...transaction, id };

      console.log('Salvando transação:', newTransaction);

      // Salvar transação principal
      await setDoc(doc(db, 'users', userId, 'transactions', id), newTransaction);
      console.log('Transação salva com sucesso no Firestore');

      // Atualizar saldo da conta SOMENTE se isPaid = true
      if (transaction.isPaid) {
        const accounts = await this.getAccounts(userId);
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
          const newBalance = transaction.type === TransactionType.INCOME
            ? account.balance + transaction.amount
            : account.balance - transaction.amount;
          await this.updateAccount(userId, account.id, { balance: newBalance });
          console.log('Saldo da conta atualizado');
        }
      }

      // Gerar transações recorrentes se necessário
      if (transaction.recurrence?.isRecurring && transaction.recurrence.frequency) {
        console.log('Gerando transações recorrentes...');
        await this.generateRecurringTransactions(userId, newTransaction);
      }

      // Gerar parcelas se necessário
      if (transaction.installments && transaction.installments.total > 1) {
        console.log('Gerando parcelas...');
        await this.generateInstallments(userId, newTransaction);
      }

      // Atualizar meta se a transação for destinada a uma meta (receita com goalId)
      if (transaction.goalId && transaction.type === TransactionType.INCOME && transaction.isPaid) {
        console.log('Atualizando meta com goalId:', transaction.goalId);
        const goalDoc = await getDoc(doc(db, 'users', userId, 'goals', transaction.goalId));
        const goal = goalDoc.data();
        if (goal) {
          await this.updateGoal(userId, transaction.goalId, {
            currentAmount: goal.currentAmount + transaction.amount
          });
          console.log('Meta atualizada com sucesso!');
        }
      }

      console.log('Transação criada com sucesso!');
      return newTransaction;
    } catch (error) {
      console.error('Erro detalhado ao adicionar transação:', error);
      throw error;
    }
  },

  async updateTransaction(userId: string, transactionId: string, updates: Partial<Transaction>): Promise<void> {
    // Buscar transação antiga para reverter saldo
    const oldTransactionDoc = await getDoc(doc(db, 'users', userId, 'transactions', transactionId));
    const oldTransaction = oldTransactionDoc.data() as Transaction;

    if (oldTransaction && (updates.amount !== undefined || updates.type !== undefined || updates.accountId !== undefined)) {
      // Reverter saldo da conta antiga
      const accounts = await this.getAccounts(userId);
      const oldAccount = accounts.find(a => a.id === oldTransaction.accountId);
      if (oldAccount) {
        const revertedBalance = oldTransaction.type === TransactionType.INCOME
          ? oldAccount.balance - oldTransaction.amount
          : oldAccount.balance + oldTransaction.amount;
        await this.updateAccount(userId, oldAccount.id, { balance: revertedBalance });
      }

      // Aplicar novo saldo
      const newAccountId = updates.accountId || oldTransaction.accountId;
      const newAmount = updates.amount || oldTransaction.amount;
      const newType = updates.type || oldTransaction.type;
      const newAccount = accounts.find(a => a.id === newAccountId);

      if (newAccount) {
        const newBalance = newType === TransactionType.INCOME
          ? newAccount.balance + newAmount
          : newAccount.balance - newAmount;
        await this.updateAccount(userId, newAccount.id, { balance: newBalance });
      }
    }

    await updateDoc(doc(db, 'users', userId, 'transactions', transactionId), updates);
  },

  async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    // Buscar transação para reverter saldo
    const transactionDoc = await getDoc(doc(db, 'users', userId, 'transactions', transactionId));
    const transaction = transactionDoc.data() as Transaction;

    if (transaction) {
      // Reverter saldo da conta
      const accounts = await this.getAccounts(userId);
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        const revertedBalance = transaction.type === TransactionType.INCOME
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;
        await this.updateAccount(userId, account.id, { balance: revertedBalance });
      }

      // Reverter meta se a transação tiver goalId (receita destinada a meta ou contribuição)
      if (transaction.goalId && (transaction.type === TransactionType.INCOME || transaction.type === TransactionType.GOAL_CONTRIBUTION)) {
        const goalDoc = await getDoc(doc(db, 'users', userId, 'goals', transaction.goalId));
        const goal = goalDoc.data();
        if (goal) {
          const newCurrentAmount = Math.max(0, goal.currentAmount - transaction.amount);
          await this.updateGoal(userId, transaction.goalId, {
            currentAmount: newCurrentAmount
          });
          console.log('Meta revertida após exclusão de transação');
        }
      }
    }

    await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
  },

  async toggleTransactionPaid(userId: string, transactionId: string, isPaid: boolean): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'transactions', transactionId), { isPaid });
  },

  // ============ GOALS ============
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      const goalsRef = collection(db, 'users', userId, 'goals');
      const snapshot = await getDocs(goalsRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      return [];
    }
  },

  async addGoal(userId: string, goal: Omit<Goal, 'id'>): Promise<Goal> {
    const id = generateId();
    const newGoal = { ...goal, id };
    await setDoc(doc(db, 'users', userId, 'goals', id), newGoal);
    return newGoal;
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
    await updateDoc(doc(db, 'users', userId, 'goals', goalId), updates);
  },

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
  },

  async contributeToGoal(userId: string, goalId: string, amount: number, accountId: string): Promise<void> {
    const goalDoc = await getDoc(doc(db, 'users', userId, 'goals', goalId));
    const goal = goalDoc.data() as Goal;
    if (goal) {
      // Atualizar o valor atual da meta
      await this.updateGoal(userId, goalId, {
        currentAmount: goal.currentAmount + amount
      });

      // Criar uma transação de contribuição para meta
      const transaction: Omit<Transaction, 'id'> = {
        description: `Contribuição para: ${goal.name}`,
        amount: amount,
        date: new Date().toISOString(),
        type: TransactionType.GOAL_CONTRIBUTION,
        category: 'Contribuição para Meta',
        accountId: accountId,
        isPaid: true,
        goalId: goalId
      };

      await this.addTransaction(userId, transaction);
    }
  },

  // ============ UTILITY FUNCTIONS ============
  async generateRecurringTransactions(userId: string, parentTransaction: Transaction): Promise<void> {
    if (!parentTransaction.recurrence?.isRecurring || !parentTransaction.recurrence.frequency) {
      return;
    }

    const { frequency, endDate } = parentTransaction.recurrence;
    const startDate = parseISO(parentTransaction.date);
    const finalDate = endDate ? parseISO(endDate) : addYears(startDate, 1); // Limite de 1 ano se não especificado

    let currentDate = startDate;
    const transactionsToCreate: Transaction[] = [];

    while (isBefore(currentDate, finalDate) && transactionsToCreate.length < 365) { // Limite de segurança
      // Calcular próxima data baseado na frequência
      switch (frequency) {
        case RecurrenceFrequency.DAILY:
          currentDate = addDays(currentDate, 1);
          break;
        case RecurrenceFrequency.WEEKLY:
          currentDate = addWeeks(currentDate, 1);
          break;
        case RecurrenceFrequency.MONTHLY:
          currentDate = addMonths(currentDate, 1);
          break;
        case RecurrenceFrequency.YEARLY:
          currentDate = addYears(currentDate, 1);
          break;
      }

      if (isBefore(currentDate, finalDate)) {
        // Criar objeto sem campos undefined
        const recurringTransaction: any = {
          description: parentTransaction.description,
          amount: parentTransaction.amount,
          type: parentTransaction.type,
          category: parentTransaction.category,
          accountId: parentTransaction.accountId,
          date: currentDate.toISOString(),
          isPaid: false,
          recurrence: {
            isRecurring: false,
            parentTransactionId: parentTransaction.id
          }
        };

        const id = generateId();
        await setDoc(
          doc(db, 'users', userId, 'transactions', id),
          { ...recurringTransaction, id }
        );
      }
    }
  },

  async generateInstallments(userId: string, parentTransaction: Transaction): Promise<void> {
    if (!parentTransaction.installments || parentTransaction.installments.total <= 1) {
      return;
    }

    const { total } = parentTransaction.installments;
    const totalAmount = parentTransaction.amount;

    // Arredondar parcelas normais para 2 casas decimais
    const regularInstallmentAmount = Math.round((totalAmount / total) * 100) / 100;

    // Calcular quanto já foi distribuído nas parcelas regulares
    const regularInstallmentsSum = regularInstallmentAmount * (total - 1);

    // A primeira parcela compensa qualquer diferença de arredondamento
    const firstInstallmentAmount = Math.round((totalAmount - regularInstallmentsSum) * 100) / 100;
    const startDate = parseISO(parentTransaction.date);

    for (let i = 2; i <= total; i++) {
      const installmentDate = addMonths(startDate, i - 1);

      // Criar objeto sem campos undefined
      const installmentTransaction: any = {
        description: parentTransaction.description,
        amount: regularInstallmentAmount,
        type: parentTransaction.type,
        category: parentTransaction.category,
        accountId: parentTransaction.accountId,
        date: installmentDate.toISOString(),
        isPaid: false,
        installments: {
          current: i,
          total: total,
          parentTransactionId: parentTransaction.id
        }
      };

      const id = generateId();
      await setDoc(
        doc(db, 'users', userId, 'transactions', id),
        { ...installmentTransaction, id }
      );
    }

    // Atualizar transação principal para indicar que é a primeira parcela
    // Primeira parcela ajusta o valor para compensar centavos perdidos
    await updateDoc(doc(db, 'users', userId, 'transactions', parentTransaction.id), {
      installments: {
        current: 1,
        total: total,
        parentTransactionId: parentTransaction.id
      },
      amount: firstInstallmentAmount
    });
  },

  // ============ TRANSFER ============
  async transferBetweenAccounts(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const accounts = await this.getAccounts(userId);
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);

    if (!fromAccount || !toAccount) {
      throw new Error('Conta não encontrada');
    }

    if (fromAccount.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    // Atualizar saldos
    await this.updateAccount(userId, fromAccountId, {
      balance: fromAccount.balance - amount
    });
    await this.updateAccount(userId, toAccountId, {
      balance: toAccount.balance + amount
    });

    // Criar transações de transferência
    const now = new Date().toISOString();

    await this.addTransaction(userId, {
      description: `Transferência: ${description}`,
      amount,
      date: now,
      type: TransactionType.EXPENSE,
      category: 'Transferência',
      accountId: fromAccountId,
      isPaid: true
    });

    await this.addTransaction(userId, {
      description: `Transferência: ${description}`,
      amount,
      date: now,
      type: TransactionType.INCOME,
      category: 'Transferência',
      accountId: toAccountId,
      isPaid: true
    });
  }
};

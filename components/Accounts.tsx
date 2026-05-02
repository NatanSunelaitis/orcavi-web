import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { AccountType, Account, TransactionType } from '../types';
import { Wallet, Plus, CreditCard, Building, PiggyBank } from 'lucide-react';

const Accounts: React.FC = () => {
  const { accounts, goals, transactions, addAccount } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<Partial<Account>>({
    name: '',
    type: AccountType.CHECKING,
    balance: 0,
    color: 'bg-blue-500'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAccount.name && newAccount.type) {
      addAccount({
        name: newAccount.name,
        type: newAccount.type,
        balance: Number(newAccount.balance),
        color: newAccount.color || 'bg-blue-500'
      } as Account);
      setIsModalOpen(false);
      setNewAccount({ name: '', type: AccountType.CHECKING, balance: 0, color: 'bg-blue-500' });
    }
  };

  const getIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CHECKING: return Building;
      case AccountType.SAVINGS: return PiggyBank;
      case AccountType.INVESTMENT: return TrendingUpIcon; 
      case AccountType.WALLET: return Wallet;
      default: return CreditCard;
    }
  };

  // Helper just for this file to avoid imports if not needed
  const TrendingUpIcon = ({className}:{className:string}) => (
     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
  );

  // Calculate reserved amount for each account
  // Calcula baseado nas contribuições (GOAL_CONTRIBUTION) que saíram desta conta
  const getReservedAmount = (accountId: string) => {
    return transactions
      .filter(t =>
        t.accountId === accountId &&
        t.type === TransactionType.GOAL_CONTRIBUTION &&
        t.isPaid
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Minhas Contas</h1>
           <p className="text-slate-500">Gerencie seus saldos e carteiras</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          style={{ backgroundColor: '#7C5CFC', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}
        >
          <Plus className="w-5 h-5" />
          Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => {
          const Icon = getIcon(acc.type);
          const reservedAmount = getReservedAmount(acc.id);
          const availableAmount = acc.balance - reservedAmount;

          return (
            <div key={acc.id} className="bg-white p-6 rounded-xl hover:shadow-md transition-shadow relative overflow-hidden" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
               <div className={`absolute top-0 left-0 w-1.5 h-full ${acc.color}`}></div>
               <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-lg bg-slate-50`}>
                   <Icon className="w-6 h-6 text-slate-700" />
                 </div>
                 <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{acc.type}</span>
               </div>
               <h3 className="text-lg font-semibold text-slate-800 mb-1">{acc.name}</h3>
               <p className="text-2xl font-bold text-slate-900 mb-3">R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>

               {reservedAmount > 0 && (
                 <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                   <div className="flex justify-between">
                     <span className="text-slate-500">Disponível:</span>
                     <span className="font-semibold text-green-600">R$ {availableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-500">Reservado em metas:</span>
                     <span className="font-semibold text-purple-600">R$ {reservedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nova Conta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Conta</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-violet-500"
                  value={newAccount.name}
                  onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                  placeholder="Ex: Nubank, Carteira..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-violet-500"
                    value={newAccount.type}
                    onChange={e => setNewAccount({...newAccount, type: e.target.value as AccountType})}
                  >
                    {Object.values(AccountType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Saldo Inicial</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-violet-500"
                    value={newAccount.balance}
                    onChange={e => setNewAccount({...newAccount, balance: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-lg"
                  style={{ backgroundColor: '#7C5CFC' }}
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
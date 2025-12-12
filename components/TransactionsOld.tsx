import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType, CATEGORIES } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

const Transactions: React.FC = () => {
  const { transactions, accounts, addTransaction } = useFinance();
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Transaction State
  const [newTrans, setNewTrans] = useState({
    description: '',
    amount: '',
    type: TransactionType.EXPENSE,
    category: '',
    accountId: accounts[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const filteredTransactions = transactions
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.description || !newTrans.amount || !newTrans.category || !newTrans.accountId) return;

    addTransaction({
      description: newTrans.description,
      amount: Number(newTrans.amount),
      type: newTrans.type,
      category: newTrans.category,
      accountId: newTrans.accountId,
      date: new Date(newTrans.date).toISOString(),
      isPaid: true // Default to paid for MVP
    });
    setIsModalOpen(false);
    setNewTrans({
      description: '',
      amount: '',
      type: TransactionType.EXPENSE,
      category: '',
      accountId: accounts[0]?.id || '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
           <p className="text-slate-500">Histórico de receitas e despesas</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500 mr-4">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtrar por:</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilterType(TransactionType.INCOME)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === TransactionType.INCOME ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            Receitas
          </button>
          <button 
            onClick={() => setFilterType(TransactionType.EXPENSE)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === TransactionType.EXPENSE ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          >
            Despesas
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Conta</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => {
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.type === TransactionType.INCOME ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-900">{t.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs">{t.category}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {account?.name || 'Desconhecida'}
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold text-right ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'}`}>
                      {t.type === TransactionType.EXPENSE ? '- ' : '+ '}
                      R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button
                  type="button"
                  onClick={() => setNewTrans({...newTrans, type: TransactionType.EXPENSE, category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTrans.type === TransactionType.EXPENSE ? 'bg-white shadow text-red-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrans({...newTrans, type: TransactionType.INCOME, category: ''})}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newTrans.type === TransactionType.INCOME ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTrans.description}
                  onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                  placeholder="Ex: Supermercado..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.amount}
                    onChange={e => setNewTrans({...newTrans, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input 
                    type="date" 
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.date}
                    onChange={e => setNewTrans({...newTrans, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select 
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.category}
                    onChange={e => setNewTrans({...newTrans, category: e.target.value})}
                  >
                    <option value="">Selecione</option>
                    {CATEGORIES[newTrans.type].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Conta</label>
                  <select 
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTrans.accountId}
                    onChange={e => setNewTrans({...newTrans, accountId: e.target.value})}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
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
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
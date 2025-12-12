import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { accounts, transactions } = useFinance();

  // Calculations
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = monthlyTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expense = monthlyTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balanceMonth = income - expense;
  const commitmentRate = income > 0 ? (expense / income) * 100 : 0;

  // Chart Data: Expenses by Category
  const expensesByCategory = monthlyTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

  // Chart Data: Last 6 Months Balance Evolution (Mock logic for demo)
  const barData = [
    { name: 'Jul', income: 4000, expense: 3200 },
    { name: 'Ago', income: 4200, expense: 3800 },
    { name: 'Set', income: 4500, expense: 2900 },
    { name: 'Out', income: 5000, expense: 4100 },
    { name: 'Nov', income: 4800, expense: 3600 },
    { name: 'Dez', income: income, expense: expense },
  ];

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500">Resumo financeiro de Dezembro 2024</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Total</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Saldo Total</h3>
          <p className="text-2xl font-bold text-slate-900">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Receitas (Mês)</h3>
          <p className="text-2xl font-bold text-green-600">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">-5%</span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Despesas (Mês)</h3>
          <p className="text-2xl font-bold text-red-600">R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${commitmentRate > 80 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {commitmentRate > 80 ? 'Crítico' : 'Saudável'}
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-medium">Comprometimento</h3>
          <p className="text-2xl font-bold text-slate-900">{commitmentRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Fluxo de Caixa Semestral</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`R$ ${value}`, '']}
                />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Gastos por Categoria</h3>
          <div className="h-64 w-full relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">Sem dados</div>
            )}
            {/* Custom Legend */}
            <div className="mt-4 space-y-2">
              {pieData.slice(0, 4).map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">R$ {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
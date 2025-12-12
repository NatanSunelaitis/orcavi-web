import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionType, SimulationResult } from '../types';
import { Calculator, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

const Simulator: React.FC = () => {
  const { transactions, accounts } = useFinance();
  
  // Simulation State
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [installments, setInstallments] = useState<number>(1);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Financial Context
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyIncome = transactions
    .filter(t => {
        const d = new Date(t.date);
        return t.type === TransactionType.INCOME && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthlyExpense = transactions
    .filter(t => {
        const d = new Date(t.date);
        return t.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  const handleSimulate = () => {
    const cost = Number(amount);
    if (!cost) return;

    const monthlyImpact = paymentType === 'CASH' ? 0 : cost / installments; // If cash, impact is immediate liquidity, not monthly budget
    const effectiveMonthlyExpense = monthlyExpense + monthlyImpact;
    
    // Calculate Ratios
    // If cash, we check if we have money. If credit, we check monthly commitment.
    
    let canAfford = true;
    let recommendation: 'RECOMMENDED' | 'WARNING' | 'NOT_RECOMMENDED' = 'RECOMMENDED';
    let newCommitmentRate = 0;
    const currentCommitmentRate = monthlyIncome > 0 ? (monthlyExpense / monthlyIncome) * 100 : 0;

    if (paymentType === 'CASH') {
        if (cost > totalLiquidity) {
            canAfford = false;
            recommendation = 'NOT_RECOMMENDED';
        } else if (cost > totalLiquidity * 0.5) {
             // If utilizing more than 50% of total savings
             recommendation = 'WARNING';
        }
        newCommitmentRate = currentCommitmentRate; // No monthly change
    } else {
        newCommitmentRate = monthlyIncome > 0 ? (effectiveMonthlyExpense / monthlyIncome) * 100 : 100;
        
        if (newCommitmentRate > 85) {
            recommendation = 'NOT_RECOMMENDED';
        } else if (newCommitmentRate > 70) {
            recommendation = 'WARNING';
        }
    }

    setResult({
        canAfford,
        newCommitmentRate,
        currentCommitmentRate,
        monthlyImpact,
        recommendation
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Simulador de Compras</h1>
          <p className="text-slate-500">Planeje antes de comprar e evite dívidas</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">O que deseja comprar?</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Notebook novo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qual o valor total?</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-500">R$</span>
                <input 
                    type="number" 
                    className="w-full border border-slate-300 rounded-lg p-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setPaymentType('CASH')}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${paymentType === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                        À Vista
                    </button>
                    <button 
                        onClick={() => setPaymentType('CREDIT')}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${paymentType === 'CREDIT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                        Parcelado
                    </button>
                </div>
            </div>

            {paymentType === 'CREDIT' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Número de Parcelas</label>
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                    >
                        {[1,2,3,4,5,6,10,12,18,24].map(i => (
                            <option key={i} value={i}>{i}x</option>
                        ))}
                    </select>
                </div>
            )}

            <button 
                onClick={handleSimulate}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors flex items-center justify-center gap-2"
            >
                <Calculator className="w-5 h-5" />
                Simular Impacto
            </button>
          </div>
        </div>
        
        {/* Context Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100 p-4 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-bold">Renda Mensal</p>
                <p className="text-lg font-bold text-slate-900">R$ {monthlyIncome.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-slate-100 p-4 rounded-xl">
                <p className="text-xs text-slate-500 uppercase font-bold">Saldo Disponível</p>
                <p className="text-lg font-bold text-slate-900">R$ {totalLiquidity.toLocaleString('pt-BR')}</p>
            </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex flex-col h-full">
         {!result ? (
             <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 p-8 text-center">
                 <Calculator className="w-16 h-16 mb-4 opacity-50" />
                 <h3 className="text-lg font-medium text-slate-600">Aguardando Simulação</h3>
                 <p>Preencha os dados ao lado para ver como esta compra afetará suas finanças.</p>
             </div>
         ) : (
             <div className={`bg-white rounded-xl shadow-lg border overflow-hidden flex flex-col h-full animate-fade-in ${
                 result.recommendation === 'RECOMMENDED' ? 'border-green-200' : 
                 result.recommendation === 'WARNING' ? 'border-amber-200' : 'border-red-200'
             }`}>
                 <div className={`p-6 ${
                     result.recommendation === 'RECOMMENDED' ? 'bg-green-50' : 
                     result.recommendation === 'WARNING' ? 'bg-amber-50' : 'bg-red-50'
                 }`}>
                     <div className="flex items-center gap-3 mb-2">
                         {result.recommendation === 'RECOMMENDED' && <CheckCircle className="w-8 h-8 text-green-600" />}
                         {result.recommendation === 'WARNING' && <AlertTriangle className="w-8 h-8 text-amber-600" />}
                         {result.recommendation === 'NOT_RECOMMENDED' && <XCircle className="w-8 h-8 text-red-600" />}
                         
                         <h2 className={`text-xl font-bold ${
                             result.recommendation === 'RECOMMENDED' ? 'text-green-800' : 
                             result.recommendation === 'WARNING' ? 'text-amber-800' : 'text-red-800'
                         }`}>
                             {result.recommendation === 'RECOMMENDED' ? 'Compra Aprovada!' : 
                              result.recommendation === 'WARNING' ? 'Atenção Necessária' : 'Não Recomendado'}
                         </h2>
                     </div>
                     <p className="text-slate-600">
                         {result.recommendation === 'RECOMMENDED' && "Esta compra cabe confortavelmente no seu orçamento."}
                         {result.recommendation === 'WARNING' && "Esta compra vai comprometer significativamente sua renda."}
                         {result.recommendation === 'NOT_RECOMMENDED' && "Alto risco de endividamento. Considere guardar dinheiro primeiro."}
                     </p>
                 </div>

                 <div className="p-6 space-y-6 flex-1">
                     {paymentType === 'CREDIT' && (
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-slate-600">Comprometimento Mensal</span>
                                <span className="text-sm text-slate-400">
                                    {result.currentCommitmentRate.toFixed(1)}% ➝ <strong className="text-slate-900">{result.newCommitmentRate.toFixed(1)}%</strong>
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        result.newCommitmentRate > 85 ? 'bg-red-500' : 
                                        result.newCommitmentRate > 70 ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(result.newCommitmentRate, 100)}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Recomendado: abaixo de 70%
                            </p>
                        </div>
                     )}

                     <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-500">Valor da Parcela</p>
                             <p className="text-xl font-bold text-slate-900">
                                 {paymentType === 'CASH' ? '---' : `R$ ${(Number(amount)/installments).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                             </p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                             <p className="text-xs text-slate-500">Saldo Após Compra</p>
                             <p className={`text-xl font-bold ${paymentType === 'CASH' ? (Number(amount) > totalLiquidity ? 'text-red-600' : 'text-slate-900') : 'text-slate-900'}`}>
                                 {paymentType === 'CASH' 
                                    ? `R$ ${(totalLiquidity - Number(amount)).toLocaleString('pt-BR')}`
                                    : `R$ ${totalLiquidity.toLocaleString('pt-BR')}`
                                 }
                             </p>
                         </div>
                     </div>

                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                         <h4 className="font-bold text-blue-800 text-sm mb-2">Nossa Sugestão</h4>
                         <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                             {result.recommendation === 'NOT_RECOMMENDED' && <li>Tente aumentar o número de parcelas para reduzir o impacto mensal.</li>}
                             {paymentType === 'CREDIT' && <li>Verifique se você tem limite disponível no cartão.</li>}
                             <li>Se possível, junte o valor para pagar à vista e peça desconto.</li>
                         </ul>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default Simulator;
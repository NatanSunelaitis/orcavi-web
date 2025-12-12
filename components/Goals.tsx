import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { Target, Trophy } from 'lucide-react';

const Goals: React.FC = () => {
  const { goals } = useFinance();

  return (
    <div>
       <div className="mb-6">
           <h1 className="text-2xl font-bold text-slate-900">Metas Financeiras</h1>
           <p className="text-slate-500">Acompanhe seus sonhos e objetivos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map(goal => {
                const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                const remaining = goal.targetAmount - goal.currentAmount;
                
                return (
                    <div key={goal.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <Trophy className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{goal.name}</h3>
                                    <p className="text-xs text-slate-500">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                                {progress.toFixed(0)}%
                            </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-4 mb-4">
                            <div 
                                className="bg-purple-600 h-4 rounded-full transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-slate-500">Guardado</p>
                                <p className="font-semibold text-green-600">R$ {goal.currentAmount.toLocaleString('pt-BR')}</p>
                            </div>
                             <div className="text-right">
                                <p className="text-xs text-slate-500">Meta</p>
                                <p className="font-semibold text-slate-900">R$ {goal.targetAmount.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>
                        
                        {remaining > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                                <p className="text-sm text-slate-500">
                                    Faltam <strong className="text-slate-800">R$ {remaining.toLocaleString('pt-BR')}</strong> para alcançar seu objetivo
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
            
            {/* Add Goal Placeholder */}
            <button className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-colors bg-slate-50 hover:bg-white min-h-[200px]">
                <Target className="w-10 h-10 mb-2" />
                <span className="font-medium">Criar Nova Meta</span>
            </button>
        </div>
    </div>
  );
};

export default Goals;
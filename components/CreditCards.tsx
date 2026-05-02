import React, { useState } from 'react';
import { CreditCard, Plus, Lock } from 'lucide-react';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface CardData {
  id: number;
  name: string;
  last4: string;
  limit: number;
  used: number;
  due: string;
  color: string;
}

interface CardTx {
  name: string;
  cat: string;
  amount: number;
  date: string;
  card: string;
}

const mockCards: CardData[] = [
  { id: 1, name: 'Nubank Ultravioleta', last4: '4821', limit: 8000, used: 2340, due: '15/05', color: '#7C5CFC' },
  { id: 2, name: 'Itaú Platinum', last4: '9203', limit: 5000, used: 1870, due: '10/05', color: '#2E86AB' },
  { id: 3, name: 'XP Visa Gold', last4: '1157', limit: 3000, used: 420, due: '20/05', color: '#E8875A' },
];

const mockTx: CardTx[] = [
  { name: 'iFood', cat: 'Alimentação', amount: 89.90, date: '18/04', card: 'Nubank' },
  { name: 'Zara', cat: 'Vestuário', amount: 234.50, date: '16/04', card: 'Itaú Platinum' },
  { name: 'Uber Eats', cat: 'Alimentação', amount: 42.00, date: '14/04', card: 'Nubank' },
  { name: 'Amazon', cat: 'Outros', amount: 156.00, date: '12/04', card: 'XP Visa' },
  { name: 'Posto Ipiranga', cat: 'Transporte', amount: 180.00, date: '10/04', card: 'Itaú Platinum' },
];

const CreditCardWidget: React.FC<{ card: CardData }> = ({ card }) => {
  const pct = Math.round((card.used / card.limit) * 100);
  return (
    <div style={{
      background: `linear-gradient(135deg, ${card.color}, ${card.color}bb)`,
      borderRadius: 16,
      padding: '22px 24px',
      color: 'white',
      boxShadow: `0 8px 24px ${card.color}44`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: -30, right: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{card.name}</div>
        <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 99 }}>•••• {card.last4}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Fatura atual</div>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>{fmtBRL(card.used)}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          Limite: {fmtBRL(card.limit)} · Vence {card.due}
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.85)', borderRadius: 99 }} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>{pct}% do limite utilizado</div>
    </div>
  );
};

const CreditCards: React.FC = () => {
  const [isProLocked] = useState(false); // Set to true to show paywall
  const totalUsed = mockCards.reduce((s, c) => s + c.used, 0);
  const totalLimit = mockCards.reduce((s, c) => s + c.limit, 0);

  if (isProLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="p-5 rounded-2xl mb-4" style={{ backgroundColor: '#EDE9FE' }}>
          <Lock className="w-10 h-10" style={{ color: '#7C5CFC' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#0D0D1A' }}>Funcionalidade Pro</h2>
        <p className="text-sm mb-6 max-w-xs" style={{ color: '#4B4B6B' }}>
          Gerencie seus cartões de crédito, faturas e limites com o plano Pro.
        </p>
        <button className="px-6 py-3 rounded-lg font-semibold text-white" style={{ backgroundColor: '#7C5CFC', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}>
          Assinar Pro — R$ 9,90/mês
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0D0D1A', letterSpacing: '-0.025em' }}>Cartões de Crédito</h1>
          <p className="text-sm mt-0.5" style={{ color: '#9090B0' }}>Faturas e gastos do mês</p>
        </div>
        <button
          className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          style={{ backgroundColor: '#7C5CFC', boxShadow: '0 4px 12px rgba(124,92,252,0.3)' }}
        >
          <Plus className="w-4 h-4" /> Novo Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {mockCards.map(c => <CreditCardWidget key={c.id} card={c} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Últimas compras */}
        <div className="lg:col-span-2 bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="px-5 py-3.5 text-sm font-bold" style={{ borderBottom: '1px solid #F5F3FF', color: '#0D0D1A' }}>
            Últimas compras
          </div>
          {mockTx.map((t, i) => (
            <div
              key={i}
              className="flex justify-between items-center px-5 py-3"
              style={{ borderBottom: i < mockTx.length - 1 ? '1px solid #F5F3FF' : 'none' }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: '#0D0D1A' }}>{t.name}</div>
                <div className="text-xs mt-0.5" style={{ color: '#9090B0' }}>{t.cat} · {t.card}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: '#DC4F3A' }}>−{fmtBRL(t.amount)}</div>
                <div className="text-xs" style={{ color: '#9090B0' }}>{t.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #E8E4FF', boxShadow: '0 1px 3px rgba(124,92,252,0.06)' }}>
          <div className="text-sm font-bold mb-4" style={{ color: '#0D0D1A' }}>Resumo das Faturas</div>
          <div className="text-xs mb-1" style={{ color: '#9090B0' }}>Total de faturas</div>
          <div className="text-3xl font-extrabold mb-2" style={{ color: '#DC4F3A', letterSpacing: '-0.025em' }}>{fmtBRL(totalUsed)}</div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#F5F3FF' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round((totalUsed / totalLimit) * 100)}%`, backgroundColor: '#DC4F3A' }}
            />
          </div>
          <div className="text-xs mb-5" style={{ color: '#9090B0' }}>
            Limite total: {fmtBRL(totalLimit)} · {Math.round((totalUsed / totalLimit) * 100)}% usado
          </div>
          {mockCards.map(c => (
            <div key={c.id} className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.color }} />
                <span className="text-sm" style={{ color: '#4B4B6B' }}>{c.name.split(' ')[0]}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#0D0D1A' }}>{fmtBRL(c.used)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditCards;

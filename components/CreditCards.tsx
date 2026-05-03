import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CATEGORIES = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Vestuário', 'Serviços', 'Outros'];
const COLORS = ['#7C5CFC', '#2E86AB', '#E8875A', '#059669', '#DC4F3A', '#F59E0B', '#1A1A2E'];

interface Card {
  id: string;
  name: string;
  last4: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
  used?: number;
}

interface CardTx {
  id: string;
  card_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  installment_total: number;
  installment_current: number;
  card_name?: string;
}

const CreditCards: React.FC = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<CardTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>('');

  const [cardForm, setCardForm] = useState({ name: '', last4: '', credit_limit: '', closing_day: '1', due_day: '10', color: '#7C5CFC' });
  const [txForm, setTxForm] = useState({ card_id: '', description: '', amount: '', category: 'Alimentação', date: new Date().toISOString().split('T')[0], installment_total: '1' });

  const loadData = async () => {
    if (!user) return;
    const [{ data: cardsData }, { data: txData }] = await Promise.all([
      supabase.from('credit_cards').select('*').eq('user_id', user.uid).order('created_at'),
      supabase.from('card_transactions').select('*, credit_cards(name)').eq('user_id', user.uid).order('date', { ascending: false }),
    ]);

    const now = new Date();
    const txList = (txData ?? []).map((t: any) => ({ ...t, card_name: t.credit_cards?.name }));

    const cardList = (cardsData ?? []).map(c => {
      const used = txList
        .filter(t => t.card_id === c.id && new Date(t.date).getMonth() === now.getMonth())
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { ...c, used };
    });

    setCards(cardList);
    setTransactions(txList);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const saveCard = async () => {
    if (!user || !cardForm.name || !cardForm.credit_limit) return;
    await supabase.from('credit_cards').insert({
      user_id: user.uid,
      name: cardForm.name,
      last4: cardForm.last4 || null,
      credit_limit: Number(cardForm.credit_limit),
      closing_day: Number(cardForm.closing_day),
      due_day: Number(cardForm.due_day),
      color: cardForm.color,
    });
    setShowCardModal(false);
    setCardForm({ name: '', last4: '', credit_limit: '', closing_day: '1', due_day: '10', color: '#7C5CFC' });
    loadData();
  };

  const saveTx = async () => {
    if (!user || !txForm.description || !txForm.amount || !txForm.card_id) return;
    await supabase.from('card_transactions').insert({
      user_id: user.uid,
      card_id: txForm.card_id,
      description: txForm.description,
      amount: Number(txForm.amount),
      category: txForm.category,
      date: txForm.date,
      installment_total: Number(txForm.installment_total),
      installment_current: 1,
    });
    setShowTxModal(false);
    setTxForm({ card_id: '', description: '', amount: '', category: 'Alimentação', date: new Date().toISOString().split('T')[0], installment_total: '1' });
    loadData();
  };

  const deleteCard = async (id: string) => {
    if (!confirm('Excluir cartão e todas as transações?')) return;
    await supabase.from('credit_cards').delete().eq('id', id);
    loadData();
  };

  const totalUsed = cards.reduce((s, c) => s + (c.used ?? 0), 0);
  const totalLimit = cards.reduce((s, c) => s + c.credit_limit, 0);

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>Cartões de Crédito</h1>
          <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Faturas e gastos do mês</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTxModal(true)} disabled={cards.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#7C5CFC', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={15} /> Lançamento
          </button>
          <button onClick={() => setShowCardModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#7C5CFC', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={15} /> Novo Cartão
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>
      ) : cards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: 'white', borderRadius: 16, border: '2px dashed #E8E4FF' }}>
          <CreditCard size={40} color="#C4B5FD" style={{ marginBottom: 12 }} />
          <p style={{ fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Nenhum cartão cadastrado</p>
          <p style={{ fontSize: 13, color: '#9090B0', marginBottom: 20 }}>Adicione seus cartões para controlar os gastos</p>
          <button onClick={() => setShowCardModal(true)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Adicionar cartão
          </button>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
            {cards.map(card => {
              const pct = Math.min(100, Math.round(((card.used ?? 0) / card.credit_limit) * 100));
              return (
                <div key={card.id} style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}bb)`, borderRadius: 16, padding: '22px 24px', color: 'white', boxShadow: `0 8px 24px ${card.color}44`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{card.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {card.last4 && <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 99 }}>•••• {card.last4}</div>}
                      <button onClick={() => deleteCard(card.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Fatura atual</div>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>{fmtBRL(card.used ?? 0)}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      Limite: {fmtBRL(card.credit_limit)} · Vence dia {card.due_day}
                    </div>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(255,255,255,0.85)', borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>{pct}% do limite utilizado</div>
                </div>
              );
            })}
          </div>

          {/* Resumo + Transações */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F5F3FF' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', margin: 0 }}>Últimos lançamentos</h3>
              </div>
              {transactions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9090B0', padding: 32, fontSize: 13 }}>Nenhum lançamento ainda</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {transactions.slice(0, 15).map(tx => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #F9F8FF' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A' }}>{tx.description}</div>
                          <div style={{ fontSize: 11, color: '#9090B0' }}>{tx.category} · {tx.card_name} · {tx.date}</div>
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#DC4F3A', whiteSpace: 'nowrap' }}>
                          -{fmtBRL(Number(tx.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D0D1A', marginBottom: 16 }}>Resumo das Faturas</h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#9090B0' }}>Total de faturas</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#DC4F3A' }}>{fmtBRL(totalUsed)}</div>
                <div style={{ height: 6, background: '#F5F3FF', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, Math.round((totalUsed / totalLimit) * 100))}%`, background: '#DC4F3A', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: '#9090B0', marginTop: 4 }}>
                  Limite total: {fmtBRL(totalLimit)} · {Math.round((totalUsed / totalLimit) * 100) || 0}% usado
                </div>
              </div>
              {cards.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                    <span style={{ fontSize: 12, color: '#374151' }}>{c.name.split(' ')[0]}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0D0D1A' }}>{fmtBRL(c.used ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal Novo Cartão */}
      {showCardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Cartão</h3>
              <button onClick={() => setShowCardModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nome do cartão *</label><input style={inputStyle} placeholder="Ex: Nubank Roxinho" value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label style={labelStyle}>Últimos 4 dígitos</label><input style={inputStyle} placeholder="0000" maxLength={4} value={cardForm.last4} onChange={e => setCardForm(f => ({ ...f, last4: e.target.value }))} /></div>
              <div><label style={labelStyle}>Limite de crédito *</label><input style={inputStyle} type="number" placeholder="5000" value={cardForm.credit_limit} onChange={e => setCardForm(f => ({ ...f, credit_limit: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Dia fechamento</label><input style={inputStyle} type="number" min={1} max={31} value={cardForm.closing_day} onChange={e => setCardForm(f => ({ ...f, closing_day: e.target.value }))} /></div>
                <div><label style={labelStyle}>Dia vencimento</label><input style={inputStyle} type="number" min={1} max={31} value={cardForm.due_day} onChange={e => setCardForm(f => ({ ...f, due_day: e.target.value }))} /></div>
              </div>
              <div>
                <label style={labelStyle}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setCardForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: cardForm.color === c ? '3px solid #1A1A2E' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <button onClick={saveCard} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Cartão
            </button>
          </div>
        </div>
      )}

      {/* Modal Lançamento */}
      {showTxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Lançamento</h3>
              <button onClick={() => setShowTxModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Cartão *</label>
                <select style={inputStyle} value={txForm.card_id} onChange={e => setTxForm(f => ({ ...f, card_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Descrição *</label><input style={inputStyle} placeholder="Ex: iFood" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label style={labelStyle}>Valor *</label><input style={inputStyle} type="number" placeholder="0,00" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select style={inputStyle} value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Data</label><input style={inputStyle} type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Parcelas</label><input style={inputStyle} type="number" min={1} max={48} value={txForm.installment_total} onChange={e => setTxForm(f => ({ ...f, installment_total: e.target.value }))} /></div>
              </div>
            </div>
            <button onClick={saveTx} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Lançamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditCards;

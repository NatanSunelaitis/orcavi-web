import React, { useState, useEffect } from 'react';
import { UserPlus, Plus, X, Trash2, Users, Link, Copy, Check, ArrowRight, Tag, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PlanGate from './PlanGate';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#7C5CFC', '#2E86AB', '#E8875A', '#059669', '#DC4F3A', '#F59E0B'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços', 'Pet', 'Viagem', 'Outros'];

interface Group { id: string; name: string; admin_id: string; invite_token: string; }
interface Member { id: string; name: string; avatar: string; color: string; is_pet: boolean; role: string; }
interface Split { id: string; member_id: string; percentage: number; amount: number; is_paid: boolean; }
interface Expense {
  id: string; description: string; amount: number; category: string;
  date: string; event_tag: string; paid_by: string | null; splits: Split[];
}
interface Settlement { from: string; to: string; amount: number; }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block',
};

function calcSettlements(members: Member[], expenses: Expense[]): Settlement[] {
  const owes: Record<string, Record<string, number>> = {};
  members.forEach(m => { owes[m.id] = {}; });

  for (const exp of expenses) {
    if (!exp.paid_by) continue;
    for (const split of exp.splits) {
      if (split.member_id === exp.paid_by || split.amount <= 0) continue;
      owes[split.member_id][exp.paid_by] = (owes[split.member_id][exp.paid_by] ?? 0) + split.amount;
    }
  }

  const settlements: Settlement[] = [];
  const seen = new Set<string>();

  for (const from of Object.keys(owes)) {
    for (const to of Object.keys(owes[from])) {
      const key = [from, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const net = (owes[from][to] ?? 0) - (owes[to]?.[from] ?? 0);
      if (net > 0.01) settlements.push({ from, to, amount: net });
      else if (net < -0.01) settlements.push({ from: to, to: from, amount: -net });
    }
  }
  return settlements;
}

const Family: React.FC = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gastos' | 'acerto'>('gastos');
  const [activeTag, setActiveTag] = useState<string>('Todos');
  const [copied, setCopied] = useState(false);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', color: '#7C5CFC', is_pet: false });
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
    event_tag: 'Geral', paid_by: '',
  });
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [splitMode, setSplitMode] = useState<'equal' | 'percent'>('equal');

  const loadData = async () => {
    if (!user) return;
    const { data: g } = await supabase
      .from('family_groups').select('*').eq('admin_id', user.uid).single();

    if (g) {
      setGroup(g);
      const { data: mData } = await supabase
        .from('family_members').select('*').eq('group_id', g.id).order('created_at');
      const mList = (mData ?? []) as Member[];
      setMembers(mList);

      const { data: eData } = await supabase
        .from('shared_expenses')
        .select('*, expense_splits(*)')
        .eq('group_id', g.id)
        .order('date', { ascending: false });

      setExpenses((eData ?? []).map((e: any) => ({
        ...e, amount: Number(e.amount),
        splits: (e.expense_splits ?? []).map((s: any) => ({
          ...s, percentage: Number(s.percentage), amount: Number(s.amount),
        })),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const openExpenseModal = () => {
    const equal = members.length > 0 ? +(100 / members.length).toFixed(1) : 0;
    const initial: Record<string, number> = {};
    members.forEach((m, i) => {
      initial[m.id] = i === members.length - 1
        ? +(100 - equal * (members.length - 1)).toFixed(1)
        : equal;
    });
    setSplits(initial);
    setSplitMode('equal');
    setExpenseForm(f => ({ ...f, paid_by: members[0]?.id ?? '' }));
    setShowExpenseModal(true);
  };

  const applyEqualSplit = () => {
    const equal = +(100 / members.length).toFixed(1);
    const s: Record<string, number> = {};
    members.forEach((m, i) => {
      s[m.id] = i === members.length - 1 ? +(100 - equal * (members.length - 1)).toFixed(1) : equal;
    });
    setSplits(s);
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) return;
    const token = Math.random().toString(36).substring(2, 18);
    const { data: g } = await supabase.from('family_groups')
      .insert({ name: groupName, admin_id: user.uid, invite_token: token })
      .select().single();
    if (g) {
      await supabase.from('family_members').insert({
        group_id: g.id, user_id: user.uid, role: 'admin',
        name: user.displayName?.split(' ')[0] ?? 'Você',
        avatar: user.displayName?.charAt(0) ?? 'V',
        color: '#7C5CFC', is_pet: false,
      });
      setShowCreateGroup(false);
      setGroupName('');
      loadData();
    }
  };

  const addMember = async () => {
    if (!group || !memberForm.name.trim()) return;
    await supabase.from('family_members').insert({
      group_id: group.id, name: memberForm.name,
      avatar: memberForm.is_pet ? '🐾' : memberForm.name.charAt(0).toUpperCase(),
      color: memberForm.color, is_pet: memberForm.is_pet, role: 'member',
    });
    setShowMemberModal(false);
    setMemberForm({ name: '', color: '#7C5CFC', is_pet: false });
    loadData();
  };

  const removeMember = async (id: string) => {
    if (!confirm('Remover membro?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    loadData();
  };

  const addExpense = async () => {
    if (!group || !user || !expenseForm.description || !expenseForm.amount || !expenseForm.paid_by) return;
    const total = Number(expenseForm.amount);
    const totalPct = +Object.values(splits).reduce((s, v) => s + v, 0).toFixed(1);
    if (Math.abs(totalPct - 100) > 0.5) { alert('A divisão deve somar 100%'); return; }

    const { data: exp } = await supabase.from('shared_expenses').insert({
      group_id: group.id, created_by: user.uid,
      description: expenseForm.description, amount: total,
      category: expenseForm.category, date: expenseForm.date,
      event_tag: expenseForm.event_tag, paid_by: expenseForm.paid_by,
    }).select().single();

    if (exp) {
      await supabase.from('expense_splits').insert(
        members.map(m => ({
          expense_id: exp.id, member_id: m.id,
          percentage: splits[m.id] ?? 0,
          amount: +(total * (splits[m.id] ?? 0) / 100).toFixed(2),
          is_paid: m.id === expenseForm.paid_by,
        }))
      );
    }
    setShowExpenseModal(false);
    loadData();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Excluir despesa?')) return;
    await supabase.from('shared_expenses').delete().eq('id', id);
    loadData();
  };

  const copyInviteLink = () => {
    if (!group?.invite_token) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${group.invite_token}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tags = ['Todos', ...Array.from(new Set(expenses.map(e => e.event_tag ?? 'Geral')))];
  const filteredExpenses = activeTag === 'Todos'
    ? expenses
    : expenses.filter(e => (e.event_tag ?? 'Geral') === activeTag);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const settlements = calcSettlements(members, expenses);
  const memberById = Object.fromEntries(members.map(m => [m.id, m]));

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>;

  // ─── Sem grupo ───
  if (!group) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}>
          <Users size={32} color="white" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8, letterSpacing: '-0.02em' }}>Crie seu grupo familiar</h2>
        <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 28, textAlign: 'center', maxWidth: 380 }}>
          Controle finanças com sua família ou amigos. Divida despesas, acompanhe quem deve quem e mantenha as contas em dia.
        </p>
        {!showCreateGroup ? (
          <button onClick={() => setShowCreateGroup(true)} style={{ padding: '13px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
            Criar grupo
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 400 }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Ex: Família Silva · Viagem SP" value={groupName} onChange={e => setGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} autoFocus />
            <button onClick={createGroup} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar</button>
          </div>
        )}
      </div>
    );
  }

  // ─── Com grupo ───
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>{group.name}</h1>
          <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Controle compartilhado do grupo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyInviteLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: copied ? '#059669' : '#6B6B9A', cursor: 'pointer', fontFamily: 'inherit' }}>
            {copied ? <Check size={14} /> : <Link size={14} />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button onClick={() => setShowMemberModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#2E86AB', cursor: 'pointer', fontFamily: 'inherit' }}>
            <UserPlus size={14} /> Membro
          </button>
          <button onClick={openExpenseModal} disabled={members.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14} /> Despesa
          </button>
        </div>
      </div>

      {/* KPIs + Membros */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, padding: '18px 20px', color: 'white', background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total de despesas</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>{fmtBRL(totalExpenses)}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{filteredExpenses.length} lançamentos</div>
        </div>
        <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Acertos pendentes</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: settlements.length > 0 ? '#DC4F3A' : '#059669' }}>{settlements.length}</div>
          <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{settlements.length === 0 ? 'Tudo certo!' : 'transferências'}</div>
        </div>
        <div style={{ borderRadius: 14, padding: '16px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
          <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 10 }}>Membros</div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            {members.map((m, i) => (
              <div key={m.id} title={m.name} style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 16 : 12, border: '2px solid white', marginLeft: i > 0 ? -6 : 0 }}>
                {m.avatar}
              </div>
            ))}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginLeft: 8 }}>{members.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
        {(['gastos', 'acerto'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? '#059669' : '#6B6B9A', boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {tab === 'gastos' ? 'Despesas' : 'Acerto de Contas'}
          </button>
        ))}
      </div>

      {/* Tab: Gastos */}
      {activeTab === 'gastos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <div>
            {/* Tags de evento */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {tags.map(tag => (
                <button key={tag} onClick={() => setActiveTag(tag)} style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${activeTag === tag ? '#059669' : '#E8E4FF'}`, background: activeTag === tag ? '#ECFDF5' : 'white', color: activeTag === tag ? '#059669' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {tag}
                </button>
              ))}
            </div>

            {/* Lista de despesas */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
              {filteredExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <DollarSign size={32} color="#E8E4FF" style={{ marginBottom: 12 }} />
                  <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhuma despesa ainda.<br />Clique em "+ Despesa" para adicionar.</p>
                </div>
              ) : filteredExpenses.map((e, i) => {
                const payer = memberById[e.paid_by ?? ''];
                return (
                  <div key={e.id} style={{ padding: '14px 20px', borderBottom: i < filteredExpenses.length - 1 ? '1px solid #F9F8FF' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A' }}>{e.description}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#9090B0' }}>{e.category} · {e.date}</span>
                          {e.event_tag && e.event_tag !== 'Geral' && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#EDE9FE', color: '#7C5CFC' }}>
                              {e.event_tag}
                            </span>
                          )}
                          {payer && (
                            <span style={{ fontSize: 11, color: '#9090B0' }}>
                              · pago por <strong style={{ color: payer.color }}>{payer.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(e.amount)}</span>
                        <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {e.splits.filter(s => s.percentage > 0).map(s => {
                        const m = memberById[s.member_id];
                        if (!m) return null;
                        return (
                          <span key={s.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.color + '18', color: m.color }}>
                            {m.is_pet ? '🐾' : m.avatar} {fmtBRL(s.amount)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Membros sidebar */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden', height: 'fit-content' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F5F3FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>Membros</span>
              <button onClick={() => setShowMemberModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                <Plus size={13} /> Adicionar
              </button>
            </div>
            {members.map((m, i) => {
              const spent = expenses.reduce((s, e) => {
                const sp = e.splits.find(x => x.member_id === m.id);
                return s + (sp?.amount ?? 0);
              }, 0);
              const paid = expenses.filter(e => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0);
              const balance = paid - spent;
              return (
                <div key={m.id} style={{ padding: '12px 18px', borderBottom: i < members.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 16 : 13, flexShrink: 0 }}>
                      {m.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {m.name}
                        {m.is_pet && <span style={{ fontSize: 9, background: '#FFE8D6', color: '#E8875A', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>PET</span>}
                        {m.role === 'admin' && <span style={{ fontSize: 9, background: '#EDE9FE', color: '#7C5CFC', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>ADM</span>}
                      </div>
                      <div style={{ fontSize: 11, color: balance >= 0 ? '#059669' : '#DC4F3A', fontWeight: 600 }}>
                        {balance >= 0 ? `+${fmtBRL(balance)}` : `-${fmtBRL(Math.abs(balance))}`}
                      </div>
                    </div>
                  </div>
                  {m.role !== 'admin' && (
                    <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}><Trash2 size={13} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Acerto de Contas */}
      {activeTab === 'acerto' && (
        <div>
          {settlements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: 'white', borderRadius: 16, border: '1px solid #E8E4FF' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#059669" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A', marginBottom: 6 }}>Tudo certo!</h3>
              <p style={{ fontSize: 13, color: '#9090B0' }}>Nenhum acerto pendente entre os membros.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settlements.map((s, i) => {
                const from = memberById[s.from];
                const to = memberById[s.to];
                if (!from || !to) return null;
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: from.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: from.is_pet ? 20 : 14, flexShrink: 0 }}>
                      {from.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#374151' }}>
                        <strong style={{ color: from.color }}>{from.name}</strong>
                        {' deve pagar '}
                        <strong style={{ color: to.color }}>{to.name}</strong>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A', letterSpacing: '-0.02em' }}>{fmtBRL(s.amount)}</div>
                    </div>
                    <ArrowRight size={16} color="#E8E4FF" />
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: to.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: to.is_pet ? 20 : 14, flexShrink: 0 }}>
                      {to.avatar}
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 12, color: '#9090B0', textAlign: 'center', margin: '8px 0 0' }}>
                Após os pagamentos, marque as despesas como pagas para limpar o acerto.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal — Novo Membro */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Adicionar Membro</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>

            {/* Link de convite */}
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 14px', marginBottom: 16, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 4 }}>Convide por link</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Compartilhe o link para alguém entrar no grupo sem precisar de conta.</div>
              <button onClick={copyInviteLink} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#059669', background: 'white', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Link copiado!' : 'Copiar link de convite'}
              </button>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#9090B0', marginBottom: 10, textAlign: 'center' }}>— ou adicione manualmente —</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nome *</label><input style={inputStyle} placeholder="Ex: Juliana" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
              <div>
                <label style={labelStyle}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => <button key={c} onClick={() => setMemberForm(f => ({ ...f, color: c }))} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: memberForm.color === c ? '3px solid #1A1A2E' : '2px solid transparent', cursor: 'pointer' }} />)}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" checked={memberForm.is_pet} onChange={e => setMemberForm(f => ({ ...f, is_pet: e.target.checked }))} />
                É um pet 🐾
              </label>
            </div>
            <button onClick={addMember} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* Modal — Nova Despesa */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nova Despesa</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Descrição *</label><input style={inputStyle} placeholder="Ex: Jantar, Ingresso, Hotel" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} autoFocus /></div>
              <div><label style={labelStyle}>Valor *</label><input style={inputStyle} type="number" placeholder="0,00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Categoria</label>
                  <select style={inputStyle} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Data</label><input style={inputStyle} type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Evento / Grupo</label>
                  <input style={inputStyle} placeholder="Ex: Viagem SP, Casa" value={expenseForm.event_tag} onChange={e => setExpenseForm(f => ({ ...f, event_tag: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Quem pagou *</label>
                  <select style={inputStyle} value={expenseForm.paid_by} onChange={e => setExpenseForm(f => ({ ...f, paid_by: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {members.filter(m => !m.is_pet).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Divisão */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Como dividir</label>
                  <button onClick={applyEqualSplit} style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Dividir igualmente
                  </button>
                </div>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 14 : 12, flexShrink: 0 }}>
                      {m.avatar}
                    </div>
                    <span style={{ fontSize: 13, flex: 1, color: '#374151' }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" min={0} max={100} value={splits[m.id] ?? 0} onChange={e => setSplits(s => ({ ...s, [m.id]: Number(e.target.value) }))} style={{ width: 60, padding: '6px 8px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 13, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }} />
                      <span style={{ fontSize: 12, color: '#9090B0' }}>%</span>
                      {expenseForm.amount && (
                        <span style={{ fontSize: 11, color: '#6B7280', minWidth: 50 }}>
                          {fmtBRL(Number(expenseForm.amount) * (splits[m.id] ?? 0) / 100)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: Math.abs(Object.values(splits).reduce((s, v) => s + v, 0) - 100) < 0.5 ? '#059669' : '#DC4F3A' }}>
                  Total: {+Object.values(splits).reduce((s, v) => s + v, 0).toFixed(1)}%
                </div>
              </div>
            </div>
            <button onClick={addExpense} style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Despesa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FamilyGated: React.FC = () => (
  <PlanGate requiredPlan="family"><Family /></PlanGate>
);

export default FamilyGated;

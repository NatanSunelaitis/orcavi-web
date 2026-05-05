import React, { useState, useEffect } from 'react';
import {
  UserPlus, Plus, X, Trash2, Users, Copy, Check,
  ArrowRight, ChevronLeft, ChevronRight, Calendar, RefreshCw,
  MapPin, Home, Tag, TrendingDown, TrendingUp, Zap, Settings,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#7C5CFC', '#2E86AB', '#E8875A', '#059669', '#DC4F3A', '#F59E0B'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços', 'Pet', 'Viagem', 'Outros'];
const CATEGORY_COLORS: Record<string, string> = {
  Moradia: '#7C5CFC', Alimentação: '#059669', Transporte: '#2E86AB',
  Saúde: '#DC4F3A', Educação: '#F59E0B', Lazer: '#E8875A',
  Serviços: '#6D28D9', Pet: '#D97706', Viagem: '#0891B2', Outros: '#6B7280',
};
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block' };

interface Group {
  id: string; name: string; admin_id: string;
  invite_token: string; invite_code?: string; invite_code_expires_at?: string;
  type: 'family' | 'event'; description?: string;
  start_date?: string; end_date?: string; monthly_budget?: number;
}
interface Member { id: string; name: string; avatar: string; color: string; is_pet: boolean; role: string; }
interface Split { id: string; member_id: string; percentage: number; amount: number; is_paid: boolean; }
interface Expense {
  id: string; description: string; amount: number; category: string;
  date: string; event_tag: string; paid_by: string | null;
  splits: Split[]; is_recurring: boolean; recurring_interval?: string;
}
interface Settlement { from: string; to: string; amount: number; }

function calcSettlements(members: Member[], expenses: Expense[]): Settlement[] {
  const owes: Record<string, Record<string, number>> = {};
  members.forEach(m => { owes[m.id] = {}; });
  for (const exp of expenses) {
    if (!exp.paid_by) continue;
    for (const split of exp.splits) {
      if (split.member_id === exp.paid_by || split.amount <= 0) continue;
      if (!owes[split.member_id]) owes[split.member_id] = {};
      owes[split.member_id][exp.paid_by] = (owes[split.member_id][exp.paid_by] ?? 0) + split.amount;
    }
  }
  const settlements: Settlement[] = [];
  const seen = new Set<string>();
  for (const from of Object.keys(owes)) {
    for (const to of Object.keys(owes[from] ?? {})) {
      const key = [from, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const net = (owes[from]?.[to] ?? 0) - (owes[to]?.[from] ?? 0);
      if (net > 0.01) settlements.push({ from, to, amount: net });
      else if (net < -0.01) settlements.push({ from: to, to: from, amount: -net });
    }
  }
  return settlements;
}

const Family: React.FC = () => {
  const { user } = useAuth();
  const { isFamily } = usePlan();

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'gastos' | 'acerto'>('overview');
  const [activeTag, setActiveTag] = useState('Todos');
  const [analyticsMonth, setAnalyticsMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [createForm, setCreateForm] = useState({ name: '', type: 'family' as 'family' | 'event', description: '', start_date: '', end_date: '' });
  const [memberForm, setMemberForm] = useState({ name: '', color: '#7C5CFC', is_pet: false });
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'Alimentação',
    date: new Date().toISOString().split('T')[0], event_tag: 'Geral', paid_by: '',
  });
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'weekly'>('monthly');

  const [quickForm, setQuickForm] = useState({ description: '', amount: '', paid_by: '' });
  const [quickLoading, setQuickLoading] = useState(false);

  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    const { data: ag } = await supabase.from('family_groups').select('*').eq('admin_id', user.uid).order('created_at');
    const { data: md } = await supabase.from('family_members').select('group_id').eq('user_id', user.uid);
    const ids = (md ?? []).map((m: any) => m.group_id).filter(Boolean);
    let mg: Group[] = [];
    if (ids.length > 0) {
      const { data } = await supabase.from('family_groups').select('*').in('id', ids);
      mg = (data ?? []) as Group[];
    }
    const all = [...(ag ?? []), ...mg] as Group[];
    const seen = new Set<string>();
    setGroups(all.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; }));
    setLoading(false);
  };

  const loadGroupDetail = async (groupId: string) => {
    setDetailLoading(true);
    const { data: mData } = await supabase.from('family_members').select('*').eq('group_id', groupId).order('created_at');
    setMembers((mData ?? []) as Member[]);
    const { data: eData } = await supabase.from('shared_expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', groupId)
      .order('date', { ascending: false });
    setExpenses((eData ?? []).map((e: any) => ({
      ...e, amount: Number(e.amount),
      splits: (e.expense_splits ?? []).map((s: any) => ({ ...s, percentage: Number(s.percentage), amount: Number(s.amount) })),
    })));
    setDetailLoading(false);
  };

  useEffect(() => { loadGroups(); }, [user]);

  const openGroup = async (group: Group) => {
    setSelectedGroup(group);
    setView('detail');
    setActiveTab(group.type === 'event' ? 'gastos' : 'overview');
    setActiveTag('Todos');
    await loadGroupDetail(group.id);
  };

  const backToList = () => { setView('list'); setSelectedGroup(null); setMembers([]); setExpenses([]); };

  const joinByCode = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true); setCodeError('');
    const { data } = await supabase.rpc('join_group_by_code', { p_code: codeInput.trim().toUpperCase() });
    setCodeLoading(false);
    if (!data || data.error) {
      setCodeError(data?.error === 'expired' ? 'Código expirado.' : data?.error === 'already_member' ? 'Você já é membro.' : 'Código inválido.');
      return;
    }
    setCodeInput(''); setShowCodeInput(false);
    await loadGroups();
  };

  const createGroup = async () => {
    if (!user || !createForm.name.trim()) return;
    const token = Math.random().toString(36).substring(2, 18);
    const payload: any = { name: createForm.name, admin_id: user.uid, invite_token: token, type: createForm.type, description: createForm.description || null };
    if (createForm.type === 'event') { payload.start_date = createForm.start_date || null; payload.end_date = createForm.end_date || null; }
    const { data: g } = await supabase.from('family_groups').insert(payload).select().single();
    if (g) {
      await supabase.from('family_members').insert({
        group_id: g.id, user_id: user.uid, role: 'admin',
        name: user.displayName?.split(' ')[0] ?? 'Você',
        avatar: user.displayName?.charAt(0).toUpperCase() ?? 'V',
        color: '#7C5CFC', is_pet: false,
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'family', description: '', start_date: '', end_date: '' });
      await loadGroups();
      openGroup(g as Group);
    }
  };

  const saveBudget = async () => {
    if (!selectedGroup || !budgetInput) return;
    const val = Number(budgetInput);
    await supabase.from('family_groups').update({ monthly_budget: val }).eq('id', selectedGroup.id);
    const updated = { ...selectedGroup, monthly_budget: val };
    setSelectedGroup(updated);
    setGroups(gs => gs.map(g => g.id === selectedGroup.id ? updated : g));
    setShowBudgetModal(false);
  };

  const generateInviteCode = async () => {
    if (!selectedGroup) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('family_groups').update({ invite_code: code, invite_code_expires_at: expires }).eq('id', selectedGroup.id);
    const updated = { ...selectedGroup, invite_code: code, invite_code_expires_at: expires };
    setSelectedGroup(updated);
    setGroups(gs => gs.map(g => g.id === selectedGroup.id ? updated : g));
  };

  const copyInviteLink = () => {
    if (!selectedGroup?.invite_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${selectedGroup.invite_token}`);
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2500);
  };
  const copyInviteCode = () => {
    if (!selectedGroup?.invite_code) return;
    navigator.clipboard.writeText(selectedGroup.invite_code);
    setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2500);
  };

  const addMember = async () => {
    if (!selectedGroup || !memberForm.name.trim()) return;
    await supabase.from('family_members').insert({
      group_id: selectedGroup.id, name: memberForm.name,
      avatar: memberForm.is_pet ? '🐾' : memberForm.name.charAt(0).toUpperCase(),
      color: memberForm.color, is_pet: memberForm.is_pet, role: 'member',
    });
    setShowMemberModal(false);
    setMemberForm({ name: '', color: '#7C5CFC', is_pet: false });
    await loadGroupDetail(selectedGroup.id);
  };

  const removeMember = async (id: string) => {
    if (!selectedGroup || !confirm('Remover membro?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    await loadGroupDetail(selectedGroup.id);
  };

  const humanMembers = members.filter(m => !m.is_pet);

  const openExpenseModal = () => {
    const isEvent = selectedGroup?.type === 'event';
    setSplitEnabled(isEvent);
    const n = humanMembers.length;
    const eq = n > 0 ? +(100 / n).toFixed(1) : 0;
    const initial: Record<string, number> = {};
    humanMembers.forEach((m, i) => { initial[m.id] = i === n - 1 ? +(100 - eq * (n - 1)).toFixed(1) : eq; });
    setSplits(initial);
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setExpenseForm(f => ({ ...f, paid_by: humanMembers[0]?.id ?? '', event_tag: 'Geral' }));
    setShowExpenseModal(true);
  };

  const addExpense = async () => {
    if (!selectedGroup || !user || !expenseForm.description || !expenseForm.amount || !expenseForm.paid_by) return;
    const total = Number(expenseForm.amount);
    if (splitEnabled) {
      const totalPct = +Object.values(splits).reduce((s, v) => s + v, 0).toFixed(1);
      if (Math.abs(totalPct - 100) > 0.5) { alert('A divisão deve somar 100%'); return; }
    }
    const { data: exp } = await supabase.from('shared_expenses').insert({
      group_id: selectedGroup.id, created_by: user.uid,
      description: expenseForm.description, amount: total,
      category: expenseForm.category, date: expenseForm.date,
      event_tag: expenseForm.event_tag || 'Geral', paid_by: expenseForm.paid_by,
      is_recurring: isRecurring, recurring_interval: isRecurring ? recurringInterval : null,
    }).select().single();
    if (exp && splitEnabled) {
      await supabase.from('expense_splits').insert(
        humanMembers.map(m => ({
          expense_id: exp.id, member_id: m.id,
          percentage: splits[m.id] ?? 0,
          amount: +(total * (splits[m.id] ?? 0) / 100).toFixed(2),
          is_paid: m.id === expenseForm.paid_by,
        }))
      );
    }
    setShowExpenseModal(false);
    await loadGroupDetail(selectedGroup.id);
  };

  const quickAdd = async () => {
    if (!quickForm.description || !quickForm.amount || !quickForm.paid_by || !selectedGroup || !user) return;
    setQuickLoading(true);
    await supabase.from('shared_expenses').insert({
      group_id: selectedGroup.id, created_by: user.uid,
      description: quickForm.description, amount: Number(quickForm.amount),
      category: 'Outros', date: new Date().toISOString().split('T')[0],
      event_tag: 'Geral', paid_by: quickForm.paid_by, is_recurring: false,
    });
    setQuickForm(f => ({ ...f, description: '', amount: '' }));
    setQuickLoading(false);
    await loadGroupDetail(selectedGroup.id);
  };

  const deleteExpense = async (id: string) => {
    if (!selectedGroup || !confirm('Excluir despesa?')) return;
    await supabase.from('expense_splits').delete().eq('expense_id', id);
    await supabase.from('shared_expenses').delete().eq('id', id);
    await loadGroupDetail(selectedGroup.id);
  };

  // ─── Analytics computed ───────────────────────────────────────────────
  const { year: aYear, month: aMonth } = analyticsMonth;
  const now = new Date();
  const isCurrentMonth = aYear === now.getFullYear() && aMonth === now.getMonth();

  const aExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === aYear && d.getMonth() === aMonth; });
  const prevM = aMonth === 0 ? { year: aYear - 1, month: 11 } : { year: aYear, month: aMonth - 1 };
  const pExpenses = expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === prevM.year && d.getMonth() === prevM.month; });

  const aTotal = aExpenses.reduce((s, e) => s + e.amount, 0);
  const pTotal = pExpenses.reduce((s, e) => s + e.amount, 0);
  const pctChange = pTotal > 0 ? ((aTotal - pTotal) / pTotal) * 100 : 0;

  const categoryData = Object.entries(
    aExpenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);
  const maxCat = categoryData[0]?.[1] ?? 1;

  const memberContribs = humanMembers.map(m => ({
    member: m,
    paid: aExpenses.filter(e => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.paid - a.paid);

  const budget = selectedGroup?.monthly_budget;
  const budgetPct = budget ? Math.min(100, (aTotal / budget) * 100) : 0;
  const budgetColor = budgetPct > 90 ? '#DC4F3A' : budgetPct > 70 ? '#F59E0B' : '#059669';

  // ─── Detail computed ──────────────────────────────────────────────────
  const tags = ['Todos', ...Array.from(new Set(expenses.map(e => e.event_tag ?? 'Geral')))];
  const filteredExpenses = activeTag === 'Todos' ? expenses : expenses.filter(e => (e.event_tag ?? 'Geral') === activeTag);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const settlements = calcSettlements(members, expenses.filter(e => e.splits.length > 0));
  const memberById = Object.fromEntries(members.map(m => [m.id, m]));
  const isAdmin = selectedGroup?.admin_id === user?.uid;
  const isCodeValid = !!(selectedGroup?.invite_code && selectedGroup.invite_code_expires_at && new Date(selectedGroup.invite_code_expires_at) > new Date());
  const codeExpiresIn = isCodeValid && selectedGroup?.invite_code_expires_at
    ? Math.ceil((new Date(selectedGroup.invite_code_expires_at).getTime() - Date.now()) / 86400000) : 0;

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>;

  // ─── LIST VIEW ────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>Grupos</h1>
          <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Família, amigos e eventos compartilhados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowCodeInput(v => !v); setCodeError(''); setCodeInput(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#6B6B9A', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Tag size={14} /> Código
          </button>
          {isFamily && (
            <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
              <Plus size={15} /> Novo Grupo
            </button>
          )}
        </div>
      </div>

      {showCodeInput && (
        <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #E8E4FF', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginBottom: 8 }}>Entrar com código</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={codeInput} onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); }} onKeyDown={e => e.key === 'Enter' && joinByCode()} placeholder="Ex: AB12CD" maxLength={8} style={{ ...inp, flex: 1, letterSpacing: '0.12em', fontWeight: 700, fontSize: 15 }} autoFocus />
            <button onClick={joinByCode} disabled={codeLoading || !codeInput.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: codeInput.trim() ? 'linear-gradient(135deg,#059669,#047857)' : '#E8E4FF', color: codeInput.trim() ? 'white' : '#9090B0', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {codeLoading ? '...' : 'Entrar'}
            </button>
          </div>
          {codeError && <p style={{ fontSize: 12, color: '#DC4F3A', margin: '6px 0 0', fontWeight: 600 }}>{codeError}</p>}
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, textAlign: 'center', padding: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 24px rgba(5,150,105,0.25)' }}><Users size={32} color="white" /></div>
          {isFamily ? (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8, letterSpacing: '-0.02em' }}>Crie seu primeiro grupo</h2>
              <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 8, maxWidth: 400, lineHeight: 1.6 }}>
                Grupo <strong style={{ color: '#059669' }}>Família</strong> para gastos contínuos, ou <strong style={{ color: '#7C5CFC' }}>Evento</strong> para viagens com data de fim.
              </p>
              <p style={{ fontSize: 12, color: '#B0B0C0', marginBottom: 24 }}>Membros convidados participam gratuitamente.</p>
              <button onClick={() => setShowCreateModal(true)} style={{ padding: '13px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>Criar grupo</button>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>Grupos compartilhados</h2>
              <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 24, maxWidth: 380 }}>Peça um convite para entrar em um grupo, ou faça upgrade para criar os seus.</p>
              <a href="/pricing" style={{ padding: '13px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>Ver planos</a>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {groups.map(g => {
            const isEvent = g.type === 'event';
            return (
              <div key={g.id} onClick={() => openGroup(g)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E8E4FF', cursor: 'pointer', boxShadow: '0 1px 3px rgba(124,92,252,0.06)', transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(124,92,252,0.06)'; }}>
                <div style={{ height: 5, background: isEvent ? 'linear-gradient(90deg,#7C5CFC,#A78BFA)' : 'linear-gradient(90deg,#059669,#047857)' }} />
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: isEvent ? '#EDE9FE' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isEvent ? <MapPin size={20} color="#7C5CFC" /> : <Home size={20} color="#059669" />}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: isEvent ? '#EDE9FE' : '#D1FAE5', color: isEvent ? '#7C5CFC' : '#059669' }}>
                      {isEvent ? 'Evento' : 'Família'}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A', marginBottom: 4 }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 12, color: '#9090B0', marginBottom: 6 }}>{g.description}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F5F3FF' }}>
                    <span style={{ fontSize: 11, color: g.admin_id === user?.uid ? '#7C5CFC' : '#9090B0', fontWeight: 600 }}>
                      {g.admin_id === user?.uid ? 'Administrador' : 'Membro'}
                    </span>
                    <ArrowRight size={14} color="#C4C4D8" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar grupo */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Grupo</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              {(['family', 'event'] as const).map(t => {
                const active = createForm.type === t;
                const color = t === 'family' ? '#059669' : '#7C5CFC';
                return (
                  <button key={t} onClick={() => setCreateForm(f => ({ ...f, type: t }))} style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${active ? color : '#E8E4FF'}`, background: active ? (t === 'family' ? '#D1FAE5' : '#EDE9FE') : 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{t === 'family' ? '🏠' : '🏕️'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : '#374151' }}>{t === 'family' ? 'Família' : 'Evento'}</div>
                    <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{t === 'family' ? 'Gastos contínuos' : 'Prazo definido'}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Nome *</label><input style={inp} placeholder={createForm.type === 'family' ? 'Ex: Família Silva' : 'Ex: Viagem SP'} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createGroup()} autoFocus /></div>
              <div><label style={lbl}>Descrição</label><input style={inp} placeholder="Opcional" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} /></div>
              {createForm.type === 'event' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lbl}>Início</label><input style={inp} type="date" value={createForm.start_date} onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><label style={lbl}>Fim</label><input style={inp} type="date" value={createForm.end_date} onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
              )}
            </div>
            <button onClick={createGroup} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Criar Grupo</button>
          </div>
        </div>
      )}
    </div>
  );

  // ─── DETAIL VIEW ──────────────────────────────────────────────────────
  const isEvent = selectedGroup!.type === 'event';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={backToList} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={18} color="#6B6B9A" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', margin: 0 }}>{selectedGroup!.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: isEvent ? '#EDE9FE' : '#D1FAE5', color: isEvent ? '#7C5CFC' : '#059669' }}>
                {isEvent ? 'Evento' : 'Família'}
              </span>
            </div>
            {selectedGroup!.description && <p style={{ fontSize: 12, color: '#9090B0', margin: '2px 0 0' }}>{selectedGroup!.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && <button onClick={() => setShowMemberModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#2E86AB', cursor: 'pointer', fontFamily: 'inherit' }}><UserPlus size={14} /> Convidar</button>}
          <button onClick={openExpenseModal} disabled={members.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={14} /> Despesa
          </button>
        </div>
      </div>

      {detailLoading ? <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ borderRadius: 14, padding: '18px 20px', color: 'white', background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.25)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total gasto</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtBRL(totalExpenses)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{expenses.length} lançamentos</div>
            </div>
            <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
              <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>{isEvent ? 'Acertos' : 'Recorrentes'}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A' }}>
                {isEvent ? settlements.length : expenses.filter(e => e.is_recurring).length}
              </div>
              <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{isEvent ? (settlements.length === 0 ? 'Tudo certo!' : 'pendentes') : 'despesas fixas'}</div>
            </div>
            <div style={{ borderRadius: 14, padding: '16px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
              <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 8 }}>Membros</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {members.slice(0, 5).map((m, i) => (
                  <div key={m.id} title={m.name} style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 13 : 10, border: '2px solid white', marginLeft: i > 0 ? -7 : 0, zIndex: 5 - i }}>
                    {m.avatar}
                  </div>
                ))}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginLeft: 8 }}>{members.length}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
            {([
              ['overview', 'Visão Geral'],
              ['gastos', 'Despesas'],
              ['acerto', 'Acerto'],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: activeTab === key ? 'white' : 'transparent', color: activeTab === key ? '#059669' : '#6B6B9A', boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Visão Geral ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Month navigator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A' }}>{MONTHS_FULL[aMonth]} {aYear}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setAnalyticsMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 })} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E8E4FF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={15} color="#6B6B9A" /></button>
                  <button onClick={() => { if (!isCurrentMonth) setAnalyticsMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }); }} disabled={isCurrentMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E8E4FF', background: 'white', cursor: isCurrentMonth ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentMonth ? 0.4 : 1 }}><ChevronRight size={15} color="#6B6B9A" /></button>
                </div>
              </div>

              {/* Budget bar */}
              {budget ? (
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>Orçamento do mês</span>
                    {isAdmin && <button onClick={() => { setBudgetInput(String(budget)); setShowBudgetModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><Settings size={14} /></button>}
                  </div>
                  <div style={{ height: 10, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetColor, borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: budgetColor, fontWeight: 700 }}>{fmtBRL(aTotal)} gastos ({budgetPct.toFixed(0)}%)</span>
                    <span style={{ color: '#9090B0' }}>{fmtBRL(Math.max(0, budget - aTotal))} disponível de {fmtBRL(budget)}</span>
                  </div>
                </div>
              ) : isAdmin ? (
                <button onClick={() => { setBudgetInput(''); setShowBudgetModal(true); }} style={{ background: 'white', borderRadius: 14, padding: '14px 20px', border: '1.5px dashed #E8E4FF', cursor: 'pointer', fontFamily: 'inherit', color: '#9090B0', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }}>
                  <Settings size={15} /> Definir orçamento mensal do grupo
                </button>
              ) : null}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid #E8E4FF' }}>
                  <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Este mês</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A' }}>{fmtBRL(aTotal)}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid #E8E4FF' }}>
                  <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Mês anterior</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A' }}>{fmtBRL(pTotal)}</div>
                  {pTotal > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      {pctChange > 0 ? <TrendingUp size={11} color="#DC4F3A" /> : <TrendingDown size={11} color="#059669" />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctChange > 0 ? '#DC4F3A' : '#059669' }}>
                        {Math.abs(pctChange).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid #E8E4FF' }}>
                  <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Lançamentos</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A' }}>{aExpenses.length}</div>
                </div>
              </div>

              {/* Category breakdown */}
              {categoryData.length > 0 && (
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginBottom: 14 }}>Gastos por categoria</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {categoryData.map(([cat, val]) => {
                      const pct = (val / aTotal) * 100;
                      const barPct = (val / maxCat) * 100;
                      const color = CATEGORY_COLORS[cat] ?? '#6B7280';
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{cat}</span>
                            <span style={{ fontSize: 12, color: '#9090B0' }}>{fmtBRL(val)} <span style={{ color, fontWeight: 700 }}>({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Member contributions */}
              {memberContribs.length > 0 && aTotal > 0 && (
                <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginBottom: 14 }}>Contribuição dos membros</div>
                  {memberContribs.map(({ member: m, paid }) => {
                    const pct = aTotal > 0 ? (paid / aTotal) * 100 : 0;
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{m.avatar}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{m.name}</span>
                            <span style={{ fontSize: 12, color: '#9090B0' }}>{fmtBRL(paid)} <span style={{ color: m.color, fontWeight: 700 }}>({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div style={{ height: 5, borderRadius: 99, background: '#F5F3FF', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 99 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {aExpenses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 24px', background: 'white', borderRadius: 14, border: '1px solid #E8E4FF' }}>
                  <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhum lançamento em {MONTHS_FULL[aMonth]}.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Despesas ── */}
          {activeTab === 'gastos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
              <div>
                {/* Quick entry */}
                <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1px solid #E8E4FF', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Zap size={15} color="#059669" style={{ flexShrink: 0 }} />
                  <input value={quickForm.description} onChange={e => setQuickForm(f => ({ ...f, description: e.target.value }))} onKeyDown={e => e.key === 'Enter' && quickAdd()} placeholder="Lançamento rápido..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', color: '#0D0D1A' }} />
                  <input type="number" value={quickForm.amount} onChange={e => setQuickForm(f => ({ ...f, amount: e.target.value }))} placeholder="R$ 0" style={{ width: 80, border: '1px solid #E8E4FF', borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none', textAlign: 'right' }} />
                  <select value={quickForm.paid_by} onChange={e => setQuickForm(f => ({ ...f, paid_by: e.target.value }))} style={{ border: '1px solid #E8E4FF', borderRadius: 8, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                    <option value="">Quem pagou</option>
                    {humanMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <button onClick={quickAdd} disabled={quickLoading || !quickForm.description || !quickForm.amount || !quickForm.paid_by} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: (quickForm.description && quickForm.amount && quickForm.paid_by) ? '#059669' : '#E8E4FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Plus size={15} color={(quickForm.description && quickForm.amount && quickForm.paid_by) ? 'white' : '#9090B0'} />
                  </button>
                </div>

                {/* Tag filters */}
                {tags.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {tags.map(tag => (
                      <button key={tag} onClick={() => setActiveTag(tag)} style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${activeTag === tag ? '#059669' : '#E8E4FF'}`, background: activeTag === tag ? '#ECFDF5' : 'white', color: activeTag === tag ? '#059669' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Expense list */}
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
                  {filteredExpenses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <p style={{ color: '#9090B0', fontSize: 14, margin: 0 }}>Nenhuma despesa ainda. Use o lançamento rápido acima.</p>
                    </div>
                  ) : filteredExpenses.map((e, i) => {
                    const payer = memberById[e.paid_by ?? ''];
                    return (
                      <div key={e.id} style={{ padding: '14px 20px', borderBottom: i < filteredExpenses.length - 1 ? '1px solid #F9F8FF' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: e.splits.length > 0 ? 8 : 0 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#0D0D1A' }}>{e.description}</span>
                              {e.is_recurring && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: '#EDE9FE', color: '#7C5CFC' }}>FIXO</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: '#9090B0' }}>{e.category} · {e.date}</span>
                              {e.event_tag && e.event_tag !== 'Geral' && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#EDE9FE', color: '#7C5CFC' }}>{e.event_tag}</span>}
                              {payer && <span style={{ fontSize: 11, color: '#9090B0' }}>· <strong style={{ color: payer.color }}>{payer.name}</strong></span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(e.amount)}</span>
                            <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        {e.splits.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {e.splits.filter(s => s.percentage > 0).map(s => {
                              const m = memberById[s.member_id];
                              if (!m) return null;
                              return <span key={s.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.color + '20', color: m.color }}>{m.avatar} {fmtBRL(s.amount)}</span>;
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Members sidebar */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden', height: 'fit-content' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #F5F3FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>Membros</span>
                  {isAdmin && <button onClick={() => setShowMemberModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', fontFamily: 'inherit' }}><Plus size={13} /></button>}
                </div>
                {members.map((m, i) => {
                  const spent = expenses.reduce((s, e) => { const sp = e.splits.find(x => x.member_id === m.id); return s + (sp?.amount ?? 0); }, 0);
                  const paid = expenses.filter(e => e.paid_by === m.id).reduce((s, e) => s + e.amount, 0);
                  const balance = paid - spent;
                  return (
                    <div key={m.id} style={{ padding: '12px 18px', borderBottom: i < members.length - 1 ? '1px solid #F9F8FF' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 15 : 12, flexShrink: 0 }}>{m.avatar}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0D0D1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {m.name}
                            {m.is_pet && <span style={{ fontSize: 9, background: '#FFE8D6', color: '#E8875A', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>PET</span>}
                            {m.role === 'admin' && <span style={{ fontSize: 9, background: '#EDE9FE', color: '#7C5CFC', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>ADM</span>}
                          </div>
                          {!m.is_pet && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: balance >= 0 ? '#059669' : '#DC4F3A' }}>
                              {balance >= 0 ? `+${fmtBRL(balance)}` : `-${fmtBRL(Math.abs(balance))}`}
                            </div>
                          )}
                        </div>
                      </div>
                      {m.role !== 'admin' && isAdmin && (
                        <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}><Trash2 size={13} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Acerto ── */}
          {activeTab === 'acerto' && (
            <div>
              {settlements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 24px', background: 'white', borderRadius: 16, border: '1px solid #E8E4FF' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Check size={28} color="#059669" /></div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D0D1A', marginBottom: 6 }}>Tudo certo!</h3>
                  <p style={{ fontSize: 13, color: '#9090B0' }}>
                    {expenses.filter(e => e.splits.length > 0).length === 0
                      ? 'Nenhuma despesa foi dividida ainda.'
                      : 'Nenhum acerto pendente entre os membros.'}
                  </p>
                </div>
              ) : settlements.map((s, i) => {
                const from = memberById[s.from];
                const to = memberById[s.to];
                if (!from || !to) return null;
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: from.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{from.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#374151' }}><strong style={{ color: from.color }}>{from.name}</strong> deve pagar <strong style={{ color: to.color }}>{to.name}</strong></div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A' }}>{fmtBRL(s.amount)}</div>
                    </div>
                    <ArrowRight size={16} color="#D1D5DB" />
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: to.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{to.avatar}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Convidar */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Convidar Membro</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: 14, padding: 16, border: '1px solid #BBF7D0', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Convite por link</div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>Membros convidados <strong>não pagam</strong> o plano.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '7px 10px', border: '1px solid #D1FAE5', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/join/{selectedGroup?.invite_token}
                </div>
                <button onClick={copyInviteLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />} {copiedLink ? 'Copiado!' : 'Link'}
                </button>
              </div>
              {isCodeValid ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 14px', border: '1px solid #D1FAE5', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '0.2em', color: '#059669' }}>{selectedGroup?.invite_code}</div>
                    <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>Expira em {codeExpiresIn}d</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={copyInviteCode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{copiedCode ? <Check size={11} /> : <Copy size={11} />} Copiar</button>
                    <button onClick={generateInviteCode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid #BBF7D0', background: 'white', color: '#059669', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><RefreshCw size={11} /> Novo</button>
                  </div>
                </div>
              ) : (
                <button onClick={generateInviteCode} style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1.5px dashed #BBF7D0', background: 'white', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={13} /> Gerar código único (7 dias)
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9090B0', textAlign: 'center', marginBottom: 14 }}>— ou adicione manualmente —</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Nome *</label><input style={inp} placeholder="Ex: Juliana, Rex" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
              <div>
                <label style={lbl}>Cor</label>
                <div style={{ display: 'flex', gap: 8 }}>{COLORS.map(c => <button key={c} onClick={() => setMemberForm(f => ({ ...f, color: c }))} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: memberForm.color === c ? '3px solid #1A1A2E' : '2px solid transparent', cursor: 'pointer' }} />)}</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" checked={memberForm.is_pet} onChange={e => setMemberForm(f => ({ ...f, is_pet: e.target.checked }))} /> É um pet 🐾
              </label>
            </div>
            <button onClick={addMember} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: 'none', background: '#1A1A2E', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Adicionar Manualmente</button>
          </div>
        </div>
      )}

      {/* Modal: Nova Despesa */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nova Despesa</h3>
              <button onClick={() => setShowExpenseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={lbl}>Descrição *</label><input style={inp} placeholder="Ex: Aluguel, Netflix, Jantar" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} autoFocus /></div>
              <div><label style={lbl}>Valor *</label><input style={inp} type="number" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Categoria</label>
                  <select style={inp} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Data</label><input style={inp} type="date" value={expenseForm.date} onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Tag / Evento</label>
                  <input style={inp} placeholder="Ex: Viagem SP" value={expenseForm.event_tag} onChange={e => setExpenseForm(f => ({ ...f, event_tag: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Quem pagou *</label>
                  <select style={inp} value={expenseForm.paid_by} onChange={e => setExpenseForm(f => ({ ...f, paid_by: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {humanMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Recurring */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: '#F9F8FF', borderRadius: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', flex: 1 }}>
                  <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} /> Despesa recorrente (fixa)
                </label>
                {isRecurring && (
                  <select value={recurringInterval} onChange={e => setRecurringInterval(e.target.value as 'monthly' | 'weekly')} style={{ border: '1px solid #E8E4FF', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                    <option value="monthly">Mensal</option>
                    <option value="weekly">Semanal</option>
                  </select>
                )}
              </div>

              {/* Split toggle */}
              <div style={{ borderTop: '1px solid #F5F3FF', paddingTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: splitEnabled ? 12 : 0 }}>
                  <input type="checkbox" checked={splitEnabled} onChange={e => setSplitEnabled(e.target.checked)} />
                  Dividir esta despesa entre membros
                </label>
                {splitEnabled && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <button onClick={() => {
                        const n = humanMembers.length; const eq = +(100 / n).toFixed(1);
                        const s: Record<string, number> = {};
                        humanMembers.forEach((m, i) => { s[m.id] = i === n - 1 ? +(100 - eq * (n - 1)).toFixed(1) : eq; });
                        setSplits(s);
                      }} style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Dividir igualmente
                      </button>
                    </div>
                    {humanMembers.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{m.avatar}</div>
                        <span style={{ fontSize: 13, flex: 1, color: '#374151' }}>{m.name}</span>
                        <input type="number" min={0} max={100} value={splits[m.id] ?? 0} onChange={e => setSplits(s => ({ ...s, [m.id]: Number(e.target.value) }))} style={{ width: 56, padding: '6px 8px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 13, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }} />
                        <span style={{ fontSize: 12, color: '#9090B0' }}>%</span>
                        {expenseForm.amount && <span style={{ fontSize: 11, color: '#6B7280', minWidth: 54 }}>{fmtBRL(Number(expenseForm.amount) * (splits[m.id] ?? 0) / 100)}</span>}
                      </div>
                    ))}
                    <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', color: Math.abs(Object.values(splits).reduce((s, v) => s + v, 0) - 100) < 0.5 ? '#059669' : '#DC4F3A' }}>
                      Total: {+Object.values(splits).reduce((s, v) => s + v, 0).toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </div>
            <button onClick={addExpense} style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Salvar Despesa
            </button>
          </div>
        </div>
      )}

      {/* Modal: Orçamento */}
      {showBudgetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Orçamento mensal</h3>
              <button onClick={() => setShowBudgetModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#9090B0', marginBottom: 16 }}>Defina um limite de gastos para o grupo neste mês. Acompanhe o consumo na Visão Geral.</p>
            <label style={lbl}>Valor do orçamento (R$)</label>
            <input style={inp} type="number" placeholder="Ex: 5000" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} autoFocus />
            <button onClick={saveBudget} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Salvar orçamento</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Family;

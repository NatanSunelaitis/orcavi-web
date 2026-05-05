import React, { useState, useEffect } from 'react';
import {
  UserPlus, Plus, X, Trash2, Users, Copy, Check,
  ArrowRight, ChevronLeft, Calendar, RefreshCw, MapPin, Home, Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';

const fmtBRL = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLORS = ['#7C5CFC', '#2E86AB', '#E8875A', '#059669', '#DC4F3A', '#F59E0B'];
const CATEGORIES = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Serviços', 'Pet', 'Viagem', 'Outros'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #E8E4FF', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6B6B9A', marginBottom: 4, display: 'block',
};

interface Group {
  id: string; name: string; admin_id: string;
  invite_token: string; invite_code?: string; invite_code_expires_at?: string;
  type: 'family' | 'event'; description?: string;
  start_date?: string; end_date?: string;
}
interface Member { id: string; name: string; avatar: string; color: string; is_pet: boolean; role: string; }
interface Split { id: string; member_id: string; percentage: number; amount: number; is_paid: boolean; }
interface Expense {
  id: string; description: string; amount: number; category: string;
  date: string; event_tag: string; paid_by: string | null; splits: Split[];
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

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [activeTab, setActiveTab] = useState<'gastos' | 'acerto'>('gastos');
  const [activeTag, setActiveTag] = useState('Todos');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '', type: 'family' as 'family' | 'event',
    description: '', start_date: '', end_date: '',
  });
  const [memberForm, setMemberForm] = useState({ name: '', color: '#7C5CFC', is_pet: false });
  const [expenseForm, setExpenseForm] = useState({
    description: '', amount: '', category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
    event_tag: 'Geral', paid_by: '',
  });
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);

    const { data: adminGroups } = await supabase
      .from('family_groups').select('*').eq('admin_id', user.uid).order('created_at');

    const { data: memberData } = await supabase
      .from('family_members').select('group_id').eq('user_id', user.uid);

    const memberGroupIds = (memberData ?? []).map((m: any) => m.group_id).filter(Boolean);
    let memberGroups: Group[] = [];
    if (memberGroupIds.length > 0) {
      const { data } = await supabase.from('family_groups').select('*').in('id', memberGroupIds);
      memberGroups = (data ?? []) as Group[];
    }

    const all = [...(adminGroups ?? []), ...memberGroups] as Group[];
    const seen = new Set<string>();
    setGroups(all.filter(g => { if (seen.has(g.id)) return false; seen.add(g.id); return true; }));
    setLoading(false);
  };

  const loadGroupDetail = async (groupId: string) => {
    setDetailLoading(true);

    const { data: mData } = await supabase
      .from('family_members').select('*').eq('group_id', groupId).order('created_at');
    setMembers((mData ?? []) as Member[]);

    const { data: eData } = await supabase
      .from('shared_expenses')
      .select('*, expense_splits(*)')
      .eq('group_id', groupId)
      .order('date', { ascending: false });

    setExpenses((eData ?? []).map((e: any) => ({
      ...e, amount: Number(e.amount),
      splits: (e.expense_splits ?? []).map((s: any) => ({
        ...s, percentage: Number(s.percentage), amount: Number(s.amount),
      })),
    })));

    setDetailLoading(false);
  };

  useEffect(() => { loadGroups(); }, [user]);

  const openGroup = async (group: Group) => {
    setSelectedGroup(group);
    setView('detail');
    setActiveTab('gastos');
    setActiveTag('Todos');
    await loadGroupDetail(group.id);
  };

  const joinByCode = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError('');
    const { data } = await supabase.rpc('join_group_by_code', { p_code: codeInput.trim().toUpperCase() });
    setCodeLoading(false);
    if (!data || data.error) {
      setCodeError(
        data?.error === 'expired' ? 'Código expirado. Peça um novo ao administrador.' :
        data?.error === 'already_member' ? 'Você já é membro deste grupo.' :
        'Código inválido. Verifique e tente novamente.'
      );
      return;
    }
    setCodeInput('');
    setShowCodeInput(false);
    await loadGroups();
  };

  const backToList = () => {
    setView('list');
    setSelectedGroup(null);
    setMembers([]);
    setExpenses([]);
  };

  const createGroup = async () => {
    if (!user || !createForm.name.trim()) return;
    const token = Math.random().toString(36).substring(2, 18);
    const payload: any = {
      name: createForm.name, admin_id: user.uid, invite_token: token,
      type: createForm.type, description: createForm.description || null,
    };
    if (createForm.type === 'event') {
      payload.start_date = createForm.start_date || null;
      payload.end_date = createForm.end_date || null;
    }

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

  const generateInviteCode = async () => {
    if (!selectedGroup) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('family_groups').update({
      invite_code: code, invite_code_expires_at: expires,
    }).eq('id', selectedGroup.id);
    const updated = { ...selectedGroup, invite_code: code, invite_code_expires_at: expires };
    setSelectedGroup(updated);
    setGroups(gs => gs.map(g => g.id === selectedGroup.id ? updated : g));
  };

  const copyInviteLink = () => {
    if (!selectedGroup?.invite_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/join/${selectedGroup.invite_token}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyInviteCode = () => {
    if (!selectedGroup?.invite_code) return;
    navigator.clipboard.writeText(selectedGroup.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
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
    if (!selectedGroup) return;
    if (!confirm('Remover membro?')) return;
    await supabase.from('family_members').delete().eq('id', id);
    await loadGroupDetail(selectedGroup.id);
  };

  const openExpenseModal = () => {
    const n = members.length;
    const equal = n > 0 ? +(100 / n).toFixed(1) : 0;
    const initial: Record<string, number> = {};
    members.forEach((m, i) => {
      initial[m.id] = i === n - 1 ? +(100 - equal * (n - 1)).toFixed(1) : equal;
    });
    setSplits(initial);
    setExpenseForm(f => ({ ...f, paid_by: members.filter(m => !m.is_pet)[0]?.id ?? '' }));
    setShowExpenseModal(true);
  };

  const addExpense = async () => {
    if (!selectedGroup || !user || !expenseForm.description || !expenseForm.amount || !expenseForm.paid_by) return;
    const total = Number(expenseForm.amount);
    const totalPct = +Object.values(splits).reduce((s, v) => s + v, 0).toFixed(1);
    if (Math.abs(totalPct - 100) > 0.5) { alert('A divisão deve somar 100%'); return; }

    const { data: exp } = await supabase.from('shared_expenses').insert({
      group_id: selectedGroup.id, created_by: user.uid,
      description: expenseForm.description, amount: total,
      category: expenseForm.category, date: expenseForm.date,
      event_tag: expenseForm.event_tag || 'Geral', paid_by: expenseForm.paid_by,
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
    await loadGroupDetail(selectedGroup.id);
  };

  const deleteExpense = async (id: string) => {
    if (!selectedGroup) return;
    if (!confirm('Excluir despesa?')) return;
    await supabase.from('expense_splits').delete().eq('expense_id', id);
    await supabase.from('shared_expenses').delete().eq('id', id);
    await loadGroupDetail(selectedGroup.id);
  };

  // Computed for detail view
  const tags = ['Todos', ...Array.from(new Set(expenses.map(e => e.event_tag ?? 'Geral')))];
  const filteredExpenses = activeTag === 'Todos'
    ? expenses : expenses.filter(e => (e.event_tag ?? 'Geral') === activeTag);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const settlements = calcSettlements(members, expenses);
  const memberById = Object.fromEntries(members.map(m => [m.id, m]));
  const isAdmin = selectedGroup?.admin_id === user?.uid;

  const isCodeValid = !!(selectedGroup?.invite_code
    && selectedGroup.invite_code_expires_at
    && new Date(selectedGroup.invite_code_expires_at) > new Date());
  const codeExpiresIn = isCodeValid && selectedGroup?.invite_code_expires_at
    ? Math.ceil((new Date(selectedGroup.invite_code_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  if (loading) return <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>;

  // ─── GROUPS LIST ───────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>Grupos</h1>
            <p style={{ fontSize: 13, color: '#9090B0', margin: '4px 0 0' }}>Família, amigos e eventos compartilhados</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => { setShowCodeInput(v => !v); setCodeError(''); setCodeInput(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#6B6B9A', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Tag size={14} /> Entrar com código
            </button>
            {isFamily && (
              <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                <Plus size={15} /> Novo Grupo
              </button>
            )}
          </div>
        </div>

        {/* Code entry panel */}
        {showCodeInput && (
          <div style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', marginBottom: 6 }}>Digite o código de convite</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={codeInput}
                  onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(''); }}
                  onKeyDown={e => e.key === 'Enter' && joinByCode()}
                  placeholder="Ex: AB12CD"
                  maxLength={8}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${codeError ? '#DC4F3A' : '#E8E4FF'}`, fontSize: 15, fontFamily: 'inherit', outline: 'none', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase', color: '#0D0D1A' }}
                  autoFocus
                />
                <button onClick={joinByCode} disabled={codeLoading || !codeInput.trim()} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: codeInput.trim() ? 'linear-gradient(135deg,#059669,#047857)' : '#E8E4FF', color: codeInput.trim() ? 'white' : '#9090B0', fontWeight: 700, fontSize: 13, cursor: codeInput.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  {codeLoading ? '...' : 'Entrar'}
                </button>
              </div>
              {codeError && <p style={{ fontSize: 12, color: '#DC4F3A', margin: '6px 0 0', fontWeight: 600 }}>{codeError}</p>}
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center', padding: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#059669,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}>
              <Users size={32} color="white" />
            </div>
            {isFamily ? (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8, letterSpacing: '-0.02em' }}>Crie seu primeiro grupo</h2>
                <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 8, maxWidth: 400, lineHeight: 1.6 }}>
                  Crie um grupo <strong style={{ color: '#059669' }}>Família</strong> para gastos contínuos com as pessoas da sua casa,
                  ou um <strong style={{ color: '#7C5CFC' }}>Evento</strong> para dividir uma viagem ou programa com prazo definido.
                </p>
                <p style={{ fontSize: 12, color: '#B0B0C0', marginBottom: 24 }}>Quem você convidar não precisa pagar o plano — só você.</p>
                <button onClick={() => setShowCreateModal(true)} style={{ padding: '13px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  Criar grupo
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8, letterSpacing: '-0.02em' }}>Grupos compartilhados</h2>
                <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 6, maxWidth: 380 }}>
                  Peça um link de convite para entrar em um grupo existente — é gratuito para membros convidados.
                </p>
                <p style={{ fontSize: 13, color: '#9090B0', marginBottom: 24 }}>Para criar seus próprios grupos, faça upgrade para o plano Família.</p>
                <a href="/pricing" style={{ padding: '13px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
                  Ver planos
                </a>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {groups.map(g => {
              const isEvent = g.type === 'event';
              const groupIsAdmin = g.admin_id === user?.uid;
              return (
                <div key={g.id} onClick={() => openGroup(g)}
                  style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #E8E4FF', cursor: 'pointer', boxShadow: '0 1px 3px rgba(124,92,252,0.06)', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(124,92,252,0.06)'; }}
                >
                  <div style={{ height: 5, background: isEvent ? 'linear-gradient(90deg,#7C5CFC,#A78BFA)' : 'linear-gradient(90deg,#059669,#047857)' }} />
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: isEvent ? '#EDE9FE' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isEvent ? <MapPin size={20} color="#7C5CFC" /> : <Home size={20} color="#059669" />}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: isEvent ? '#EDE9FE' : '#D1FAE5', color: isEvent ? '#7C5CFC' : '#059669' }}>
                        {isEvent ? 'Evento' : 'Família'}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D1A', marginBottom: 4 }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: 12, color: '#9090B0', marginBottom: 8 }}>{g.description}</div>}
                    {isEvent && (g.start_date || g.end_date) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9090B0', marginBottom: 8 }}>
                        <Calendar size={11} />
                        {g.start_date ?? '?'}{g.end_date ? ` → ${g.end_date}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #F5F3FF' }}>
                      <span style={{ fontSize: 11, color: groupIsAdmin ? '#7C5CFC' : '#9090B0', fontWeight: 600 }}>
                        {groupIsAdmin ? 'Administrador' : 'Membro'}
                      </span>
                      <ArrowRight size={14} color="#C4C4D8" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Group */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Novo Grupo</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
              </div>

              {/* Type selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                {(['family', 'event'] as const).map(t => {
                  const active = createForm.type === t;
                  const color = t === 'family' ? '#059669' : '#7C5CFC';
                  const bg = t === 'family' ? '#D1FAE5' : '#EDE9FE';
                  return (
                    <button key={t} onClick={() => setCreateForm(f => ({ ...f, type: t }))} style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${active ? color : '#E8E4FF'}`, background: active ? bg : 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{t === 'family' ? '🏠' : '🏕️'}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: active ? color : '#374151' }}>{t === 'family' ? 'Família' : 'Evento'}</div>
                      <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{t === 'family' ? 'Gastos contínuos' : 'Prazo definido'}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Nome do grupo *</label>
                  <input style={inputStyle} placeholder={createForm.type === 'family' ? 'Ex: Família Silva' : 'Ex: Viagem para SP'} value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createGroup()} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Descrição</label>
                  <input style={inputStyle} placeholder="Opcional" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                {createForm.type === 'event' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={labelStyle}>Data de início</label><input style={inputStyle} type="date" value={createForm.start_date} onChange={e => setCreateForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><label style={labelStyle}>Data de fim</label><input style={inputStyle} type="date" value={createForm.end_date} onChange={e => setCreateForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>
                )}
              </div>
              <button onClick={createGroup} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                Criar Grupo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── GROUP DETAIL ──────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={backToList} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <ChevronLeft size={18} color="#6B6B9A" />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', letterSpacing: '-0.025em', margin: 0 }}>{selectedGroup!.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: selectedGroup!.type === 'event' ? '#EDE9FE' : '#D1FAE5', color: selectedGroup!.type === 'event' ? '#7C5CFC' : '#059669' }}>
                {selectedGroup!.type === 'event' ? 'Evento' : 'Família'}
              </span>
            </div>
            {selectedGroup!.description && <p style={{ fontSize: 12, color: '#9090B0', margin: '2px 0 0' }}>{selectedGroup!.description}</p>}
            {selectedGroup!.type === 'event' && selectedGroup!.start_date && (
              <p style={{ fontSize: 11, color: '#9090B0', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={10} /> {selectedGroup!.start_date}{selectedGroup!.end_date ? ` → ${selectedGroup!.end_date}` : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => setShowMemberModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #E8E4FF', background: 'white', fontSize: 13, fontWeight: 600, color: '#2E86AB', cursor: 'pointer', fontFamily: 'inherit' }}>
              <UserPlus size={14} /> Convidar
            </button>
          )}
          <button onClick={openExpenseModal} disabled={members.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', fontSize: 13, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit', opacity: members.length === 0 ? 0.5 : 1 }}>
            <Plus size={14} /> Despesa
          </button>
        </div>
      </div>

      {detailLoading ? (
        <p style={{ color: '#9090B0', textAlign: 'center', padding: 48 }}>Carregando...</p>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div style={{ borderRadius: 14, padding: '18px 20px', color: 'white', background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total de despesas</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{fmtBRL(totalExpenses)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{filteredExpenses.length} lançamentos</div>
            </div>
            <div style={{ borderRadius: 14, padding: '18px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
              <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 4 }}>Acertos pendentes</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: settlements.length > 0 ? '#DC4F3A' : '#059669' }}>{settlements.length}</div>
              <div style={{ fontSize: 11, color: '#9090B0', marginTop: 2 }}>{settlements.length === 0 ? 'Tudo certo!' : 'transferências'}</div>
            </div>
            <div style={{ borderRadius: 14, padding: '16px 20px', background: 'white', border: '1px solid #E8E4FF' }}>
              <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 8 }}>Membros</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {members.slice(0, 5).map((m, i) => (
                  <div key={m.id} title={m.name} style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 14 : 11, border: '2px solid white', marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i }}>
                    {m.avatar}
                  </div>
                ))}
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginLeft: 10 }}>{members.length}</span>
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

          {/* Tab: Despesas */}
          {activeTab === 'gastos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
              <div>
                {/* Event tag filters */}
                {tags.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {tags.map(tag => (
                      <button key={tag} onClick={() => setActiveTag(tag)} style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${activeTag === tag ? '#059669' : '#E8E4FF'}`, background: activeTag === tag ? '#ECFDF5' : 'white', color: activeTag === tag ? '#059669' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden' }}>
                  {filteredExpenses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <Tag size={28} color="#E8E4FF" style={{ marginBottom: 12 }} />
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
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#EDE9FE', color: '#7C5CFC' }}>{e.event_tag}</span>
                              )}
                              {payer && <span style={{ fontSize: 11, color: '#9090B0' }}>· pago por <strong style={{ color: payer.color }}>{payer.name}</strong></span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#DC4F3A' }}>−{fmtBRL(e.amount)}</span>
                            <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 0 }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {e.splits.filter(s => s.percentage > 0).map(s => {
                            const m = memberById[s.member_id];
                            if (!m) return null;
                            return <span key={s.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: m.color + '20', color: m.color }}>{m.is_pet ? '🐾' : m.avatar} {fmtBRL(s.amount)}</span>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Members sidebar */}
              <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E8E4FF', overflow: 'hidden', height: 'fit-content' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #F5F3FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A' }}>Membros</span>
                  {isAdmin && (
                    <button onClick={() => setShowMemberModal(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                {members.map((m, i) => {
                  const spent = expenses.reduce((s, e) => { const sp = e.splits.find(x => x.member_id === m.id); return s + (sp?.amount ?? 0); }, 0);
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
                          <div style={{ fontSize: 11, fontWeight: 600, color: balance >= 0 ? '#059669' : '#DC4F3A' }}>
                            {balance >= 0 ? `+${fmtBRL(balance)}` : `-${fmtBRL(Math.abs(balance))}`}
                          </div>
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

          {/* Tab: Acerto */}
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
              ) : settlements.map((s, i) => {
                const from = memberById[s.from];
                const to = memberById[s.to];
                if (!from || !to) return null;
                return (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid #E8E4FF', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: from.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: from.is_pet ? 20 : 14, flexShrink: 0 }}>{from.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        <strong style={{ color: from.color }}>{from.name}</strong> deve pagar <strong style={{ color: to.color }}>{to.name}</strong>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#DC4F3A', letterSpacing: '-0.02em' }}>{fmtBRL(s.amount)}</div>
                    </div>
                    <ArrowRight size={16} color="#D1D5DB" />
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: to.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: to.is_pet ? 20 : 14, flexShrink: 0 }}>{to.avatar}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Convidar Membro */}
      {showMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Convidar Membro</h3>
              <button onClick={() => setShowMemberModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9090B0' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#F0FDF4', borderRadius: 14, padding: 16, border: '1px solid #BBF7D0', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>Convite por link ou código</div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.5 }}>
                Quem entrar pelo convite <strong>não precisa pagar</strong> o plano Família — só você, como criador.
              </p>

              {/* Link */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #D1FAE5', fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/join/{selectedGroup?.invite_token}
                </div>
                <button onClick={copyInviteLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  {copiedLink ? 'Copiado!' : 'Link'}
                </button>
              </div>

              {/* Invite code */}
              {isCodeValid ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '10px 14px', border: '1px solid #D1FAE5', textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '0.18em', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{selectedGroup?.invite_code}</div>
                    <div style={{ fontSize: 10, color: '#9090B0', marginTop: 2 }}>Expira em {codeExpiresIn} dia{codeExpiresIn !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={copyInviteCode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {copiedCode ? <Check size={11} /> : <Copy size={11} />} Copiar
                    </button>
                    <button onClick={generateInviteCode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: '1px solid #BBF7D0', background: 'white', color: '#059669', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <RefreshCw size={11} /> Novo
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={generateInviteCode} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px dashed #BBF7D0', background: 'white', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RefreshCw size={13} /> Gerar código único (expira em 7 dias)
                </button>
              )}
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#9090B0', textAlign: 'center', marginBottom: 14 }}>— ou adicione manualmente —</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>Nome *</label><input style={inputStyle} placeholder="Ex: Juliana, Rex" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} autoFocus /></div>
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
            <button onClick={addMember} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: 'none', background: '#1A1A2E', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
              Adicionar Manualmente
            </button>
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
              <div><label style={labelStyle}>Descrição *</label><input style={inputStyle} placeholder="Ex: Jantar, Ingresso, Hotel" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} autoFocus /></div>
              <div><label style={labelStyle}>Valor *</label><input style={inputStyle} type="number" placeholder="0.00" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
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
                  <label style={labelStyle}>Tag / Evento</label>
                  <input style={inputStyle} placeholder="Ex: Viagem SP" value={expenseForm.event_tag} onChange={e => setExpenseForm(f => ({ ...f, event_tag: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Quem pagou *</label>
                  <select style={inputStyle} value={expenseForm.paid_by} onChange={e => setExpenseForm(f => ({ ...f, paid_by: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {members.filter(m => !m.is_pet).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Split */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Como dividir</label>
                  <button onClick={() => {
                    const n = members.length; const eq = +(100 / n).toFixed(1);
                    const s: Record<string, number> = {};
                    members.forEach((m, i) => { s[m.id] = i === n - 1 ? +(100 - eq * (n - 1)).toFixed(1) : eq; });
                    setSplits(s);
                  }} style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #BBF7D0', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Dividir igualmente
                  </button>
                </div>
                {members.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: m.is_pet ? 14 : 12, flexShrink: 0 }}>{m.avatar}</div>
                    <span style={{ fontSize: 13, flex: 1, color: '#374151' }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" min={0} max={100} value={splits[m.id] ?? 0} onChange={e => setSplits(s => ({ ...s, [m.id]: Number(e.target.value) }))} style={{ width: 56, padding: '6px 8px', borderRadius: 8, border: '1px solid #E8E4FF', fontSize: 13, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }} />
                      <span style={{ fontSize: 12, color: '#9090B0' }}>%</span>
                      {expenseForm.amount && <span style={{ fontSize: 11, color: '#6B7280', minWidth: 54 }}>{fmtBRL(Number(expenseForm.amount) * (splits[m.id] ?? 0) / 100)}</span>}
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

export default Family;

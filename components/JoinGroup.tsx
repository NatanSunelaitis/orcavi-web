import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Check, Home, MapPin, ArrowRight, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface GroupInfo {
  id: string;
  name: string;
  type: 'family' | 'event';
  description?: string;
  member_count: number;
  admin_name: string;
}

type Status = 'loading' | 'found' | 'not_found' | 'already_member' | 'joining' | 'success' | 'error';

const JoinGroup: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const load = async () => {
      if (!token) { setStatus('not_found'); return; }

      const { data, error } = await supabase.rpc('get_group_by_invite_token', { p_token: token });

      if (error || !data || data.error === 'not_found') {
        setStatus('not_found');
        return;
      }

      setGroup(data as GroupInfo);

      // Check if already a member
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id')
        .eq('group_id', data.id)
        .eq('user_id', user?.uid ?? '')
        .maybeSingle();

      setStatus(memberData ? 'already_member' : 'found');
    };

    if (user) load();
  }, [token, user]);

  const join = async () => {
    if (!token) return;
    setStatus('joining');

    const { data } = await supabase.rpc('join_group_by_token', { p_token: token });

    if (!data || data.error) {
      setStatus(data?.error === 'already_member' ? 'already_member' : 'error');
      return;
    }

    setStatus('success');
    setTimeout(() => navigate('/family'), 2200);
  };

  const isEvent = group?.type === 'event';
  const gradient = isEvent
    ? 'linear-gradient(135deg,#7C5CFC,#6D28D9)'
    : 'linear-gradient(135deg,#059669,#047857)';

  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div style={{ minHeight: '100vh', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        {children}
      </div>
    </div>
  );

  if (status === 'loading') return (
    <Wrap>
      <div style={{ padding: 56, textAlign: 'center' }}>
        <Loader size={28} color="#7C5CFC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#9090B0', fontSize: 14 }}>Verificando convite...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </Wrap>
  );

  if (status === 'not_found') return (
    <Wrap>
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={28} color="#DC4F3A" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>Convite inválido</h2>
        <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 28, lineHeight: 1.6 }}>
          Este link de convite não existe ou foi removido pelo administrador do grupo.
        </p>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Ir para o início
        </button>
      </div>
    </Wrap>
  );

  if (status === 'error') return (
    <Wrap>
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={28} color="#DC4F3A" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>Algo deu errado</h2>
        <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 28 }}>Não foi possível processar o convite. Tente novamente.</p>
        <button onClick={() => setStatus('found')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Tentar novamente
        </button>
      </div>
    </Wrap>
  );

  if (status === 'success') return (
    <Wrap>
      <div style={{ padding: 56, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(5,150,105,0.2)' }}>
          <Check size={32} color="#059669" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D0D1A', marginBottom: 8, letterSpacing: '-0.02em' }}>Você entrou no grupo!</h2>
        <p style={{ fontSize: 14, color: '#9090B0' }}>Redirecionando para <strong>{group?.name}</strong>...</p>
      </div>
    </Wrap>
  );

  if (status === 'already_member') return (
    <Wrap>
      <div style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Check size={28} color="#059669" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D0D1A', marginBottom: 8 }}>Você já é membro</h2>
        <p style={{ fontSize: 14, color: '#9090B0', marginBottom: 28 }}>
          Você já faz parte de <strong>{group?.name}</strong>.
        </p>
        <button onClick={() => navigate('/family')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
          Ver grupo <ArrowRight size={15} />
        </button>
      </div>
    </Wrap>
  );

  // ─── Main: group found ────────────────────────────────────────────────
  return (
    <Wrap>
      {/* Colored header */}
      <div style={{ background: gradient, padding: '32px 32px 28px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          {isEvent ? <MapPin size={24} color="white" /> : <Home size={24} color="white" />}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Convite para {isEvent ? 'Evento' : 'Grupo Familiar'}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
          {group!.name}
        </h1>
        {group!.description && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>{group!.description}</p>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '24px 32px 32px' }}>
        {/* Info pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#F9F8FF', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 3 }}>Criado por</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group!.admin_name}
            </div>
          </div>
          <div style={{ background: '#F9F8FF', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#9090B0', marginBottom: 3 }}>Membros</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0D0D1A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} color="#9090B0" /> {group!.member_count}
            </div>
          </div>
        </div>

        {/* Free plan note */}
        <div style={{ background: '#ECFDF5', borderRadius: 10, padding: '10px 14px', marginBottom: 22, display: 'flex', gap: 9, alignItems: 'flex-start', border: '1px solid #BBF7D0' }}>
          <Check size={14} color="#059669" style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 600, lineHeight: 1.5 }}>
            Participar é gratuito — você não precisa de nenhum plano pago.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={join}
          disabled={status === 'joining'}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: gradient, color: 'white', fontWeight: 700, fontSize: 15,
            cursor: status === 'joining' ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: status === 'joining' ? 0.75 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          {status === 'joining' ? 'Entrando...' : <><span>Entrar no grupo</span><ArrowRight size={16} /></>}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#B0B0C0', margin: '14px 0 0' }}>
          Logado como <strong style={{ color: '#6B6B9A' }}>{user?.email}</strong>
        </p>
      </div>
    </Wrap>
  );
};

export default JoinGroup;

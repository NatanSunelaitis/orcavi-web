import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, Calculator, Target, CreditCard, TrendingDown, Users, MessageCircle, Zap, Crown, Menu, X, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import { PLANS } from '../config/plans';

interface LayoutProps {
  children: React.ReactNode;
}

const PLAN_COLORS: Record<string, string> = {
  free: '#6B6B9A',
  pro: '#7C5CFC',
  family: '#059669',
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Grátis',
  pro: 'Pro',
  family: 'Família',
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { plan, isFree, isPro, isFamily, planExpiresAt } = usePlan();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const freeNav = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transações', href: '/transactions', icon: Receipt },
    { name: 'Contas', href: '/accounts', icon: Wallet },
    { name: 'Simulador', href: '/simulator', icon: Calculator },
    { name: 'Metas', href: '/goals', icon: Target },
  ];

  const proNav = [
    { name: 'Cartões', href: '/cards', icon: CreditCard, requiredPlan: 'pro' },
    { name: 'Dívidas', href: '/debts', icon: TrendingDown, requiredPlan: 'pro' },
  ];

  const familyNav = [
    { name: 'Família', href: '/family', icon: Users, requiredPlan: 'family' },
    { name: 'WhatsApp IA', href: '/whatsapp-ai', icon: MessageCircle, requiredPlan: 'family' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const userInitial = user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
  const planColor = PLAN_COLORS[plan] ?? '#6B6B9A';
  const planLabel = PLAN_LABELS[plan] ?? 'Grátis';

  const expiresText = planExpiresAt
    ? `Expira ${new Date(planExpiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : null;

  const NavItem = ({ item, locked = false }: { item: any; locked?: boolean }) => {
    const active = isActive(item.href);
    return (
      <Link
        to={item.href}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors"
        style={{
          fontSize: 14, fontWeight: 500,
          backgroundColor: active ? '#25253F' : 'transparent',
          color: active ? 'white' : locked ? '#3D3D5C' : '#6B6B9A',
          opacity: locked ? 0.6 : 1,
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#25253F';
            (e.currentTarget as HTMLElement).style.color = locked ? '#6B6B9A' : '#C4B5FD';
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = locked ? '#3D3D5C' : '#6B6B9A';
          }
        }}
      >
        <item.icon className="flex-shrink-0" style={{ width: 18, height: 18, color: active ? '#A78BFA' : 'inherit' }} />
        <span className="flex-1">{item.name}</span>
        {locked && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, backgroundColor: item.requiredPlan === 'pro' ? '#7C5CFC22' : '#05966922', color: item.requiredPlan === 'pro' ? '#A78BFA' : '#34D399', letterSpacing: '0.03em' }}>
            {item.requiredPlan === 'pro' ? 'PRO' : 'FAMÍLIA'}
          </span>
        )}
      </Link>
    );
  };

  const renderNav = (mobile = false) => (
    <>
      {freeNav.map(item => (
        <NavItem key={item.name} item={item} />
      ))}

      {/* Seção Pro */}
      <div className="px-3 pt-3 pb-1" style={{ fontSize: 10, fontWeight: 700, color: isPro ? '#7C5CFC' : '#3D3D5C', letterSpacing: '0.08em' }}>
        {isPro ? '— PRO' : 'PRO'}
      </div>
      {proNav.map(item => (
        <NavItem key={item.name} item={item} locked={!isPro} />
      ))}

      {/* Seção Família */}
      <div className="px-3 pt-3 pb-1" style={{ fontSize: 10, fontWeight: 700, color: isFamily ? '#059669' : '#3D3D5C', letterSpacing: '0.08em' }}>
        {isFamily ? '— FAMÍLIA' : 'FAMÍLIA'}
      </div>
      {familyNav.map(item => (
        <NavItem key={item.name} item={item} locked={!isFamily} />
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F3FF' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed h-full z-10" style={{ width: 240, backgroundColor: '#1A1A2E' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#7C5CFC' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 7-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>Orçavi</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {renderNav()}
        </nav>

        {/* Banner upgrade (só free) */}
        {isFree && (
          <Link to="/pricing" className="mx-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #7C5CFC22, #A78BFA22)', border: '1px solid #7C5CFC44', textDecoration: 'none' }}>
            <Zap style={{ width: 14, height: 14, color: '#A78BFA', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#C4B5FD' }}>Faça upgrade para Pro</p>
              <p style={{ fontSize: 10, color: '#6B6B9A' }}>14 dias grátis</p>
            </div>
          </Link>
        )}

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid #25253F' }}>
          {/* Badge do plano atual */}
          <Link to="/pricing" style={{ textDecoration: 'none' }}>
            <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg" style={{ background: `${planColor}11`, border: `1px solid ${planColor}33` }}>
              <Crown style={{ width: 13, height: 13, color: planColor, flexShrink: 0 }} />
              <div className="flex-1 overflow-hidden">
                <p style={{ fontSize: 11, fontWeight: 700, color: planColor }}>Plano {planLabel}</p>
                {expiresText && <p style={{ fontSize: 10, color: '#6B6B9A' }}>{expiresText}</p>}
              </div>
              <Settings style={{ width: 12, height: 12, color: '#6B6B9A' }} />
            </div>
          </Link>

          <div className="flex items-center gap-2.5 px-3 py-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="rounded-full flex-shrink-0" style={{ width: 30, height: 30 }} />
            ) : (
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#25253F', color: '#A78BFA', fontSize: 12, fontWeight: 700 }}>
                {userInitial}
              </div>
            )}
            <div className="overflow-hidden">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#C4B5FD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName?.split(' ')[0] || user?.email}
              </p>
              <p style={{ fontSize: 11, color: '#6B6B9A' }}>Conta Google</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors" style={{ fontSize: 13, color: '#6B6B9A', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC4F3A'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#6B6B9A'; }}
          >
            <LogOut style={{ width: 15, height: 15 }} />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#1A1A2E', borderBottom: '1px solid #25253F' }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#7C5CFC' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 7-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, color: 'white', letterSpacing: '-0.025em' }}>Orçavi</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X style={{ width: 24, height: 24, color: '#C4B5FD' }} /> : <Menu style={{ width: 24, height: 24, color: '#C4B5FD' }} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 pt-16" style={{ backgroundColor: 'rgba(13,13,26,0.7)' }} onClick={() => setIsMobileMenuOpen(false)}>
          <div className="h-full w-3/4 max-w-xs p-4" style={{ backgroundColor: '#1A1A2E' }} onClick={e => e.stopPropagation()}>
            <nav className="flex flex-col gap-0.5">{renderNav(true)}</nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-60 p-4 md:p-8 mt-16 md:mt-0 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;

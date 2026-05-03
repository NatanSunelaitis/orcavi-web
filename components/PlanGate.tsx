import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Zap, Users, ArrowRight, Check } from 'lucide-react';
import { PlanId, PLANS } from '../config/plans';
import { usePlan } from '../context/PlanContext';

interface PlanGateProps {
  requiredPlan: 'pro' | 'family';
  children: React.ReactNode;
}

const PLAN_CONFIG = {
  pro: {
    icon: <Zap size={28} color="white" />,
    gradient: 'linear-gradient(135deg, #7C5CFC, #5B21B6)',
    color: '#7C5CFC',
    lightBg: '#EDE9FE',
    highlights: [
      'Cartões de crédito com controle de faturas',
      'Controle de dívidas e financiamentos',
      'Transações e contas ilimitadas',
      '14 dias grátis para testar',
    ],
  },
  family: {
    icon: <Users size={28} color="white" />,
    gradient: 'linear-gradient(135deg, #059669, #047857)',
    color: '#059669',
    lightBg: '#D1FAE5',
    highlights: [
      'Até 5 membros + pets no grupo',
      'Divisão automática de despesas',
      'Carteira compartilhada da família',
      'Assistente IA financeiro (Claude)',
    ],
  },
};

const PlanGate: React.FC<PlanGateProps> = ({ requiredPlan, children }) => {
  const { hasAccess } = usePlan();

  if (hasAccess(requiredPlan as PlanId)) return <>{children}</>;

  const config = PLAN_CONFIG[requiredPlan];
  const plan = PLANS[requiredPlan];

  return (
    <div style={{ position: 'relative' }}>
      {/* Preview desfocado do conteúdo */}
      <div style={{ filter: 'blur(3px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none', maxHeight: 420, overflow: 'hidden' }}>
        {children}
      </div>

      {/* Overlay gradiente na parte de baixo do preview */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
        background: 'linear-gradient(to bottom, transparent, #F5F3FF)',
        pointerEvents: 'none',
      }} />

      {/* Card de upgrade */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440,
        background: 'white',
        borderRadius: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        zIndex: 10,
      }}>
        {/* Header colorido */}
        <div style={{ background: config.gradient, padding: '28px 28px 24px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            {config.icon}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Recurso do plano {plan.name}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
            Faça upgrade para desbloquear este e outros recursos
          </p>
        </div>

        {/* Corpo */}
        <div style={{ padding: '20px 28px 28px' }}>
          {/* Preço */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: config.lightBg, borderRadius: 12, padding: '12px 16px',
            marginBottom: 18,
          }}>
            <Crown size={16} color={config.color} />
            <span style={{ fontSize: 14, fontWeight: 700, color: config.color }}>
              {plan.name} — apenas {plan.priceLabel}/mês
            </span>
            {'trialDays' in plan && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: config.color, borderRadius: 99, padding: '2px 8px', marginLeft: 'auto' }}>
                {plan.trialDays}d grátis
              </span>
            )}
          </div>

          {/* Highlights */}
          <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {config.highlights.map((h) => (
              <li key={h} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 99, background: config.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={11} color={config.color} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 13, color: '#374151' }}>{h}</span>
              </li>
            ))}
          </ul>

          {/* Botões */}
          <Link
            to="/pricing"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '13px', borderRadius: 14,
              background: config.gradient, color: 'white',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Fazer upgrade para {plan.name}
            <ArrowRight size={15} />
          </Link>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '12px 0 0' }}>
            Cancele quando quiser · Sem fidelidade
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanGate;

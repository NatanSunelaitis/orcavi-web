import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PLANS, PlanId, planHasAccess } from '../config/plans';

interface PlanState {
  plan: PlanId;
  planExpiresAt: string | null;
  loading: boolean;
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;
  canAddTransaction: (currentMonthCount: number) => boolean;
  canAddAccount: (currentCount: number) => boolean;
  canAddGoal: (currentCount: number) => boolean;
  hasAccess: (requiredPlan: PlanId) => boolean;
  limits: typeof PLANS['free']['limits'];
}

// Cache global para evitar múltiplas subscriptions do mesmo usuário
const planCache: { plan: PlanId; expiresAt: string | null } | null = null;
let globalPlan: PlanId = 'free';
let globalExpiresAt: string | null = null;
let channelCreated = false;

export function usePlan(): PlanState {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>(globalPlan);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(globalExpiresAt);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', user.uid)
        .single();

      if (error) {
        console.error('Erro ao buscar plano:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const isExpired = data.plan_expires_at
          ? new Date(data.plan_expires_at) < new Date()
          : false;

        const activePlan = isExpired ? 'free' : ((data.plan as PlanId) ?? 'free');
        globalPlan = activePlan;
        globalExpiresAt = data.plan_expires_at;
        setPlan(activePlan);
        setPlanExpiresAt(data.plan_expires_at);

        if (isExpired && data.plan !== 'free') {
          await supabase
            .from('profiles')
            .update({ plan: 'free', plan_expires_at: null })
            .eq('id', user.uid);
        }
      }
      setLoading(false);
    };

    fetchPlan();

    // Cria canal com nome único por usuário para evitar conflito
    const channelName = `plan-${user.uid}`;
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.uid}`,
      }, (payload) => {
        const newPlan = (payload.new.plan as PlanId) ?? 'free';
        globalPlan = newPlan;
        globalExpiresAt = payload.new.plan_expires_at;
        setPlan(newPlan);
        setPlanExpiresAt(payload.new.plan_expires_at);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.uid]);

  const limits = PLANS[plan].limits;

  return {
    plan,
    planExpiresAt,
    loading,
    isPro: planHasAccess(plan, 'pro'),
    isFamily: planHasAccess(plan, 'family'),
    isFree: plan === 'free',
    hasAccess: (requiredPlan: PlanId) => planHasAccess(plan, requiredPlan),
    canAddTransaction: (count: number) => {
      const limit = limits.transactionsPerMonth;
      return limit === Infinity || count < limit;
    },
    canAddAccount: (count: number) => {
      const limit = limits.accounts;
      return limit === Infinity || count < limit;
    },
    canAddGoal: (count: number) => {
      const limit = limits.goals;
      return limit === Infinity || count < limit;
    },
    limits,
  };
}

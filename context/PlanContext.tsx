import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { PLANS, PlanId, planHasAccess } from '../config/plans';

interface PlanContextType {
  plan: PlanId;
  planExpiresAt: string | null;
  loading: boolean;
  isPro: boolean;
  isFamily: boolean;
  isFree: boolean;
  hasAccess: (requiredPlan: PlanId) => boolean;
  canAddTransaction: (count: number) => boolean;
  canAddAccount: (count: number) => boolean;
  canAddGoal: (count: number) => boolean;
  limits: typeof PLANS['free']['limits'];
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>('free');
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
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

      if (error) { setLoading(false); return; }

      if (data) {
        const isExpired = data.plan_expires_at
          ? new Date(data.plan_expires_at) < new Date()
          : false;
        const activePlan = isExpired ? 'free' : ((data.plan as PlanId) ?? 'free');
        setPlan(activePlan);
        setPlanExpiresAt(data.plan_expires_at);
        if (isExpired && data.plan !== 'free') {
          await supabase.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', user.uid);
        }
      }
      setLoading(false);
    };

    fetchPlan();

    // Canal único criado uma só vez no Provider
    if (channelRef.current) return;
    channelRef.current = supabase
      .channel(`plan-ctx-${user.uid}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.uid}`,
      }, (payload) => {
        setPlan((payload.new.plan as PlanId) ?? 'free');
        setPlanExpiresAt(payload.new.plan_expires_at ?? null);
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

  return (
    <PlanContext.Provider value={{
      plan, planExpiresAt, loading,
      isPro: planHasAccess(plan, 'pro'),
      isFamily: planHasAccess(plan, 'family'),
      isFree: plan === 'free',
      hasAccess: (r) => planHasAccess(plan, r),
      canAddTransaction: (n) => limits.transactionsPerMonth === Infinity || n < limits.transactionsPerMonth,
      canAddAccount: (n) => limits.accounts === Infinity || n < limits.accounts,
      canAddGoal: (n) => limits.goals === Infinity || n < limits.goals,
      limits,
    }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
};

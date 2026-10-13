// src/lib/usePlan.ts
// React hook for accessing plan state throughout the app

import { useState, useCallback, useEffect } from 'react';
import {
  getActivePlan,
  setActivePlan,
  getTrialReceiptCount,
  incrementTrialReceiptCount,
  isTrialExhausted,
  parseLicenseKey,
  PLAN_CONFIG,
  type Plan,
  type Feature,
} from './planConfig';

export interface PlanState {
  plan: Plan;
  planLabel: string;
  receiptCount: number;
  maxReceipts: number;
  isTrialExhausted: boolean;
  receiptsRemaining: number;
  isNearLimit: boolean; // within 3 of limit
  canAccess: (feature: Feature) => boolean;
  activateLicense: (key: string) => { success: boolean; plan?: Plan; error?: string };
  recordReceipt: () => { allowed: boolean; count: number };
  refresh: () => void;
}

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<Plan>(getActivePlan);
  const [receiptCount, setReceiptCount] = useState<number>(getTrialReceiptCount);

  // Re-read from localStorage (for cross-tab updates)
  const refresh = useCallback(() => {
    setPlan(getActivePlan());
    setReceiptCount(getTrialReceiptCount());
  }, []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [refresh]);

  const config = PLAN_CONFIG[plan];
  const maxReceipts = config.maxReceipts;
  const exhausted = plan === 'free_trial' && receiptCount >= 30;
  const receiptsRemaining = plan === 'free_trial' ? Math.max(0, 30 - receiptCount) : Infinity;
  const isNearLimit = plan === 'free_trial' && receiptsRemaining <= 3 && !exhausted;

  const canAccess = useCallback(
    (feature: Feature) => PLAN_CONFIG[plan].features[feature],
    [plan]
  );

  const activateLicense = useCallback((key: string) => {
    const result = parseLicenseKey(key);
    if (!result.valid || !result.plan) {
      return { success: false, error: result.error };
    }
    setActivePlan(result.plan);
    setPlan(result.plan);
    return { success: true, plan: result.plan };
  }, []);

  const recordReceipt = useCallback(() => {
    if (plan === 'free_trial' && isTrialExhausted()) {
      return { allowed: false, count: getTrialReceiptCount() };
    }
    const count = plan === 'free_trial' ? incrementTrialReceiptCount() : getTrialReceiptCount();
    setReceiptCount(count);
    return { allowed: true, count };
  }, [plan]);

  return {
    plan,
    planLabel: config.label,
    receiptCount,
    maxReceipts,
    isTrialExhausted: exhausted,
    receiptsRemaining,
    isNearLimit,
    canAccess,
    activateLicense,
    recordReceipt,
    refresh,
  };
}

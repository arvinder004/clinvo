// src/lib/planConfig.ts
// Feature gating engine — plan limits & feature flags for Clinvo

export type Plan = 'free_trial' | 'growth' | 'enterprise';
export type Feature =
  | 'csvExport'
  | 'customBranding'
  | 'dataBackup'
  | 'gdprAuditLogs'
  | 'multiBranch'
  | 'staffLogins'
  | 'fullHistory';

export interface PlanConfig {
  name: string;
  label: string;
  price: string;
  priceNum: number;
  period: string;
  maxReceipts: number;
  maxStaffLogins: number;
  historyDays: number;
  features: Record<Feature, boolean>;
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  free_trial: {
    name: 'free_trial',
    label: 'Free Trial',
    price: '₹0',
    priceNum: 0,
    period: '30 receipts',
    maxReceipts: 30,
    maxStaffLogins: 1,
    historyDays: 7,
    features: {
      csvExport: false,
      customBranding: false,
      dataBackup: false,
      gdprAuditLogs: false,
      multiBranch: false,
      staffLogins: false,
      fullHistory: false,
    },
  },
  growth: {
    name: 'growth',
    label: 'Growth',
    price: '₹1,999',
    priceNum: 1999,
    period: '/mo',
    maxReceipts: Infinity,
    maxStaffLogins: 5,
    historyDays: Infinity,
    features: {
      csvExport: true,
      customBranding: true,
      dataBackup: true,
      gdprAuditLogs: false,
      multiBranch: false,
      staffLogins: true,
      fullHistory: true,
    },
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise',
    price: '₹4,999',
    priceNum: 4999,
    period: '/mo',
    maxReceipts: Infinity,
    maxStaffLogins: Infinity,
    historyDays: Infinity,
    features: {
      csvExport: true,
      customBranding: true,
      dataBackup: true,
      gdprAuditLogs: true,
      multiBranch: true,
      staffLogins: true,
      fullHistory: true,
    },
  },
};

// ── Storage keys ──────────────────────────────────────────────────────────────
const PLAN_KEY = 'clinvo_active_plan';
const RECEIPT_COUNT_KEY = 'clinvo_trial_receipt_count';

export function getActivePlan(): Plan {
  if (typeof window === 'undefined') return 'free_trial';
  const stored = localStorage.getItem(PLAN_KEY) as Plan | null;
  if (stored && stored in PLAN_CONFIG) return stored;
  return 'free_trial';
}

export function setActivePlan(plan: Plan): void {
  localStorage.setItem(PLAN_KEY, plan);
}

export function getTrialReceiptCount(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(RECEIPT_COUNT_KEY) || '0', 10);
}

export function incrementTrialReceiptCount(): number {
  const current = getTrialReceiptCount();
  const next = current + 1;
  localStorage.setItem(RECEIPT_COUNT_KEY, String(next));
  return next;
}

export function isTrialExhausted(): boolean {
  const plan = getActivePlan();
  if (plan !== 'free_trial') return false;
  return getTrialReceiptCount() >= PLAN_CONFIG.free_trial.maxReceipts;
}

export function canAccessFeature(feature: Feature): boolean {
  const plan = getActivePlan();
  return PLAN_CONFIG[plan].features[feature];
}

export function getPlanLabel(plan: Plan): string {
  return PLAN_CONFIG[plan].label;
}

// ── License key validation ────────────────────────────────────────────────────
// Format: CLNV-XXXX-XXXX-XXXX-G (Growth) or -E (Enterprise)
export function parseLicenseKey(key: string): { valid: boolean; plan?: Plan; error?: string } {
  const cleaned = key.trim().toUpperCase();
  const pattern = /^CLNV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-([GE])$/;
  const match = cleaned.match(pattern);

  if (!match) {
    return { valid: false, error: 'Invalid key format. Expected: CLNV-XXXX-XXXX-XXXX-G or -E' };
  }

  const planSuffix = match[1];
  const plan: Plan = planSuffix === 'G' ? 'growth' : 'enterprise';
  return { valid: true, plan };
}

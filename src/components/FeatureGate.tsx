// src/components/FeatureGate.tsx
// Wrapper component that locks features based on active plan

import React from 'react';
import { Lock } from 'lucide-react';
import { usePlan } from '../lib/usePlan';
import { PLAN_CONFIG, type Feature, type Plan } from '../lib/planConfig';

const FEATURE_LABELS: Record<Feature, { name: string; minPlan: Plan }> = {
  csvExport:      { name: 'CSV Export',         minPlan: 'growth' },
  customBranding: { name: 'Custom Branding',    minPlan: 'growth' },
  dataBackup:     { name: 'Data Backup',        minPlan: 'growth' },
  gdprAuditLogs:  { name: 'GDPR Audit Logs',   minPlan: 'enterprise' },
  multiBranch:    { name: 'Multi-branch',       minPlan: 'enterprise' },
  staffLogins:    { name: 'Multiple Staff Logins', minPlan: 'growth' },
  fullHistory:    { name: 'Full Receipt History', minPlan: 'growth' },
};

interface Props {
  feature: Feature;
  onUpgrade?: () => void;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<Props> = ({ feature, onUpgrade, children }) => {
  const { canAccess } = usePlan();
  const isLocked = !canAccess(feature);

  if (!isLocked) return <>{children}</>;

  const meta = FEATURE_LABELS[feature];
  const planConfig = PLAN_CONFIG[meta.minPlan];

  return (
    <div className="feature-gate-wrapper locked" style={{ position: 'relative', minHeight: 60 }}>
      {/* Blurred children underneath */}
      <div style={{ filter: 'blur(2px)', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="feature-gate-overlay" onClick={onUpgrade} style={{ cursor: onUpgrade ? 'pointer' : 'default' }}>
        <div className="feature-gate-card">
          <div className="feature-gate-icon">
            <Lock size={20} />
          </div>
          <div className="feature-gate-title">{meta.name}</div>
          <div className="feature-gate-sub">
            Available on <strong>{planConfig.label}</strong> plan — {planConfig.price}{planConfig.period}
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              style={{
                marginTop: '0.25rem',
                padding: '0.5rem 1rem',
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Enter License Key →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

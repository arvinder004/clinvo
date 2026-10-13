// src/components/TrialBanner.tsx
// Persistent usage banner shown inside clinic app when trial is running/near limit/exhausted

import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePlan } from '../lib/usePlan';

interface Props {
  onOpenActivation: () => void;
}

export const TrialBanner: React.FC<Props> = ({ onOpenActivation }) => {
  const { plan, receiptCount, isTrialExhausted, receiptsRemaining, isNearLimit } = usePlan();

  // Only show for free trial users
  if (plan !== 'free_trial') return null;

  const isUrgent = isTrialExhausted || isNearLimit;

  if (isTrialExhausted) {
    return (
      <div className="trial-banner urgent">
        <div className="trial-banner-text">
          <AlertTriangle size={14} />
          <span>
            Your free trial is complete — <strong>30 / 30 receipts used.</strong>{' '}
            New receipts are blocked until you activate a license key.
          </span>
        </div>
        <div className="trial-banner-actions">
          <button
            onClick={onOpenActivation}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.9rem',
              background: '#c0392b', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Enter License Key <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (isNearLimit) {
    return (
      <div className={`trial-banner ${isUrgent ? 'urgent' : ''}`}>
        <div className="trial-banner-text">
          <AlertTriangle size={14} />
          <span>
            Only{' '}
            <span className="trial-count">{receiptsRemaining}</span>{' '}
            receipt{receiptsRemaining !== 1 ? 's' : ''} left in your free trial.{' '}
            Activate a key before you run out.
          </span>
        </div>
        <div className="trial-banner-actions">
          <button
            onClick={onOpenActivation}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.9rem',
              background: 'var(--warning)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius)',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Activate License <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Normal trial in progress — subtle count
  return (
    <div className="trial-banner">
      <div className="trial-banner-text">
        <CheckCircle2 size={14} style={{ color: '#92400e' }} />
        <span>
          Free trial:{' '}
          <span className="trial-count">{receiptCount} / 30</span>{' '}
          receipts used.{' '}
          <span style={{ color: '#78350f', fontWeight: 400 }}>
            Upgrade anytime to remove the limit.
          </span>
        </span>
      </div>
      <div className="trial-banner-actions">
        <button
          onClick={onOpenActivation}
          style={{
            background: 'none',
            border: '1px solid #fcd34d',
            color: '#78350f',
            borderRadius: 'var(--radius)',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.35rem 0.75rem',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Enter License Key
        </button>
      </div>
    </div>
  );
};

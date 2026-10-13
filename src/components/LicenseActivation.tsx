// src/components/LicenseActivation.tsx
// Modal for entering & activating a license key — upgrades plan from trial to Growth or Enterprise

import React, { useState, useRef, useEffect } from 'react';
import { KeyRound, CheckCircle2, X, AlertCircle, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { usePlan } from '../lib/usePlan';
import { PLAN_CONFIG, type Plan } from '../lib/planConfig';

interface Props {
  onClose: () => void;
  onActivated?: (plan: Plan) => void;
}

export const LicenseActivation: React.FC<Props> = ({ onClose, onActivated }) => {
  const { activateLicense } = usePlan();
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [activatedPlan, setActivatedPlan] = useState<Plan | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-format key as user types: CLNV-XXXX-XXXX-XXXX-G
  const handleKeyChange = (raw: string) => {
    const stripped = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 17);
    let formatted = stripped;
    if (stripped.length > 4) formatted = stripped.slice(0, 4) + '-' + stripped.slice(4);
    if (stripped.length > 8) formatted = formatted.slice(0, 9) + '-' + stripped.slice(8);
    if (stripped.length > 12) formatted = formatted.slice(0, 14) + '-' + stripped.slice(12);
    if (stripped.length > 16) formatted = formatted.slice(0, 19) + '-' + stripped.slice(16);
    setKey(formatted);
    setStatus('idle');
    setErrorMsg('');
  };

  const handleActivate = async () => {
    if (key.trim().length < 5) {
      setErrorMsg('Please enter your license key.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    // Simulate brief validation delay (replace with API call if needed)
    await new Promise((r) => setTimeout(r, 700));
    const result = activateLicense(key);
    if (result.success && result.plan) {
      setActivatedPlan(result.plan);
      setStatus('success');
      setTimeout(() => {
        onActivated?.(result.plan!);
      }, 2400);
    } else {
      setErrorMsg(result.error || 'Invalid key. Check the key and try again.');
      setStatus('error');
    }
  };

  const planConfig = activatedPlan ? PLAN_CONFIG[activatedPlan] : null;

  return (
    <div className="license-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="license-modal">

        {/* ── Header ── */}
        <div className="license-modal-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div className="license-modal-icon">
              {status === 'success' ? (
                <CheckCircle2 size={22} />
              ) : (
                <KeyRound size={22} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '3px' }}>
                {status === 'success' ? 'License Activated!' : 'Activate License Key'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-faint)' }}>
                {status === 'success'
                  ? `Your clinic is now on the ${planConfig?.label} plan.`
                  : 'Enter the key you received after purchase to unlock all features.'}
              </div>
            </div>
          </div>
          {status !== 'success' && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: '4px', borderRadius: '6px', lineHeight: 1 }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="license-modal-body">
          {status === 'success' && planConfig ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{
                width: 72, height: 72,
                background: 'var(--brand-light)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                color: 'var(--brand)',
                animation: 'lp-pop 0.4s var(--ease-spring) both',
              }}>
                <ShieldCheck size={34} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--ink)', marginBottom: '0.5rem' }}>
                Welcome to {planConfig.label}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--ink-muted)', marginBottom: '1.5rem' }}>
                All {planConfig.label} features are now unlocked for your clinic.
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '0.6rem',
                background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem', textAlign: 'left',
              }}>
                {['Unlimited receipts', 'Up to ' + (planConfig.maxStaffLogins === Infinity ? 'unlimited' : planConfig.maxStaffLogins) + ' staff logins', 'Full receipt history', 'Financial reports & CSV export', 'Custom clinic branding'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                    <CheckCircle2 size={14} color="var(--brand)" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  License Key
                </label>
                <input
                  ref={inputRef}
                  className={`license-key-input ${status === 'error' ? 'error' : ''}`}
                  type="text"
                  placeholder="CLNV-XXXX-XXXX-XXXX-G"
                  value={key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                  spellCheck={false}
                  autoComplete="off"
                />
                {status === 'error' && errorMsg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--danger)' }}>
                    <AlertCircle size={13} />
                    {errorMsg}
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', marginTop: '0.5rem' }}>
                  Format: <span style={{ fontFamily: 'var(--font-mono)' }}>CLNV-XXXX-XXXX-XXXX-G</span> (Growth) or <span style={{ fontFamily: 'var(--font-mono)' }}>-E</span> (Enterprise)
                </div>
              </div>

              {/* How to get a key */}
              <div style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Don't have a key yet?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { icon: '💬', label: 'WhatsApp', sub: '+91 XXXXX XXXXX', href: 'https://wa.me/91XXXXXXXXXX?text=Hi%2C+I%27d+like+to+buy+the+Clinvo+Growth+plan' },
                    { icon: '📧', label: 'Email', sub: 'sales@clinvo.in', href: 'mailto:sales@clinvo.in?subject=Clinvo%20License%20Key%20Request&body=Hi%2C%20I%27d%20like%20to%20purchase%20the%20Growth%20plan.' },
                  ].map((opt) => (
                    <a key={opt.label} href={opt.href} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--ink-muted)', fontSize: '0.85rem' }}
                    >
                      <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                      <span><strong style={{ color: 'var(--ink)' }}>{opt.label}:</strong> {opt.sub}</span>
                      <ArrowRight size={12} style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }} />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {status !== 'success' && (
          <div className="license-modal-footer">
            <button
              onClick={onClose}
              style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', color: 'var(--ink-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleActivate}
              disabled={status === 'loading' || !key.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.5rem',
                background: status === 'loading' ? 'var(--brand-hover)' : 'var(--brand)',
                color: '#fff', border: 'none', borderRadius: 'var(--radius)',
                fontSize: '0.875rem', fontWeight: 600, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: !key.trim() ? 0.6 : 1,
                transition: 'all var(--t-fast)',
              }}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'lp-spin 0.8s linear infinite' }} />
                  Verifying...
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  Activate Key
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

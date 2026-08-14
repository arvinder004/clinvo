import React, { useState, useEffect } from 'react';
import { Building2, KeyRound, ShieldCheck, CheckCircle2, ArrowRight, ChevronRight, Code2, Delete } from 'lucide-react';
import PinLock from './PinLock';

interface SetupWizardProps {
  onComplete: (clinicName: string, pinSet: boolean) => void;
}

type Step = 'welcome' | 'clinic-name' | 'pin' | 'dev-pin' | 'recovery' | 'done';
const ALL_STEPS: Step[] = ['welcome', 'clinic-name', 'pin', 'dev-pin', 'recovery', 'done'];

// ── Inline 4-digit numpad for dev PIN (reuses same style as PinLock) ──────────
const DOTS = 4;

const DevPinSetup: React.FC<{ onSet: () => void; onSkip: () => void }> = ({ onSet, onSkip }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleDigit = (d: string) => {
    const cur = step === 'confirm' ? confirmPin : pin;
    if (cur.length >= DOTS) return;
    step === 'confirm' ? setConfirmPin(p => p + d) : setPin(p => p + d);
    setError('');
  };

  const handleDelete = () => {
    step === 'confirm' ? setConfirmPin(p => p.slice(0, -1)) : setPin(p => p.slice(0, -1));
    setError('');
  };

  // Keyboard support
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') { setPressedKey(e.key); handleDigit(e.key); }
      else if (e.key === 'Backspace') { setPressedKey('⌫'); handleDelete(); }
    };
    const up = () => setPressedKey(null);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [pin, confirmPin, step]);

  // Auto-submit on 4 digits
  useEffect(() => {
    const cur = step === 'confirm' ? confirmPin : pin;
    if (cur.length !== DOTS) return;
    const t = setTimeout(async () => {
      if (step === 'enter') {
        setStep('confirm');
      } else {
        if (pin === confirmPin) {
          // @ts-ignore
          await window.devPin.set(pin);
          onSet();
        } else {
          setPin(''); setConfirmPin(''); setStep('enter');
          triggerShake();
          setError("PINs didn't match. Please try again.");
        }
      }
    }, 100);
    return () => clearTimeout(t);
  }, [pin, confirmPin, step]);

  const currentPin = step === 'confirm' ? confirmPin : pin;

  return (
    <div className="bento-fullscreen-overlay">
      <div className={`bento-auth-card ${shake ? 'shake' : ''}`} style={{ maxWidth: '380px', alignItems: 'center' }}>
        {/* Progress dots — matches wizard progress */}
        <div className="wizard-progress" style={{ marginBottom: '1.5rem' }}>
          {ALL_STEPS.map((s, i) => (
            <div key={s} className={`wizard-step-dot ${s === 'dev-pin' ? 'active' : i < ALL_STEPS.indexOf('dev-pin') ? 'done' : ''}`} />
          ))}
        </div>

        <div className="bento-auth-header">
          <div className="bento-auth-icon purple">
            <Code2 size={28} />
          </div>
          <h1>{step === 'confirm' ? 'Confirm Developer PIN' : 'Set Developer PIN'}</h1>
          <p>
            {step === 'confirm'
              ? 'Enter the same PIN again to confirm'
              : 'This PIN unlocks developer mode — only share it with the system administrator'}
          </p>
        </div>

        <div className="pin-dots">
          {Array.from({ length: DOTS }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < currentPin.length ? 'filled' : ''}`} />
          ))}
        </div>

        <div className="pin-error-area">
          {error && <span className="pin-error">{error}</span>}
        </div>

        <div className="pin-numpad">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} className="pin-key empty" />;
            if (key === '⌫') return (
              <button key={i} className={`pin-key delete-key ${pressedKey === '⌫' ? 'pressed' : ''}`} onClick={handleDelete}>
                <Delete size={20} />
              </button>
            );
            return (
              <button key={i} className={`pin-key ${pressedKey === key ? 'pressed' : ''}`} onClick={() => handleDigit(key)}>
                {key}
              </button>
            );
          })}
        </div>

        <p className="pin-keyboard-hint">You can also type using your keyboard</p>

        <button className="pin-skip-btn" onClick={onSkip}>
          Skip for now
        </button>

        <div className="pin-footer">
          <ShieldCheck size={14} />
          <span>Developer PIN is stored securely on this device</span>
        </div>
      </div>

      <style>{`
        .shake { animation: shake 0.4s ease; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .wizard-progress { display: flex; justify-content: center; gap: 0.5rem; }
        .wizard-step-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; transition: all 0.2s; }
        .wizard-step-dot.active { background: var(--primary); width: 24px; border-radius: 4px; }
        .wizard-step-dot.done { background: #86efac; }
        .pin-header { text-align: center; margin-bottom: 1.5rem; }
        .pin-icon-badge {
          width: 64px; height: 64px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem;
        }
        .pin-header h1 { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.4rem; }
        .pin-header p { font-size: 0.875rem; color: #64748b; margin: 0; line-height: 1.5; }
        .pin-dots { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
        .pin-dot {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid #cbd5e1; background: white; transition: all 0.15s;
        }
        .pin-dot.filled { background: #2563eb; border-color: #2563eb; transform: scale(1.15); }
        .pin-error-area { min-height: 1.25rem; margin-bottom: 0.75rem; }
        .pin-error { font-size: 0.8rem; color: #ef4444; text-align: center; }
        .pin-numpad {
          display: grid; grid-template-columns: repeat(3, 72px);
          justify-content: center;
          gap: 0.75rem; margin-bottom: 1.25rem;
        }
        .pin-key {
          width: 72px; height: 72px; border-radius: 50%; font-size: 1.4rem; font-weight: 600;
          background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.1s; user-select: none;
        }
        .pin-key:hover { background: #f1f5f9; transform: scale(1.05); }
        .pin-key.pressed { background: #dbeafe; border-color: #2563eb; transform: scale(0.95); }
        .pin-key.delete-key { background: #fef2f2; border-color: #fecaca; color: #ef4444; }
        .pin-key.empty { background: transparent; border: none; pointer-events: none; }
        .pin-keyboard-hint { font-size: 0.75rem; color: #94a3b8; margin-bottom: 1rem; }
        .pin-skip-btn {
          font-size: 0.85rem; color: #64748b; background: none; border: none;
          cursor: pointer; text-decoration: underline; margin-bottom: 1.25rem;
          text-underline-offset: 3px;
        }
        .pin-skip-btn:hover { color: #0f172a; }
        .pin-footer {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.75rem; color: #94a3b8;
        }
        .shake { animation: shake 0.4s ease; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

// ── Main Wizard ───────────────────────────────────────────────────────────────

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [clinicName, setClinicName] = useState('');
  const [pinSet, setPinSet] = useState(false);
  const [devPinSet, setDevPinSet] = useState(false);
  const [nameError, setNameError] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');

  useEffect(() => {
    // @ts-ignore
    if (window.recoveryKey) {
      // @ts-ignore
      window.recoveryKey.generate().then(setRecoveryKey);
    }
  }, []);

  const handleNameNext = () => {
    if (!clinicName.trim()) {
      setNameError('Please enter your clinic name to continue.');
      return;
    }
    setNameError('');
    setStep('pin');
  };

  const handleFinish = async () => {
    // @ts-ignore
    await window.database.setMetadata('clinic_name', clinicName.trim());
    // @ts-ignore
    await window.setupWizard.markComplete();
    onComplete(clinicName.trim(), pinSet);
  };

  // PIN step — full-screen PinLock component
  if (step === 'pin') {
    return (
      <PinLock
        mode="setup"
        onSuccess={() => { setPinSet(true); setStep('dev-pin'); }}
        onSkip={() => setStep('dev-pin')}
      />
    );
  }

  // Dev PIN step — inline numpad inside wizard layout
  if (step === 'dev-pin') {
    return (
      <DevPinSetup
        onSet={() => { setDevPinSet(true); setStep('recovery'); }}
        onSkip={() => setStep('recovery')}
      />
    );
  }

  return (
    <div className="bento-fullscreen-overlay">
      <div className="bento-auth-card" style={{ maxWidth: '460px', alignItems: 'center' }}>

        {/* Progress dots */}
        <div className="wizard-progress">
          {ALL_STEPS.map((s, i) => (
            <div
              key={s}
              className={`wizard-step-dot ${step === s ? 'active' : i < ALL_STEPS.indexOf(step) ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* ── Welcome ── */}
        {step === 'welcome' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="bento-auth-header">
              <div className="bento-auth-icon blue">
                <Building2 size={30} />
              </div>
              <h1>Welcome to Clinvo</h1>
              <p>Let's get your clinic set up in a few quick steps. This will only take a minute.</p>
            </div>

            <div style={{ width: '100%', background: 'var(--background)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                <ChevronRight size={16} color="var(--primary)" />
                <span>Set your clinic name</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                <ChevronRight size={16} color="var(--primary)" />
                <span>Set a PIN to protect patient data</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                <ChevronRight size={16} color="var(--primary)" />
                <span>Set a Developer PIN for admin access</span>
              </div>
            </div>

            <button className="bento-btn" style={{ width: '100%', padding: '0.9rem' }} onClick={() => setStep('clinic-name')}>
              Get Started
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Clinic Name ── */}
        {step === 'clinic-name' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="bento-auth-header">
              <div className="bento-auth-icon blue">
                <Building2 size={30} />
              </div>
              <h1>What is your clinic called?</h1>
              <p>This name will appear on every receipt you generate.</p>
            </div>

            <div className="bento-form-group" style={{ width: '100%', marginBottom: '1.75rem' }}>
              <label htmlFor="clinic-name-input">Clinic Name</label>
              <input
                id="clinic-name-input"
                type="text"
                className="bento-input"
                placeholder="e.g. City Health Clinic"
                value={clinicName}
                onChange={e => { setClinicName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                autoFocus
              />
              {nameError && <span style={{ display: 'block', fontSize: '0.8rem', color: '#ef4444', marginTop: '0.4rem' }}>{nameError}</span>}
            </div>

            <button className="bento-btn" style={{ width: '100%', padding: '0.9rem' }} onClick={handleNameNext}>
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Recovery Key ── */}
        {step === 'recovery' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="bento-auth-header">
              <div className="bento-auth-icon purple">
                <KeyRound size={30} />
              </div>
              <h1>Save your Recovery Key</h1>
              <p>This is the only way to reset your PINs if you forget them. Please keep it somewhere safe.</p>
            </div>

            <div style={{ width: '100%', background: '#fef2f2', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.75rem', textAlign: 'center', border: '2px dashed #fca5a5' }}>
              <code style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991b1b', letterSpacing: '1px' }}>
                {recoveryKey || 'Generating...'}
              </code>
            </div>

            <button className="bento-btn" style={{ width: '100%', padding: '0.9rem' }} onClick={() => setStep('done')}>
              I have saved my Recovery Key
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="bento-auth-header">
              <div className="bento-auth-icon green">
                <CheckCircle2 size={30} />
              </div>
              <h1>All set!</h1>
              <p>Your clinic has been configured and is ready to use.</p>
            </div>

            <div style={{ width: '100%', background: 'var(--background)', borderRadius: '12px', padding: '1.1rem 1.25rem', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <Building2 size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Clinic:</strong> {clinicName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <KeyRound size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>PIN Lock:</strong>{' '}
                  {pinSet ? 'Enabled' : 'Not set — you can add one later in Control Center'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <Code2 size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>Developer PIN:</strong>{' '}
                  {devPinSet ? 'Enabled' : 'Not set — developer mode will be inaccessible until set in Control Center'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                <ShieldCheck size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span><strong>Auto Backup:</strong> Enabled — daily backups will be created automatically</span>
              </div>
            </div>

            <button className="bento-btn" style={{ width: '100%', padding: '0.9rem' }} onClick={handleFinish}>
              Open Clinvo
              <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>

      <style>{`
        /* Remove unused wizard- specific styles and rely on inline or bento classes */
      `}</style>
    </div>
  );
};

export default SetupWizard;

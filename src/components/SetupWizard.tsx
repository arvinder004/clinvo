import React, { useState, useEffect } from 'react';
import { Building2, KeyRound, ShieldCheck, CheckCircle2, ArrowRight, ChevronRight, Code2, Delete } from 'lucide-react';
import PinLock from './PinLock';

interface SetupWizardProps {
  onComplete: (clinicName: string, pinSet: boolean) => void;
}

type Step = 'welcome' | 'clinic-name' | 'pin' | 'dev-pin' | 'done';
const ALL_STEPS: Step[] = ['welcome', 'clinic-name', 'pin', 'dev-pin', 'done'];

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
    <div className="wizard-overlay">
      <div className={`pin-card ${shake ? 'shake' : ''}`}>
        {/* Progress dots — matches wizard progress */}
        <div className="wizard-progress" style={{ marginBottom: '1.5rem' }}>
          {ALL_STEPS.map((s, i) => (
            <div key={s} className={`wizard-step-dot ${s === 'dev-pin' ? 'active' : i < ALL_STEPS.indexOf('dev-pin') ? 'done' : ''}`} />
          ))}
        </div>

        <div className="pin-header">
          <div className="pin-icon-badge" style={{ background: '#fdf4ff', color: '#9333ea' }}>
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
        .wizard-overlay {
          position: fixed; inset: 0; background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; font-family: 'Inter', sans-serif;
        }
        .pin-card {
          background: white; border-radius: 24px; padding: 2.5rem 2.25rem;
          width: 100%; max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;
          display: flex; flex-direction: column; align-items: center;
        }
        .wizard-progress { display: flex; justify-content: center; gap: 0.5rem; }
        .wizard-step-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; transition: all 0.2s; }
        .wizard-step-dot.active { background: #2563eb; width: 24px; border-radius: 4px; }
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
        onSet={() => { setDevPinSet(true); setStep('done'); }}
        onSkip={() => setStep('done')}
      />
    );
  }

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">

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
          <div className="wizard-body">
            <div className="wizard-icon-badge blue">
              <Building2 size={30} />
            </div>
            <h1>Welcome to Clinvo</h1>
            <p>Let's get your clinic set up in a few quick steps. This will only take a minute.</p>

            <div className="wizard-checklist">
              <div className="checklist-item">
                <ChevronRight size={16} className="check-arrow" />
                <span>Set your clinic name</span>
              </div>
              <div className="checklist-item">
                <ChevronRight size={16} className="check-arrow" />
                <span>Set a PIN to protect patient data</span>
              </div>
              <div className="checklist-item">
                <ChevronRight size={16} className="check-arrow" />
                <span>Set a Developer PIN for admin access</span>
              </div>
            </div>

            <button className="wizard-btn-primary" onClick={() => setStep('clinic-name')}>
              Get Started
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Clinic Name ── */}
        {step === 'clinic-name' && (
          <div className="wizard-body">
            <div className="wizard-icon-badge blue">
              <Building2 size={30} />
            </div>
            <h1>What is your clinic called?</h1>
            <p>This name will appear on every receipt you generate.</p>

            <div className="wizard-input-group">
              <label htmlFor="clinic-name-input">Clinic Name</label>
              <input
                id="clinic-name-input"
                type="text"
                placeholder="e.g. City Health Clinic"
                value={clinicName}
                onChange={e => { setClinicName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                autoFocus
              />
              {nameError && <span className="wizard-error">{nameError}</span>}
            </div>

            <button className="wizard-btn-primary" onClick={handleNameNext}>
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="wizard-body">
            <div className="wizard-icon-badge green">
              <CheckCircle2 size={30} />
            </div>
            <h1>All set!</h1>
            <p>Your clinic has been configured and is ready to use.</p>

            <div className="wizard-summary">
              <div className="summary-row">
                <Building2 size={16} />
                <span><strong>Clinic:</strong> {clinicName}</span>
              </div>
              <div className="summary-row">
                <KeyRound size={16} />
                <span>
                  <strong>PIN Lock:</strong>{' '}
                  {pinSet ? 'Enabled' : 'Not set — you can add one later in Control Center'}
                </span>
              </div>
              <div className="summary-row">
                <Code2 size={16} />
                <span>
                  <strong>Developer PIN:</strong>{' '}
                  {devPinSet ? 'Enabled' : 'Not set — developer mode will be inaccessible until set in Control Center'}
                </span>
              </div>
              <div className="summary-row">
                <ShieldCheck size={16} />
                <span><strong>Auto Backup:</strong> Enabled — daily backups will be created automatically</span>
              </div>
            </div>

            <button className="wizard-btn-primary" onClick={handleFinish}>
              Open Clinvo
              <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>

      <style>{`
        .wizard-overlay {
          position: fixed;
          inset: 0;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          font-family: 'Inter', sans-serif;
        }

        .wizard-card {
          background: white;
          border-radius: 24px;
          padding: 2.5rem 2.25rem;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        .wizard-progress {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .wizard-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e2e8f0;
          transition: all 0.2s;
        }

        .wizard-step-dot.active {
          background: #2563eb;
          width: 24px;
          border-radius: 4px;
        }

        .wizard-step-dot.done {
          background: #86efac;
        }

        .wizard-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .wizard-icon-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .wizard-icon-badge.blue { background: #eff6ff; color: #2563eb; }
        .wizard-icon-badge.green { background: #f0fdf4; color: #16a34a; }

        .wizard-body h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 0.5rem;
        }

        .wizard-body > p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0 0 1.75rem;
          line-height: 1.6;
        }

        .wizard-checklist {
          width: 100%;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }

        .checklist-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #334155;
        }

        .check-arrow { color: #2563eb; flex-shrink: 0; }

        .wizard-input-group {
          width: 100%;
          text-align: left;
          margin-bottom: 1.75rem;
        }

        .wizard-input-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .wizard-input-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          font-family: inherit;
          color: #0f172a;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }

        .wizard-input-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .wizard-error {
          display: block;
          font-size: 0.8rem;
          color: #ef4444;
          margin-top: 0.4rem;
        }

        .wizard-btn-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.9rem 1.5rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .wizard-btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }

        .wizard-summary {
          width: 100%;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          text-align: left;
        }

        .summary-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: 0.875rem;
          color: #334155;
          line-height: 1.5;
        }

        .summary-row svg {
          color: #2563eb;
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
};

export default SetupWizard;

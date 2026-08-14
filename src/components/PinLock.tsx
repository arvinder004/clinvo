import React, { useState, useEffect, useRef } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';

interface PinLockProps {
  mode: 'verify' | 'setup';
  onSuccess: () => void;
  onSkip?: () => void; // only used in setup mode
}

const DOTS = 4;

const PinLock: React.FC<PinLockProps> = ({ mode, onSuccess, onSkip }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm' | 'reset'>('enter');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lockout countdown
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutSeconds(0);
        setAttempts(0);
        setError('');
        clearInterval(interval);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutUntil || step === 'reset') return;
      if (e.key >= '0' && e.key <= '9') {
        setPressedKey(e.key);
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        setPressedKey('⌫');
        handleDelete();
      }
    };
    const handleKeyUp = () => setPressedKey(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [lockoutUntil, pin, confirmPin, step]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = (digit: string) => {
    if (lockoutUntil) return;
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length >= DOTS) return;

    if (step === 'confirm') {
      setConfirmPin(prev => prev + digit);
    } else {
      setPin(prev => prev + digit);
    }
    setError('');
  };

  const handleDelete = () => {
    if (lockoutUntil) return;
    if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setPin(prev => prev.slice(0, -1));
    }
    setError('');
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    const current = step === 'confirm' ? confirmPin : pin;
    if (current.length !== DOTS) return;

    const timer = setTimeout(async () => {
      if (mode === 'verify') {
        // @ts-ignore
        const result = await window.pinLock.verify(pin);
        if (result.success) {
          onSuccess();
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setPin('');
          triggerShake();
          if (newAttempts >= 5) {
            const until = Date.now() + 30_000; // 30 second lockout
            setLockoutUntil(until);
            setError('Too many attempts. Locked for 30 seconds.');
          } else {
            setError(`Incorrect PIN. ${5 - newAttempts} attempt${5 - newAttempts === 1 ? '' : 's'} remaining.`);
          }
        }
      } else {
        // Setup mode
        if (step === 'enter') {
          setStep('confirm');
        } else {
          if (pin === confirmPin) {
            // @ts-ignore
            await window.pinLock.set(pin);
            onSuccess();
          } else {
            setConfirmPin('');
            setPin('');
            setStep('enter');
            triggerShake();
            setError("PINs didn't match. Please try again.");
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pin, confirmPin, step]);

  const currentPin = step === 'confirm' ? confirmPin : pin;

  const getTitle = () => {
    if (step === 'reset') return 'Reset PIN';
    if (mode === 'verify') return 'Enter PIN';
    if (step === 'confirm') return 'Confirm PIN';
    return 'Set a PIN';
  };

  const getSubtitle = () => {
    if (step === 'reset') return 'Enter your 12-character Recovery Key to clear your PIN';
    if (mode === 'verify') return 'Enter your 4-digit PIN to unlock Clinvo';
    if (step === 'confirm') return 'Enter the same PIN again to confirm';
    return 'Choose a 4-digit PIN to protect the app';
  };

  const handleResetSubmit = async () => {
    // @ts-ignore
    const result = await window.pinLock.reset(resetKey);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || 'Invalid Recovery Key.');
      setResetKey('');
      triggerShake();
    }
  };

  return (
    <div className="bento-fullscreen-overlay">
      <div className={`bento-auth-card ${shake ? 'shake' : ''}`} ref={containerRef} style={{ maxWidth: '380px' }}>
        <div className="bento-auth-header">
          <div className="bento-auth-icon blue">
            <Lock size={28} />
          </div>
          <h1>{getTitle()}</h1>
          <p>{getSubtitle()}</p>
        </div>

        {step !== 'reset' ? (
          <>
            {/* Dots */}
            <div className="pin-dots">
              {Array.from({ length: DOTS }).map((_, i) => (
                <div
                  key={i}
                  className={`pin-dot ${i < currentPin.length ? 'filled' : ''} ${lockoutUntil ? 'locked' : ''}`}
                />
              ))}
            </div>

            {/* Error / Lockout */}
            <div className="pin-error-area">
              {lockoutUntil ? (
                <span className="pin-error lockout">Locked for {lockoutSeconds}s</span>
              ) : error ? (
                <span className="pin-error">{error}</span>
              ) : null}
            </div>

            {/* Numpad */}
            <div className="pin-numpad">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
                if (key === '') return <div key={i} className="pin-key empty" />;
                if (key === '⌫') return (
                  <button
                    key={i}
                    className={`pin-key delete-key ${pressedKey === '⌫' ? 'pressed' : ''}`}
                    onClick={handleDelete}
                    disabled={!!lockoutUntil}
                  >
                    <Delete size={20} />
                  </button>
                );
                return (
                  <button
                    key={i}
                    className={`pin-key ${pressedKey === key ? 'pressed' : ''}`}
                    onClick={() => handleDigit(key)}
                    disabled={!!lockoutUntil}
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            {/* Keyboard hint */}
            <p className="pin-keyboard-hint">You can also type using your keyboard</p>
          </>
        ) : (
          <div className="pin-reset-form">
            <input
              type="text"
              placeholder="e.g. CLNV-8X4T-9P2Q"
              value={resetKey}
              onChange={e => { setResetKey(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleResetSubmit()}
              autoFocus
            />
            <div className="pin-error-area" style={{ minHeight: '1.5rem', marginBottom: '1rem', marginTop: '0.5rem' }}>
              {error && <span className="pin-error">{error}</span>}
            </div>
            <div className="pin-reset-actions">
              <button className="pin-skip-btn" onClick={() => { setStep('enter'); setError(''); setResetKey(''); }}>Cancel</button>
              <button className="pin-submit-btn" onClick={handleResetSubmit}>Reset PIN</button>
            </div>
          </div>
        )}

        {/* Skip option for setup */}
        {mode === 'setup' && onSkip && (
          <button className="pin-skip-btn" onClick={onSkip}>
            Skip for now
          </button>
        )}

        {/* Forgot PIN for verify */}
        {mode === 'verify' && step === 'enter' && (
          <button className="pin-skip-btn" onClick={() => { setStep('reset'); setError(''); setPin(''); }}>
            Forgot PIN?
          </button>
        )}

        <div className="pin-footer">
          <ShieldCheck size={14} />
          <span>PIN is stored securely on this device</span>
        </div>
      </div>

      <style>{`
        .shake { animation: shake 0.45s ease; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }

        .pin-dots { display: flex; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
        .pin-dot {
          width: 16px; height: 16px; border-radius: 50%; border: 2px solid #cbd5e1;
          background: transparent; transition: all 0.15s ease;
        }
        .pin-dot.filled { background: var(--primary); border-color: var(--primary); transform: scale(1.15); }
        .pin-dot.locked { border-color: #ef4444; }

        .pin-error-area { min-height: 1.5rem; margin-bottom: 1.5rem; text-align: center; }
        .pin-error { font-size: 0.8rem; color: #ef4444; font-weight: 500; }
        .pin-error.lockout { color: #dc2626; font-weight: 600; }

        .pin-numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        .pin-key {
          height: 60px; border-radius: 14px; border: 1.5px solid #e2e8f0; background: #f8fafc;
          font-size: 1.375rem; font-weight: 600; color: #1e293b; cursor: pointer;
          transition: all 0.12s ease; display: flex; align-items: center; justify-content: center;
        }
        .pin-key:hover:not(:disabled) { background: #e0f2fe; border-color: var(--primary); color: var(--primary); transform: translateY(-1px); }
        .pin-key:active:not(:disabled) { transform: scale(0.93); background: #dbeafe; }
        .pin-key:disabled { opacity: 0.4; cursor: not-allowed; }
        .pin-key.empty { background: transparent; border: none; pointer-events: none; }
        .pin-key.delete-key { color: #64748b; }
        .pin-key.pressed { background: #dbeafe; border-color: var(--primary); color: var(--primary); transform: scale(0.93); }

        .pin-keyboard-hint { font-size: 0.72rem; color: #cbd5e1; margin: -0.75rem 0 1rem; letter-spacing: 0.01em; text-align: center; }
        .pin-skip-btn {
          width: 100%; padding: 0.6rem; background: transparent; border: none; color: #94a3b8;
          font-size: 0.85rem; cursor: pointer; margin-bottom: 1rem; text-decoration: underline; text-underline-offset: 3px;
        }
        .pin-skip-btn:hover { color: #64748b; }
        .pin-footer {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem; color: #10b981;
          font-size: 0.75rem; font-weight: 500; border-top: 1px solid #f1f5f9; padding-top: 1.25rem;
        }

        .pin-reset-form input {
          width: 100%; padding: 0.85rem; border-radius: 12px; border: 1.5px solid #cbd5e1;
          font-size: 1rem; text-align: center; outline: none; transition: border-color 0.2s;
        }
        .pin-reset-form input:focus { border-color: var(--primary); }
        .pin-reset-actions { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
        .pin-reset-actions .pin-skip-btn { margin-bottom: 0; text-decoration: none; background: #f1f5f9; border-radius: 10px; color: #475569; }
        .pin-submit-btn { width: 100%; padding: 0.6rem; background: var(--primary); color: white; border: none; border-radius: 10px; font-size: 0.85rem; cursor: pointer; font-weight: 500; }
        .pin-submit-btn:hover { background: #0284c7; }
      `}</style>
    </div>
  );
};

export default PinLock;

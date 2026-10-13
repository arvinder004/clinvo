import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, ArrowLeft, KeyRound, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const STORAGE_KEYS = {
  PASSWORD_HASH: 'clinvo_superadmin_password_hash',
  SALT: 'clinvo_superadmin_salt',
  SESSION: 'clinvo_superadmin_session',
  FAILED_ATTEMPTS: 'clinvo_superadmin_failed_attempts',
  LOCKOUT_UNTIL: 'clinvo_superadmin_lockout_until',
};

// Initial default master password for the platform owner
export const DEFAULT_MASTER_PASSWORD = 'ClinvoAdmin#2026!';
export const DEFAULT_ADMIN_EMAIL = 'admin@clinvo.internal';

// Secure client-side SHA-256 with salt
export async function hashSuperAdminPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + 'CLINVO_SUPERADMIN_HMAC_PEPPER_2026');
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback hash
  let h = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return 'fallback_' + Math.abs(h).toString(16);
}

// Check if currently active session is valid
export function checkSuperAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionStr) return false;
    const session = JSON.parse(sessionStr);
    if (session && session.expiresAt && Date.now() < session.expiresAt) {
      return true;
    }
    // Expired
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return false;
  } catch {
    return false;
  }
}

// Clear session upon logout
export function clearSuperAdminSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export const SuperAdminLogin: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember24h, setRemember24h] = useState(true);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Check lockout on mount and interval
  useEffect(() => {
    const checkLockout = () => {
      const lockoutStr = localStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      if (lockoutStr) {
        const lockoutTime = parseInt(lockoutStr, 10);
        if (Date.now() < lockoutTime) {
          setIsLocked(true);
          setLockoutRemaining(Math.ceil((lockoutTime - Date.now()) / 1000));
        } else {
          setIsLocked(false);
          setLockoutRemaining(0);
          localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
          localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
        }
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Retrieve or initialize master password hash
      let storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
      let storedSalt = localStorage.getItem(STORAGE_KEYS.SALT);

      if (!storedHash || !storedSalt) {
        // Initialize default master credentials
        storedSalt = 'clinvo_salt_' + Date.now().toString(36);
        storedHash = await hashSuperAdminPassword(DEFAULT_MASTER_PASSWORD, storedSalt);
        localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, storedHash);
        localStorage.setItem(STORAGE_KEYS.SALT, storedSalt);
      }

      const inputHash = await hashSuperAdminPassword(password.trim(), storedSalt);

      if (inputHash === storedHash) {
        // Reset failed attempts
        localStorage.removeItem(STORAGE_KEYS.FAILED_ATTEMPTS);
        localStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);

        // Store active session token with expiry
        const durationMs = remember24h ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
        const session = {
          email: email.trim(),
          authenticatedAt: Date.now(),
          expiresAt: Date.now() + durationMs,
          role: 'SUPER_ADMIN',
        };
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));

        // Log audit activity
        // @ts-ignore
        if (typeof window !== 'undefined' && window.platformAdmin) {
          // @ts-ignore
          window.platformAdmin.logActivity({
            userName: email.trim() || 'Super Admin',
            userRole: 'SUPER_ADMIN',
            clinicName: 'Global Platform Control',
            action: 'Super Admin Login Verified',
            details: `Super Admin authenticated successfully via password gate (${remember24h ? '24h session' : '2h session'})`,
          });
        }

        onSuccess();
      } else {
        // Increment failed attempts
        const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, attempts.toString());

        if (attempts >= 5) {
          const lockoutTime = Date.now() + 5 * 60 * 1000; // 5 min lockout
          localStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, lockoutTime.toString());
          setIsLocked(true);
          setLockoutRemaining(300);
          setError('Too many failed attempts. Console locked for 5 minutes.');
        } else {
          setError(`Incorrect password. ${5 - attempts} attempt(s) remaining before lockout.`);
        }
        setPassword('');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Top back button */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#cbd5e1',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          backdropFilter: 'blur(8px)',
        }}
      >
        <ArrowLeft size={16} /> Return to Website Home
      </button>

      {/* Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(30, 41, 59, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Header Icon & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={34} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Platform Super Admin
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Restricted administrative console for platform management, clinic tenants, and GDPR compliance audits.
          </p>
        </div>

        {/* Lockout Warning */}
        {isLocked && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            <ShieldAlert size={20} />
            <div>
              <strong>Console Locked for Security:</strong> Try again in {lockoutRemaining} seconds.
            </div>
          </div>
        )}

        {/* Error message */}
        {error && !isLocked && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Super Admin Email / Account
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@clinvo.internal"
              disabled={isLocked}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Master Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter master admin password"
                disabled={isLocked}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem 0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember session checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={remember24h}
              onChange={(e) => setRemember24h(e.target.checked)}
              style={{ accentColor: '#3b82f6', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Keep session authenticated for 24 hours</span>
          </label>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLocked || isLoading}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '8px',
              background: isLocked ? '#475569' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.98rem',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: isLocked ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            <KeyRound size={18} />
            <span>{isLoading ? 'Verifying Credentials...' : 'Unlock Super Admin Console'}</span>
          </button>
        </form>

        {/* Initial Credentials Hint for Platform Owner */}
        <div
          style={{
            marginTop: '1.75rem',
            padding: '0.85rem 1rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#93c5fd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            <CheckCircle2 size={15} color="#60a5fa" />
            <span>Platform Owner Master Credentials</span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '0.78rem', lineHeight: 1.5 }}>
            Initial Password: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#93c5fd' }}>{DEFAULT_MASTER_PASSWORD}</code>
            <br />
            You can change this anytime inside the dashboard via <strong>Security & Password</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};

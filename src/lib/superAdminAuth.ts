// src/lib/superAdminAuth.ts
// Platform super admin authentication & session verification utilities

const STORAGE_KEYS = {
  PASSWORD_HASH: 'clinvo_superadmin_password_hash',
  SALT: 'clinvo_superadmin_salt',
  SESSION: 'clinvo_superadmin_session',
  FAILED_ATTEMPTS: 'clinvo_superadmin_failed_attempts',
  LOCKOUT_UNTIL: 'clinvo_superadmin_lockout_until',
};

export const DEFAULT_MASTER_PASSWORD = 'ClinvoAdmin#2026!';
export const DEFAULT_ADMIN_EMAIL = 'admin@clinvo.internal';

export async function hashSuperAdminPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + 'CLINVO_SUPERADMIN_HMAC_PEPPER_2026');
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let h = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return 'fallback_' + Math.abs(h).toString(16);
}

export function checkSuperAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const isValid = session.authenticated === true && session.expiresAt > Date.now();
    return isValid;
  } catch {
    return false;
  }
}

export function clearSuperAdminSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

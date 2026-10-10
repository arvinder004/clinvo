import { ipcMain } from 'electron';
import crypto from 'node:crypto';
import Store from 'electron-store';

const store = new Store();
const SECRET_SALT = import.meta.env.VITE_SECRET_SALT || '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function verifyLicenseKey(keyStr: string): { valid: boolean; expiry?: number } {
  try {
    if (!keyStr.startsWith('DOC-')) return { valid: false };
    const parts = keyStr.slice(4).split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signature] = parts;

    const hmac = crypto.createHmac('sha256', SECRET_SALT);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64url');
    if (signature !== expectedSignature) return { valid: false };

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp) return { valid: false };

    return { valid: true, expiry: payload.exp };
  } catch {
    return { valid: false };
  }
}

const hashDevPin = (pin: string): string =>
  crypto.createHash('sha256').update(pin + SECRET_SALT + 'DEV').digest('hex');

// ── License Handlers ──────────────────────────────────────────────────────────

export function registerLicensingHandlers(): void {
  ipcMain.handle('licensing-get-status', () => {
    const now = Date.now();

    const storedKey = store.get('license_key') as string | undefined;
    if (storedKey) {
      const check = verifyLicenseKey(storedKey);
      if (check.valid && check.expiry && check.expiry > now) {
        const daysLeft = Math.ceil((check.expiry - now) / (1000 * 60 * 60 * 24));
        return { status: 'ACTIVE', daysLeft, trialActive: false };
      }
    }

    // Fall back to trial
    let trialStart = store.get('trial_start') as number | undefined;
    if (!trialStart) {
      trialStart = now;
      store.set('trial_start', trialStart);
    }

    const trialExpiry = trialStart + 7 * 24 * 60 * 60 * 1000; // 7 days
    if (trialExpiry > now) {
      const daysLeft = Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24));
      return { status: 'TRIAL', daysLeft, trialActive: true };
    }

    return { status: 'EXPIRED', daysLeft: 0, trialActive: false };
  });

  ipcMain.handle('licensing-activate', (_, keyStr: string) => {
    const check = verifyLicenseKey(keyStr.trim());
    if (check.valid && check.expiry && check.expiry > Date.now()) {
      store.set('license_key', keyStr.trim());
      return { success: true };
    }
    return { success: false, error: 'Invalid or expired license key.' };
  });

  ipcMain.handle('licensing-verify-current-key', (_, keyStr: string) => {
    const storedKey = store.get('license_key') as string | undefined;
    if (!storedKey) return false;
    return keyStr.trim() === storedKey;
  });

  // ── Setup Wizard ────────────────────────────────────────────────────────────

  ipcMain.handle('setup-is-complete', () => !!store.get('setup_complete'));

  ipcMain.handle('setup-mark-complete', () => {
    store.set('setup_complete', true);
    return { success: true };
  });

  // ── PIN Lock ────────────────────────────────────────────────────────────────

  ipcMain.handle('pin-is-set', () => !!store.get('app_pin_hash'));

  ipcMain.handle('pin-set', (_, pin: string) => {
    const hash = crypto.createHash('sha256').update(pin + SECRET_SALT).digest('hex');
    store.set('app_pin_hash', hash);
    return { success: true };
  });

  ipcMain.handle('pin-verify', (_, pin: string) => {
    const stored = store.get('app_pin_hash') as string | undefined;
    if (!stored) return { success: true }; // no PIN set — allow through
    const hash = crypto.createHash('sha256').update(pin + SECRET_SALT).digest('hex');
    return { success: hash === stored };
  });

  ipcMain.handle('pin-reset', (_, recoveryKeyAttempt: string) => {
    const actualKey = store.get('recovery_key') as string | undefined;
    if (!actualKey || recoveryKeyAttempt.trim().toUpperCase() !== actualKey) {
      return { success: false, message: 'Invalid Recovery Key.' };
    }
    store.delete('app_pin_hash');
    return { success: true };
  });

  ipcMain.handle('pin-clear', () => {
    store.delete('app_pin_hash');
    return { success: true };
  });

  // ── Developer Mode PIN ──────────────────────────────────────────────────────

  ipcMain.handle('dev-pin-is-set', () => !!store.get('dev_pin_hash'));

  ipcMain.handle('dev-pin-set', (_, pin: string) => {
    store.set('dev_pin_hash', hashDevPin(pin));
    return { success: true };
  });

  ipcMain.handle('dev-pin-verify', (_, pin: string) => {
    const stored = store.get('dev_pin_hash') as string | undefined;
    if (!stored) return { success: false };
    return { success: hashDevPin(pin) === stored };
  });

  ipcMain.handle('dev-pin-reset', (_, recoveryKeyAttempt: string) => {
    const actualKey = store.get('recovery_key') as string | undefined;
    if (!actualKey || recoveryKeyAttempt.trim().toUpperCase() !== actualKey) {
      return { success: false, message: 'Invalid Recovery Key.' };
    }
    store.delete('dev_pin_hash');
    return { success: true };
  });

  ipcMain.handle('dev-pin-clear', () => {
    store.delete('dev_pin_hash');
    return { success: true };
  });
}

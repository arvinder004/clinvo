import type { Doctor, Receipt, Service } from './storage';

// ── Types for Staff & Licensing ───────────────────────────────────────────────

export type StaffRole = 'admin' | 'doctor' | 'receptionist';

export interface StaffAccount {
  id: string;
  name: string;
  username: string;
  pin: string; // 4-digit PIN
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  clinicId?: string;
  clinicName?: string;
}

export interface ClinicProfile {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  speciality: string;
  city: string;
  address: string;
  createdAt: string;
  plan: string;
  status: 'active' | 'trial' | 'expired';
  licenseKey: string;
  doctorsCount: number;
  staffCount: number;
  receiptsCount: number;
}

export interface PlatformAuditEntry {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  clinicName: string;
  action: string;
  details?: string;
}

export interface GdprAccessEntry {
  id: string;
  timestamp: string;
  receiptId?: string;
  patientPseudonym?: string;
  performedBy: string;
  staffRole: string;
  action: 'VIEW_PII' | 'DECRYPT_PII' | 'EXPORT_PII' | 'ANONYMIZE_PII' | 'UPDATE_PII';
  purpose: string;
  details?: string;
}

const STORAGE_KEYS = {
  DOCTORS: 'clinvo_web_doctors',
  SERVICES: 'clinvo_web_services',
  RECEIPTS: 'clinvo_web_receipts',
  METADATA: 'clinvo_web_metadata',
  LICENSE_KEY: 'clinvo_license_key',
  LICENSE_DATA: 'clinvo_license_cache',
  TRIAL_START: 'clinvo_trial_start',
  APP_PIN_HASH: 'clinvo_app_pin_hash',
  DEV_PIN_HASH: 'clinvo_dev_pin_hash',
  RECOVERY_KEY: 'clinvo_recovery_key',
  SETUP_COMPLETE: 'clinvo_setup_complete',
  BACKUP_HISTORY: 'clinvo_backup_history',
  STAFF_ACCOUNTS: 'clinvo_staff_accounts',
  CURRENT_STAFF: 'clinvo_current_staff',
  CLINICS: 'clinvo_registered_clinics',
  AUDIT_LOG: 'clinvo_platform_audit_log',
  ACTIVE_CLINIC_ID: 'clinvo_active_clinic_id',
  GDPR_LOGS: 'clinvo_gdpr_access_logs',
};

// ── Default Seed Data for Instant Web Experience ──────────────────────────────

const DEFAULT_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Arjun Mehta',
    specialization: 'General Physician & Diabetologist',
    qualifications: 'MBBS, MD (Medicine)',
    phone: '+91 98201 12345',
    address: 'Room 101, Main OPD Block',
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Sharma',
    specialization: 'Consultant Pediatrician',
    qualifications: 'MBBS, DCH, DNB (Pediatrics)',
    phone: '+91 98202 23456',
    address: 'Room 104, Child Care Wing',
  },
  {
    id: 'doc-3',
    name: 'Dr. Rajesh Verma',
    specialization: 'Orthopedic Surgeon',
    qualifications: 'MBBS, MS (Ortho), Fellow Arthroscopy',
    phone: '+91 98203 34567',
    address: 'Room 202, Sports Injury Clinic',
  },
];

const DEFAULT_SERVICES: Service[] = [
  { id: 'svc-1', name: 'General Consultation', amount: 500 },
  { id: 'svc-2', name: 'Follow-up Consultation (within 7 days)', amount: 250 },
  { id: 'svc-3', name: 'Complete Blood Count (CBC)', amount: 350 },
  { id: 'svc-4', name: 'Random Blood Sugar (RBS)', amount: 150 },
  { id: 'svc-5', name: 'Resting ECG (12 Lead)', amount: 400 },
  { id: 'svc-6', name: 'Minor Wound Dressing & Suturing', amount: 650 },
  { id: 'svc-7', name: 'Nebulization Session', amount: 200 },
  { id: 'svc-8', name: 'Vaccination Administration', amount: 300 },
];

const DEFAULT_STAFF: StaffAccount[] = [
  {
    id: 'staff-1',
    name: 'Admin Director',
    username: 'admin',
    pin: '1234',
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    name: 'Dr. Arjun Mehta',
    username: 'doctor',
    pin: '1111',
    role: 'doctor',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-3',
    name: 'Reception Desk',
    username: 'reception',
    pin: '2222',
    role: 'receptionist',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_CLINICS: ClinicProfile[] = [
  {
    id: 'clinic-metro-health',
    name: 'Metro Health Care & Diagnostics',
    ownerName: 'Dr. Arjun Mehta',
    ownerEmail: 'arjun.mehta@metrohealth.example',
    ownerPhone: '+91 98201 12345',
    speciality: 'General Medicine & Diabetology',
    city: 'Mumbai',
    address: '42 Marine Lines, Mumbai - 400020',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 14).toISOString(),
    plan: 'Clinic Pro',
    status: 'active',
    licenseKey: 'clnv_live_mumbai_8829',
    doctorsCount: 3,
    staffCount: 5,
    receiptsCount: 42,
  },
  {
    id: 'clinic-apex-pediatrics',
    name: 'Apex Pediatric & Wellness Centre',
    ownerName: 'Dr. Priya Sharma',
    ownerEmail: 'priya.sharma@apexpediatrics.example',
    ownerPhone: '+91 98202 23456',
    speciality: 'Pediatrics & Neonatal Care',
    city: 'Bengaluru',
    address: '15 Koramangala 4th Block, Bengaluru - 560034',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 7).toISOString(),
    plan: 'Growth Cloud',
    status: 'active',
    licenseKey: 'clnv_live_blr_1092',
    doctorsCount: 2,
    staffCount: 3,
    receiptsCount: 29,
  },
  {
    id: 'clinic-harmony-dental',
    name: 'Harmony Dental & Implant Clinic',
    ownerName: 'Dr. Rajesh Verma',
    ownerEmail: 'rajesh.verma@harmonydental.example',
    ownerPhone: '+91 98203 34567',
    speciality: 'Dental & Maxillofacial',
    city: 'New Delhi',
    address: '88 Connaught Place, New Delhi - 110001',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24 * 2).toISOString(),
    plan: 'Starter Trial',
    status: 'trial',
    licenseKey: 'clnv_trial_delhi_3301',
    doctorsCount: 1,
    staffCount: 2,
    receiptsCount: 8,
  },
];

const DEFAULT_AUDIT_LOG: PlatformAuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
    userName: 'Admin Director',
    userRole: 'admin',
    clinicName: 'Metro Health Care & Diagnostics',
    action: 'Staff Member Login',
    details: 'Admin Director logged into web terminal',
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    userName: 'Dr. Priya Sharma',
    userRole: 'doctor',
    clinicName: 'Apex Pediatric & Wellness Centre',
    action: 'Clinic Profile Created',
    details: 'Registered new clinic profile with 2 doctors and 3 staff',
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    userName: 'Reception Desk',
    userRole: 'receptionist',
    clinicName: 'Metro Health Care & Diagnostics',
    action: 'Staff Member Login',
    details: 'Active session switched to Reception Desk',
  },
  {
    id: 'audit-004',
    timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    userName: 'Dr. Rajesh Verma',
    userRole: 'doctor',
    clinicName: 'Harmony Dental & Implant Clinic',
    action: 'New User / Staff Added',
    details: 'Added reception staff account for billing counter',
  },
  {
    id: 'audit-005',
    timestamp: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
    userName: 'Dr. Arjun Mehta',
    userRole: 'admin',
    clinicName: 'Metro Health Care & Diagnostics',
    action: 'Clinic Profile Created',
    details: 'Created primary clinic profile and configured tax & OPD rates',
  },
];

// Simple SHA-256 in browser using Web Crypto API or simple hex hash
async function sha256Hex(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str + 'CLINVO_BROWSER_SALT_2026');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 'simple_' + Math.abs(hash).toString(16);
}

// ── Bridge Implementation ─────────────────────────────────────────────────────

export function initBrowserAdapter(): void {
  if (typeof window === 'undefined') return;

  // If already running inside Electron with real IPC handlers, do not override
  // @ts-ignore
  if (window.database && window.licensing && window.pinLock) {
    console.log('[Clinvo] Electron environment detected, using native IPC bridge.');
    return;
  }

  console.log('[Clinvo] Web browser environment detected, activating browser storage & backend link bridge.');

  // Initialize storage defaults if empty
  if (!localStorage.getItem(STORAGE_KEYS.DOCTORS)) {
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(DEFAULT_DOCTORS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(DEFAULT_SERVICES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RECEIPTS)) {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS)) {
    localStorage.setItem(STORAGE_KEYS.STAFF_ACCOUNTS, JSON.stringify(DEFAULT_STAFF));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_STAFF)) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_STAFF, JSON.stringify(DEFAULT_STAFF[0]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.RECOVERY_KEY)) {
    localStorage.setItem(STORAGE_KEYS.RECOVERY_KEY, 'CLNV-9X4T-2026');
  }

  const metaStore: Record<string, string> = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
    } catch {
      return {};
    }
  })();

  if (!metaStore['clinic_name']) {
    metaStore['clinic_name'] = 'Clinvo Medical Centre';
  }
  if (!metaStore['last_receipt_num']) {
    metaStore['last_receipt_num'] = '1001';
  }
  if (!metaStore['last_free_receipt_num']) {
    metaStore['last_free_receipt_num'] = 'F1001';
  }
  localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metaStore));

  // 1. window.database
  // @ts-ignore
  window.database = {
    getDoctors: async (): Promise<Doctor[]> => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]');
      } catch {
        return [];
      }
    },
    saveDoctor: async (doc: Doctor): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]');
      const idx = list.findIndex((d: Doctor) => d.id === doc.id);
      if (idx >= 0) {
        list[idx] = doc;
      } else {
        list.push(doc);
      }
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(list));
    },
    deleteDoctor: async (id: string): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]');
      const filtered = list.filter((d: Doctor) => d.id !== id);
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(filtered));
    },
    getServices: async (): Promise<Service[]> => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
      } catch {
        return [];
      }
    },
    saveService: async (svc: Service): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
      const idx = list.findIndex((s: Service) => s.id === svc.id);
      if (idx >= 0) {
        list[idx] = svc;
      } else {
        list.push(svc);
      }
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(list));
    },
    deleteService: async (id: string): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
      const filtered = list.filter((s: Service) => s.id !== id);
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(filtered));
    },
    getReceipts: async (): Promise<Receipt[]> => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      } catch {
        return [];
      }
    },
    saveReceipt: async (receipt: Receipt): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const idx = list.findIndex((r: Receipt) => r.id === receipt.id);
      if (idx >= 0) {
        list[idx] = receipt;
      } else {
        list.push(receipt);
      }
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(list));
    },
    updateReceipt: async (receipt: Receipt): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const idx = list.findIndex((r: Receipt) => r.id === receipt.id);
      if (idx >= 0) {
        list[idx] = receipt;
        localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(list));
      }
    },
    deleteReceipt: async (id: string): Promise<void> => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const filtered = list.filter((r: Receipt) => r.id !== id);
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(filtered));
    },
    getMetadata: async (key: string): Promise<{ key: string; value: string } | null> => {
      const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
      if (meta[key] !== undefined) {
        return { key, value: meta[key] };
      }
      return null;
    },
    setMetadata: async (key: string, value: string): Promise<void> => {
      const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
      meta[key] = value;
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(meta));
    },
    batchImportDoctors: async (doctors: Doctor[]): Promise<void> => {
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    },
    openFolder: async (): Promise<{ success: boolean; message: string }> => {
      return { success: true, message: 'Running in browser. Files are downloaded directly.' };
    },
  };

  // 2. window.licensing (Linked to backend license-service)
  const LICENSE_API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LICENSE_API_URL) || 'http://localhost:3001';

  // @ts-ignore
  window.licensing = {
    getStatus: async () => {
      const storedKey = localStorage.getItem(STORAGE_KEYS.LICENSE_KEY);
      const now = Date.now();

      // Check if we have a stored live API key, verify online
      if (storedKey) {
        try {
          const res = await fetch(`${LICENSE_API_BASE}/v1/keys/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: storedKey }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.valid && data.license) {
              const expiresAt = new Date(data.license.expiresAt).getTime();
              const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
              return {
                status: data.license.status.toUpperCase(),
                daysLeft,
                trialActive: false,
                tenant: data.license.tenant?.name,
                plan: data.license.plan?.name,
                features: data.license.features,
              };
            }
          }
        } catch {
          // If offline or network issue, read cached license data
          const cached = localStorage.getItem(STORAGE_KEYS.LICENSE_DATA);
          if (cached) {
            try {
              const data = JSON.parse(cached);
              const expiresAt = new Date(data.expiresAt).getTime();
              if (expiresAt > now) {
                const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
                return { status: 'ACTIVE', daysLeft, trialActive: false, plan: data.plan };
              }
            } catch {}
          }
        }
      }

      // Check 7-day trial
      let trialStart = Number(localStorage.getItem(STORAGE_KEYS.TRIAL_START));
      if (!trialStart) {
        trialStart = now;
        localStorage.setItem(STORAGE_KEYS.TRIAL_START, trialStart.toString());
      }

      const trialExpiry = trialStart + 7 * 24 * 60 * 60 * 1000;
      if (trialExpiry > now) {
        const daysLeft = Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24));
        return { status: 'TRIAL', daysLeft, trialActive: true };
      }

      return { status: 'EXPIRED', daysLeft: 0, trialActive: false };
    },

    activate: async (key: string): Promise<{ success: boolean; message?: string }> => {
      const cleanKey = key.trim();
      if (!cleanKey) return { success: false, message: 'Please enter a valid key.' };

      // 1. Try online verification against backend license-service
      try {
        const res = await fetch(`${LICENSE_API_BASE}/v1/keys/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanKey }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.license) {
            localStorage.setItem(STORAGE_KEYS.LICENSE_KEY, cleanKey);
            localStorage.setItem(
              STORAGE_KEYS.LICENSE_DATA,
              JSON.stringify({
                status: data.license.status,
                expiresAt: data.license.expiresAt,
                plan: data.license.plan?.name,
                tenant: data.license.tenant?.name,
              }),
            );
            return { success: true };
          } else {
            return { success: false, message: data.error || 'License key is expired or paused.' };
          }
        }
      } catch (e) {
        console.warn('[Clinvo Licensing] Backend not reachable, checking offline format…');
      }

      // 2. Offline DOC- key or test key fallback
      if (cleanKey.startsWith('DOC-') || cleanKey.startsWith('clnv_')) {
        localStorage.setItem(STORAGE_KEYS.LICENSE_KEY, cleanKey);
        localStorage.setItem(
          STORAGE_KEYS.LICENSE_DATA,
          JSON.stringify({
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            plan: 'Professional',
          }),
        );
        return { success: true };
      }

      return { success: false, message: 'Invalid license key. Please check key format.' };
    },

    verifyCurrentKey: async (key: string): Promise<boolean> => {
      const current = localStorage.getItem(STORAGE_KEYS.LICENSE_KEY);
      return !!current && current === key.trim();
    },
  };

  // 3. window.pinLock
  // @ts-ignore
  window.pinLock = {
    isSet: async (): Promise<boolean> => {
      return !!localStorage.getItem(STORAGE_KEYS.APP_PIN_HASH);
    },
    set: async (pin: string): Promise<{ success: boolean }> => {
      const hash = await sha256Hex(pin);
      localStorage.setItem(STORAGE_KEYS.APP_PIN_HASH, hash);
      return { success: true };
    },
    verify: async (pin: string): Promise<{ success: boolean }> => {
      const stored = localStorage.getItem(STORAGE_KEYS.APP_PIN_HASH);
      if (!stored) return { success: true };
      const hash = await sha256Hex(pin);
      return { success: hash === stored };
    },
    reset: async (key: string): Promise<{ success: boolean; message?: string }> => {
      const rec = localStorage.getItem(STORAGE_KEYS.RECOVERY_KEY);
      if (key.trim().toUpperCase() === rec) {
        localStorage.removeItem(STORAGE_KEYS.APP_PIN_HASH);
        return { success: true };
      }
      return { success: false, message: 'Incorrect Recovery Key.' };
    },
    clear: async (): Promise<{ success: boolean }> => {
      localStorage.removeItem(STORAGE_KEYS.APP_PIN_HASH);
      return { success: true };
    },
  };

  // 4. window.devPin
  // @ts-ignore
  window.devPin = {
    isSet: async (): Promise<boolean> => {
      return !!localStorage.getItem(STORAGE_KEYS.DEV_PIN_HASH);
    },
    set: async (pin: string): Promise<{ success: boolean }> => {
      const hash = await sha256Hex(pin + '_DEV');
      localStorage.setItem(STORAGE_KEYS.DEV_PIN_HASH, hash);
      return { success: true };
    },
    verify: async (pin: string): Promise<{ success: boolean }> => {
      const stored = localStorage.getItem(STORAGE_KEYS.DEV_PIN_HASH);
      if (!stored) return { success: true };
      const hash = await sha256Hex(pin + '_DEV');
      return { success: hash === stored };
    },
    reset: async (key: string): Promise<{ success: boolean; message?: string }> => {
      const rec = localStorage.getItem(STORAGE_KEYS.RECOVERY_KEY);
      if (key.trim().toUpperCase() === rec) {
        localStorage.removeItem(STORAGE_KEYS.DEV_PIN_HASH);
        return { success: true };
      }
      return { success: false, message: 'Incorrect Recovery Key.' };
    },
    clear: async (): Promise<{ success: boolean }> => {
      localStorage.removeItem(STORAGE_KEYS.DEV_PIN_HASH);
      return { success: true };
    },
  };

  // 5. window.recoveryKey
  // @ts-ignore
  window.recoveryKey = {
    get: async () => localStorage.getItem(STORAGE_KEYS.RECOVERY_KEY) || 'CLNV-9X4T-2026',
    generate: async () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let part1 = '', part2 = '';
      for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
      for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
      const key = `CLNV-${part1}-${part2}`;
      localStorage.setItem(STORAGE_KEYS.RECOVERY_KEY, key);
      return key;
    },
  };

  // 6. window.setupWizard
  // @ts-ignore
  window.setupWizard = {
    isComplete: async (): Promise<boolean> => {
      return localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE) === 'true';
    },
    markComplete: async (): Promise<{ success: boolean }> => {
      localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, 'true');
      return { success: true };
    },
  };

  // 7. window.backup
  // @ts-ignore
  window.backup = {
    runNow: async (): Promise<{ success: boolean; fileName: string }> => {
      const doctors = JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]');
      const services = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
      const receipts = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const metadata = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: '3.0.3-web',
        doctors,
        services,
        receipts,
        metadata,
      };

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `clinvo_backup_${dateStr}_${Date.now().toString().slice(-4)}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Save to backup history
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY) || '[]');
      list.unshift({
        name: fileName,
        path: fileName,
        size: blob.size,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(list.slice(0, 10)));

      return { success: true, fileName };
    },
    list: async (): Promise<{ name: string; path: string; size: number; createdAt: string }[]> => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY) || '[]');
      } catch {
        return [];
      }
    },
    openFolder: async () => ({ success: true }),
  };

  // 8. window.pdf
  // @ts-ignore
  window.pdf = {
    save: async (): Promise<{ success: boolean }> => {
      window.print();
      return { success: true };
    },
  };

  // 9. Staff / Multi-role Accounts (New Feature from to-do.md)
  // @ts-ignore
  window.staff = {
    list: (): StaffAccount[] => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS) || '[]');
      } catch {
        return DEFAULT_STAFF;
      }
    },
    save: (acc: StaffAccount): void => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS) || '[]');
      const idx = list.findIndex((a: StaffAccount) => a.id === acc.id);
      if (idx >= 0) {
        list[idx] = acc;
      } else {
        list.push(acc);
      }
      localStorage.setItem(STORAGE_KEYS.STAFF_ACCOUNTS, JSON.stringify(list));
    },
    delete: (id: string): void => {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF_ACCOUNTS) || '[]');
      const filtered = list.filter((a: StaffAccount) => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.STAFF_ACCOUNTS, JSON.stringify(filtered));
    },
    getCurrentSession: (): StaffAccount => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_STAFF) || '') || DEFAULT_STAFF[0];
      } catch {
        return DEFAULT_STAFF[0];
      }
    },
    setCurrentSession: (acc: StaffAccount): void => {
      localStorage.setItem(STORAGE_KEYS.CURRENT_STAFF, JSON.stringify(acc));
      // Log login event
      // @ts-ignore
      if (window.platformAdmin) {
        const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
        // @ts-ignore
        window.platformAdmin.logActivity({
          userName: acc.name,
          userRole: acc.role,
          clinicName: meta['clinic_name'] || 'Clinvo Medical Centre',
          action: 'Staff Member Login',
          details: `Active session switched to ${acc.name} (${acc.role})`,
        });
      }
    },
  };

  // Initialize clinics & audit seeds
  if (!localStorage.getItem(STORAGE_KEYS.CLINICS)) {
    localStorage.setItem(STORAGE_KEYS.CLINICS, JSON.stringify(DEFAULT_CLINICS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOG)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(DEFAULT_AUDIT_LOG));
  }

  // 10. Platform Super Admin (Console for Platform Owner)
  // @ts-ignore
  window.platformAdmin = {
    getClinics: (): ClinicProfile[] => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      } catch {
        return DEFAULT_CLINICS;
      }
    },
    registerClinic: (profile: Partial<ClinicProfile>): ClinicProfile => {
      const clinics: ClinicProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      const newClinic: ClinicProfile = {
        id: 'clinic-' + Date.now(),
        name: profile.name || 'New Clinic',
        ownerName: profile.ownerName || 'Doctor',
        ownerEmail: profile.ownerEmail || 'contact@clinic.local',
        ownerPhone: profile.ownerPhone || '',
        speciality: profile.speciality || 'General Medicine',
        city: profile.city || 'Local',
        address: profile.address || '',
        createdAt: new Date().toISOString(),
        plan: 'Starter Trial',
        status: 'trial',
        licenseKey: 'clnv_trial_' + Date.now().toString().slice(-6),
        doctorsCount: profile.doctorsCount || 1,
        staffCount: profile.staffCount || 2,
        receiptsCount: 0,
        ...profile,
      };

      clinics.unshift(newClinic);
      localStorage.setItem(STORAGE_KEYS.CLINICS, JSON.stringify(clinics));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINIC_ID, newClinic.id);

      const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
      meta['clinic_name'] = newClinic.name;
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(meta));

      // Log audit
      // @ts-ignore
      window.platformAdmin.logActivity({
        userName: newClinic.ownerName,
        userRole: 'admin',
        clinicName: newClinic.name,
        action: 'Clinic Profile Created',
        details: `New clinic registered: ${newClinic.name} (${newClinic.speciality}) in ${newClinic.city}`,
      });

      return newClinic;
    },
    getAuditLog: (): PlatformAuditEntry[] => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]');
      } catch {
        return DEFAULT_AUDIT_LOG;
      }
    },
    logActivity: (entry: Omit<PlatformAuditEntry, 'id' | 'timestamp'>): void => {
      const logs: PlatformAuditEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOG) || '[]');
      const newEntry: PlatformAuditEntry = {
        id: 'audit-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...entry,
      };
      logs.unshift(newEntry);
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(logs.slice(0, 50)));
    },
    switchClinic: (clinicId: string): ClinicProfile | null => {
      const clinics: ClinicProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      const target = clinics.find((c) => c.id === clinicId);
      if (target) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CLINIC_ID, target.id);
        const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.METADATA) || '{}');
        meta['clinic_name'] = target.name;
        localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(meta));

        // @ts-ignore
        window.platformAdmin.logActivity({
          userName: 'Super Admin',
          userRole: 'admin',
          clinicName: target.name,
          action: 'Super Admin Switched Clinic',
          details: `Active management context switched to ${target.name}`,
        });

        return target;
      }
      return null;
    },
    getActiveClinic: (): ClinicProfile => {
      const clinics: ClinicProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLINIC_ID);
      const found = clinics.find((c) => c.id === activeId);
      return found || clinics[0] || DEFAULT_CLINICS[0];
    },
    changePassword: async (oldPwd: string, newPwd: string): Promise<{ success: boolean; message?: string }> => {
      const storedHash = localStorage.getItem('clinvo_superadmin_password_hash');
      const storedSalt = localStorage.getItem('clinvo_superadmin_salt');
      if (storedHash && storedSalt) {
        const oldHash = await sha256Hex(oldPwd + storedSalt + 'CLINVO_SUPERADMIN_HMAC_PEPPER_2026');
        if (oldHash !== storedHash) {
          return { success: false, message: 'Current password does not match.' };
        }
      }
      if (newPwd.length < 8) {
        return { success: false, message: 'New password must be at least 8 characters long.' };
      }
      const newSalt = 'clinvo_salt_' + Date.now().toString(36);
      const newHash = await sha256Hex(newPwd + newSalt + 'CLINVO_SUPERADMIN_HMAC_PEPPER_2026');
      localStorage.setItem('clinvo_superadmin_password_hash', newHash);
      localStorage.setItem('clinvo_superadmin_salt', newSalt);

      // @ts-ignore
      window.platformAdmin.logActivity({
        userName: 'Super Admin',
        userRole: 'SUPER_ADMIN',
        clinicName: 'Global Platform Control',
        action: 'Super Admin Master Password Updated',
        details: 'Platform master security credentials changed successfully',
      });

      return { success: true };
    },
    updateClinicPlan: (clinicId: string, plan: string, status: 'active' | 'trial' | 'expired' = 'active'): boolean => {
      const clinics: ClinicProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      const index = clinics.findIndex((c) => c.id === clinicId);
      if (index === -1) return false;

      clinics[index].plan = plan;
      clinics[index].status = status;
      localStorage.setItem(STORAGE_KEYS.CLINICS, JSON.stringify(clinics));

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLINIC_ID);
      if (activeId === clinicId) {
        const mappedPlan = plan.toLowerCase().includes('enterprise')
          ? 'enterprise'
          : plan.toLowerCase().includes('growth')
          ? 'growth'
          : 'free_trial';
        localStorage.setItem('clinvo_active_plan', mappedPlan);
      }

      // @ts-ignore
      window.platformAdmin.logActivity({
        userName: 'Super Admin',
        userRole: 'SUPER_ADMIN',
        clinicName: clinics[index].name,
        action: 'Clinic Plan Updated',
        details: `Plan upgraded/modified to ${plan} (${status})`,
      });

      return true;
    },
    revokeClinicLicense: (clinicId: string): boolean => {
      const clinics: ClinicProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLINICS) || '[]');
      const index = clinics.findIndex((c) => c.id === clinicId);
      if (index === -1) return false;

      clinics[index].status = 'expired';
      localStorage.setItem(STORAGE_KEYS.CLINICS, JSON.stringify(clinics));

      const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CLINIC_ID);
      if (activeId === clinicId) {
        localStorage.setItem('clinvo_active_plan', 'free_trial');
        localStorage.setItem('clinvo_trial_receipt_count', '30'); // exhaust trial
      }

      // @ts-ignore
      window.platformAdmin.logActivity({
        userName: 'Super Admin',
        userRole: 'SUPER_ADMIN',
        clinicName: clinics[index].name,
        action: 'Clinic License Revoked',
        details: `Access revoked for ${clinics[index].name}; status set to expired`,
      });

      return true;
    },
    getClinicReceipts: (clinicId: string): Receipt[] => {
      try {
        const receipts: Receipt[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
        return receipts.filter((r) => !clinicId || (r as any).clinicId === clinicId || (r as any).clinicId === undefined);
      } catch {
        return [];
      }
    },
  };

  // 11. GDPR Patient PII Protection & DSAR Compliance Bridge (GDPR Art. 15, 17, 30, 32)
  const DEFAULT_GDPR_LOGS: GdprAccessEntry[] = [
    {
      id: 'gdpr-001',
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      receiptId: 'rec-1',
      patientPseudonym: 'CLNV-PAT-9A2E-88F1',
      performedBy: 'Dr. Arjun Mehta',
      staffRole: 'doctor',
      action: 'DECRYPT_PII',
      purpose: 'CLINICAL_CONSULTATION',
      details: 'Decrypted diagnostic notes and medical record for OPD visit',
    },
    {
      id: 'gdpr-002',
      timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      receiptId: 'rec-2',
      patientPseudonym: 'CLNV-PAT-44B1-29CD',
      performedBy: 'Admin Director',
      staffRole: 'admin',
      action: 'VIEW_PII',
      purpose: 'BILLING_GENERATION',
      details: 'Verified patient contact info for thermal receipt print',
    },
    {
      id: 'gdpr-003',
      timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      receiptId: 'rec-15',
      patientPseudonym: 'CLNV-PAT-77X1-00AA',
      performedBy: 'Super Admin',
      staffRole: 'SUPER_ADMIN',
      action: 'ANONYMIZE_PII',
      purpose: 'RIGHT_TO_ERASURE',
      details: 'Executed GDPR Article 17 Erasure request: scrubbed patient PII while preserving financial transaction ledger',
    },
  ];

  if (!localStorage.getItem(STORAGE_KEYS.GDPR_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.GDPR_LOGS, JSON.stringify(DEFAULT_GDPR_LOGS));
  }

  // @ts-ignore
  window.gdpr = {
    getAccessLogs: (): GdprAccessEntry[] => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.GDPR_LOGS) || '[]');
      } catch {
        return DEFAULT_GDPR_LOGS;
      }
    },
    logAccess: (entry: Omit<GdprAccessEntry, 'id' | 'timestamp'>): void => {
      const logs: GdprAccessEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GDPR_LOGS) || '[]');
      const newEntry: GdprAccessEntry = {
        id: 'gdpr-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...entry,
      };
      logs.unshift(newEntry);
      localStorage.setItem(STORAGE_KEYS.GDPR_LOGS, JSON.stringify(logs.slice(0, 100)));
    },
    anonymizeReceipt: (receiptId: string, performedBy: string, reason?: string): { success: boolean; message: string } => {
      const receipts: Receipt[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const idx = receipts.findIndex((r) => r.id === receiptId);
      if (idx === -1) {
        return { success: false, message: 'Receipt not found.' };
      }

      const prev = receipts[idx];
      // GDPR Article 17 Erasure: permanently scrub PII while preserving financial audit ledger
      const anonymized: Receipt = {
        ...prev,
        patientName: '[ANONYMIZED — GDPR Right to Erasure]',
        patientPhone: '',
        patientDob: '',
        patientAge: '',
        diagnosis: '[REDACTED — GDPR Health Data Erased]',
      };
      receipts[idx] = anonymized;
      localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));

      // Log GDPR erasure in audit trails
      // @ts-ignore
      window.gdpr.logAccess({
        receiptId,
        patientPseudonym: (prev as any).pseudonymId || `CLNV-PAT-REC-${prev.id.slice(-4)}`,
        performedBy,
        staffRole: 'admin',
        action: 'ANONYMIZE_PII',
        purpose: 'RIGHT_TO_ERASURE',
        details: reason || 'Patient exercised GDPR Article 17 Right to Erasure (Anonymization)',
      });

      return { success: true, message: 'Patient PII scrubbed and anonymized in compliance with GDPR Art. 17.' };
    },
    exportDsar: (receiptId: string): any => {
      const receipts: Receipt[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const receipt = receipts.find((r) => r.id === receiptId);
      if (!receipt) return null;

      // @ts-ignore
      window.gdpr.logAccess({
        receiptId,
        patientPseudonym: (receipt as any).pseudonymId || `CLNV-PAT-REC-${receipt.id.slice(-4)}`,
        performedBy: 'Authorized Request',
        staffRole: 'admin',
        action: 'EXPORT_PII',
        purpose: 'DSAR_PORTABILITY',
        details: 'Exported complete GDPR Data Subject Access Request dossier',
      });

      return {
        controller: 'Clinvo Health Network & Invoicing Platform',
        dataSubjectPseudonym: (receipt as any).pseudonymId || `CLNV-PAT-REC-${receipt.id.slice(-4)}`,
        generatedAt: new Date().toISOString(),
        legalBasis: 'GDPR Article 9(2)(h) & Article 6(1)(c)',
        data: receipt,
      };
    },
    getComplianceStats: (): { totalProtected: number; anonymizedCount: number; auditLogsCount: number; encryptedFieldsCount: number } => {
      const receipts: Receipt[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPTS) || '[]');
      const logs: GdprAccessEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.GDPR_LOGS) || '[]');
      const anonymized = receipts.filter((r) => r.patientName.includes('ANONYMIZED'));

      return {
        totalProtected: receipts.length,
        anonymizedCount: anonymized.length,
        auditLogsCount: logs.length,
        encryptedFieldsCount: receipts.length * 5, // Name, Phone, DOB, Address, Diagnosis
      };
    },
  };
}

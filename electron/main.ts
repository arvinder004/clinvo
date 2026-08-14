import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import Store from 'electron-store'
import crypto from 'node:crypto'
import { database } from './database'
import { shell } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

const require = createRequire(import.meta.url)
const { machineIdSync } = require('node-machine-id')
const Database = require('better-sqlite3')

// --- Data Migration (From AppData to Documents) ---
const oldDataDir = path.join(app.getPath('userData'), 'ClinicData')
const newDataDir = path.join(app.getPath('documents'), 'ClinvoData')
if (fs.existsSync(oldDataDir) && !fs.existsSync(newDataDir)) {
  try {
    fs.cpSync(oldDataDir, path.join(newDataDir, 'Database'), { recursive: true })
    const oldBackups = path.join(newDataDir, 'Database', 'Backups')
    if (fs.existsSync(oldBackups)) {
      fs.renameSync(oldBackups, path.join(newDataDir, 'Backups'))
    }
  } catch (err) {
    console.error('Failed to migrate data to Documents:', err)
  }
}

// Initialize Database
database.init(Database)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import { createClient } from '@supabase/supabase-js'
const SUPABASE_URL = 'https://pwiuzmjmzekthvnpxoht.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_007w9EecvzQX25VhkFZ62w_ZtU5aaEU'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const store = new Store()
const SECRET_SALT = 'CLINVO-OFFLINE-LICENSE-2024-X99'
// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ └── main.js
// │

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Built prefix
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

// Recovery Key Logic
ipcMain.handle('generate-recovery-key', () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let key = 'CLNV-'
  for (let i = 0; i < 4; i++) key += characters.charAt(Math.floor(Math.random() * characters.length))
  key += '-'
  for (let i = 0; i < 4; i++) key += characters.charAt(Math.floor(Math.random() * characters.length))
  store.set('recovery_key', key)
  return key
})

ipcMain.handle('get-recovery-key', () => {
  return store.get('recovery_key')
})


// SQLite Database IPCs
ipcMain.handle('db-get-doctors', () => database.getDoctors())
ipcMain.handle('db-save-doctor', (_, doctor) => database.saveDoctor(doctor))
ipcMain.handle('db-delete-doctor', (_, id) => database.deleteDoctor(id))

ipcMain.handle('db-get-services', () => database.getServices())
ipcMain.handle('db-save-service', (_, service) => database.saveService(service))
ipcMain.handle('db-delete-service', (_, id) => database.deleteService(id))

ipcMain.handle('db-get-receipts', () => database.getReceipts())
ipcMain.handle('db-save-receipt', (_, receipt) => database.saveReceipt(receipt))
ipcMain.handle('db-update-receipt', (_, receipt) => database.updateReceipt(receipt))
ipcMain.handle('db-delete-receipt', (_, id) => database.deleteReceipt(id))

ipcMain.handle('db-get-metadata', (_, key) => database.getMetadata(key))
ipcMain.handle('db-set-metadata', (_, key, value) => database.setMetadata(key, value))

ipcMain.handle('db-batch-import-doctors', (_, doctors) => database.batchImportDoctors(doctors))

ipcMain.handle('open-db-folder', () => {
  shell.showItemInFolder(database.getDbPath())
})

// ─── Licensing IPCs (Offline Cryptographic) ───────────────────────────────────

function verifyLicenseKey(keyStr: string) {
  try {
    if (!keyStr.startsWith('DOC-')) return { valid: false };
    const parts = keyStr.slice(4).split('.');
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signature] = parts;
    
    // Check signature
    const hmac = crypto.createHmac('sha256', SECRET_SALT);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64url');
    if (signature !== expectedSignature) return { valid: false };

    // Check payload
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);
    if (!payload.exp) return { valid: false };

    return { valid: true, expiry: payload.exp };
  } catch (err) {
    return { valid: false };
  }
}

ipcMain.handle('licensing-get-status', () => {
  const now = Date.now();
  
  // 1. Check if a valid license key is stored
  const storedKey = store.get('license_key') as string | undefined;
  if (storedKey) {
    const check = verifyLicenseKey(storedKey);
    if (check.valid && check.expiry && check.expiry > now) {
      const daysLeft = Math.ceil((check.expiry - now) / (1000 * 60 * 60 * 24));
      return { status: 'ACTIVE', daysLeft, trialActive: false };
    }
  }

  // 2. Fall back to Trial
  let trialStart = store.get('trial_start') as number | undefined;
  if (!trialStart) {
    trialStart = now;
    store.set('trial_start', trialStart);
  }

  const trialExpiry = trialStart + (7 * 24 * 60 * 60 * 1000); // 7 days
  if (trialExpiry > now) {
    const daysLeft = Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24));
    return { status: 'TRIAL', daysLeft, trialActive: true };
  }

  // 3. Expired
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

// ─── Setup Wizard IPCs ───────────────────────────────────────────────────────

ipcMain.handle('setup-is-complete', () => {
  return !!store.get('setup_complete')
})

ipcMain.handle('setup-mark-complete', () => {
  store.set('setup_complete', true)
  return { success: true }
})

// ─── PIN Lock IPCs ────────────────────────────────────────────────────────────

ipcMain.handle('pin-is-set', () => {
  return !!store.get('app_pin_hash')
})

ipcMain.handle('pin-set', (_, pin: string) => {
  const hash = crypto.createHash('sha256').update(pin + SECRET_SALT).digest('hex')
  store.set('app_pin_hash', hash)
  return { success: true }
})

ipcMain.handle('pin-verify', (_, pin: string) => {
  const stored = store.get('app_pin_hash') as string | undefined
  if (!stored) return { success: true } // no PIN set yet — allow through
  const hash = crypto.createHash('sha256').update(pin + SECRET_SALT).digest('hex')
  return { success: hash === stored }
})

ipcMain.handle('pin-reset', (_, recoveryKeyAttempt: string) => {
  const actualKey = store.get('recovery_key') as string | undefined
  if (!actualKey || recoveryKeyAttempt.trim().toUpperCase() !== actualKey) {
    return { success: false, message: 'Invalid Recovery Key.' }
  }
  store.delete('app_pin_hash')
  return { success: true }
})

ipcMain.handle('pin-clear', () => {
  store.delete('app_pin_hash')
  return { success: true }
})

// ─── Developer Mode PIN IPCs ──────────────────────────────────────────────────

const hashDevPin = (pin: string) =>
  crypto.createHash('sha256').update(pin + SECRET_SALT + 'DEV').digest('hex')

ipcMain.handle('dev-pin-is-set', () => {
  return !!store.get('dev_pin_hash')
})

ipcMain.handle('dev-pin-set', (_, pin: string) => {
  store.set('dev_pin_hash', hashDevPin(pin))
  return { success: true }
})

ipcMain.handle('dev-pin-verify', (_, pin: string) => {
  const stored = store.get('dev_pin_hash') as string | undefined
  if (!stored) return { success: false }
  return { success: hashDevPin(pin) === stored }
})

ipcMain.handle('dev-pin-reset', (_, recoveryKeyAttempt: string) => {
  const actualKey = store.get('recovery_key') as string | undefined
  if (!actualKey || recoveryKeyAttempt.trim().toUpperCase() !== actualKey) {
    return { success: false, message: 'Invalid Recovery Key.' }
  }
  store.delete('dev_pin_hash')
  return { success: true }
})

ipcMain.handle('dev-pin-clear', () => {
  store.delete('dev_pin_hash')
  return { success: true }
})

// ─── Auto Daily Backup ────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(app.getPath('documents'), 'ClinvoData', 'Backups')
const MAX_BACKUPS = 7 // keep last 7 daily backups

const runDailyBackup = () => {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const backupFile = path.join(BACKUP_DIR, `backup_${today}.json`)

    // Only create one backup per day
    if (fs.existsSync(backupFile)) {
      console.log('Daily backup already exists for today:', today)
      return
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const doctors = database.getDoctors()
    const services = database.getServices()
    const receipts = database.getReceipts()

    const backupData = {
      exportedAt: new Date().toISOString(),
      version: app.getVersion(),
      doctors,
      services,
      receipts,
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8')
    console.log('Daily backup created:', backupFile)

    // Prune old backups — keep only the latest MAX_BACKUPS
    const allBackups = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort() // sorts lexicographically; YYYY-MM-DD format sorts correctly

    if (allBackups.length > MAX_BACKUPS) {
      const toDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS)
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, file))
        console.log('Pruned old backup:', file)
      }
    }
  } catch (err) {
    console.error('Daily backup failed:', err)
  }
}

ipcMain.handle('backup-run-now', () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `backup_manual_${timestamp}.json`)

    const backupData = {
      exportedAt: new Date().toISOString(),
      version: app.getVersion(),
      doctors: database.getDoctors(),
      services: database.getServices(),
      receipts: database.getReceipts(),
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8')
    return { success: true, path: backupFile }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('backup-list', () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return []
    return fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
        createdAt: fs.statSync(path.join(BACKUP_DIR, f)).birthtime.toISOString(),
      }))
  } catch {
    return []
  }
})

ipcMain.handle('backup-open-folder', () => {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
  shell.openPath(BACKUP_DIR)
})

// ─── PDF Export ───────────────────────────────────────────────────────────────

ipcMain.handle('save-pdf', async (event) => {
  const { dialog } = await import('electron')
  const defaultReceiptsDir = path.join(app.getPath('documents'), 'ClinvoData', 'Receipts')
  if (!fs.existsSync(defaultReceiptsDir)) {
    fs.mkdirSync(defaultReceiptsDir, { recursive: true })
  }

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Receipt as PDF',
    defaultPath: path.join(defaultReceiptsDir, `receipt_${new Date().toISOString().slice(0,10)}.pdf`),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { success: false }

  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { success: false, error: 'No window' }

  try {
    // Show print-only elements and hide screen elements before capture
    await win.webContents.executeJavaScript(`
      document.body.classList.add('pdf-capture');
      void 0;
    `)

    // Small delay for React to re-render with the new class applied
    await new Promise(r => setTimeout(r, 100))

    const data = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
    })

    // Restore normal view
    await win.webContents.executeJavaScript(`
      document.body.classList.remove('pdf-capture');
      void 0;
    `)

    fs.writeFileSync(filePath, data)
    shell.showItemInFolder(filePath)
    return { success: true, filePath }
  } catch (err: any) {
    // Always restore on error
    try {
      await win.webContents.executeJavaScript(`
        document.body.classList.remove('pdf-capture');
        void 0;
      `)
    } catch {}
    return { success: false, error: err.message }
  }
})

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Clinvo Clinic Management',
    icon: path.join(process.env.VITE_PUBLIC || RENDERER_DIST, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date()).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  
  // Run daily backup after window is ready and DB is initialized
  setTimeout(runDailyBackup, 3000)

  // Check for updates and notify the user using system notifications
  autoUpdater.checkForUpdatesAndNotify()
})

// Automatically install the update when downloaded
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})


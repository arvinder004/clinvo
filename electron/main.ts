import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import Store from 'electron-store'
import crypto from 'node:crypto'
import { excelStorage } from './excelStorage'
import { database } from './database'
import { shell } from 'electron'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

const require = createRequire(import.meta.url)
const { machineIdSync } = require('node-machine-id')
const Database = require('better-sqlite3')

// Initialize Database
database.init(Database)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

// Licensing Logic
const getMachineID = () => {
  try {
    return machineIdSync()
  } catch (error) {
    console.error('Failed to get machine ID:', error)
    return 'UNKNOWN-DEVICE'
  }
}

// Full Key Format: YYYYMMDD-XXXX-XXXX-XXXX-XXXX
const generateDateBoundKey = (id: string, dateStr: string) => {
  const hash = crypto.createHash('sha256').update(id + dateStr + SECRET_SALT).digest('hex').toUpperCase()
  return `${dateStr}-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`
}

ipcMain.handle('get-machine-id', () => getMachineID())

ipcMain.handle('check-activation', () => {
  const savedKey = store.get('license_key') as string
  if (!savedKey) return { status: 'NOT_ACTIVATED' }

  const parts = savedKey.split('-')
  const dateStr = parts[0]
  
  if (!dateStr || dateStr.length !== 8) return { status: 'NOT_ACTIVATED' }

  const expectedKey = generateDateBoundKey(getMachineID(), dateStr)
  if (savedKey !== expectedKey) return { status: 'INVALID' }

  // Expiry check
  const expiryDate = new Date(
    parseInt(dateStr.substring(0, 4)),
    parseInt(dateStr.substring(4, 6)) - 1,
    parseInt(dateStr.substring(6, 8)),
    23, 59, 59
  )
  
  const now = new Date()
  
  // Anti-tampering check
  const lastSeenStr = store.get('last_seen_date') as string
  if (lastSeenStr) {
    const lastSeen = new Date(lastSeenStr)
    // If current time is more than 24 hours BEFORE last seen, suspect tampering
    // (We allow small drifts but not major clock resets)
    if (now < new Date(lastSeen.getTime() - 1000 * 60 * 60)) {
      return { status: 'TAMPERED', message: 'System clock has been manipulated.' }
    }
  }
  
  if (now > expiryDate) {
    return { status: 'EXPIRED', expiryDate: expiryDate.toLocaleDateString() }
  }

  // Update last seen to current time
  store.set('last_seen_date', now.toISOString())

  const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return { status: 'ACTIVATED', daysLeft, expiryDate: expiryDate.toLocaleDateString() }
})

ipcMain.handle('activate-license', (_, fullKey: string) => {
  const cleanKey = fullKey.trim().toUpperCase()
  const parts = cleanKey.split('-')
  const dateStr = parts[0]

  if (!dateStr || dateStr.length !== 8) {
    return { success: false, message: 'Invalid License Format' }
  }

  const expectedKey = generateDateBoundKey(getMachineID(), dateStr)
  if (cleanKey === expectedKey) {
    store.set('license_key', cleanKey)
    store.set('last_seen_date', new Date().toISOString())
    return { success: true }
  }
  return { success: false, message: 'Invalid License Key' }
})

// For original developer to generate keys
ipcMain.handle('dev-generate-key', (_, mid: string, dateStr: string) => {
  return generateDateBoundKey(mid, dateStr)
})

// Excel Storage IPCs
ipcMain.handle('save-to-excel', (_, data) => {
  return excelStorage.saveData(data)
})

ipcMain.handle('load-from-excel', () => {
  return excelStorage.loadData()
})

ipcMain.handle('open-excel-file', () => {
  shell.openPath(excelStorage.getExcelPath())
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

ipcMain.handle('pin-clear', () => {
  store.delete('app_pin_hash')
  return { success: true }
})

// ─── Developer Mode PIN IPCs ──────────────────────────────────────────────────

// Default PIN — always works regardless of user-set PIN
const DEFAULT_DEV_PIN = '7749'

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
  // Default PIN always works
  if (pin === DEFAULT_DEV_PIN) return { success: true }
  const stored = store.get('dev_pin_hash') as string | undefined
  if (!stored) return { success: false }
  return { success: hashDevPin(pin) === stored }
})

// Reset user PIN after verifying the default PIN
ipcMain.handle('dev-pin-reset', (_, defaultPinAttempt: string) => {
  if (defaultPinAttempt !== DEFAULT_DEV_PIN) {
    return { success: false, message: 'Incorrect default PIN.' }
  }
  store.delete('dev_pin_hash')
  return { success: true }
})

ipcMain.handle('dev-pin-clear', () => {
  store.delete('dev_pin_hash')
  return { success: true }
})

// ─── Auto Daily Backup ────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(app.getPath('userData'), 'ClinicData', 'Backups')
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
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Save Receipt as PDF',
    defaultPath: `receipt_${new Date().toISOString().slice(0,10)}.pdf`,
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
      marginsType: 0,
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


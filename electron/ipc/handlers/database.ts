import { ipcMain, app, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { database } from '../../database/index';

const BACKUP_DIR = path.join(app.getPath('documents'), 'ClinvoData', 'Backups');
const MAX_BACKUPS = 7; // keep last 7 daily backups

// ── SQLite CRUD ───────────────────────────────────────────────────────────────

export function registerDatabaseHandlers(): void {
  // Doctors
  ipcMain.handle('db-get-doctors', () => database.getDoctors());
  ipcMain.handle('db-save-doctor', (_, doctor) => database.saveDoctor(doctor));
  ipcMain.handle('db-delete-doctor', (_, id) => database.deleteDoctor(id));

  // Services
  ipcMain.handle('db-get-services', () => database.getServices());
  ipcMain.handle('db-save-service', (_, service) => database.saveService(service));
  ipcMain.handle('db-delete-service', (_, id) => database.deleteService(id));

  // Receipts
  ipcMain.handle('db-get-receipts', () => database.getReceipts());
  ipcMain.handle('db-save-receipt', (_, receipt) => database.saveReceipt(receipt));
  ipcMain.handle('db-update-receipt', (_, receipt) => database.updateReceipt(receipt));
  ipcMain.handle('db-delete-receipt', (_, id) => database.deleteReceipt(id));

  // Metadata
  ipcMain.handle('db-get-metadata', (_, key) => database.getMetadata(key));
  ipcMain.handle('db-set-metadata', (_, key, value) => database.setMetadata(key, value));

  // Batch operations
  ipcMain.handle('db-batch-import-doctors', (_, doctors) => database.batchImportDoctors(doctors));

  // ── Backup ────────────────────────────────────────────────────────────────

  ipcMain.handle('backup-run-now', () => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_DIR, `backup_manual_${timestamp}.json`);

      const backupData = {
        exportedAt: new Date().toISOString(),
        version: app.getVersion(),
        doctors: database.getDoctors(),
        services: database.getServices(),
        receipts: database.getReceipts(),
      };

      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
      return { success: true, path: backupFile };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup-list', () => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) return [];
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
        }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('backup-open-folder', () => {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    shell.openPath(BACKUP_DIR);
  });
}

// ── Daily Auto-Backup (called on app startup, not via IPC) ───────────────────

export function runDailyBackup(): void {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupFile = path.join(BACKUP_DIR, `backup_${today}.json`);

    if (fs.existsSync(backupFile)) {
      console.log('[backup] Daily backup already exists for today:', today);
      return;
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const backupData = {
      exportedAt: new Date().toISOString(),
      version: app.getVersion(),
      doctors: database.getDoctors(),
      services: database.getServices(),
      receipts: database.getReceipts(),
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log('[backup] Daily backup created:', backupFile);

    // Prune old backups — keep only the latest MAX_BACKUPS
    const allBackups = fs
      .readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .sort(); // YYYY-MM-DD sorts lexicographically

    if (allBackups.length > MAX_BACKUPS) {
      const toDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        console.log('[backup] Pruned old backup:', file);
      }
    }
  } catch (err) {
    console.error('[backup] Daily backup failed:', err);
  }
}

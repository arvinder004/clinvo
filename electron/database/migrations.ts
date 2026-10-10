import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

/**
 * Migrate clinic data from the legacy AppData location (userData/ClinicData)
 * to the user-friendly Documents location (documents/ClinvoData).
 *
 * This runs once before the database is initialized. It is safe to call on
 * every startup — it no-ops if the source doesn't exist or migration already
 * happened.
 */
export function runDataMigration(): void {
  const oldDataDir = path.join(app.getPath('userData'), 'ClinicData');
  const newDataDir = path.join(app.getPath('documents'), 'ClinvoData');

  if (!fs.existsSync(oldDataDir) || fs.existsSync(newDataDir)) {
    return; // nothing to migrate
  }

  try {
    fs.cpSync(oldDataDir, path.join(newDataDir, 'Database'), { recursive: true });

    const oldBackups = path.join(newDataDir, 'Database', 'Backups');
    if (fs.existsSync(oldBackups)) {
      fs.renameSync(oldBackups, path.join(newDataDir, 'Backups'));
    }

    console.log('[migration] Data migrated from AppData to Documents successfully.');
  } catch (err) {
    console.error('[migration] Failed to migrate data to Documents:', err);
  }
}

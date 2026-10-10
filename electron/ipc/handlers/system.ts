import { ipcMain, shell } from 'electron';
import Store from 'electron-store';
import { database } from '../../database/index';

const store = new Store();

export function registerSystemHandlers(): void {
  // ── Recovery Key ────────────────────────────────────────────────────────────

  ipcMain.handle('generate-recovery-key', () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let key = 'CLNV-';
    for (let i = 0; i < 4; i++) key += characters.charAt(Math.floor(Math.random() * characters.length));
    key += '-';
    for (let i = 0; i < 4; i++) key += characters.charAt(Math.floor(Math.random() * characters.length));
    store.set('recovery_key', key);
    return key;
  });

  ipcMain.handle('get-recovery-key', () => store.get('recovery_key'));

  // ── File System ─────────────────────────────────────────────────────────────

  ipcMain.handle('open-db-folder', () => {
    shell.showItemInFolder(database.getDbPath());
  });
}

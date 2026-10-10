/// <reference types="vite/client" />
import { app, BrowserWindow, session, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

import { runDataMigration } from './database/migrations';
import { database } from './database/index';
import { registerAllHandlers } from './ipc/index';
import { runDailyBackup } from './ipc/handlers/database';
import { initAutoUpdater } from './services/updater';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Path Constants ────────────────────────────────────────────────────────────

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// ── HiDPI Fix (Windows — must run before app is ready) ───────────────────────

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('high-dpi-support', '1');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
}

// ── Single Instance Lock ──────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ── Global Error Catchers ─────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// ── Early Init (before window) ────────────────────────────────────────────────

runDataMigration();
database.init(Database);
registerAllHandlers();

// ── Window ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(900, height),
    show: false, // prevent white flash on startup
    title: 'Clinvo Clinic Management',
    icon: path.join(process.env.VITE_PUBLIC || RENDERER_DIST, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Show only when fully rendered — eliminates white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // ── Navigation Guard ────────────────────────────────────────────────────────
  // Block the renderer from navigating away from the local app origin.

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    const isDevServer = VITE_DEV_SERVER_URL && navigationUrl.startsWith(VITE_DEV_SERVER_URL);
    const isFileProtocol = parsed.protocol === 'file:';

    if (!isDevServer && !isFileProtocol) {
      event.preventDefault();
      // Safe external links go to the system browser instead
      if (['https:', 'http:'].includes(parsed.protocol)) {
        shell.openExternal(navigationUrl);
      }
    }
  });

  // ── Window Open Policy ──────────────────────────────────────────────────────
  // Deny all renderer-initiated window.open() calls; safe links open externally.

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['https:', 'http:', 'mailto:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch { /* malformed URL — drop it */ }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.on('second-instance', () => {
  // Focus the existing window when a second instance is attempted
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // ── Content Security Policy ─────────────────────────────────────────────────
  // Applied in production only. Dev mode requires looser rules for Vite HMR.

  if (!VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", // inline styles required by most React UI libs
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          ],
        },
      });
    });
  }

  createWindow();

  // Trigger daily backup 3 s after startup to avoid blocking initial render
  setTimeout(runDailyBackup, 3000);

  initAutoUpdater();
});

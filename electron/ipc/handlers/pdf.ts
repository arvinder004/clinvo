import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export function registerPdfHandlers(): void {
  ipcMain.handle('save-pdf', async (event) => {
    const defaultReceiptsDir = path.join(app.getPath('documents'), 'ClinvoData', 'Receipts');
    if (!fs.existsSync(defaultReceiptsDir)) {
      fs.mkdirSync(defaultReceiptsDir, { recursive: true });
    }

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Receipt as PDF',
      defaultPath: path.join(
        defaultReceiptsDir,
        `receipt_${new Date().toISOString().slice(0, 10)}.pdf`
      ),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) return { success: false };

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No window' };

    try {
      // Activate print-only layout in renderer before capture
      await win.webContents.executeJavaScript(`
        document.body.classList.add('pdf-capture');
        void 0;
      `);

      // Small delay for React to re-render with the new class
      await new Promise(r => setTimeout(r, 100));

      const data = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' },
      });

      // Restore normal view
      await win.webContents.executeJavaScript(`
        document.body.classList.remove('pdf-capture');
        void 0;
      `);

      fs.writeFileSync(filePath, data);
      shell.showItemInFolder(filePath);
      return { success: true, filePath };
    } catch (err: any) {
      // Always restore on error
      try {
        await win.webContents.executeJavaScript(`
          document.body.classList.remove('pdf-capture');
          void 0;
        `);
      } catch { /* ignore cleanup error */ }
      return { success: false, error: err.message };
    }
  });
}

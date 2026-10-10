import { registerDatabaseHandlers } from './handlers/database';
import { registerLicensingHandlers } from './handlers/licensing';
import { registerSystemHandlers } from './handlers/system';
import { registerPdfHandlers } from './handlers/pdf';

/**
 * Register all IPC handlers with the main process.
 * Call this once during app.whenReady(), before the window is created.
 */
export function registerAllHandlers(): void {
  registerDatabaseHandlers();
  registerLicensingHandlers();
  registerSystemHandlers();
  registerPdfHandlers();
}

import pkg from 'electron-updater';
const { autoUpdater } = pkg;

/**
 * Configure and kick off the auto-updater.
 * Automatically installs the update when the download completes.
 */
export function initAutoUpdater(): void {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
}

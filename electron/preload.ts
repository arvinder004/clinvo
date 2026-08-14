import { ipcRenderer, contextBridge } from 'electron'

// Removed raw ipcRenderer exposure for security (enforcing strict contextIsolation)

contextBridge.exposeInMainWorld('recoveryKey', {
  get: () => ipcRenderer.invoke('get-recovery-key'),
  generate: () => ipcRenderer.invoke('generate-recovery-key'),
})

contextBridge.exposeInMainWorld('licensing', {
  getStatus: () => ipcRenderer.invoke('licensing-get-status'),
  activate: (key: string) => ipcRenderer.invoke('licensing-activate', key),
  verifyCurrentKey: (key: string) => ipcRenderer.invoke('licensing-verify-current-key', key),
})

contextBridge.exposeInMainWorld('database', {
  getDoctors: () => ipcRenderer.invoke('db-get-doctors'),
  saveDoctor: (doctor: any) => ipcRenderer.invoke('db-save-doctor', doctor),
  deleteDoctor: (id: string) => ipcRenderer.invoke('db-delete-doctor', id),
  getServices: () => ipcRenderer.invoke('db-get-services'),
  saveService: (service: any) => ipcRenderer.invoke('db-save-service', service),
  deleteService: (id: string) => ipcRenderer.invoke('db-delete-service', id),
  getReceipts: () => ipcRenderer.invoke('db-get-receipts'),
  saveReceipt: (receipt: any) => ipcRenderer.invoke('db-save-receipt', receipt),
  updateReceipt: (receipt: any) => ipcRenderer.invoke('db-update-receipt', receipt),
  deleteReceipt: (id: string) => ipcRenderer.invoke('db-delete-receipt', id),
  getMetadata: (key: string) => ipcRenderer.invoke('db-get-metadata', key),
  setMetadata: (key: string, value: string) => ipcRenderer.invoke('db-set-metadata', key, value),
  batchImportDoctors: (doctors: any[]) => ipcRenderer.invoke('db-batch-import-doctors', doctors),
  openFolder: () => ipcRenderer.invoke('open-db-folder'),
})

contextBridge.exposeInMainWorld('pinLock', {
  isSet: () => ipcRenderer.invoke('pin-is-set'),
  set: (pin: string) => ipcRenderer.invoke('pin-set', pin),
  verify: (pin: string) => ipcRenderer.invoke('pin-verify', pin),
  reset: (key: string) => ipcRenderer.invoke('pin-reset', key),
  clear: () => ipcRenderer.invoke('pin-clear'),
})

contextBridge.exposeInMainWorld('devPin', {
  isSet: () => ipcRenderer.invoke('dev-pin-is-set'),
  set: (pin: string) => ipcRenderer.invoke('dev-pin-set', pin),
  verify: (pin: string) => ipcRenderer.invoke('dev-pin-verify', pin),
  reset: (defaultPin: string) => ipcRenderer.invoke('dev-pin-reset', defaultPin),
  clear: () => ipcRenderer.invoke('dev-pin-clear'),
})

contextBridge.exposeInMainWorld('setupWizard', {
  isComplete: () => ipcRenderer.invoke('setup-is-complete'),
  markComplete: () => ipcRenderer.invoke('setup-mark-complete'),
})

contextBridge.exposeInMainWorld('backup', {
  runNow: () => ipcRenderer.invoke('backup-run-now'),
  list: () => ipcRenderer.invoke('backup-list'),
  openFolder: () => ipcRenderer.invoke('backup-open-folder'),
})

contextBridge.exposeInMainWorld('pdf', {
  save: () => ipcRenderer.invoke('save-pdf'),
})


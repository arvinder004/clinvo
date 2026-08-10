import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, Users, Receipt, PlusCircle, Settings, ShieldCheck, Copy, DownloadCloud, UploadCloud, FileText, Activity, Briefcase, FolderOpen, KeyRound, HardDrive, RotateCcw, Lock, Timer, Code2 } from 'lucide-react';

import { storage, type Doctor, type Receipt as ReceiptType, type Service } from './lib/storage';
import HistoryPage from './components/HistoryPage';
import ReceiptPrint from './components/ReceiptPrint';
import './index.css';

// Components
import Dashboard from './components/Dashboard';
import DoctorManagement from './components/DoctorManagement';
import ServiceManagement from './components/ServiceManagement';
import ReceiptForm from './components/ReceiptForm';
import ActivationScreen from './components/ActivationScreen';
import PinLock from './components/PinLock';
import SetupWizard from './components/SetupWizard';

type Tab = 'dashboard' | 'doctors' | 'services' | 'new-receipt' | 'history' | 'settings';

// ── Developer Login Modal ─────────────────────────────────────────────────────
const DevLoginModal: React.FC<{ onSuccess: () => void; onClose: () => void }> = ({ onSuccess, onClose }) => {
  const [view, setView] = useState<'login' | 'reset' | 'reset-success'>('login');
  const [pin, setPin] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [error, setError] = useState('');

  // On mount — if no dev PIN has ever been set, skip straight into developer mode
  useEffect(() => {
    (async () => {
      // @ts-ignore
      const isSet = await window.devPin.isSet();
      if (!isSet) onSuccess();
    })();
  }, []);

  const handleLogin = async () => {
    // @ts-ignore
    const result = await window.devPin.verify(pin);
    if (result.success) { onSuccess(); }
    else { setError('Incorrect PIN. Try again or use the Forgot PIN option below.'); setPin(''); }
  };

  const handleReset = async () => {
    // @ts-ignore
    const result = await window.devPin.reset(resetPin);
    if (result.success) { setView('reset-success'); setResetPin(''); setError(''); }
    else { setError('Incorrect default PIN. Contact Clinvo Support for assistance.'); setResetPin(''); }
  };

  return (
    <div className="dev-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dev-modal">

        {view === 'login' && (<>
          <h3>Developer Access</h3>
          <p>Enter your 4-digit Developer PIN to unlock developer mode.</p>
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="••••"
            value={pin} autoFocus
            onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="dev-error">{error}</p>}
          <div className="dev-modal-actions">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleLogin}>Unlock</button>
          </div>
          <button className="dev-forgot-link" onClick={() => { setView('reset'); setPin(''); setError(''); }}>
            Forgot PIN?
          </button>
        </>)}

        {view === 'reset' && (<>
          <h3>Reset Developer PIN</h3>
          <p>Enter the default Clinvo PIN to reset your developer PIN. If you don't have it, contact Clinvo Support.</p>
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="Default PIN"
            value={resetPin} autoFocus
            onChange={e => { setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleReset()}
          />
          {error && <p className="dev-error">{error}</p>}
          <div className="dev-modal-actions">
            <button className="btn-ghost" onClick={() => { setView('login'); setResetPin(''); setError(''); }}>Back</button>
            <button className="btn-primary" onClick={handleReset}>Reset PIN</button>
          </div>
          <p className="dev-support-note">Need help? Contact Clinvo Support at <strong>support@clinvo.com</strong></p>
        </>)}

        {view === 'reset-success' && (<>
          <h3>PIN Reset Successful</h3>
          <p>Your developer PIN has been cleared. You can now set a new one from the setup wizard or Control Center.</p>
          <div className="dev-modal-actions" style={{ justifyContent: 'center' }}>
            <button className="btn-primary" onClick={onSuccess}>Enter Developer Mode</button>
          </div>
        </>)}

      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [activationStatus, setActivationStatus] = useState<{status: 'NOT_ACTIVATED' | 'ACTIVATED' | 'EXPIRED' | 'TAMPERED'; expiryDate?: string} | null>(null);
  const [machineId, setMachineId] = useState<string>('');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  // PIN lock state
  const [pinState, setPinState] = useState<'loading' | 'setup' | 'verify' | 'unlocked'>('loading');
  const [pinIsSet, setPinIsSet] = useState(false);
  const [backupList, setBackupList] = useState<{name: string; path: string; size: number; createdAt: string}[]>([]);

  // Setup wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardChecked, setWizardChecked] = useState(false);
  const [clinicName, setClinicName] = useState<string>('');

  // Auto-lock: timeout in minutes (0 = disabled)
  const AUTO_LOCK_TIMEOUT_KEY = 'clinvo_autolock_timeout';
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
    return saved !== null ? parseInt(saved) : 5;
  });
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [syncKeyInput, setSyncKeyInput] = useState('');
  const [showDevLogin, setShowDevLogin] = useState(false);
  
  const [receiptsToPrint, setReceiptsToPrint] = useState<ReceiptType[]>([]);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null);

  useEffect(() => {
    const checkLicense = async () => {
      // @ts-ignore
      const result = await window.licensing.checkActivation();
      setActivationStatus(result);
    };

    const checkPin = async () => {
      // @ts-ignore
      const isSet = await window.pinLock.isSet();
      setPinIsSet(isSet);
      if (isSet) {
        setPinState('verify');
      } else {
        setPinState('unlocked'); // no PIN set — go straight in, setup is optional from Control Center
      }
    };

    const checkWizard = async () => {
      // @ts-ignore
      const complete = await window.setupWizard.isComplete();
      if (!complete) setShowWizard(true);
      setWizardChecked(true);
    };

    const loadClinicName = async () => {
      // @ts-ignore
      const meta = await window.database.getMetadata('clinic_name');
      if (meta?.value) setClinicName(meta.value);
    };

    const loadInitialData = async () => {
      await storage.migrateToSQLite();
      const receipts = await storage.getReceipts();
      const doctors = await storage.getDoctors();
      if (receipts.length === 0 && doctors.length === 0) {
        // @ts-ignore
        const excelData = await window.excelStorage?.loadData();
        if (excelData) await storage.importData(JSON.stringify(excelData));
      }
      refreshData();
    };

    checkLicense();
    checkPin();
    checkWizard();
    loadClinicName();
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings' && !machineId) {
      // @ts-ignore
      window.licensing.getMachineID().then(id => setMachineId(id));
    }
    if (activeTab === 'settings') {
      // @ts-ignore
      window.backup.list().then((list: any[]) => setBackupList(list));
    }
  }, [activeTab]);

  // ── Auto-lock on inactivity ───────────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (!pinIsSet || autoLockMinutes === 0 || pinState !== 'unlocked') return;
    inactivityTimer.current = setTimeout(() => {
      setPinState('verify');
    }, autoLockMinutes * 60 * 1000);
  }, [pinIsSet, autoLockMinutes, pinState]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer(); // start the timer on mount / when deps change
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivityTimer]);

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    if (newClicks >= 5) {
      setShowDevLogin(true);
      setLogoClicks(0);
    } else {
      setLogoClicks(newClicks);
      setTimeout(() => setLogoClicks(0), 3000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (isDevMode) {
          setIsDevMode(false);
        } else {
          setShowDevLogin(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevMode]);

  const handleSyncDoctors = async () => {
    if (!syncKeyInput.trim()) return alert('Please enter a Setup Key');
    if (await storage.batchImportDoctors(syncKeyInput.trim())) {
      alert('Doctors synchronized successfully!');
      setSyncKeyInput('');
      refreshData();
    } else {
      alert('Invalid Setup Key. Please contact the developer.');
    }
  };

  const handlePrint = (input: ReceiptType | ReceiptType[]) => {
    const toPrint = Array.isArray(input) ? input : [input];
    setReceiptsToPrint(toPrint);
    setTimeout(() => window.print(), 150);
  };

  const handleDownload = async (input: ReceiptType | ReceiptType[]) => {
    const toPrint = Array.isArray(input) ? input : [input];
    setReceiptsToPrint(toPrint);
    await new Promise(res => setTimeout(res, 250));
    try {
      // @ts-ignore
      const result = await window.pdf.save();
      if (!result.success && result.error) alert('PDF error: ' + result.error);
    } finally {
      setReceiptsToPrint(null);
    }
  };

  const refreshData = async () => {
    const [d, s, r] = await Promise.all([
      storage.getDoctors(),
      storage.getServices(),
      storage.getReceipts()
    ]);
    setDoctors(d);
    setServices(s);
    setReceipts(r);
  };

  const handleDeleteReceipt = (id: string) => {
    if (confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      storage.deleteReceipt(id);
      refreshData();
    }
  };

  const handleEditReceipt = (receipt: ReceiptType) => {
    setEditingReceipt(receipt);
    setActiveTab('new-receipt');
  };

  if (activationStatus === null) {
    return <div className="loading-screen">Loading Clinvo...</div>;
  }

  if (activationStatus.status !== 'ACTIVATED') {
    return (
      <ActivationScreen 
        status={activationStatus.status} 
        expiryDate={activationStatus.expiryDate}
        onActivated={() => window.location.reload()} 
      />
    );
  }

  // PIN lock gate — shown only when a PIN is set and needs to be verified
  if (pinState === 'verify') {
    return (
      <PinLock
        mode="verify"
        onSuccess={() => setPinState('unlocked')}
      />
    );
  }

  // PIN setup — only shown when explicitly triggered from Control Center
  if (pinState === 'setup') {
    return (
      <PinLock
        mode="setup"
        onSuccess={() => { setPinIsSet(true); setPinState('unlocked'); }}
        onSkip={() => setPinState('unlocked')}
      />
    );
  }

  if (pinState === 'loading') {
    return <div className="loading-screen">Loading Clinvo...</div>;
  }

  // Setup wizard — shown once, after PIN is resolved
  if (wizardChecked && showWizard && pinState === 'unlocked') {
    return (
      <SetupWizard
        onComplete={(name, pinWasSet) => {
          if (pinWasSet) setPinIsSet(true);
          if (name) setClinicName(name);
          setShowWizard(false);
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <aside className="sidebar no-print">
        <div className="sidebar-header" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <div className="logo">
            <img src="/icon.png" alt="Logo" className="logo-img" />
            {clinicName ? (
              <div className="logo-text-stack">
                <span className="logo-clinic-name">{clinicName}</span>
                <span className="logo-powered-by">powered by Clinvo</span>
              </div>
            ) : (
              <span>Clinvo</span>
            )}
          </div>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'new-receipt' ? 'active' : ''}`}
            onClick={() => { setEditingReceipt(null); setActiveTab('new-receipt'); }}
          >
            <PlusCircle size={20} />
            <span>New Receipt</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Receipt size={20} />
            <span>History</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => setActiveTab('doctors')}
          >
            <Users size={20} />
            <span>Doctors</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Briefcase size={20} />
            <span>Clinic Services</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Control Center</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-badge">
            <div className="dot"></div>
            {isDevMode ? 'Developer Mode Active' : 'Offline Mode Active'}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header no-print">
          <h1>{activeTab.replace('-', ' ').toUpperCase()}</h1>
          <div className="user-profile">
            {pinIsSet && (
              <button
                className="lock-app-btn"
                title="Lock app"
                onClick={() => setPinState('verify')}
              >
                <Lock size={16} />
                <span>Lock</span>
              </button>
            )}
          </div>
        </header>

        <div className={`content-inner${activeTab === 'new-receipt' ? ' content-inner-flush' : ''}`}>
          {activeTab === 'dashboard' && <Dashboard doctors={doctors} receipts={receipts} onNewReceipt={() => { setEditingReceipt(null); setActiveTab('new-receipt'); }} />}
          {activeTab === 'doctors' && <DoctorManagement doctors={doctors} onUpdate={refreshData} isDevMode={isDevMode} />}
          {activeTab === 'services' && <ServiceManagement services={services} onUpdate={refreshData} isDevMode={isDevMode} />}
          {activeTab === 'new-receipt' && <ReceiptForm doctors={doctors} initialData={editingReceipt} onSave={() => { refreshData(); }} />}
          {activeTab === 'history' && (
            <HistoryPage
              receipts={receipts}
              doctors={doctors}
              onPrint={handlePrint}
              onDownload={handleDownload}
              onEdit={handleEditReceipt}
              onDelete={handleDeleteReceipt}
            />
          )}

          {activeTab === 'settings' && (
            <div className="control-center">
              <div className="control-header center-header">
                <h2>Control Center</h2>
                <p className="text-muted">Manage your clinic's database, medical setup, and system license.</p>
              </div>

              <div className="control-grid">
                {/* Data Safety & Backup */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon blue"><DownloadCloud size={18} /></div>
                    <h3>Data Safety & Backup</h3>
                  </div>
                  <p className="card-description">Create manual backups of your patient data and doctor configurations for safety or migration.</p>
                  <div className="card-actions-row">
                    <button className="btn-primary-sm" onClick={() => storage.exportData()}>
                      <DownloadCloud size={16} /> Export Backup (.json)
                    </button>
                    <button className="btn-secondary-sm" onClick={() => document.getElementById('import-file')?.click()}>
                      <UploadCloud size={16} /> Import Backup (.json)
                    </button>
                    <button className="btn-ghost-sm" onClick={() => (window as any).database.openFolder()}>
                      <FolderOpen size={16} /> Show Data Folder
                    </button>
                  </div>
                  <input 
                    type="file" accept=".json" id="import-file" style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        if (await storage.importData(event.target?.result as string)) {
                          alert('Data imported successfully! The app will now reload.');
                          window.location.reload();
                        } else {
                          alert('Error: This file is not a valid Clinvo backup.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>

                {/* Professional Setup */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon purple"><Users size={18} /></div>
                    <h3>Professional Setup</h3>
                  </div>
                  <p className="card-description">Synchronize your clinic's doctor information using a secure Setup Key provided by the developer.</p>
                  <div className="card-actions-vertical">
                    <input 
                      type="text"
                      placeholder="Paste Setup Key here..." 
                      value={syncKeyInput}
                      onChange={(e) => setSyncKeyInput(e.target.value)}
                      className="sync-input-line"
                    />
                    <button className="btn-primary w-full" onClick={handleSyncDoctors} disabled={!syncKeyInput.trim()}>
                      <Activity size={16} /> Sync Doctors Now
                    </button>
                  </div>
                </div>

                {/* Reports & Intelligence */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon green"><FileText size={18} /></div>
                    <h3>Reports & Intelligence</h3>
                  </div>
                  <p className="card-description">Generate comprehensive financial reports compatible with Excel for accounting and auditing.</p>
                  <div className="card-actions">
                    <button className="btn-ghost-bottom w-full" onClick={() => storage.exportToExcel()}>
                      <FileText size={16} /> Download CSV Report
                    </button>
                  </div>
                </div>

                {/* Auto Backup */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon blue"><HardDrive size={18} /></div>
                    <h3>Auto Backup</h3>
                  </div>
                  <p className="card-description">A backup is created automatically every time you open the app. The last 7 daily backups are kept.</p>
                  <div className="card-actions-row" style={{ marginBottom: '1rem' }}>
                    <button className="btn-primary-sm" onClick={async () => {
                      // @ts-ignore
                      const result = await window.backup.runNow();
                      if (result.success) {
                        alert('Backup created successfully!');
                        // @ts-ignore
                        window.backup.list().then((list: any[]) => setBackupList(list));
                      } else {
                        alert('Backup failed: ' + result.error);
                      }
                    }}>
                      <RotateCcw size={16} /> Backup Now
                    </button>
                    <button className="btn-ghost-sm" onClick={() => (window as any).backup.openFolder()}>
                      <FolderOpen size={16} /> Open Backup Folder
                    </button>
                  </div>
                  {backupList.length > 0 && (
                    <div className="backup-list">
                      <span className="label-caps" style={{ marginBottom: '0.5rem', display: 'block' }}>Recent Backups</span>
                      {backupList.slice(0, 5).map(b => (
                        <div key={b.name} className="backup-item">
                          <span className="backup-name">{b.name.replace('.json', '')}</span>
                          <span className="backup-size">{(b.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PIN Lock */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon purple"><KeyRound size={18} /></div>
                    <h3>PIN Lock</h3>
                  </div>
                  <p className="card-description">
                    {pinIsSet ? 'A PIN is currently protecting this app.' : 'No PIN set. Anyone who opens the app can access all data.'}
                  </p>
                  <div className="card-actions-row" style={{ marginBottom: '1rem' }}>
                    <button className="btn-primary-sm" onClick={() => {
                      setPinIsSet(false);
                      setPinState('setup');
                    }}>
                      <KeyRound size={16} /> {pinIsSet ? 'Change PIN' : 'Set PIN'}
                    </button>
                    {pinIsSet && (
                      <button className="btn-secondary-sm" onClick={async () => {
                        if (confirm('Remove PIN protection? Anyone will be able to open the app.')) {
                          // @ts-ignore
                          await window.pinLock.clear();
                          setPinIsSet(false);
                          alert('PIN removed.');
                        }
                      }}>
                        Remove PIN
                      </button>
                    )}
                  </div>
                  {pinIsSet && (
                    <div className="autolock-setting">
                      <div className="autolock-label">
                        <Timer size={15} />
                        <span>Auto-lock after inactivity</span>
                      </div>
                      <select
                        className="autolock-select"
                        value={autoLockMinutes}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setAutoLockMinutes(val);
                          localStorage.setItem(AUTO_LOCK_TIMEOUT_KEY, val.toString());
                        }}
                      >
                        <option value={0}>Disabled</option>
                        <option value={1}>1 minute</option>
                        <option value={2}>2 minutes</option>
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Developer Mode */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon orange"><Code2 size={18} /></div>
                    <h3>Developer Mode</h3>
                  </div>
                  <p className="card-description">
                    {isDevMode
                      ? 'Developer mode is active. You can manage doctors and clinic services.'
                      : 'Unlock developer mode to manage doctors, clinic services, and other admin settings.'}
                  </p>
                  <div className="card-actions-row">
                    {isDevMode ? (
                      <button className="btn-secondary-sm" onClick={() => setIsDevMode(false)}>
                        <ShieldCheck size={16} /> Exit Developer Mode
                      </button>
                    ) : (
                      <button className="btn-primary-sm" onClick={() => setShowDevLogin(true)}>
                        <Code2 size={16} /> Enter Developer Mode
                      </button>
                    )}
                  </div>
                </div>

                {/* System License */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon gray"><ShieldCheck size={18} /></div>
                    <h3>System License</h3>
                  </div>
                  <p className="card-description">View your system's activation status and copy your machine ID if you require a new license key.</p>
                  
                  <div className="license-status-section">
                    <div className="license-row">
                      <span className="label-caps">LICENSE STATUS</span>
                      <div className={`license-badge-modern ${activationStatus?.status === 'ACTIVATED' ? 'active' : ''}`}>
                        <div className="dot"></div>
                        <span>{activationStatus?.status === 'ACTIVATED' ? 'ACTIVATED' : activationStatus?.status}</span>
                        {activationStatus?.expiryDate && <span className="expiry-date">{activationStatus.expiryDate}</span>}
                      </div>
                    </div>

                    <div className="license-row">
                      <span className="label-caps">MACHINE ID</span>
                      <div className="machine-id-display">
                        <code>{machineId}</code>
                        <button className="copy-btn" onClick={() => {
                          navigator.clipboard.writeText(machineId);
                          alert('Machine ID copied!');
                        }}><Copy size={14} /></button>
                      </div>
                    </div>

                    <div className="center-link-container">
                      <button 
                        className="btn-link" 
                        onClick={() => {
                          if (confirm('Are you sure you want to remove the current license?')) {
                            // @ts-ignore
                            window.licensing.deactivate();
                            window.location.reload();
                          }
                        }}
                      >
                        Change / Renew License
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Print Template for History — uses ReceiptPrint component, marked as duplicate */}
      {receiptsToPrint.length > 0 && (
        <div className="print-only">
          {receiptsToPrint.map(r => (
            <ReceiptPrint
              key={r.id}
              receipt={r}
              doctor={doctors.find(d => d.id === r.doctorId)}
              isDuplicate={true}
            />
          ))}
        </div>
      )}

      {showDevLogin && (
        <DevLoginModal
          onSuccess={() => { setIsDevMode(true); setShowDevLogin(false); }}
          onClose={() => setShowDevLogin(false)}
        />
      )}

      <style>{`
        .loading-screen {
          height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #f8fafc; color: var(--primary); font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 600;
        }
        .dev-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }
        .dev-modal {
          background: white; border-radius: 1rem; padding: 2rem;
          width: 320px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .dev-modal h3 { margin: 0 0 0.5rem; color: var(--primary); }
        .dev-modal p { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.5rem; }
        .dev-modal input {
          width: 100%; padding: 0.75rem; border: 1px solid var(--border);
          border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 1rem;
        }
        .dev-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }

        .dev-error {
          font-size: 0.8rem; color: #ef4444; margin: -1rem 0 1rem; line-height: 1.4;
        }

        .dev-forgot-link {
          display: block; width: 100%; text-align: center; margin-top: 1rem;
          background: none; border: none; color: #94a3b8; font-size: 0.8rem;
          cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
          padding: 0;
        }

        .dev-forgot-link:hover { color: #64748b; }

        .dev-support-note {
          margin-top: 1.25rem; font-size: 0.78rem; color: #94a3b8;
          text-align: center; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 1rem;
        }
        
        .sync-input-modern {
          padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem;
          font-family: monospace; font-size: 0.9rem; background: #f8fafc;
        }

        .license-status-badge {
          display: inline-flex; align-items: center; gap: 0.5rem; background: #ecfdf5; color: #059669;
          padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;
        }

        .status-badge.dev-active {
          background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; cursor: pointer;
          width: 100%; justify-content: center; transition: all 0.2s;
        }
        
        .status-badge.dev-active:hover { background: #fee2e2; transform: translateY(-1px); }

        .app-container { display: flex; min-height: 100vh; }

        .sidebar {
          width: 260px; background: white; border-right: 1px solid var(--border);
          display: flex; flex-direction: column; padding: 1.5rem; position: sticky; top: 0; height: 100vh;
        }

        .logo {
          display: flex; align-items: center; gap: 0.75rem; font-family: 'Outfit', sans-serif;
          font-weight: 700; font-size: 1.5rem; color: var(--primary);
          margin-bottom: 2rem;
        }

        .logo-img {
          width: 44px; height: 44px; border-radius: 10px; object-fit: contain;
        }

        .action-buttons {
          display: flex; gap: 0.5rem; justify-content: flex-end;
        }

        .btn-icon-xs.delete-btn:hover {
          color: #ef4444; border-color: #fee2e2; background: #fef2f2;
        }
        
        .btn-icon-xs.edit-btn:hover {
          color: var(--primary); border-color: #e0f2fe; background: #f0f9ff;
        }

        .nav-menu { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }

        .nav-divider {
          height: 1px;
          background: var(--border);
          margin: 0.5rem 0.5rem;
          opacity: 0.6;
        }

        .nav-item {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem;
          color: var(--text-muted); background: transparent; font-weight: 500; text-align: left; width: 100%; border-radius: 8px;
        }

        .nav-item:hover { background: #f1f5f9; color: var(--text-main); }
        .nav-item.active { background: #f0f9ff; color: var(--primary); }

        .status-badge {
          display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
          color: var(--secondary); background: #f0fdfa; padding: 0.5rem; border-radius: 20px;
        }

        .dot { width: 8px; height: 8px; background: var(--secondary); border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

        .main-content { flex: 1; display: flex; flex-direction: column; }

        .content-header {
          background: white; padding: 0 2rem; border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: stretch;
          min-height: 64px;
        }

        .content-header h1 { font-size: 1.25rem; color: var(--text-muted); letter-spacing: 0.05em; display: flex; align-items: center; }

        .user-profile {
          display: flex;
          align-items: center;
        }

        .content-inner { padding: 2rem; flex: 1; overflow-y: auto; }
        .content-inner-flush { padding: 0 !important; overflow: hidden; }

        .date-group-modern { margin-bottom: 2rem; }
        .btn-reset:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
        .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }

        .control-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          grid-auto-rows: 1fr;
          gap: 2rem; 
          max-width: 1000px;
          margin: 0 auto;
        }
        .control-card { 
          padding: 2.5rem; background: white; border-radius: 16px; border: 1px solid var(--border); 
          display: flex; flex-direction: column; gap: 1rem;
          transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .control-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .card-icon-header.inline { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .card-description { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; margin: 0; }
        
        .header-icon { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; }
        .header-icon.blue { background: #e0f2fe; color: #0284c7; }
        .header-icon.purple { background: #f3e8ff; color: #9333ea; }
        .header-icon.green { background: #dcfce7; color: #16a34a; }
        .header-icon.gray { background: #f1f5f9; color: #475569; }

        .center-header { text-align: center; margin-bottom: 2rem; }
        .center-header h2 { font-size: 1.75rem; color: #1e293b; margin-bottom: 0.5rem; }

        .card-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: auto; padding-top: 1.5rem; }
        .btn-primary-sm { 
          background: #0ea5e9; color: white; padding: 0.75rem; border-radius: 8px; 
          font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .btn-secondary-sm { 
          background: #f8fafc; color: var(--text-main); padding: 0.75rem; border-radius: 8px; 
          border: 1px solid var(--border); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        
        .card-actions-vertical { margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1.5rem; }
        .sync-input-line {
          width: 100%; padding: 0.85rem 1rem; border: 1px solid var(--border); border-radius: 8px;
          background: #f8fafc; font-size: 0.9rem; margin-bottom: 0.5rem; font-family: inherit;
        }
        .sync-input-line:focus { outline: none; border-color: var(--primary); background: white; }

        .card-actions { margin-top: auto; padding-top: 1.5rem; display: flex; flex-direction: column; }
        .btn-ghost-bottom {
          background: transparent; color: #475569; padding: 0.85rem; border-radius: 8px; 
          border: 1px solid transparent; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          transition: all 0.2s;
        }
        .btn-ghost-bottom:hover { background: #f1f5f9; color: #1e293b; }

        .license-status-section { display: flex; flex-direction: column; gap: 1rem; margin-top: auto; padding-top: 1.5rem; }
        .license-row { display: flex; justify-content: space-between; align-items: center; }
        .label-caps { font-size: 0.7rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
        
        .license-badge-modern { 
          display: flex; align-items: center; gap: 0.75rem; background: #f1f5f9; 
          padding: 0.5rem 1rem; border-radius: 12px; font-weight: 600; font-size: 0.85rem;
        }
        .license-badge-modern.active { background: #ecfdf5; color: #059669; }
        .license-badge-modern .dot { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
        .license-badge-modern.active .dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .expiry-date { color: #64748b; font-weight: 500; margin-left: 0.25rem; }

        .machine-id-display { 
          display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; 
          padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border);
          width: 100%; max-width: 200px;
        }
        .machine-id-display code { 
          font-family: monospace; font-size: 0.75rem; color: #475569; 
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
        }
        .copy-btn { background: transparent; color: #64748b; padding: 2px; border-radius: 4px; }
        .copy-btn:hover { color: var(--primary); background: #f0f9ff; }

        .center-link-container { text-align: center; width: 100%; padding-top: 0.5rem; }
        .btn-link { 
          background: transparent; color: var(--text-muted); font-size: 0.75rem; text-align: center; 
          padding: 0; text-decoration: underline; font-weight: 500;
        }
        .btn-link:hover { color: #ef4444; }

        .payment-badge {
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-left: 0.5rem;
        }
        .payment-badge.cash { background: #fef3c7; color: #92400e; }
        .payment-badge.online { background: #dcfce7; color: #166534; }
        .payment-badge.free { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }

        .method-breakdown {
          display: flex;
          gap: 0.75rem;
          font-size: 0.65rem;
          margin-top: 4px;
          opacity: 0.9;
          font-weight: 500;
        }
        .method-breakdown span {
          background: rgba(255,255,255,0.15);
          padding: 1px 5px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default App;

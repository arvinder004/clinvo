import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDashboard, Users, Receipt, PlusCircle, Settings, ShieldCheck, DownloadCloud, UploadCloud, FileText, Briefcase, FolderOpen, KeyRound, HardDrive, RotateCcw, Lock, Timer, Code2 } from 'lucide-react';

import { storage, type Doctor, type Receipt as ReceiptType, type Service } from './lib/storage';
import HistoryPage from './components/HistoryPage';
import ReceiptPrint from './components/ReceiptPrint';
import './index.css';

// Components
import Dashboard from './components/Dashboard';
import DoctorManagement from './components/DoctorManagement';
import ServiceManagement from './components/ServiceManagement';
import ReceiptForm from './components/ReceiptForm';
import SubscriptionScreen from './components/SubscriptionScreen';
import PinLock from './components/PinLock';
import SetupWizard from './components/SetupWizard';
import logoImg from './assets/logo.png';

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
    else { setError(result.message || 'Incorrect Recovery Key.'); setResetPin(''); }
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
          <p>Enter your 12-character Recovery Key (generated during setup) to reset your developer PIN.</p>
          <input
            type="text" placeholder="e.g. CLNV-8X4T-9P2Q"
            value={resetPin} autoFocus
            onChange={e => { setResetPin(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleReset()}
          />
          {error && <p className="dev-error">{error}</p>}
          <div className="dev-modal-actions">
            <button className="btn-ghost" onClick={() => { setView('login'); setResetPin(''); setError(''); }}>Back</button>
            <button className="btn-primary" onClick={handleReset}>Reset PIN</button>
          </div>
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
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  // PIN lock state
  const [pinState, setPinState] = useState<'loading' | 'setup' | 'verify' | 'unlocked'>('loading');
  const [pinIsSet, setPinIsSet] = useState(false);
  const [backupList, setBackupList] = useState<{name: string; path: string; size: number; createdAt: string}[]>([]);

  // Setup wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardChecked, setWizardChecked] = useState(false);
  const [clinicName, setClinicName] = useState<string>('');

  // Licensing state
  const [licenseInfo, setLicenseInfo] = useState<{status: string, daysLeft: number, trialActive: boolean} | null>(null);

  // Auto-lock: timeout in minutes (0 = disabled)
  const AUTO_LOCK_TIMEOUT_KEY = 'clinvo_autolock_timeout';
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(() => {
    const saved = localStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
    return saved !== null ? parseInt(saved) : 5;
  });
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);
  const [showDevLogin, setShowDevLogin] = useState(false);
  
  const [receiptsToPrint, setReceiptsToPrint] = useState<ReceiptType[]>([]);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null);

  // PIN Auth
  const [pinAuthTarget, setPinAuthTarget] = useState<'change' | 'remove' | null>(null);
  const [authKeyInput, setAuthKeyInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Licensing Activation
  const [activationKeyInput, setActivationKeyInput] = useState('');

  useEffect(() => {

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
      }
      refreshData();
    };

    const checkLicense = async () => {
      // @ts-ignore
      const info = await window.licensing.getStatus();
      setLicenseInfo(info);
    };

    checkLicense();
    checkPin();
    checkWizard();
    loadClinicName();
    loadInitialData();
  }, []);

  useEffect(() => {

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
      setReceiptsToPrint([]);
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

  if (!wizardChecked || !licenseInfo) {
    return <div className="loading-screen">Starting Clinvo...</div>;
  }

  // Check Subscription Expiration
  if (licenseInfo.status === 'EXPIRED') {
    return (
      <SubscriptionScreen 
        onActivated={async () => {
          // @ts-ignore
          const info = await window.licensing.getStatus();
          setLicenseInfo(info);
        }} 
      />
    );
  }

  // Show Setup Wizard if not completed
  if (showWizard) {
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



  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {licenseInfo.daysLeft <= 7 && licenseInfo.status !== 'EXPIRED' && (
        <div style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, zIndex: 1000, position: 'relative' }}>
          ⚠️ Your {licenseInfo.trialActive ? 'trial' : 'subscription'} expires in {licenseInfo.daysLeft} days. 
          Please contact support to renew your license.
        </div>
      )}
      <div className="app-container" style={{ flex: 1, minHeight: 0 }}>
      <aside className="sidebar no-print">
        <div className="sidebar-header" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <div className="logo">
            <img src={logoImg} alt="Logo" className="logo-img" />
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
                {/* Product License Activation */}
                <div className="card control-card">
                  <div className="card-icon-header inline">
                    <div className="header-icon orange"><ShieldCheck size={18} /></div>
                    <h3>Product License</h3>
                  </div>
                  <p className="card-description">
                    {licenseInfo?.trialActive
                      ? `You are on a free trial with ${licenseInfo.daysLeft} days remaining.`
                      : licenseInfo?.status === 'ACTIVE'
                        ? `Your subscription is active with ${licenseInfo.daysLeft} days remaining.`
                        : 'Your subscription has expired.'}
                  </p>
                  <div className="card-actions-vertical">
                    <input 
                      type="text"
                      placeholder="Enter License Key (DOC-...)" 
                      value={activationKeyInput}
                      onChange={(e) => setActivationKeyInput(e.target.value)}
                      className="sync-input-line"
                    />
                    <button className="btn-primary w-full" 
                      disabled={!activationKeyInput.trim()}
                      onClick={async () => {
                        // @ts-ignore
                        const result = await window.licensing.activate(activationKeyInput.trim());
                        if (result.success) {
                          alert('License activated successfully! Clinvo will now reload.');
                          window.location.reload();
                        } else {
                          alert(result.error || 'Invalid license key.');
                        }
                      }}
                    >
                      <ShieldCheck size={16} /> Activate License
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
                  {licenseInfo?.trialActive ? (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <KeyRound size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                      PIN changes are locked during the free trial. Activate Clinvo to unlock this feature.
                    </div>
                  ) : (
                    <div className="card-actions-row" style={{ marginBottom: '1rem' }}>
                      <button className="btn-primary-sm" onClick={() => {
                        if (!pinIsSet) {
                          setPinState('setup');
                        } else {
                          setPinAuthTarget('change');
                        }
                      }}>
                        <KeyRound size={16} /> {pinIsSet ? 'Change PIN' : 'Set PIN'}
                      </button>
                      {pinIsSet && (
                        <button className="btn-secondary-sm" onClick={() => {
                          setPinAuthTarget('remove');
                        }}>
                          Remove PIN
                        </button>
                      )}
                    </div>
                  )}
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

      {pinAuthTarget !== null && (
        <div className="dev-overlay" onClick={e => { if (e.target === e.currentTarget) { setPinAuthTarget(null); setAuthKeyInput(''); setAuthError(''); } }}>
          <div className="dev-modal">
            <h3>Authorization Required</h3>
            <p>Please enter your Product License Key to authorize this change.</p>
            <input
              type="text" placeholder="DOC-..."
              value={authKeyInput} autoFocus
              onChange={e => { setAuthKeyInput(e.target.value); setAuthError(''); }}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  // @ts-ignore
                  const isValid = await window.licensing.verifyCurrentKey(authKeyInput);
                  if (isValid) {
                    if (pinAuthTarget === 'change') {
                      setPinIsSet(false);
                      setPinState('setup');
                    } else if (pinAuthTarget === 'remove') {
                      // @ts-ignore
                      await window.pinLock.clear();
                      setPinIsSet(false);
                      alert('PIN removed successfully.');
                    }
                    setPinAuthTarget(null);
                    setAuthKeyInput('');
                    setAuthError('');
                  } else {
                    setAuthError('Incorrect product key.');
                  }
                }
              }}
            />
            {authError && <p className="dev-error">{authError}</p>}
            <div className="dev-modal-actions">
              <button className="btn-ghost" onClick={() => { setPinAuthTarget(null); setAuthKeyInput(''); setAuthError(''); }}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                // @ts-ignore
                const isValid = await window.licensing.verifyCurrentKey(authKeyInput);
                if (isValid) {
                  if (pinAuthTarget === 'change') {
                    setPinIsSet(false);
                    setPinState('setup');
                  } else if (pinAuthTarget === 'remove') {
                    // @ts-ignore
                    await window.pinLock.clear();
                    setPinIsSet(false);
                    alert('PIN removed successfully.');
                  }
                  setPinAuthTarget(null);
                  setAuthKeyInput('');
                  setAuthError('');
                } else {
                  setAuthError('Incorrect product key.');
                }
              }}>Verify & Continue</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default App;

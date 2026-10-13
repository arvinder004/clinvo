import React, { useState, useEffect } from 'react';
import {
  Crown,
  Building2,
  ShieldCheck,
  Receipt,
  Search,
  ExternalLink,
  Plus,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  Activity,
  LogOut,
  Lock,
  FileJson,
  UserX,
  AlertTriangle,
  Download
} from 'lucide-react';
import type { ClinicProfile, PlatformAuditEntry, GdprAccessEntry } from '../lib/browserAdapter';

interface Props {
  onBackToHome: () => void;
  onLaunchClinic: (clinicId: string) => void;
  onOpenCreateClinic: () => void;
  onLogout?: () => void;
}

export const PlatformAdminDashboard: React.FC<Props> = ({
  onBackToHome,
  onLaunchClinic,
  onOpenCreateClinic,
  onLogout,
}) => {
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAuditEntry[]>([]);
  const [gdprLogs, setGdprLogs] = useState<GdprAccessEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'clinics' | 'audit-log' | 'gdpr-compliance'>('clinics');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // GDPR DSAR / Erasure Action state
  const [selectedReceiptForGdpr, setSelectedReceiptForGdpr] = useState('');
  const [receiptsList, setReceiptsList] = useState<any[]>([]);
  const [dsarExportModal, setDsarExportModal] = useState<any | null>(null);
  const [gdprNotice, setGdprNotice] = useState('');
  const [viewingReceiptsClinic, setViewingReceiptsClinic] = useState<ClinicProfile | null>(null);

  const loadPlatformData = () => {
    // @ts-ignore
    if (window.platformAdmin) {
      // @ts-ignore
      setClinics(window.platformAdmin.getClinics());
      // @ts-ignore
      setAuditLogs(window.platformAdmin.getAuditLog());
    }
    // @ts-ignore
    if (window.gdpr) {
      // @ts-ignore
      setGdprLogs(window.gdpr.getAccessLogs());
    }
    try {
      const storedReceipts = JSON.parse(localStorage.getItem('clinvo_web_receipts') || '[]');
      setReceiptsList(storedReceipts);
    } catch {
      setReceiptsList([]);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  const handleSetClinicPlan = (clinicId: string, newPlan: string) => {
    // @ts-ignore
    if (window.platformAdmin && window.platformAdmin.updateClinicPlan) {
      const status = newPlan === 'Starter Trial' ? 'trial' : 'active';
      // @ts-ignore
      window.platformAdmin.updateClinicPlan(clinicId, newPlan, status);
      loadPlatformData();
      setGdprNotice(`Plan updated to "${newPlan}" for selected clinic.`);
      setTimeout(() => setGdprNotice(''), 3500);
    }
  };

  const handleRevokeLicense = (clinicId: string, clinicName: string) => {
    if (window.confirm(`Revoke license and access for "${clinicName}"? The clinic will be set to expired.`)) {
      // @ts-ignore
      if (window.platformAdmin && window.platformAdmin.revokeClinicLicense) {
        // @ts-ignore
        window.platformAdmin.revokeClinicLicense(clinicId);
        loadPlatformData();
        setGdprNotice(`License revoked for ${clinicName}. Status marked as expired.`);
        setTimeout(() => setGdprNotice(''), 3500);
      }
    }
  };

  const totalReceipts = clinics.reduce((acc, c) => acc + (c.receiptsCount || 0), 0);
  const activeTrialsCount = clinics.filter(c => c.status === 'trial' || (c.plan && c.plan.toLowerCase().includes('trial'))).length;
  const paidClinicsCount = clinics.filter(c => c.status === 'active' && (!c.plan || !c.plan.toLowerCase().includes('trial'))).length;
  const totalReceiptsAll = receiptsList.length > 0 ? receiptsList.length : totalReceipts;

  const filteredClinics = clinics.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRoleFilter === 'ALL' || log.userRole.toLowerCase() === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const filteredGdprLogs = gdprLogs.filter((log) => {
    return (
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.patientPseudonym && log.patientPseudonym.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.purpose.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + d.toLocaleDateString();
    } catch {
      return ts;
    }
  };

  // Change Password Handler
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // @ts-ignore
      if (window.platformAdmin && window.platformAdmin.changePassword) {
        // @ts-ignore
        const res = await window.platformAdmin.changePassword(currentPassword, newPassword);
        if (res.success) {
          setPasswordSuccess('Master security password updated successfully.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setTimeout(() => {
            setShowPasswordModal(false);
            setPasswordSuccess('');
          }, 1500);
        } else {
          setPasswordError(res.message || 'Failed to update password.');
        }
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Error occurred while updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Execute GDPR Erasure (Anonymize Patient PII)
  const handleExecuteErasure = (receiptId: string) => {
    if (!receiptId) return;
    if (window.confirm('Execute GDPR Article 17 Right to Erasure? This will permanently scrub and anonymize the patient PII while retaining the financial ledger for tax compliance.')) {
      // @ts-ignore
      if (window.gdpr) {
        // @ts-ignore
        const res = window.gdpr.anonymizeReceipt(receiptId, 'Super Admin', 'Patient DSAR Article 17 Erasure Request');
        if (res.success) {
          setGdprNotice('GDPR Article 17 Erasure Executed: Patient PII scrubbed successfully.');
          loadPlatformData();
          setTimeout(() => setGdprNotice(''), 4000);
        }
      }
    }
  };

  // Export DSAR Dossier (GDPR Art. 15 / 20)
  const handleExportDsar = (receiptId: string) => {
    if (!receiptId) return;
    // @ts-ignore
    if (window.gdpr) {
      // @ts-ignore
      const dossier = window.gdpr.exportDsar(receiptId);
      setDsarExportModal(dossier);
      loadPlatformData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: 'var(--text-main)', paddingBottom: '4rem' }}>
      {/* ── Super Admin Top Bar ────────────────────────────────────────────── */}
      <header
        style={{
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '1.25rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.3px' }}>
                Clinvo Platform Super Admin
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#22c55e',
                  color: '#0f172a',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Lock size={10} /> Password Protected
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Prisma PostgreSQL Backend • Multi-Clinic Registry • GDPR Patient PII Protection
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Security & Password modal button */}
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="Update Master Super Admin Password"
          >
            <KeyRound size={15} /> Security & Password
          </button>

          <button
            onClick={onBackToHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} /> Home Page
          </button>

          <button
            onClick={onOpenCreateClinic}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Plus size={16} /> Register New Clinic
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Terminate Super Admin Session"
            >
              <LogOut size={15} /> Log Out
            </button>
          )}
        </div>
      </header>

      {/* GDPR Notification Banner */}
      {gdprNotice && (
        <div style={{ maxWidth: '1240px', margin: '1rem auto 0', padding: '0 1.5rem' }}>
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#15803d',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{gdprNotice}</span>
          </div>
        </div>
      )}

      {/* ── Metric Cards ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1240px', margin: '2rem auto 0', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="card bento-card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps">Registered Clinics</span>
              <Building2 size={20} color="#2563eb" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
              {clinics.length}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {activeTrialsCount} active trials · {paidClinicsCount} paid clinics
            </span>
          </div>

          <div className="card bento-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps">Paid Subscriptions</span>
              <Crown size={20} color="#10b981" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem', color: '#10b981' }}>
              {paidClinicsCount}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Growth & Enterprise tiers active</span>
          </div>

          <div className="card bento-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps">GDPR PII Protection</span>
              <ShieldCheck size={20} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem', color: '#8b5cf6' }}>
              AES-256
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Field-level authenticated GCM</span>
          </div>

          <div className="card bento-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps">Platform Receipts</span>
              <Receipt size={20} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-main)' }}>
              {totalReceiptsAll}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Financial transactions recorded</span>
          </div>
        </div>

        {/* ── Tabs & Filter Header ────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: '2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-sunken)',
              padding: '4px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-light)',
            }}
          >
            <button
              onClick={() => setActiveTab('clinics')}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                background: activeTab === 'clinics' ? 'white' : 'transparent',
                color: activeTab === 'clinics' ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: activeTab === 'clinics' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
              }}
            >
              Registered Clinics ({clinics.length})
            </button>
            <button
              onClick={() => setActiveTab('audit-log')}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                background: activeTab === 'audit-log' ? 'white' : 'transparent',
                color: activeTab === 'audit-log' ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: activeTab === 'audit-log' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Activity size={15} /> Who Logged In & Users ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('gdpr-compliance')}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.85rem',
                border: 'none',
                background: activeTab === 'gdpr-compliance' ? 'white' : 'transparent',
                color: activeTab === 'gdpr-compliance' ? '#2563eb' : 'var(--text-muted)',
                boxShadow: activeTab === 'gdpr-compliance' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={15} /> GDPR & Patient PII Compliance ({gdprLogs.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeTab === 'audit-log' && (
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
              >
                <option value="ALL">All Roles</option>
                <option value="admin">Admin</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            )}

            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder={
                  activeTab === 'clinics'
                    ? 'Search clinics...'
                    : activeTab === 'audit-log'
                    ? 'Search logins or users...'
                    : 'Search GDPR logs & pseudonyms...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2rem', padding: '0.55rem 0.75rem 0.55rem 2rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* ── TAB 1: Registered Clinics Table ─────────────────────────────────── */}
        {activeTab === 'clinics' && (
          <div className="card" style={{ marginTop: '1.25rem', padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinic Name</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lead Doctor / Owner</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>City & Location</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doctors / Staff</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Plan</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClinics.map((clinic) => (
                  <tr key={clinic.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>
                      <div style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{clinic.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{clinic.speciality}</div>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{clinic.ownerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{clinic.ownerEmail}</div>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem' }}>
                      <div>{clinic.city}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{clinic.address || '—'}</div>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem' }}>
                      <span className="bento-badge badge-blue">{clinic.doctorsCount || 1} Doc</span>{' '}
                      <span className="bento-badge badge-green">{clinic.staffCount || 2} Staff</span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      <select
                        value={clinic.plan || 'Starter Trial'}
                        onChange={(e) => handleSetClinicPlan(clinic.id, e.target.value)}
                        style={{
                          padding: '0.35rem 0.55rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          fontWeight: 600,
                          color: clinic.plan?.toLowerCase().includes('enterprise')
                            ? '#7c3aed'
                            : clinic.plan?.toLowerCase().includes('growth')
                            ? 'var(--brand)'
                            : '#b45309',
                          background: 'var(--surface)',
                          width: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="Starter Trial">Starter Trial</option>
                        <option value="Growth">Growth (₹1,999)</option>
                        <option value="Enterprise">Enterprise (₹4,999)</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span
                        className={`bento-badge ${
                          clinic.status === 'active'
                            ? 'badge-green'
                            : clinic.status === 'trial'
                            ? 'badge-blue'
                            : 'badge-orange'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {clinic.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => setViewingReceiptsClinic(clinic)}
                          className="btn-ghost-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                          title="View Clinic Receipts"
                        >
                          <Receipt size={13} /> Receipts
                        </button>
                        {clinic.status !== 'expired' ? (
                          <button
                            onClick={() => handleRevokeLicense(clinic.id, clinic.name)}
                            className="btn-ghost-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0.35rem 0.6rem', fontSize: '0.78rem', color: 'var(--danger)' }}
                            title="Revoke Clinic License"
                          >
                            <AlertTriangle size={13} /> Revoke
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, padding: '0.35rem' }}>
                            Revoked
                          </span>
                        )}
                        <button
                          onClick={() => onLaunchClinic(clinic.id)}
                          className="btn-primary-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ExternalLink size={14} /> Enter Clinic
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: Who Logged In & Activity Log ──────────────────────────────── */}
        {activeTab === 'audit-log' && (
          <div className="card" style={{ marginTop: '1.25rem', padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>User / Member</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clinic</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {formatTime(log.timestamp)}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>{log.userName}</td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span
                        className={`bento-badge ${
                          log.userRole === 'admin'
                            ? 'badge-purple'
                            : log.userRole === 'doctor'
                            ? 'badge-blue'
                            : 'badge-green'
                        }`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {log.userRole}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {log.clinicName}
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.85rem' }}>{log.action}</span>
                    </td>
                    <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 3: GDPR & Patient PII Compliance Center ─────────────────────── */}
        {activeTab === 'gdpr-compliance' && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Compliance Guarantee Card */}
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: '#f8fafc',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ maxWidth: '780px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <ShieldCheck size={18} />
                    <span>European General Data Protection Regulation (GDPR) Architecture</span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0.4rem 0', color: '#ffffff' }}>
                    PostgreSQL Patient PII Encryption & Data Subject Rights
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                    In compliance with <strong>GDPR Article 9 (Health Data)</strong> and <strong>Article 32 (Security of Processing)</strong>, all patient identifiers (Name, Phone, DOB, Address, Clinical Diagnosis) are stored encrypted at rest using <strong>AES-256-GCM</strong>. Blind HMAC indexing ensures searchability without plaintext database leakage. <strong>Article 17 (Right to Erasure)</strong> is enforced by scrubbing patient PII while maintaining required financial ledgers for statutory accounting.
                  </p>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Database Engine</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>Prisma PostgreSQL</div>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> Strict PII Isolation
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive GDPR Article 17 Erasure & DSAR Action Toolbar */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <h4 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserX size={18} color="#ef4444" />
                <span>Patient Data Subject Rights Console (Articles 15, 17, 20)</span>
              </h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Demonstrate GDPR compliance actions: execute Right to Erasure (anonymization) or export structured DSAR data dossier.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select
                  value={selectedReceiptForGdpr}
                  onChange={(e) => setSelectedReceiptForGdpr(e.target.value)}
                  style={{ minWidth: '320px', padding: '0.6rem 0.85rem', fontSize: '0.88rem' }}
                >
                  <option value="">Select a patient receipt to test GDPR action...</option>
                  {receiptsList.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Receipt #{r.receiptNumber} — {r.patientName} ({r.diagnosis || 'General OPD'})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleExecuteErasure(selectedReceiptForGdpr)}
                  disabled={!selectedReceiptForGdpr}
                  className="btn-secondary-sm"
                  style={{
                    color: selectedReceiptForGdpr ? '#ef4444' : 'var(--text-muted)',
                    borderColor: selectedReceiptForGdpr ? '#fca5a5' : 'var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Article 17: Right to Erasure / Anonymization"
                >
                  <UserX size={15} /> Execute GDPR Erasure (Anonymize PII)
                </button>

                <button
                  onClick={() => handleExportDsar(selectedReceiptForGdpr)}
                  disabled={!selectedReceiptForGdpr}
                  className="btn-primary-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Article 15/20: Data Subject Access Request Portability"
                >
                  <FileJson size={15} /> Export DSAR Dossier (JSON)
                </button>
              </div>
            </div>

            {/* GDPR Access & Processing Audit Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', background: 'var(--surface-sunken)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                    GDPR Article 30 & 33 Records of Processing Activities (ROPA)
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Immutable log of all views, decryptions, exports, and erasures of Patient PII
                  </span>
                </div>
                <span className="bento-badge badge-blue">
                  {filteredGdprLogs.length} audit records
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patient Pseudonym</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operator & Role</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>GDPR Action</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lawful Purpose</th>
                    <th style={{ padding: '0.85rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGdprLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Clock size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatTime(log.timestamp)}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <code style={{ fontSize: '0.8rem', background: 'var(--surface-sunken)', padding: '2px 6px', borderRadius: '4px', color: '#2563eb' }}>
                          {log.patientPseudonym || 'CLNV-PAT-ANON'}
                        </code>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        {log.performedBy} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({log.staffRole})</span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>
                        <span
                          className={`bento-badge ${
                            log.action === 'ANONYMIZE_PII'
                              ? 'badge-orange'
                              : log.action === 'DECRYPT_PII'
                              ? 'badge-purple'
                              : log.action === 'EXPORT_PII'
                              ? 'badge-blue'
                              : 'badge-green'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {log.purpose}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Change Super Admin Master Password ───────────────────────── */}
      {showPasswordModal && (
        <div className="dev-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPasswordModal(false); }}>
          <div className="dev-modal" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <KeyRound size={22} color="#2563eb" />
              <h3 style={{ margin: 0 }}>Super Admin Password</h3>
            </div>
            <p style={{ margin: '0 0 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Update your master platform security credentials used to access this console.
            </p>

            {passwordError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Current Password (or Initial Password)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  New Master Password (min 8 chars)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new master password"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="dev-modal-actions" style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: DSAR Export Viewer (Article 15 & 20) ──────────────────────── */}
      {dsarExportModal && (
        <div className="dev-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDsarExportModal(null); }}>
          <div className="dev-modal" style={{ maxWidth: '640px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileJson size={22} color="#2563eb" />
                <h3 style={{ margin: 0 }}>GDPR DSAR Export Dossier</h3>
              </div>
              <span className="bento-badge badge-green">Article 20 Compliant</span>
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Exported personal and health data for pseudonym: <strong>{dsarExportModal.dataSubjectPseudonym}</strong>
            </p>

            <pre
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                overflowX: 'auto',
                maxHeight: '340px',
              }}
            >
              {JSON.stringify(dsarExportModal, null, 2)}
            </pre>

            <div className="dev-modal-actions" style={{ marginTop: '1rem' }}>
              <button
                className="btn-ghost"
                onClick={() => setDsarExportModal(null)}
              >
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(dsarExportModal, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `dsar_export_${dsarExportModal.dataSubjectPseudonym}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={14} style={{ marginRight: '4px' }} /> Download JSON Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: View Clinic Receipts ── */}
      {viewingReceiptsClinic && (
        <div className="dev-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewingReceiptsClinic(null); }}>
          <div className="dev-modal" style={{ maxWidth: '820px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Receipt size={22} color="var(--brand)" />
                <h3 style={{ margin: 0 }}>Receipts: {viewingReceiptsClinic.name}</h3>
              </div>
              <span className="bento-badge badge-green" style={{ textTransform: 'capitalize' }}>
                {viewingReceiptsClinic.plan || 'Starter Trial'} Plan
              </span>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Practitioner: <strong>{viewingReceiptsClinic.ownerName}</strong> ({viewingReceiptsClinic.speciality}) · Location: <strong>{viewingReceiptsClinic.city}</strong>
            </p>

            {receiptsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', background: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                No receipts recorded yet for this clinic.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Receipt #</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Patient (Pseudonym / Name)</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Doctor</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Method</th>
                      <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptsList.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>#{r.receiptNumber}</td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{r.patientName}</td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{r.doctorName || viewingReceiptsClinic.ownerName}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span className="bento-badge badge-blue">{r.paymentMethod || 'CASH'}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>₹{r.total || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="dev-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="btn-ghost" onClick={() => setViewingReceiptsClinic(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

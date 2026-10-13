import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Stethoscope, User, Plus, Trash2, Edit3, KeyRound, Check } from 'lucide-react';
import type { StaffAccount, StaffRole } from '../lib/browserAdapter';

interface Props {
  currentStaff: StaffAccount;
  onSwitchStaff: (staff: StaffAccount) => void;
}

export const StaffManagement: React.FC<Props> = ({ currentStaff, onSwitchStaff }) => {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<StaffRole>('receptionist');
  const [formError, setFormError] = useState('');

  // Switch modal state
  const [switchTarget, setSwitchTarget] = useState<StaffAccount | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState('');
  const [switchError, setSwitchError] = useState('');

  const loadStaff = () => {
    // @ts-ignore
    if (window.staff) {
      // @ts-ignore
      setStaffList(window.staff.list());
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleSaveStaff = () => {
    if (!name.trim()) {
      setFormError('Staff name is required.');
      return;
    }
    if (!username.trim()) {
      setFormError('Username is required.');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setFormError('A 4-digit numeric PIN is required.');
      return;
    }

    const account: StaffAccount = {
      id: editingStaff ? editingStaff.id : 'staff-' + Date.now(),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      pin: pin.trim(),
      role,
      isActive: true,
      createdAt: editingStaff ? editingStaff.createdAt : new Date().toISOString(),
    };

    // @ts-ignore
    if (window.staff) {
      // @ts-ignore
      window.staff.save(account);
      loadStaff();
    }

    // @ts-ignore
    if (typeof window !== 'undefined' && window.platformAdmin) {
      // @ts-ignore
      const activeClinic = window.platformAdmin.getActiveClinic?.();
      // @ts-ignore
      window.platformAdmin.logActivity({
        userName: currentStaff.name,
        userRole: currentStaff.role,
        clinicName: activeClinic?.name || 'Clinvo Medical Centre',
        action: editingStaff ? 'Staff Account Updated' : 'New User / Staff Added',
        details: `${editingStaff ? 'Updated' : 'Added'} ${account.name} as ${account.role} (${account.username})`,
      });
    }

    setShowAddModal(false);
    setEditingStaff(null);
    setName('');
    setUsername('');
    setPin('');
    setRole('receptionist');
    setFormError('');
  };

  const handleDeleteStaff = (id: string) => {
    if (id === currentStaff.id) {
      alert('You cannot delete the currently active staff account.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this staff account?')) {
      // @ts-ignore
      if (window.staff) {
        // @ts-ignore
        window.staff.delete(id);
        loadStaff();
      }
    }
  };

  const handleStartSwitch = (staff: StaffAccount) => {
    if (staff.id === currentStaff.id) return;
    setSwitchTarget(staff);
    setSwitchPinInput('');
    setSwitchError('');
  };

  const handleConfirmSwitch = () => {
    if (!switchTarget) return;
    if (switchPinInput.trim() === switchTarget.pin) {
      // @ts-ignore
      if (window.staff) {
        // @ts-ignore
        window.staff.setCurrentSession(switchTarget);
      }
      onSwitchStaff(switchTarget);
      setSwitchTarget(null);
      setSwitchPinInput('');
      setSwitchError('');
    } else {
      setSwitchError('Incorrect PIN. Please try again.');
      setSwitchPinInput('');
    }
  };

  const getRoleIcon = (r: StaffRole) => {
    switch (r) {
      case 'admin':
        return <Shield size={16} className="text-purple-600" />;
      case 'doctor':
        return <Stethoscope size={16} className="text-blue-600" />;
      case 'receptionist':
        return <User size={16} className="text-emerald-600" />;
    }
  };

  const getRoleBadgeClass = (r: StaffRole) => {
    switch (r) {
      case 'admin':
        return 'badge-purple';
      case 'doctor':
        return 'badge-blue';
      case 'receptionist':
        return 'badge-green';
    }
  };

  return (
    <div className="card control-card" style={{ marginTop: '1.5rem' }}>
      <div className="card-icon-header inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="header-icon purple"><UserCheck size={18} /></div>
          <div>
            <h3>Clinic Staff & Role Access</h3>
            <p className="text-sm text-muted">Manage logins for Receptionists, Doctors, and Administrators sharing this clinic.</p>
          </div>
        </div>
        {currentStaff.role === 'admin' && (
          <button
            className="btn-primary-sm"
            onClick={() => {
              setEditingStaff(null);
              setName('');
              setUsername('');
              setPin('');
              setRole('receptionist');
              setFormError('');
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Add Staff Member
          </button>
        )}
      </div>

      <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Staff Member</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Username</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Role & Permissions</th>
              <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Active Status</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((s) => {
              const isCurrent = s.id === currentStaff.id;
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: isCurrent ? 'var(--accent)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getRoleIcon(s.role)}
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>
                          Current Session
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    @{s.username}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`bento-badge ${getRoleBadgeClass(s.role)}`} style={{ textTransform: 'capitalize' }}>
                      {s.role}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {s.role === 'admin' && 'Full system & financial control'}
                      {s.role === 'doctor' && 'Clinical history, notes & receipts'}
                      {s.role === 'receptionist' && 'Billing, appointments & registration'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.8rem', fontWeight: 500 }}>
                      <Check size={14} /> Active
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {!isCurrent && (
                        <button
                          className="btn-ghost-sm"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => handleStartSwitch(s)}
                          title="Switch to this account"
                        >
                          Switch
                        </button>
                      )}
                      {currentStaff.role === 'admin' && (
                        <>
                          <button
                            className="btn-icon-xs"
                            onClick={() => {
                              setEditingStaff(s);
                              setName(s.name);
                              setUsername(s.username);
                              setPin(s.pin);
                              setRole(s.role);
                              setShowAddModal(true);
                            }}
                            title="Edit Staff"
                            style={{ padding: '0.4rem', border: 'none', background: '#e0f2fe', color: '#0284c7', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                          >
                            <Edit3 size={15} />
                          </button>
                          {staffList.length > 1 && !isCurrent && (
                            <button
                              className="btn-icon-xs"
                              onClick={() => handleDeleteStaff(s.id)}
                              title="Delete Staff"
                              style={{ padding: '0.4rem', border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div className="dev-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="dev-modal" style={{ maxWidth: '440px' }}>
            <h3>{editingStaff ? 'Edit Staff Account' : 'Add New Staff Member'}</h3>
            <p>Set up login credentials and choose an access role for this staff member.</p>

            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
              <div>
                <label className="text-sm font-medium text-muted">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Kavita Roy or Receptionist"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted">Login Username</label>
                <input
                  type="text"
                  placeholder="e.g. reception_morning"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted">4-Digit Access PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem', fontFamily: 'monospace', letterSpacing: '2px' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted">Access Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                >
                  <option value="receptionist">Receptionist (Billing, Appointments & Receipts)</option>
                  <option value="doctor">Doctor (Patient Notes, Prescriptions & History)</option>
                  <option value="admin">Administrator (Full Access & Settings)</option>
                </select>
              </div>

              {formError && <p className="dev-error" style={{ margin: 0 }}>{formError}</p>}
            </div>

            <div className="dev-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button className="btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveStaff}>
                {editingStaff ? 'Update Account' : 'Create Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Account PIN Verification Modal */}
      {switchTarget && (
        <div className="dev-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSwitchTarget(null); }}>
          <div className="dev-modal" style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <div className="header-icon purple"><KeyRound size={24} /></div>
            </div>
            <h3>Switch Account</h3>
            <p>Enter the 4-digit PIN for <strong>{switchTarget.name}</strong> ({switchTarget.role}).</p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={switchPinInput}
              autoFocus
              onChange={(e) => {
                setSwitchPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                setSwitchError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmSwitch()}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', padding: '0.75rem', width: '100%', marginTop: '0.75rem' }}
            />

            {switchError && <p className="dev-error">{switchError}</p>}

            <div className="dev-modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-ghost" onClick={() => setSwitchTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirmSwitch}>Unlock & Switch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

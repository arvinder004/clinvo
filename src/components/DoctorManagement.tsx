import React, { useState, useEffect } from 'react';
import { storage, type Doctor } from '../lib/storage';
import { Trash2, Edit2, UserPlus, X } from 'lucide-react';

interface DoctorManagementProps {
  doctors: Doctor[];
  onUpdate: () => void;
  isDevMode?: boolean;
}

const EMPTY_FORM = { name: '', specialization: '', qualifications: '', phone: '', address: '' };

const DoctorManagement: React.FC<DoctorManagementProps> = ({ doctors, onUpdate, isDevMode = false }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (doctor: Doctor) => {
    setForm({
      name: doctor.name,
      specialization: doctor.specialization,
      qualifications: doctor.qualifications || '',
      phone: doctor.phone || '',
      address: doctor.address || '',
    });
    setEditingId(doctor.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const doctor: Doctor = {
      id: editingId || Date.now().toString(),
      ...form,
    };
    await storage.saveDoctor(doctor);
    onUpdate();
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this doctor?')) {
      await storage.deleteDoctor(id);
      onUpdate();
    }
  };

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="bento-page no-print">
      <div className="bento-page-header">
        <h2>{isDevMode ? 'Manage Doctors (Dev)' : 'Our Doctors'}</h2>
        {isDevMode && (
          <button className="bento-btn-primary" onClick={openAdd}>
            <UserPlus size={18} />
            Add New Doctor
          </button>
        )}
      </div>

      <div className="bento-grid-2">
        {doctors.length === 0 ? (
          <div className="bento-list-card bento-empty" style={{ gridColumn: '1 / -1' }}>
            {isDevMode
              ? 'No doctors found. Use the button above to add one.'
              : 'No doctors found. Please contact the developer to add doctors.'}
          </div>
        ) : (
          doctors.map(doctor => (
            <div key={doctor.id} className="bento-metric-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>{doctor.name}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span className="bento-badge badge-online">{doctor.specialization}</span>
                    {doctor.qualifications && <span className="bento-badge badge-free">{doctor.qualifications}</span>}
                  </div>
                  <p style={{ margin: '0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{doctor.phone}</p>
                  {doctor.address && (
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-light)', fontSize: '0.8rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
                      {doctor.address}
                    </p>
                  )}
                </div>
                {isDevMode && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={() => openEdit(doctor)} className="bento-btn-ghost" style={{ padding: '0.5rem' }} title="Edit"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(doctor.id)} className="bento-btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="bento-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bento-modal">
            <div className="bento-modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>{editingId ? 'Edit Doctor' : 'Add New Doctor'}</h3>
              <button onClick={closeModal} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="bento-modal-body">
                <div className="bento-form-group">
                  <label>Full Name</label>
                  <input className="bento-input" value={form.name} onChange={set('name')} placeholder="Dr. John Doe" required autoFocus />
                </div>
                <div className="bento-form-group">
                  <label>Specialization</label>
                  <input className="bento-input" value={form.specialization} onChange={set('specialization')} placeholder="e.g. Cardiologist" required />
                </div>
                <div className="bento-form-group">
                  <label>Qualifications</label>
                  <input className="bento-input" value={form.qualifications} onChange={set('qualifications')} placeholder="e.g. MBBS, MD (Medicine)" />
                </div>
                <div className="bento-form-group">
                  <label>Phone / Contact</label>
                  <input className="bento-input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
                </div>
                <div className="bento-form-group">
                  <label>Clinic / Chamber Address</label>
                  <textarea className="bento-input" value={form.address} onChange={set('address')} placeholder="Enter the specific clinic or chamber address for this doctor" rows={2} />
                </div>
              </div>
              
              <div className="bento-modal-actions">
                <button type="button" className="bento-btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="bento-btn-primary">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default DoctorManagement;

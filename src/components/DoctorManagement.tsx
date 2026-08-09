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
    <div className="doctor-management no-print">
      <div className="section-header">
        <h2>{isDevMode ? 'Manage Doctors (Dev)' : 'Our Doctors'}</h2>
        {isDevMode && (
          <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
            <UserPlus size={18} />
            Add New Doctor
          </button>
        )}
      </div>

      <div className="doctor-grid">
        {doctors.length === 0 ? (
          <div className="card empty-state">
            <p className="text-muted">
              {isDevMode
                ? 'No doctors found. Use the button above to add one.'
                : 'No doctors found. Please contact the developer to add doctors.'}
            </p>
          </div>
        ) : (
          doctors.map(doctor => (
            <div key={doctor.id} className="card doctor-card">
              <div className="doctor-info">
                <h3>{doctor.name}</h3>
                <div className="doctor-badges">
                  <span className="badge">{doctor.specialization}</span>
                  {doctor.qualifications && <span className="badge secondary">{doctor.qualifications}</span>}
                </div>
                <p className="text-muted">{doctor.phone}</p>
                {doctor.address && <p className="text-muted small-address">{doctor.address}</p>}
              </div>
              {isDevMode && (
                <div className="doctor-actions">
                  <button onClick={() => openEdit(doctor)} className="btn-icon" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(doctor.id)} className="btn-icon text-danger" title="Delete"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="dm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="dm-modal">
            <div className="dm-modal-header">
              <h3>{editingId ? 'Edit Doctor' : 'Add New Doctor'}</h3>
              <button className="dm-close-btn" onClick={closeModal} title="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="doctor-form">
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={set('name')} placeholder="Dr. John Doe" required autoFocus />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input value={form.specialization} onChange={set('specialization')} placeholder="e.g. Cardiologist" required />
              </div>
              <div className="form-group">
                <label>Qualifications</label>
                <input value={form.qualifications} onChange={set('qualifications')} placeholder="e.g. MBBS, MD (Medicine)" />
              </div>
              <div className="form-group">
                <label>Phone / Contact</label>
                <input value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group full-width">
                <label>Clinic / Chamber Address (shown on receipt header)</label>
                <textarea value={form.address} onChange={set('address')} placeholder="Enter the specific clinic or chamber address for this doctor" rows={2} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .doctor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .doctor-card {
          display: flex;
          justify-content: space-between;
          padding: 1.5rem;
        }

        .doctor-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .badge {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge.secondary {
          background: #f1f5f9;
          color: #475569;
        }

        .small-address {
          font-size: 0.8rem;
          margin-top: 0.5rem;
          border-top: 1px solid var(--border);
          padding-top: 0.5rem;
        }

        .btn-ghost {
          background: transparent;
          color: var(--text-muted);
          padding: 0.75rem 1.5rem;
        }

        .btn-icon {
          background: transparent;
          color: var(--text-muted);
          padding: 0.5rem;
        }

        .btn-icon:hover {
          color: var(--primary);
          background: #f1f5f9;
        }

        .text-danger { color: #ef4444 !important; }
        .text-danger:hover { background: #fef2f2 !important; }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
        }

        /* Modal */
        .dm-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .dm-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
          animation: modalIn 0.18s ease;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dm-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.4rem 1.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .dm-modal-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .dm-close-btn {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 0.35rem;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .dm-close-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .doctor-form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.1rem;
          padding: 1.5rem 1.75rem 1.75rem;
        }

        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .form-group input,
        .form-group textarea {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem 0.9rem;
          font-size: 0.95rem;
          font-family: inherit;
          color: #0f172a;
          background: #f8fafc;
          transition: border-color 0.15s, box-shadow 0.15s;
          resize: none;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary, #0ea5e9);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .form-actions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.25rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default DoctorManagement;

import React, { useState, useEffect } from 'react';
import { storage, type Service } from '../lib/storage';
import { Trash2, Edit2, PlusCircle, Activity, X } from 'lucide-react';

interface ServiceManagementProps {
  services: Service[];
  onUpdate: () => void;
  isDevMode?: boolean;
}

const EMPTY_FORM = { name: '', amount: 0 };

const ServiceManagement: React.FC<ServiceManagementProps> = ({ services, onUpdate, isDevMode = false }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Close on Escape
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

  const openEdit = (service: Service) => {
    setForm({ name: service.name, amount: service.amount });
    setEditingId(service.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const service: Service = {
      id: editingId || Date.now().toString(),
      name: form.name,
      amount: form.amount,
    };
    await storage.saveService(service);
    onUpdate();
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      await storage.deleteService(id);
      onUpdate();
    }
  };

  return (
    <div className="service-management no-print">
      <div className="section-header">
        <div className="header-title">
          <Activity size={24} style={{ color: 'var(--primary)' }} />
          <h2>{isDevMode ? 'Manage Services (Dev)' : 'Clinic Services'}</h2>
        </div>
        {isDevMode && (
          <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
            <PlusCircle size={18} />
            Add New Service
          </button>
        )}
      </div>

      <div className="service-grid">
        {services.length === 0 ? (
          <div className="card empty-state">
            <p className="text-muted">
              {isDevMode
                ? 'No services defined. Use the button above to add clinic services for faster billing.'
                : 'No services defined. Please contact the developer to add clinic services.'}
            </p>
          </div>
        ) : (
          services.map(service => (
            <div key={service.id} className="card service-card">
              <div className="service-info">
                <div className="service-main">
                  <h3>{service.name}</h3>
                  <span className="service-price">₹{service.amount.toLocaleString()}</span>
                </div>
              </div>
              {isDevMode && (
                <div className="service-actions">
                  <button onClick={() => openEdit(service)} className="btn-icon" title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(service.id)} className="btn-icon text-danger" title="Delete"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="sm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="sm-modal">
            <div className="sm-modal-header">
              <h3>{editingId ? 'Edit Service' : 'Add New Service'}</h3>
              <button className="sm-close-btn" onClick={closeModal} title="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="service-form">
              <div className="form-group">
                <label>Service Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Regular Consultation"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Default Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                  placeholder="0"
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .service-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          transition: all 0.2s;
        }

        .service-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .service-main {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .service-main h3 { margin: 0; font-size: 1.1rem; }

        .service-price {
          font-weight: 700;
          color: var(--primary);
          font-size: 1.25rem;
        }

        .service-actions { display: flex; gap: 0.5rem; }

        .btn-ghost {
          background: transparent;
          color: var(--text-muted);
          padding: 0.75rem 1.5rem;
        }

        .btn-icon {
          background: transparent;
          color: var(--text-muted);
          padding: 0.5rem;
          border-radius: 8px;
        }

        .btn-icon:hover { color: var(--primary); background: #f1f5f9; }
        .text-danger { color: #ef4444 !important; }
        .text-danger:hover { background: #fef2f2 !important; }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem;
        }

        /* Modal */
        .sm-modal-backdrop {
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

        .sm-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 1px solid #e2e8f0;
          animation: smModalIn 0.18s ease;
        }

        @keyframes smModalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .sm-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.4rem 1.75rem 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .sm-modal-header h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .sm-close-btn {
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

        .sm-close-btn:hover { background: #fee2e2; color: #dc2626; }

        .service-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          padding: 1.5rem 1.75rem 1.75rem;
        }

        .form-group { display: flex; flex-direction: column; }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.4rem;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .form-group input {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 0.65rem 0.9rem;
          font-size: 0.95rem;
          font-family: inherit;
          color: #0f172a;
          background: #f8fafc;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary, #0ea5e9);
          background: white;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }
      `}</style>
    </div>
  );
};

export default ServiceManagement;

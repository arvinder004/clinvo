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
    <div className="bento-page no-print">
      <div className="bento-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={24} style={{ color: 'var(--primary)' }} />
          <h2>{isDevMode ? 'Manage Services (Dev)' : 'Clinic Services'}</h2>
        </div>
        {isDevMode && (
          <button className="bento-btn-primary" onClick={openAdd}>
            <PlusCircle size={18} />
            Add New Service
          </button>
        )}
      </div>

      <div className="bento-grid-2">
        {services.length === 0 ? (
          <div className="bento-list-card bento-empty" style={{ gridColumn: '1 / -1' }}>
            {isDevMode
              ? 'No services defined. Use the button above to add clinic services for faster billing.'
              : 'No services defined. Please contact the developer to add clinic services.'}
          </div>
        ) : (
          services.map(service => (
            <div key={service.id} className="bento-metric-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>{service.name}</h3>
                <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem' }}>₹{service.amount.toLocaleString()}</span>
              </div>
              {isDevMode && (
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => openEdit(service)} className="bento-btn-ghost" style={{ padding: '0.5rem' }} title="Edit"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(service.id)} className="bento-btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} title="Delete"><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="bento-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bento-modal" style={{ maxWidth: '420px' }}>
            <div className="bento-modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>{editingId ? 'Edit Service' : 'Add New Service'}</h3>
              <button onClick={closeModal} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="bento-modal-body">
                <div className="bento-form-group">
                  <label>Service Name</label>
                  <input
                    className="bento-input"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Regular Consultation"
                    required
                    autoFocus
                  />
                </div>
                <div className="bento-form-group">
                  <label>Default Amount (₹)</label>
                  <input
                    className="bento-input"
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              
              <div className="bento-modal-actions">
                <button type="button" className="bento-btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="bento-btn-primary">Save Service</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default ServiceManagement;

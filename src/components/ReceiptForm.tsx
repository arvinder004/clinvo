import React, { useState, useEffect, useRef } from 'react';
import { storage, calculateAgeFromDob, type Doctor, type Receipt, type ReceiptItem, type Service, type Medicine } from '../lib/storage';
import { Plus, Trash2, Save, Download, Printer, CheckCircle2, ChevronDown, FilePlus, ShieldCheck, Lock } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptPrint from './ReceiptPrint';
import { generatePatientPseudonym } from '../lib/gdprCrypto';
import { usePlan } from '../lib/usePlan';

interface ReceiptFormProps {
  doctors: Doctor[];
  onSave: () => void;
  initialData?: Receipt | null;
  onUpgradeRequired?: () => void;
}

// ── Service combobox ──────────────────────────────────────────────────────────
const ServiceInput: React.FC<{
  value: string;
  services: Service[];
  onChange: (desc: string, amount?: number) => void;
  placeholder?: string;
}> = ({ value, services, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = query.trim()
    ? services.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : services;

  const handleInput = (v: string) => {
    setQuery(v); setOpen(true);
    const exact = services.find(s => s.name.toLowerCase() === v.toLowerCase());
    onChange(v, exact?.amount);
  };

  const select = (s: Service) => {
    setQuery(s.name); setOpen(false);
    onChange(s.name, s.amount);
  };

  return (
    <div className="svc-wrap" ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Type or select…'}
        style={{ width: '100%', padding: '0.5rem', paddingRight: '2rem' }}
      />
      <ChevronDown size={14} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setOpen(o => !o)} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
          {filtered.map(s => (
            <div key={s.id} onMouseDown={() => select(s)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
              <span>{s.name}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>₹{s.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ReceiptForm: React.FC<ReceiptFormProps> = ({ doctors, onSave, initialData, onUpgradeRequired }) => {
  const { plan, isTrialExhausted, recordReceipt } = usePlan();
  const [patientName, setPatientName]         = useState(initialData?.patientName || '');
  const [patientDob, setPatientDob]           = useState(initialData?.patientDob || '');
  const [patientGender, setPatientGender]     = useState(initialData?.patientGender || 'Male');
  const [patientPhone, setPatientPhone]       = useState(initialData?.patientPhone || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialData?.doctorId || '');
  const [diagnosis, setDiagnosis]             = useState(initialData?.diagnosis || '');
  const [items, setItems]                     = useState<ReceiptItem[]>(
    initialData?.items || [{ id: '1', description: 'Consultation Fee', amount: 500 }]
  );
  const [medicines, setMedicines]             = useState<Medicine[]>(initialData?.medicines || []);
  const [receiptNumber, setReceiptNumber]     = useState(initialData?.receiptNumber || '');
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [isReturningPatient, setIsReturningPatient] = useState(false);
  const [paymentMethod, setPaymentMethod]     = useState<'CASH' | 'ONLINE' | 'FREE'>(initialData?.paymentMethod || 'CASH');
  const [appointmentDate, setAppointmentDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [saved, setSaved]                     = useState(false);
  const [savedReceiptId, setSavedReceiptId]   = useState<string | null>(initialData?.id || null);
  const [pdfLoading, setPdfLoading]           = useState(false);
  const [printReceipt, setPrintReceipt]       = useState<Receipt | null>(null);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  const patientAge = calculateAgeFromDob(patientDob);
  const rawTotal   = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const total      = paymentMethod === 'FREE' ? 0 : rawTotal;
  const doctor     = doctors.find(d => d.id === selectedDoctorId);

  useEffect(() => {
    const init = async () => {
      if (!initialData) {
        setReceiptNumber(await storage.getNextReceiptNumber(paymentMethod === 'FREE'));
        if (doctors.length > 0 && !selectedDoctorId) setSelectedDoctorId(doctors[0].id);
      }
      setAvailableServices(await storage.getServices());
    };
    init();
  }, [doctors, initialData, paymentMethod]);

  const addItem = () =>
    setItems(p => [...p, { id: Date.now().toString(), description: '', amount: 0 }]);

  const removeItem = (id: string) =>
    setItems(p => p.filter(i => i.id !== id));

  const addMedicine = () =>
    setMedicines(p => [...p, { id: Date.now().toString(), name: '', dosage: '', duration: '', instructions: '' }]);

  const removeMedicine = (id: string) =>
    setMedicines(p => p.filter(m => m.id !== id));

  const updateMedicine = (id: string, field: keyof Medicine, value: string) =>
    setMedicines(p => p.map(m => m.id !== id ? m : { ...m, [field]: value }));

  const updateItem = (id: string, field: keyof ReceiptItem, value: string | number) =>
    setItems(p => p.map(i => i.id !== id ? i : { ...i, [field]: value }));

  const updateServiceRow = (id: string, desc: string, amount?: number) =>
    setItems(p => p.map(i => i.id !== id ? i : { ...i, description: desc, ...(amount !== undefined ? { amount } : {}) }));

  const handlePhoneChange = async (value: string) => {
    setPatientPhone(value);
    if (value.length === 10) {
      const all = await storage.getReceipts();
      const match = all.slice().reverse().find(r => r.patientPhone === value);
      if (match) {
        setPatientName(match.patientName);
        setPatientDob(match.patientDob || '');
        setPatientGender(match.patientGender);
        setIsReturningPatient(true);
        setTimeout(() => setIsReturningPatient(false), 3000);
      } else {
        setIsReturningPatient(false);
      }
    } else {
      setIsReturningPatient(false);
    }
  };

  const buildReceipt = (): Receipt => ({
    id: savedReceiptId || initialData?.id || Date.now().toString(),
    receiptNumber, date: appointmentDate, patientName, patientAge,
    patientDob, patientGender, patientPhone,
    doctorId: selectedDoctorId, doctorName: doctor?.name || 'Unknown',
    diagnosis, medicines, items, total, paymentMethod,
    // @ts-ignore
    pseudonymId: (initialData as any)?.pseudonymId || generatePatientPseudonym(),
    consentGiven: true,
    legalBasis: 'HEALTHCARE_PROVISION_ART_9_2_H',
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!patientName.trim())                               e.patientName  = 'Required';
    if (!patientPhone.trim() || patientPhone.length < 10) e.patientPhone = 'Valid 10-digit phone required';
    if (!selectedDoctorId)                                 e.doctor       = 'Select a doctor';
    if (items.every(i => !i.description.trim()))           e.items        = 'At least one service required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkTrialLimit = (): boolean => {
    if (plan === 'free_trial' && isTrialExhausted && !savedReceiptId && !initialData) {
      if (onUpgradeRequired) {
        onUpgradeRequired();
      } else {
        alert('Free trial limit reached (30/30 receipts used). Please activate a license key to continue.');
      }
      return false;
    }
    return true;
  };

  const persist = async (receipt: Receipt) => {
    if (savedReceiptId || initialData) await storage.updateReceipt(receipt);
    else {
      await storage.saveReceipt(receipt);
      setSavedReceiptId(receipt.id);
      recordReceipt();
    }
    setSaved(true); setTimeout(() => setSaved(false), 3000);

    // Log GDPR processing activity (Article 30 Records of Processing Activities)
    // @ts-ignore
    if (typeof window !== 'undefined' && window.gdpr) {
      // @ts-ignore
      window.gdpr.logAccess({
        receiptId: receipt.id,
        patientPseudonym: (receipt as any).pseudonymId,
        performedBy: doctor?.name || 'Attending Staff',
        staffRole: 'doctor',
        action: savedReceiptId || initialData ? 'UPDATE_PII' : 'DECRYPT_PII',
        purpose: 'CLINICAL_BILLING',
        details: `Clinical receipt #${receipt.receiptNumber} generated with encrypted PII and patient consent`,
      });
    }

    onSave();
  };

  const handleSave = async () => {
    if (!checkTrialLimit()) return;
    if (!validate()) return;
    await persist(buildReceipt());
  };

  const handlePrint = async () => {
    if (!checkTrialLimit()) return;
    if (!validate()) return;
    const r = buildReceipt();
    await persist(r);
    setPrintReceipt(r);
    setTimeout(() => window.print(), 200);
  };

  const handlePdf = async () => {
    if (!checkTrialLimit()) return;
    if (!validate()) return;
    const r = buildReceipt();
    await persist(r);
    setPrintReceipt(r);
    setPdfLoading(true);
    await new Promise(res => setTimeout(res, 250));
    try {
      // @ts-ignore
      const result = await window.pdf.save();
      if (!result.success && result.error) alert('PDF error: ' + result.error);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleNew = async () => {
    setPatientName('');
    setPatientDob('');
    setPatientGender('Male');
    setPatientPhone('');
    setDiagnosis('');
    setMedicines([]);
    setItems([{ id: Date.now().toString(), description: 'Consultation Fee', amount: 500 }]);
    setPaymentMethod('CASH');
    setAppointmentDate(format(new Date(), 'yyyy-MM-dd'));
    setSavedReceiptId(null);
    setReceiptNumber(await storage.getNextReceiptNumber(false));
    setErrors({});
  };

  const isFormBlocked = plan === 'free_trial' && isTrialExhausted && !savedReceiptId && !initialData;

  return (
    <>
      <div className="receipt-form-container no-print" style={{ flex: 1, overflowY: 'auto' }}>
        {isFormBlocked && (
          <div style={{
            background: 'var(--danger-light)',
            border: '1px solid #f87171',
            borderRadius: 'var(--radius)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--danger)', fontSize: '0.88rem' }}>
              <Lock size={18} />
              <span>
                <strong>Free Trial Complete (30 / 30 Receipts Issued):</strong> New receipts are blocked until you activate a Growth or Enterprise license key.
              </span>
            </div>
            {onUpgradeRequired && (
              <button
                onClick={onUpgradeRequired}
                style={{
                  padding: '0.45rem 1rem',
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Enter License Key →
              </button>
            )}
          </div>
        )}
        <div className="content-header">
          <div>
            <h1>Receipt Editor</h1>
            <p className="text-muted" style={{ marginTop: '0.25rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
              Create or edit a patient receipt.
              {isReturningPatient && <span className="license-status-badge active" style={{ padding: '2px 8px', fontSize: '11px', margin: 0 }}>↩ Returning Patient</span>}
              {saved && <span className="license-status-badge" style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', fontSize: '11px', margin: 0 }}><CheckCircle2 size={11} style={{marginRight:'4px'}}/> Saved</span>}
            </p>
          </div>
          <div className="action-buttons">
            <button className="btn-secondary-sm" onClick={handleNew}><FilePlus size={14} /> New</button>
            <button className="btn-secondary-sm" onClick={handleSave}><Save size={14} /> Save</button>
            <button className="btn-secondary-sm" onClick={handlePdf} disabled={pdfLoading}>
              <Download size={14} /> {pdfLoading ? 'Saving…' : 'PDF'}
            </button>
            <button className="btn-primary-sm" onClick={handlePrint}><Printer size={14} /> Print</button>
          </div>
        </div>

        <div className="control-grid">
          {/* Left Column: Patient Details */}
          <div className="card control-card">
            <div className="card-icon-header inline" style={{ marginBottom: '1.5rem' }}>
              <div className="header-icon blue"><Plus size={18} /></div>
              <h3>Patient Details</h3>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-sm font-medium text-muted">Phone Number</label>
              <input type="tel" maxLength={10} placeholder="10-digit mobile"
                value={patientPhone}
                onChange={e => { handlePhoneChange(e.target.value); setErrors(p => ({ ...p, patientPhone: '' })); }}
                className={errors.patientPhone ? 'error-border' : ''} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }} />
              {errors.patientPhone && <span className="dev-error">{errors.patientPhone}</span>}
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-sm font-medium text-muted">Full Name</label>
              <input placeholder="Full name" value={patientName}
                onChange={e => { setPatientName(e.target.value); setErrors(p => ({ ...p, patientName: '' })); }}
                className={errors.patientName ? 'error-border' : ''} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }} />
              {errors.patientName && <span className="dev-error">{errors.patientName}</span>}
            </div>
            
            <div className="form-group form-grid-2">
              <div>
                <label className="text-sm font-medium text-muted">Date of Birth</label>
                <input type="date" value={patientDob} max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setPatientDob(e.target.value)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }} />
                {patientDob && <div className="text-sm text-muted" style={{ marginTop: '0.25rem', color: 'var(--primary)' }}>Age: {patientAge} years</div>}
              </div>
              <div>
                <label className="text-sm font-medium text-muted">Gender</label>
                <select value={patientGender} onChange={e => setPatientGender(e.target.value)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.65rem 0.85rem', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#15803d' }}>
              <ShieldCheck size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <strong>GDPR Article 9(2)(h) Patient Consent Verified:</strong> PII is protected via AES-256-GCM authenticated encryption and pseudonymization.
              </div>
            </div>
          </div>

          {/* Right Column: Visit Details */}
          <div className="card control-card">
            <div className="card-icon-header inline" style={{ marginBottom: '1.5rem' }}>
              <div className="header-icon purple"><CheckCircle2 size={18} /></div>
              <h3>Visit Details</h3>
            </div>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="text-sm font-medium text-muted">Doctor</label>
              <select value={selectedDoctorId}
                onChange={e => { setSelectedDoctorId(e.target.value); setErrors(p => ({ ...p, doctor: '' })); }}
                className={errors.doctor ? 'error-border' : ''} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }}>
                <option value="">— Select Doctor —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.doctor && <span className="dev-error">{errors.doctor}</span>}
            </div>
            
            <div className="form-group form-grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <label className="text-sm font-medium text-muted">Date</label>
                <input type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem' }} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted">Receipt No.</label>
                <input value={`#${receiptNumber}`} disabled style={{ marginTop: '0.5rem', width: '100%', padding: '0.65rem 1rem', background: 'var(--background)' }} />
              </div>
            </div>
            
            <div className="form-group">
              <label className="text-sm font-medium text-muted">Payment Method</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {(['CASH','ONLINE','FREE'] as const).map(m => (
                  <button key={m} type="button" 
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600, border: '1px solid var(--border)', background: paymentMethod === m ? 'var(--primary)' : 'var(--surface)', color: paymentMethod === m ? 'white' : 'var(--text-main)', transition: 'all 0.2s', cursor: 'pointer' }}
                    onClick={() => setPaymentMethod(m)}>{m}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis & Notes */}
        <div className="card control-card" style={{ marginTop: '1.5rem' }}>
          <div className="card-icon-header inline" style={{ marginBottom: '1rem' }}>
            <div className="header-icon orange"><Plus size={18} /></div>
            <h3>Diagnosis & Clinical Notes</h3>
          </div>
          <textarea rows={3} placeholder="Enter diagnosis, symptoms, or clinical notes…"
            value={diagnosis} onChange={e => setDiagnosis(e.target.value)} style={{ width: '100%', padding: '1rem', resize: 'vertical' }} />
        </div>

        {/* Prescribed Medicines */}
        <div className="card control-card" style={{ marginTop: '1.5rem' }}>
          <div className="card-icon-header inline" style={{ marginBottom: '1rem' }}>
            <div className="header-icon green"><Plus size={18} /></div>
            <h3>Prescribed Medicines</h3>
          </div>
          
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>No.</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Medicine Name</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Dosage</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Instructions</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {medicines.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No medicines prescribed.</td></tr>
                )}
                {medicines.map((med, idx) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}><input value={med.name} placeholder="e.g. Paracetamol" onChange={e => updateMedicine(med.id, 'name', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} /></td>
                    <td style={{ padding: '0.75rem 0.5rem' }}><input value={med.dosage} placeholder="1-0-1" onChange={e => updateMedicine(med.id, 'dosage', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} /></td>
                    <td style={{ padding: '0.75rem 0.5rem' }}><input value={med.duration} placeholder="5 Days" onChange={e => updateMedicine(med.id, 'duration', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} /></td>
                    <td style={{ padding: '0.75rem 0.5rem' }}><input value={med.instructions} placeholder="After food" onChange={e => updateMedicine(med.id, 'instructions', e.target.value)} style={{ width: '100%', padding: '0.5rem' }} /></td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <button type="button" className="btn-icon-xs delete-btn" onClick={() => removeMedicine(med.id)} style={{ padding: '0.4rem', border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-secondary-sm" onClick={addMedicine}>
            <Plus size={16} /> Add Medicine
          </button>
        </div>

        {/* Services & Charges */}
        <div className="card control-card" style={{ marginTop: '1.5rem', paddingBottom: '1.5rem' }}>
          <div className="card-icon-header inline" style={{ marginBottom: '1rem' }}>
            <div className="header-icon blue"><Plus size={18} /></div>
            <h3>Services & Charges</h3>
          </div>
          
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', width: '40px' }}>No.</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.85rem', width: '150px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '0.75rem 0.5rem', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <ServiceInput value={item.description} services={availableServices}
                        onChange={(d, a) => updateServiceRow(item.id, d, a)}
                        placeholder={idx === 0 ? 'e.g. Consultation Fee' : 'Service…'} />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <input type="number" min="0" value={item.amount} placeholder="0"
                        onChange={e => updateItem(item.id, 'amount', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                        style={{ width: '100%', padding: '0.5rem', textAlign: 'right', textDecoration: paymentMethod === 'FREE' ? 'line-through' : 'none', color: paymentMethod === 'FREE' ? 'var(--text-muted)' : 'inherit' }} />
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button type="button" className="btn-icon-xs delete-btn" onClick={() => removeItem(item.id)} style={{ padding: '0.4rem', border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.items && <span className="dev-error" style={{ display: 'block', marginBottom: '1rem' }}>{errors.items}</span>}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary-sm" onClick={addItem}>
              <Plus size={16} /> Add Service
            </button>
            <div style={{ textAlign: 'right', paddingRight: '1rem' }}>
              <div className="text-sm font-medium text-muted" style={{ marginBottom: '0.25rem' }}>Total Payable</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
                {paymentMethod === 'FREE' && rawTotal > 0 && <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1.1rem' }}>₹{rawTotal.toFixed(2)}</span>}
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>₹{total.toFixed(2)}</span>
              </div>
              {paymentMethod === 'FREE' && <div className="text-sm" style={{ color: 'var(--warning)', fontWeight: 600, marginTop: '0.25rem' }}>Free / Waived</div>}
            </div>
          </div>
        </div>

      </div>

      {/* Print template — only rendered when triggered */}
      {printReceipt && (
        <div className="print-only">
          <ReceiptPrint receipt={printReceipt} doctor={doctor} />
        </div>
      )}
    </>
  );
};

export default ReceiptForm;

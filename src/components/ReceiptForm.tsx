import React, { useState, useEffect, useRef } from 'react';
import { storage, calculateAgeFromDob, type Doctor, type Receipt, type ReceiptItem, type Service, type Medicine } from '../lib/storage';
import { Plus, Trash2, Save, Download, Printer, CheckCircle2, ChevronDown, FilePlus } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptPrint from './ReceiptPrint';

interface ReceiptFormProps {
  doctors: Doctor[];
  onSave: () => void;
  initialData?: Receipt | null;
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
    <div className="svc-wrap" ref={ref}>
      <input
        className="svc-in"
        value={query}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || 'Type or select…'}
      />
      <ChevronDown size={12} className="svc-chev" onClick={() => setOpen(o => !o)} />
      {open && filtered.length > 0 && (
        <div className="svc-drop">
          {filtered.map(s => (
            <div key={s.id} className="svc-opt" onMouseDown={() => select(s)}>
              <span>{s.name}</span>
              <span className="svc-opt-amt">₹{s.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const ReceiptForm: React.FC<ReceiptFormProps> = ({ doctors, onSave, initialData }) => {
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

  const persist = async (receipt: Receipt) => {
    if (savedReceiptId || initialData) await storage.updateReceipt(receipt);
    else { await storage.saveReceipt(receipt); setSavedReceiptId(receipt.id); }
    setSaved(true); setTimeout(() => setSaved(false), 3000);
    onSave();
  };

  const handleSave = async () => {
    if (!validate()) return;
    await persist(buildReceipt());
  };

  const handlePrint = async () => {
    if (!validate()) return;
    const r = buildReceipt();
    await persist(r);
    setPrintReceipt(r);
    setTimeout(() => window.print(), 200);
  };

  const handlePdf = async () => {
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

  return (
    <>
      <div className="rf-shell no-print">

        {/* Toolbar */}
      <div className="rf-toolbar">
        <div className="rf-toolbar-left">
          <span className="rf-toolbar-label">Receipt Editor</span>
          {isReturningPatient && <span className="rf-badge green">↩ Returning Patient</span>}
          {saved && <span className="rf-badge blue"><CheckCircle2 size={11} /> Saved</span>}
        </div>
        <div className="rf-toolbar-right">
          <button className="rf-tb ghost" onClick={handleNew}><FilePlus size={14} /> New</button>
          <button className="rf-tb ghost" onClick={handleSave}><Save size={14} /> Save</button>
          <button className="rf-tb outline" onClick={handlePdf} disabled={pdfLoading}>
            <Download size={14} />{pdfLoading ? 'Saving…' : 'PDF'}
          </button>
          <button className="rf-tb primary" onClick={handlePrint}><Printer size={14} /> Print</button>
        </div>
      </div>

      {/* A4 canvas */}
      <div className="rf-canvas">
        <div className="rf-a4">

          {/* Doctor header */}
          <div className="rf-doc-header">
            <div className="rf-doc-hdr-left">
              {doctor ? (
                <>
                  <div className="rf-doc-name">{doctor.name}</div>
                  {doctor.qualifications && <div className="rf-doc-qual">{doctor.qualifications}</div>}
                  {doctor.specialization && <div className="rf-doc-spec">{doctor.specialization}</div>}
                </>
              ) : (
                <div className="rf-doc-name rf-doc-placeholder">← Select doctor</div>
              )}
            </div>
            <div className="rf-doc-hdr-right">
              <select
                className={`rf-doc-sel${errors.doctor ? ' rf-err-border' : ''}`}
                value={selectedDoctorId}
                onChange={e => { setSelectedDoctorId(e.target.value); setErrors(p => ({ ...p, doctor: '' })); }}
              >
                <option value="">— Select Doctor —</option>
                {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.doctor && <div className="rf-field-err">{errors.doctor}</div>}
              {doctor?.address && <div className="rf-doc-addr">{doctor.address}</div>}
              {doctor?.phone && <div className="rf-doc-phone">Ph: {doctor.phone}</div>}
            </div>
          </div>

          {/* Title */}
          <div className="rf-title">CONSULTATION RECORD</div>

          {/* Receipt meta */}
          <div className="rf-meta-row">
            <div className="rf-meta-item">
              <span className="rf-meta-key">Receipt No.</span>
              <span className="rf-meta-val">#{receiptNumber}</span>
            </div>
            <div className="rf-meta-item">
              <span className="rf-meta-key">Date</span>
              <input type="date" className="rf-meta-date" value={appointmentDate}
                onChange={e => setAppointmentDate(e.target.value)} />
            </div>
            <div className="rf-meta-item">
              <span className="rf-meta-key">Payment</span>
              <div className="rf-pm">
                {(['CASH','ONLINE','FREE'] as const).map(m => (
                  <button key={m} type="button"
                    className={paymentMethod === m ? 'active' : ''}
                    onClick={() => setPaymentMethod(m)}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <hr className="rf-hr" />

          {/* Patient */}
          <div className="rf-section-lbl">PATIENT DETAILS</div>
          <div className="rf-patient-grid">
            <div className="rf-pf-row">
              <span className="rf-pf-key">Phone</span>
              <div className="rf-pf-val">
                <input className={`rf-pf-in${errors.patientPhone ? ' rf-err-border' : ''}`}
                  value={patientPhone} type="tel" maxLength={10}
                  placeholder="10-digit mobile"
                  onChange={e => { handlePhoneChange(e.target.value); setErrors(p => ({ ...p, patientPhone: '' })); }} />
                {errors.patientPhone && <span className="rf-field-err">{errors.patientPhone}</span>}
              </div>
            </div>
            <div className="rf-pf-row">
              <span className="rf-pf-key">Name</span>
              <div className="rf-pf-val">
                <input className={`rf-pf-in${errors.patientName ? ' rf-err-border' : ''}`}
                  value={patientName} placeholder="Full name"
                  onChange={e => { setPatientName(e.target.value); setErrors(p => ({ ...p, patientName: '' })); }} />
                {errors.patientName && <span className="rf-field-err">{errors.patientName}</span>}
              </div>
            </div>
            <div className="rf-pf-row">
              <span className="rf-pf-key">Date of Birth</span>
              <div className="rf-pf-val">
                <input className="rf-pf-in" type="date" value={patientDob}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setPatientDob(e.target.value)} />
                {patientDob && <span className="rf-age-note">Age: {patientAge}</span>}
              </div>
            </div>
            <div className="rf-pf-row">
              <span className="rf-pf-key">Gender</span>
              <select className="rf-pf-in" value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>

          <hr className="rf-hr" />

          {/* Diagnosis */}
          <div className="rf-section-lbl">DIAGNOSIS / CLINICAL NOTES</div>
          <textarea className="rf-diag" rows={3}
            placeholder="Enter diagnosis, symptoms, or clinical notes…"
            value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />

          <hr className="rf-hr" />

          {/* Medicines */}
          <div className="rf-section-lbl">PRESCRIBED MEDICINES</div>
          <table className="rf-svc-tbl">
            <thead>
              <tr>
                <th className="rf-th-no">No.</th>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Instructions</th>
                <th className="rf-th-del"></th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med, idx) => (
                <tr key={med.id}>
                  <td className="rf-td-no">{idx + 1}</td>
                  <td>
                    <input className="rf-pf-in" style={{ borderBottom: 'none' }}
                      value={med.name} placeholder="e.g. Paracetamol 500mg"
                      onChange={e => updateMedicine(med.id, 'name', e.target.value)} />
                  </td>
                  <td>
                    <input className="rf-pf-in" style={{ borderBottom: 'none' }}
                      value={med.dosage} placeholder="e.g. 1-0-1"
                      onChange={e => updateMedicine(med.id, 'dosage', e.target.value)} />
                  </td>
                  <td>
                    <input className="rf-pf-in" style={{ borderBottom: 'none' }}
                      value={med.duration} placeholder="e.g. 5 Days"
                      onChange={e => updateMedicine(med.id, 'duration', e.target.value)} />
                  </td>
                  <td>
                    <input className="rf-pf-in" style={{ borderBottom: 'none' }}
                      value={med.instructions} placeholder="e.g. After food"
                      onChange={e => updateMedicine(med.id, 'instructions', e.target.value)} />
                  </td>
                  <td className="rf-td-del">
                    <button type="button" className="rf-del-btn" onClick={() => removeMedicine(med.id)}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="rf-add-row" onClick={addMedicine}>
            <Plus size={12} /> Add Medicine
          </button>

          <hr className="rf-hr" />

          {/* Services */}
          <div className="rf-section-lbl">SERVICES & CHARGES</div>
          <table className="rf-svc-tbl">
            <thead>
              <tr>
                <th className="rf-th-no">No.</th>
                <th>Description</th>
                <th className="rf-th-amt">Amount (₹)</th>
                <th className="rf-th-del"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="rf-td-no">{idx + 1}</td>
                  <td>
                    <ServiceInput value={item.description} services={availableServices}
                      onChange={(d, a) => updateServiceRow(item.id, d, a)}
                      placeholder={idx === 0 ? 'e.g. Consultation Fee' : 'Service…'} />
                  </td>
                  <td className="rf-td-amt">
                    <input className={`rf-amt-in${paymentMethod === 'FREE' ? ' struck' : ''}`}
                      type="number" min="0"
                      value={item.amount === 0 ? '' : item.amount}
                      placeholder="0"
                      onChange={e => updateItem(item.id, 'amount', e.target.value === '' ? 0 : Number(e.target.value))} />
                  </td>
                  <td className="rf-td-del">
                    {items.length > 1 && (
                      <button type="button" className="rf-del-btn" onClick={() => removeItem(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {errors.items && <div className="rf-field-err" style={{margin:'4pt 0'}}>{errors.items}</div>}
          <button type="button" className="rf-add-row" onClick={addItem}>
            <Plus size={12} /> Add Service
          </button>

          {/* Total */}
          <div className="rf-total-bar">
            <span className="rf-total-lbl">
              Total Payable
              {paymentMethod === 'FREE' && <span className="rf-free-note"> (Free / Waived)</span>}
            </span>
            <span className="rf-total-val">
              {paymentMethod === 'FREE' && rawTotal > 0 && (
                <span className="rf-total-struck">₹{rawTotal.toFixed(2)}</span>
              )}
              ₹{total.toFixed(2)}
            </span>
          </div>

          {/* Footer */}
          <div className="rf-doc-footer">
            <div className="rf-terms">
              <span>• Computer-generated receipt.</span>
              <span>• Fees once paid are non-refundable.</span>
            </div>
            <div className="rf-sig">
              <div className="rf-sig-line" />
              <div className="rf-sig-lbl">Authorised Signatory</div>
            </div>
          </div>

        </div>{/* end a4 */}
      </div>{/* end canvas */}
      </div>{/* end rf-shell */}

      {/* Print template — only rendered when triggered */}
      {printReceipt && (
        <div className="print-only">
          <ReceiptPrint receipt={printReceipt} doctor={doctor} />
        </div>
      )}


      <style>{`
        /* Shell */
        .rf-shell {
          display: flex; flex-direction: column;
          height: calc(100vh - 64px);
          background: #d1d5db;
          overflow: hidden;
        }

        /* Toolbar */
        .rf-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 20px; background: white;
          border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
        }
        .rf-toolbar-left { display: flex; align-items: center; gap: 10px; }
        .rf-toolbar-label {
          font-size: 11px; font-weight: 700; color: #374151;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .rf-badge {
          font-size: 10px; font-weight: 600; padding: 2px 8px;
          border-radius: 10px; display: flex; align-items: center; gap: 3px;
        }
        .rf-badge.green { background: #dcfce7; color: #166534; }
        .rf-badge.blue  { background: #dbeafe; color: #1e40af; }
        .rf-toolbar-right { display: flex; gap: 6px; }
        .rf-tb {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 14px; font-size: 12px; font-weight: 600;
          border-radius: 6px; cursor: pointer; transition: all 0.15s;
        }
        .rf-tb.ghost   { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
        .rf-tb.ghost:hover { background: #e5e7eb; }
        .rf-tb.outline { background: white; color: #111; border: 1.5px solid #111; }
        .rf-tb.outline:hover { background: #111; color: white; }
        .rf-tb.outline:disabled { opacity: 0.4; cursor: not-allowed; }
        .rf-tb.primary { background: #0ea5e9; color: white; border: none;
          box-shadow: 0 2px 8px rgba(14,165,233,0.3); }
        .rf-tb.primary:hover { background: #0284c7; }

        /* Canvas */
        .rf-canvas {
          flex: 1; overflow-y: auto;
          display: flex; justify-content: center;
          padding: 24px 16px; background: #d1d5db;
        }

        /* A4 paper */
        .rf-a4 {
          width: 210mm; min-width: 210mm; max-width: 210mm;
          background: white;
          box-shadow: 0 4px 32px rgba(0,0,0,0.18);
          padding: 14mm 16mm;
          box-sizing: border-box;
          font-family: 'Times New Roman', Georgia, serif;
          font-size: 10.5pt;
          color: #111;
          display: flex; flex-direction: column; gap: 0;
        }

        /* Doctor header */
        .rf-doc-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 8pt; border-bottom: 2pt solid #111; margin-bottom: 8pt; gap: 12pt;
        }
        .rf-doc-hdr-left { flex: 1; }
        .rf-doc-name { font-size: 20pt; font-weight: 700; line-height: 1.1; color: #111; }
        .rf-doc-placeholder { color: #9ca3af; font-size: 13pt; font-style: italic; font-weight: 400; }
        .rf-doc-qual { font-size: 9pt; font-weight: 600; color: #222; margin-top: 2pt; }
        .rf-doc-spec { font-size: 8.5pt; color: #444; font-style: italic; }
        .rf-doc-hdr-right { text-align: right; min-width: 150pt; }
        .rf-doc-sel {
          width: 100%; padding: 3pt 5pt; font-family: sans-serif; font-size: 8pt;
          border: 1pt solid #d1d5db; border-radius: 3pt; background: #f9fafb;
          color: #111; margin-bottom: 4pt; cursor: pointer;
        }
        .rf-doc-sel:focus { outline: none; border-color: #0ea5e9; }
        .rf-doc-addr { font-size: 7.5pt; line-height: 1.5; white-space: pre-wrap; color: #333; margin-bottom: 2pt; }
        .rf-doc-phone { font-size: 7.5pt; font-weight: 600; color: #333; }

        /* Title */
        .rf-title {
          text-align: center; font-size: 11pt; font-weight: 700;
          letter-spacing: 3pt; border: 1pt solid #111;
          padding: 4pt 0; margin-bottom: 8pt; background: #f8f8f8;
          font-family: 'Times New Roman', serif;
        }

        /* Meta row */
        .rf-meta-row { display: flex; align-items: center; gap: 20pt; margin-bottom: 8pt; flex-wrap: wrap; }
        .rf-meta-item { display: flex; align-items: center; gap: 6pt; }
        .rf-meta-key { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5pt; color: #555; }
        .rf-meta-val { font-size: 11pt; font-weight: 700; color: #111; }
        .rf-meta-date {
          padding: 2pt 5pt; border: 1pt solid #d1d5db; border-radius: 3pt;
          font-family: sans-serif; font-size: 8.5pt; background: #f9fafb;
        }
        .rf-meta-date:focus { outline: none; border-color: #0ea5e9; }
        .rf-pm { display: flex; background: #f3f4f6; border: 1pt solid #d1d5db; border-radius: 4pt; overflow: hidden; }
        .rf-pm button {
          padding: 2pt 8pt; font-size: 7.5pt; font-weight: 700; border: none;
          background: transparent; color: #6b7280; cursor: pointer; font-family: sans-serif;
        }
        .rf-pm button.active { background: #0ea5e9; color: white; }

        /* Divider */
        .rf-hr { border: none; border-top: 0.75pt solid #d1d5db; margin: 7pt 0; }

        /* Section label */
        .rf-section-lbl {
          font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1pt; color: #555; margin-bottom: 5pt;
          border-bottom: 0.5pt solid #e5e7eb; padding-bottom: 2pt;
        }

        /* Patient fields */
        .rf-patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5pt 16pt; margin-bottom: 0; }
        .rf-pf-row { display: flex; align-items: flex-start; gap: 6pt; }
        .rf-pf-key {
          font-size: 8pt; font-weight: 600; color: #555; min-width: 62pt;
          padding-top: 3pt; white-space: nowrap;
        }
        .rf-pf-key::after { content: ':'; }
        .rf-pf-val { flex: 1; display: flex; flex-direction: column; gap: 2pt; }
        .rf-pf-in {
          width: 100%; padding: 3pt 0; border: none; border-bottom: 1pt solid #9ca3af;
          background: transparent; font-family: inherit; font-size: 9.5pt; color: #111;
          box-sizing: border-box;
        }
        .rf-pf-in:focus { outline: none; border-bottom-color: #0ea5e9; background: #f0f9ff; }
        .rf-pf-in::placeholder { color: #9ca3af; font-style: italic; font-size: 8.5pt; }
        .rf-age-note { font-size: 7.5pt; color: #0ea5e9; font-weight: 600; }
        .rf-err-border { border-color: #ef4444 !important; background: #fef2f2 !important; }
        .rf-field-err { font-size: 7pt; color: #ef4444; font-weight: 500; }

        /* Diagnosis */
        .rf-diag {
          width: 100%; padding: 5pt 6pt; border: 0.75pt solid #d1d5db; border-radius: 3pt;
          font-family: inherit; font-size: 9pt; color: #111; resize: vertical;
          background: #fafafa; line-height: 1.6; box-sizing: border-box; min-height: 48pt;
        }
        .rf-diag:focus { outline: none; border-color: #0ea5e9; background: white; }
        .rf-diag::placeholder { color: #9ca3af; font-style: italic; }

        /* Services table */
        .rf-svc-tbl { width: 100%; border-collapse: collapse; margin-bottom: 4pt; font-size: 9pt; }
        .rf-svc-tbl th {
          background: #f3f4f6; border: 0.75pt solid #d1d5db; padding: 3pt 6pt;
          font-size: 7.5pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.4pt; color: #374151; text-align: left;
        }
        .rf-svc-tbl td { border: 0.75pt solid #e5e7eb; padding: 1pt 3pt; vertical-align: middle; }
        .rf-th-no  { width: 22pt; text-align: center; }
        .rf-th-amt { width: 68pt; text-align: right; }
        .rf-th-del { width: 18pt; }
        .rf-td-no  { text-align: center; color: #6b7280; font-size: 8.5pt; }
        .rf-td-amt { text-align: right; }
        .rf-td-del { text-align: center; }

        /* Service combobox */
        .svc-wrap { position: relative; width: 100%; }
        .svc-in {
          width: 100%; padding: 2pt 4pt; border: none; background: transparent;
          font-family: inherit; font-size: 9pt; color: #111;
        }
        .svc-in:focus { outline: none; background: #f0f9ff; }

        .rf-amt-in {
          width: 100%; padding: 2pt 4pt; border: none; background: transparent;
          font-family: inherit; font-size: 9pt; text-align: right; color: #111;
        }
        .rf-amt-in:focus { outline: none; background: #f0f9ff; }
        .rf-amt-in.struck { text-decoration: line-through; color: #9ca3af; }
        .rf-del-btn {
          width: 16pt; height: 16pt; display: flex; align-items: center; justify-content: center;
          border-radius: 3pt; border: 0.75pt solid #fca5a5; color: #ef4444;
          background: #fef2f2; cursor: pointer;
        }
        .rf-del-btn:hover { background: #fee2e2; }
        .rf-add-row {
          display: flex; align-items: center; gap: 4pt; padding: 3pt 10pt;
          font-size: 8pt; font-weight: 600; color: #0ea5e9; background: #f0f9ff;
          border: 0.75pt dashed #0ea5e9; border-radius: 3pt; cursor: pointer;
          font-family: sans-serif; margin-bottom: 8pt;
        }
        .rf-add-row:hover { background: #e0f2fe; border-style: solid; }

        /* Total */
        .rf-total-bar {
          display: flex; justify-content: flex-end; align-items: center; gap: 14pt;
          border-top: 1.5pt solid #111; padding-top: 6pt; margin-bottom: 10pt;
        }
        .rf-total-lbl { font-size: 9.5pt; font-weight: 700; color: #111; }
        .rf-free-note  { font-size: 7.5pt; color: #6b7280; font-weight: 400; }
        .rf-total-val  { font-size: 13pt; font-weight: 700; color: #111; display: flex; align-items: center; gap: 8pt; }
        .rf-total-struck { font-size: 9pt; color: #9ca3af; text-decoration: line-through; font-weight: 400; }

        /* Footer */
        .rf-doc-footer {
          margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;
          border-top: 0.75pt solid #9ca3af; padding-top: 6pt;
        }
        .rf-terms { font-size: 7pt; color: #6b7280; line-height: 1.8; display: flex; flex-direction: column; }
        .rf-sig { text-align: center; min-width: 90pt; }
        .rf-sig-line { border-top: 1pt solid #111; width: 80pt; margin: 0 auto 3pt; }
        .rf-sig-lbl { font-size: 7.5pt; font-weight: 600; color: #111; }

        /* Print */
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
      `}</style>
    </>
  );
};

export default ReceiptForm;

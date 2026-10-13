// src/components/ClinicRegistration.tsx
// 5-step Free Trial Onboarding Wizard for new clinics

import React, { useState } from 'react';
import {
  ArrowRight, ArrowLeft, Check, Building2, Stethoscope,
  Briefcase, KeyRound, CheckCircle2, X, Loader2, AlertCircle,
} from 'lucide-react';
import { setActivePlan } from '../lib/planConfig';
import logoImg from '../assets/logo.png';

interface Props {
  onComplete: () => void;
  onBack?: () => void;
  onCancel?: () => void;
}

const STEP_LABELS = ['Clinic', 'Doctor', 'Services', 'PIN Setup', 'Ready!'];

const DEFAULT_SERVICES = [
  { name: 'General Consultation', amount: 500 },
  { name: 'Follow-up Consultation', amount: 300 },
  { name: 'ECG', amount: 800 },
  { name: 'Blood Test', amount: 400 },
];

const SPECIALITIES = [
  'General Medicine', 'Pediatrics', 'Cardiology', 'Orthopedics',
  'Dermatology', 'Gynecology', 'ENT', 'Ophthalmology',
  'Neurology', 'Psychiatry', 'Dental', 'Ayurveda / Homeopathy', 'Other',
];

interface ClinicData {
  name: string;
  ownerName: string;
  ownerEmail: string;
  speciality: string;
  city: string;
  phone: string;
  address: string;
}

interface DoctorData {
  name: string;
  specialization: string;
  qualifications: string;
  registrationNumber: string;
}

interface ServiceItem {
  id: string;
  name: string;
  amount: string;
}

export const ClinicRegistration: React.FC<Props> = ({ onComplete, onBack, onCancel }) => {
  const handleCancelNavigation = onBack || onCancel;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [clinic, setClinic] = useState<ClinicData>({
    name: '',
    ownerName: '',
    ownerEmail: '',
    speciality: 'General Medicine',
    city: '',
    phone: '',
    address: '',
  });

  const [doctor, setDoctor] = useState<DoctorData>({
    name: '',
    specialization: '',
    qualifications: '',
    registrationNumber: '',
  });

  const [services, setServices] = useState<ServiceItem[]>(
    DEFAULT_SERVICES.map((s, i) => ({ id: String(i), name: s.name, amount: String(s.amount) }))
  );

  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation ────────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!clinic.name.trim()) errs.name = 'Clinic name is required';
      if (!clinic.ownerName.trim()) errs.ownerName = 'Your name is required';
      if (!clinic.city.trim()) errs.city = 'City is required';
    }
    if (step === 1) {
      if (!doctor.name.trim()) errs.doctorName = 'Doctor name is required';
      if (!doctor.specialization.trim()) errs.specialization = 'Specialization is required';
    }
    if (step === 3) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) errs.pin = 'PIN must be exactly 4 digits';
      if (pin !== pinConfirm) errs.pinConfirm = 'PINs don\'t match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  // ── Service management ────────────────────────────────────────────────
  const updateService = (id: string, field: 'name' | 'amount', value: string) => {
    setServices(services.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const addService = () => {
    setServices([...services, { id: Date.now().toString(), name: '', amount: '' }]);
  };

  // ── Final setup ───────────────────────────────────────────────────────
  const handleFinish = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900)); // Simulate setup

    // Store clinic data in localStorage (web mode — no Electron IPC)
    const clinicId = `clinic-${Date.now()}`;
    const clinicData = {
      id: clinicId,
      ...clinic,
      plan: 'free_trial',
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('clinvo_clinic', JSON.stringify(clinicData));
      localStorage.setItem('clinvo_active_plan', 'free_trial');
      localStorage.setItem('clinvo_trial_receipt_count', '0');

      // Store doctors
      const doctorData = [{
        id: `doc-${Date.now()}`,
        name: doctor.name || clinic.ownerName,
        specialization: doctor.specialization || clinic.speciality,
        qualifications: doctor.qualifications,
        registrationNumber: doctor.registrationNumber,
        isActive: true,
      }];
      localStorage.setItem('clinvo_doctors', JSON.stringify(doctorData));
      localStorage.setItem('clinvo_web_doctors', JSON.stringify(doctorData));

      // Store services
      const serviceData = services
        .filter(s => s.name.trim())
        .map((s, i) => ({ id: `svc-${i}-${Date.now()}`, name: s.name.trim(), amount: parseFloat(s.amount) || 0 }));
      localStorage.setItem('clinvo_services', JSON.stringify(serviceData));
      localStorage.setItem('clinvo_web_services', JSON.stringify(serviceData));

      // Store app PIN if set
      if (pin && pin.length === 4) {
        localStorage.setItem('clinvo_setup_complete', 'true');
      }

      // Register with Platform Super Admin console if available
      // @ts-ignore
      if (typeof window !== 'undefined' && window.platformAdmin && window.platformAdmin.registerClinic) {
        // @ts-ignore
        window.platformAdmin.registerClinic({
          id: clinicId,
          name: clinic.name,
          ownerName: clinic.ownerName,
          ownerEmail: clinic.ownerEmail || 'doctor@' + clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.in',
          ownerPhone: clinic.phone,
          speciality: clinic.speciality,
          city: clinic.city,
          address: clinic.address,
          plan: 'Starter Trial',
          status: 'trial',
          doctorsCount: 1,
          staffCount: 1,
        });
      }

      // Set plan
      setActivePlan('free_trial');
    } catch (e) {
      console.error('Setup failed:', e);
    }

    setLoading(false);
    setStep(4); // Success step
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="wizard-root">

      {/* Nav bar */}
      <nav className="wizard-nav">
        <div className="lp-nav-logo" onClick={handleCancelNavigation} style={{ cursor: 'pointer' }}>
          <img src={logoImg} alt="Clinvo" style={{ height: 28 }} />
          <span className="lp-nav-wordmark">Clinvo</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>
          Free Trial Setup · 30 receipts, no card required
        </div>
        {handleCancelNavigation && (
          <button
            onClick={handleCancelNavigation}
            style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <X size={14} /> Cancel
          </button>
        )}
      </nav>

      {/* Step progress */}
      {step < 4 && (
        <div className="wizard-progress">
          {STEP_LABELS.slice(0, 4).map((label, i) => (
            <React.Fragment key={label}>
              <div className="wizard-step-dot">
                <div className={`wizard-step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className={`wizard-step-label ${i === step ? 'active' : ''}`}>{label}</span>
              </div>
              {i < 3 && <div className={`wizard-connector ${i < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 0 — Clinic Profile */}
      {step === 0 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <Building2 size={20} style={{ color: 'var(--brand)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Clinic Profile</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
              Basic information about your clinic. This appears on receipts.
            </p>
          </div>
          <div className="wizard-card-body">
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-clinic-name">Clinic Name *</label>
                <input id="wiz-clinic-name" className="wizard-input" value={clinic.name} onChange={e => setClinic({ ...clinic, name: e.target.value })} placeholder="e.g. Apex Multispecialty Clinic" />
                {errors.name && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.name}</span>}
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-speciality">Speciality</label>
                <select id="wiz-speciality" className="wizard-input" value={clinic.speciality} onChange={e => setClinic({ ...clinic, speciality: e.target.value })}>
                  {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-owner-name">Owner / Doctor Name *</label>
                <input id="wiz-owner-name" className="wizard-input" value={clinic.ownerName} onChange={e => setClinic({ ...clinic, ownerName: e.target.value })} placeholder="Dr. Your Name" />
                {errors.ownerName && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.ownerName}</span>}
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-city">City *</label>
                <input id="wiz-city" className="wizard-input" value={clinic.city} onChange={e => setClinic({ ...clinic, city: e.target.value })} placeholder="e.g. New Delhi" />
                {errors.city && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.city}</span>}
              </div>
            </div>
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-email">Email (optional)</label>
                <input id="wiz-email" className="wizard-input" type="email" value={clinic.ownerEmail} onChange={e => setClinic({ ...clinic, ownerEmail: e.target.value })} placeholder="doctor@yourclinic.com" />
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-phone">Phone (optional)</label>
                <input id="wiz-phone" className="wizard-input" type="tel" value={clinic.phone} onChange={e => setClinic({ ...clinic, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="wizard-form-group">
              <label htmlFor="wiz-address">Clinic Address (optional)</label>
              <input id="wiz-address" className="wizard-input" value={clinic.address} onChange={e => setClinic({ ...clinic, address: e.target.value })} placeholder="Building, Street, City — appears on receipts" />
            </div>
          </div>
          <div className="wizard-card-footer">
            <div />
            <button id="wiz-step0-next" className="lp-btn lp-btn--brand lp-btn--lg" onClick={next}>
              Next: Add Doctor <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 1 — First Doctor */}
      {step === 1 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <Stethoscope size={20} style={{ color: 'var(--brand)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>First Doctor</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
              Your clinic's primary physician. Appears on receipts. You can add more doctors later.
            </p>
          </div>
          <div className="wizard-card-body">
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-doc-name">Doctor Name *</label>
                <input id="wiz-doc-name" className="wizard-input" value={doctor.name} onChange={e => setDoctor({ ...doctor, name: e.target.value })} placeholder={`Dr. ${clinic.ownerName || 'Your Name'}`} />
                {errors.doctorName && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.doctorName}</span>}
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-doc-spec">Specialization *</label>
                <input id="wiz-doc-spec" className="wizard-input" value={doctor.specialization} onChange={e => setDoctor({ ...doctor, specialization: e.target.value })} placeholder={clinic.speciality || 'General Physician'} />
                {errors.specialization && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.specialization}</span>}
              </div>
            </div>
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-doc-qual">Qualifications</label>
                <input id="wiz-doc-qual" className="wizard-input" value={doctor.qualifications} onChange={e => setDoctor({ ...doctor, qualifications: e.target.value })} placeholder="MBBS, MD — printed on receipts" />
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-doc-reg">MCI / State Reg. Number</label>
                <input id="wiz-doc-reg" className="wizard-input" value={doctor.registrationNumber} onChange={e => setDoctor({ ...doctor, registrationNumber: e.target.value })} placeholder="e.g. MCI-DEL-2009-4412" />
              </div>
            </div>
          </div>
          <div className="wizard-card-footer">
            <button className="lp-btn lp-btn--ghost" onClick={prev}>
              <ArrowLeft size={14} /> Back
            </button>
            <button id="wiz-step1-next" className="lp-btn lp-btn--brand lp-btn--lg" onClick={next}>
              Next: Services <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Services */}
      {step === 2 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <Briefcase size={20} style={{ color: 'var(--brand)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>OPD Services & Rates</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
              These appear as selectable line items when generating receipts. Edit, remove, or add your own.
            </p>
          </div>
          <div className="wizard-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {services.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    className="wizard-input"
                    placeholder="Service name"
                    value={s.name}
                    onChange={e => updateService(s.id, 'name', e.target.value)}
                    style={{ flex: 3 }}
                  />
                  <div style={{ position: 'relative', flex: 1, minWidth: '100px' }}>
                    <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)', fontSize: '0.9rem', pointerEvents: 'none' }}>₹</span>
                    <input
                      className="wizard-input"
                      type="number"
                      min={0}
                      placeholder="500"
                      value={s.amount}
                      onChange={e => updateService(s.id, 'amount', e.target.value)}
                      style={{ paddingLeft: '1.6rem' }}
                    />
                  </div>
                  <button onClick={() => removeService(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }} aria-label="Remove">
                    <X size={15} />
                  </button>
                </div>
              ))}
              <button
                onClick={addService}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem', background: 'var(--surface-raised)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--ink-faint)', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                id="wiz-add-service-btn"
              >
                + Add Another Service
              </button>
            </div>
          </div>
          <div className="wizard-card-footer">
            <button className="lp-btn lp-btn--ghost" onClick={prev}>
              <ArrowLeft size={14} /> Back
            </button>
            <button id="wiz-step2-next" className="lp-btn lp-btn--brand lp-btn--lg" onClick={next}>
              Next: Set PIN <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — PIN Setup */}
      {step === 3 && (
        <div className="wizard-card">
          <div className="wizard-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <KeyRound size={20} style={{ color: 'var(--brand)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Master PIN</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: 0 }}>
              This 4-digit PIN locks your clinic app. You can skip this and set it later in Settings.
            </p>
          </div>
          <div className="wizard-card-body">
            <div className="wizard-grid-2">
              <div className="wizard-form-group">
                <label htmlFor="wiz-pin">4-Digit PIN</label>
                <input
                  id="wiz-pin"
                  className="wizard-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors({}); }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
                />
                {errors.pin && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.pin}</span>}
              </div>
              <div className="wizard-form-group">
                <label htmlFor="wiz-pin-confirm">Confirm PIN</label>
                <input
                  id="wiz-pin-confirm"
                  className="wizard-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pinConfirm}
                  onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors({}); }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center' }}
                />
                {errors.pinConfirm && <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{errors.pinConfirm}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.85rem', background: 'var(--brand-light)', border: '1px solid var(--brand-mid)', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem', color: 'var(--brand-hover)' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>Remember this PIN — it locks your clinic's billing data. You can reset it using your Recovery Key from Settings.</span>
            </div>
          </div>
          <div className="wizard-card-footer">
            <button className="lp-btn lp-btn--ghost" onClick={prev}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button id="wiz-skip-pin-btn" className="lp-btn lp-btn--ghost" onClick={() => setStep(4)}>
                Skip for now
              </button>
              <button id="wiz-step3-next" className="lp-btn lp-btn--brand lp-btn--lg" onClick={() => { if (validateStep()) handleFinish(); }}>
                {loading ? <><Loader2 size={14} style={{ animation: 'lp-spin 0.8s linear infinite' }} /> Setting up…</> : <>Finish Setup <Check size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Success */}
      {step === 4 && (
        <div className="wizard-card" style={{ maxWidth: 580 }}>
          <div className="wizard-success">
            <div className="wizard-success-icon">
              <CheckCircle2 size={36} />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--ink)' }}>
              Your clinic is ready.
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink-muted)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto' }}>
              <strong>{clinic.name || 'Your Clinic'}</strong> is set up and ready for billing.
              Your free trial starts now.
            </p>

            <div className="wizard-trial-pill">
              ⏳ 30 free receipts · No credit card required
            </div>

            <div style={{ width: '100%', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'left' }}>
              {[
                'Issue receipts — select a service, enter patient name, done.',
                'Track financial summaries by day, week, or month.',
                'Add more doctors and staff from the Settings tab.',
                'When your 30 receipts are used, enter a license key to continue.',
              ].map((tip) => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
                  <CheckCircle2 size={14} style={{ color: 'var(--brand)', flexShrink: 0, marginTop: '2px' }} />
                  {tip}
                </div>
              ))}
            </div>

            <button
              id="wiz-open-clinic-btn"
              className="lp-btn lp-btn--brand lp-btn--lg"
              onClick={onComplete}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Open My Clinic <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

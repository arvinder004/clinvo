// src/components/LandingPage.tsx
// Clinvo Marketing Landing Page — Clinical Precision Design

import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowRight, CheckCircle2, Lock, Download, MessageCircle, Mail,
  ChevronRight, Stethoscope, Receipt, Users, ShieldCheck,
  Clock, Zap,
} from 'lucide-react';
import logoImg from '../assets/logo.png';

interface Props {
  onStartOnboarding: () => void;
  onOpenClinicApp: () => void;
  onOpenPlatformAdmin: () => void;
}

// ── Plan feature row helper ────────────────────────────────────────────────────
const Feat: React.FC<{ available: boolean; children: React.ReactNode }> = ({ available, children }) => (
  <li className={`lp-plan-feature ${available ? '' : 'locked'}`}>
    {available ? (
      <CheckCircle2 size={16} className="lp-plan-feature-icon lp-plan-feature-icon--check" />
    ) : (
      <Lock size={13} className="lp-plan-feature-icon lp-plan-feature-icon--lock" />
    )}
    {children}
  </li>
);

// ── Mock Receipt visual ────────────────────────────────────────────────────────
const MockReceipt: React.FC = () => (
  <div className="lp-feature-visual">
    <div className="lp-feature-visual-header">
      <div className="lp-feature-visual-dot" style={{ background: '#ff5f57' }} />
      <div className="lp-feature-visual-dot" style={{ background: '#febc2e' }} />
      <div className="lp-feature-visual-dot" style={{ background: '#28c840' }} />
      <span className="lp-feature-visual-title">New Receipt — Apex Clinic</span>
    </div>
    <div className="lp-feature-visual-body">
      <div className="lp-mock-receipt">
        <div className="lp-mock-receipt-header">
          <div>
            <div className="lp-mock-clinic-name">Apex Multispecialty Clinic</div>
            <div className="lp-mock-receipt-num">INV-2026-0041</div>
          </div>
          <span className="lp-mock-badge lp-mock-badge--green">CASH</span>
        </div>
        <div className="lp-mock-row">
          <div className="lp-mock-field">
            <div className="lp-mock-label">Patient</div>
            <div className="lp-mock-value">Sunil Mehra</div>
          </div>
          <div className="lp-mock-field">
            <div className="lp-mock-label">Doctor</div>
            <div className="lp-mock-value">Dr. R. Sharma</div>
          </div>
        </div>
        <div className="lp-mock-row">
          <div className="lp-mock-field">
            <div className="lp-mock-label">Age / Gender</div>
            <div className="lp-mock-value">46 yrs · Male</div>
          </div>
          <div className="lp-mock-field">
            <div className="lp-mock-label">Date</div>
            <div className="lp-mock-value">13 Oct 2026</div>
          </div>
        </div>
        <div style={{ marginTop: '0.25rem' }}>
          <div className="lp-mock-service-row">
            <span className="lp-mock-service-name">Cardiology Consultation</span>
            <span className="lp-mock-service-amount">₹1,500</span>
          </div>
          <div className="lp-mock-service-row">
            <span className="lp-mock-service-name">12-Lead ECG</span>
            <span className="lp-mock-service-amount">₹600</span>
          </div>
        </div>
        <div className="lp-mock-total">
          <span>Total</span>
          <span className="lp-mock-total-amount">₹2,100</span>
        </div>
      </div>
    </div>
  </div>
);

// ── Mock Staff Login visual ────────────────────────────────────────────────────
const MockStaffLogin: React.FC = () => (
  <div className="lp-feature-visual">
    <div className="lp-feature-visual-header">
      <div className="lp-feature-visual-dot" style={{ background: '#ff5f57' }} />
      <div className="lp-feature-visual-dot" style={{ background: '#febc2e' }} />
      <div className="lp-feature-visual-dot" style={{ background: '#28c840' }} />
      <span className="lp-feature-visual-title">Staff Login — Apex Clinic</span>
    </div>
    <div className="lp-feature-visual-body">
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
        Who's logging in today?
      </div>
      <div className="lp-mock-staff-grid">
        {[
          { name: 'Dr. Rajesh Sharma', role: 'Cardiologist', color: '#1a6b4a', initials: 'RS' },
          { name: 'Dr. Preeti Kapoor', role: 'Physician', color: '#1d4ed8', initials: 'PK' },
          { name: 'Pooja Verma', role: 'Receptionist', color: '#7c3aed', initials: 'PV' },
          { name: 'Rohan Mehra', role: 'Billing Admin', color: '#d97706', initials: 'RM' },
        ].map((s) => (
          <div key={s.name} className="lp-mock-staff-card">
            <div className="lp-mock-avatar" style={{ background: s.color }}>
              {s.initials}
            </div>
            <div className="lp-mock-staff-name">{s.name}</div>
            <div className="lp-mock-staff-role">{s.role}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {['●', '●', '●', '●'].map((d, i) => <span key={i} style={{ fontSize: '0.6rem', color: 'var(--brand)' }}>{d}</span>)}
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', flex: 1 }}>Enter PIN</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)', cursor: 'pointer' }}>Unlock →</span>
      </div>
    </div>
  </div>
);

// ── Mock Financial Dashboard visual ───────────────────────────────────────────
const MockFinancials: React.FC = () => {
  const bars = [
    { month: 'Jun', height: 55, amount: '₹38k' },
    { month: 'Jul', height: 72, amount: '₹51k' },
    { month: 'Aug', height: 88, amount: '₹62k' },
    { month: 'Sep', height: 65, amount: '₹46k' },
    { month: 'Oct', height: 100, amount: '₹71k' },
  ];

  return (
    <div className="lp-feature-visual">
      <div className="lp-feature-visual-header">
        <div className="lp-feature-visual-dot" style={{ background: '#ff5f57' }} />
        <div className="lp-feature-visual-dot" style={{ background: '#febc2e' }} />
        <div className="lp-feature-visual-dot" style={{ background: '#28c840' }} />
        <span className="lp-feature-visual-title">Financial Summary — Oct 2026</span>
      </div>
      <div className="lp-feature-visual-body">
        <div className="lp-mock-stats-row">
          <div className="lp-mock-stat-card">
            <div className="lp-mock-stat-val">₹71k</div>
            <div className="lp-mock-stat-lbl">This Month</div>
          </div>
          <div className="lp-mock-stat-card">
            <div className="lp-mock-stat-val">128</div>
            <div className="lp-mock-stat-lbl">Receipts</div>
          </div>
          <div className="lp-mock-stat-card">
            <div className="lp-mock-stat-val">+18%</div>
            <div className="lp-mock-stat-lbl">vs Last Mo.</div>
          </div>
        </div>
        <div className="lp-mock-chart">
          {bars.map((b) => (
            <div key={b.month} className="lp-mock-chart-bar">
              <span style={{ fontSize: '0.62rem', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>{b.amount}</span>
              <div
                className="lp-mock-bar"
                style={{ height: `${b.height}%`, background: b.month === 'Oct' ? 'var(--brand)' : 'var(--brand-mid)' }}
              />
              <span className="lp-mock-bar-label">{b.month}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {[{ label: 'Cash', pct: '62%', color: 'var(--brand)' }, { label: 'Online', pct: '28%', color: '#1d4ed8' }, { label: 'Free', pct: '10%', color: 'var(--ink-faint)' }].map(p => (
            <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.73rem', color: 'var(--ink-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', padding: '0.2rem 0.6rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              {p.label} {p.pct}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const LandingPage: React.FC<Props> = ({ onStartOnboarding, onOpenClinicApp, onOpenPlatformAdmin }) => {
  const [scrolled, setScrolled] = useState(false);
  const pricingRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const howRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-root">

      {/* ════════════════════════════════════════
          NAV
      ════════════════════════════════════════ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logoImg} alt="Clinvo" />
            <span className="lp-nav-wordmark">Clinvo</span>
          </div>

          <ul className="lp-nav-links">
            <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo(featuresRef); }}>Features</a></li>
            <li><a href="#how" onClick={(e) => { e.preventDefault(); scrollTo(howRef); }}>How it works</a></li>
            <li><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo(pricingRef); }}>Pricing</a></li>
            <li><a href="#contact" onClick={(e) => { e.preventDefault(); scrollTo(contactRef); }}>Buy a key</a></li>
          </ul>

          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn--ghost" onClick={onOpenClinicApp} id="nav-sign-in-btn">
              Sign In
            </button>
            <button className="lp-btn lp-btn--brand" onClick={onStartOnboarding} id="nav-free-trial-btn">
              Start for Free <ArrowRight size={13} />
            </button>
            {/* Hidden admin link — triple-click logo or visit #/admin */}
            <button
              onClick={onOpenPlatformAdmin}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
              aria-hidden="true"
              id="hidden-admin-btn"
            />
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-inner">
            {/* Left — editorial block */}
            <div>
              <div className="lp-hero-eyebrow">
                <span className="lp-hero-eyebrow-dot" />
                Built for clinics in India
              </div>

              <h1 className="lp-hero-headline">
                The billing system your<br />
                clinic actually <em>deserves.</em>
              </h1>

              <p className="lp-hero-subline">
                Built for solo practitioners and small clinics in India.
                Issue receipts, track payments, and manage your team —
                without the complexity of hospital-grade software.
              </p>

              <div className="lp-hero-ctas">
                <button
                  id="hero-free-trial-btn"
                  className="lp-btn lp-btn--brand lp-btn--lg"
                  onClick={onStartOnboarding}
                >
                  Start for Free <ArrowRight size={15} />
                </button>
                <button
                  id="hero-download-btn"
                  className="lp-btn lp-btn--brand-outline lp-btn--lg"
                  onClick={() => {}}
                >
                  <Download size={15} />
                  Desktop App
                </button>
              </div>

              <div className="lp-hero-stats">
                <div className="lp-hero-stat">
                  <div className="lp-hero-stat-number">30</div>
                  <div className="lp-hero-stat-label">Free receipts, no card</div>
                </div>
                <div className="lp-hero-stat-divider" />
                <div className="lp-hero-stat">
                  <div className="lp-hero-stat-number">&lt;30s</div>
                  <div className="lp-hero-stat-label">Receipt generation time</div>
                </div>
                <div className="lp-hero-stat-divider" />
                <div className="lp-hero-stat">
                  <div className="lp-hero-stat-number">GDPR</div>
                  <div className="lp-hero-stat-label">Patient data compliant</div>
                </div>
              </div>
            </div>

            {/* Right — mockup */}
            <div className="lp-hero-visual">
              <div className="lp-hero-mockup">
                <div className="lp-hero-mockup-bar">
                  <div className="lp-hero-mockup-dot" style={{ background: '#ff5f57' }} />
                  <div className="lp-hero-mockup-dot" style={{ background: '#febc2e' }} />
                  <div className="lp-hero-mockup-dot" style={{ background: '#28c840' }} />
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                    clinvo — Receipt Form
                  </span>
                </div>
                <div className="lp-hero-mockup-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Doctor row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      {[{ label: 'Doctor', value: 'Dr. Rajesh Sharma' }, { label: 'Date', value: '13 Oct 2026' }].map(f => (
                        <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink-placeholder)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 500, background: 'var(--surface-raised)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Patient */}
                    {[{ label: 'Patient Name', value: 'Sunil Mehra' }, { label: 'Diagnosis (optional)', value: 'Hypertension follow-up, BP controlled' }].map(f => (
                      <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink-placeholder)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 500, background: 'var(--surface-raised)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{f.value}</div>
                      </div>
                    ))}
                    {/* Services */}
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink-placeholder)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Services</div>
                      {[{ name: 'Cardiology Consultation', amount: '₹1,500' }, { name: '12-Lead ECG', amount: '₹600' }].map(s => (
                        <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{s.name}</span>
                          <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{s.amount}</span>
                        </div>
                      ))}
                    </div>
                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--brand)', borderRadius: 'var(--radius)', color: '#fff' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Total</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem' }}>₹2,100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TRUST BAR
      ════════════════════════════════════════ */}
      <div className="lp-trust">
        <div className="lp-container">
          <div className="lp-trust-inner">
            <span className="lp-trust-label">Used by clinics across</span>
            <div className="lp-trust-divider" />
            {[
              { icon: <Stethoscope size={14} />, label: 'General Medicine' },
              { icon: <Users size={14} />, label: 'Pediatrics' },
              { icon: <ShieldCheck size={14} />, label: 'Orthopedics' },
              { icon: <Zap size={14} />, label: 'Dermatology' },
              { icon: <Receipt size={14} />, label: 'Diagnostics' },
            ].map(({ icon, label }) => (
              <React.Fragment key={label}>
                <div className="lp-trust-badge">
                  {icon}
                  {label}
                </div>
                <div className="lp-trust-divider" />
              </React.Fragment>
            ))}
            <span className="lp-trust-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={13} style={{ color: 'var(--brand)' }} /> GDPR compliant patient data
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          FEATURES — Alternating editorial rows
      ════════════════════════════════════════ */}
      <section className="lp-section" id="features" ref={featuresRef as any}>
        <div className="lp-container">
          <div className="lp-features-intro">
            <div className="lp-section-tag">
              <Zap size={12} /> What Clinvo does
            </div>
            <h2 className="lp-section-heading">
              Everything a clinic needs.<br />Nothing it doesn't.
            </h2>
            <p className="lp-section-sub">
              Designed for the rhythm of a busy consultation room —
              not for a hospital IT department.
            </p>
          </div>

          {/* Row 1 — Receipt generation */}
          <div className="lp-feature-row">
            <MockReceipt />
            <div className="lp-feature-text">
              <div className="lp-feature-number">01 — Billing</div>
              <h3 className="lp-feature-title">Receipt generation in under 30 seconds</h3>
              <p className="lp-feature-body">
                Select a doctor, choose services from your preset list, add the patient's name and diagnosis —
                and the receipt is ready. Print it or save it as a PDF without leaving the screen.
              </p>
              <ul className="lp-feature-checklist">
                <li>Doctor-attributed receipts with specialization</li>
                <li>Diagnosis field with Article 9 patient consent logging</li>
                <li>Auto-calculated totals across multiple services</li>
                <li>Cash, Online, Card, Free, and Insurance payment modes</li>
              </ul>
            </div>
          </div>

          {/* Row 2 — Staff logins */}
          <div className="lp-feature-row lp-feature-row--reverse">
            <div className="lp-feature-text">
              <div className="lp-feature-number">02 — Team</div>
              <h3 className="lp-feature-title">Every doctor, every role — one license</h3>
              <p className="lp-feature-body">
                Receptionists, doctors, and billing admins all log in with their own PIN to the same
                shared clinic data. No separate accounts. No extra cost per user.
              </p>
              <ul className="lp-feature-checklist">
                <li>Role-based access: receptionist sees billing, doctor sees history</li>
                <li>PIN-based login — no passwords for counter staff to forget</li>
                <li>Owner can add, edit, or remove staff from the admin panel</li>
                <li>Auto-lock after inactivity to protect patient data</li>
              </ul>
            </div>
            <MockStaffLogin />
          </div>

          {/* Row 3 — Financials */}
          <div className="lp-feature-row">
            <MockFinancials />
            <div className="lp-feature-text">
              <div className="lp-feature-number">03 — Financials</div>
              <h3 className="lp-feature-title">Financials you can actually read</h3>
              <p className="lp-feature-body">
                Monthly totals, weekly breakdowns, and payment method splits — all in one view.
                Export to CSV for your accountant without calling your IT guy.
              </p>
              <ul className="lp-feature-checklist">
                <li>Filter by date range, doctor, or payment method</li>
                <li>Monthly and weekly revenue trend charts</li>
                <li>One-click CSV export for GST and accounting purposes</li>
                <li>Total OPD footfall count alongside revenue</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════ */}
      <section className="lp-section lp-section--alt" id="how-it-works" ref={howRef as any}>
        <div className="lp-container">
          <div style={{ textAlign: 'center' }}>
            <div className="lp-section-tag">
              <Clock size={12} /> Getting started
            </div>
            <h2 className="lp-section-heading">Up and running in 5 minutes</h2>
            <p className="lp-section-sub" style={{ margin: '0 auto' }}>
              No installation guides. No training sessions. No support tickets on day one.
            </p>
          </div>

          <div className="lp-how-grid">
            {[
              {
                num: '01',
                title: 'Create your clinic profile',
                body: 'Add your clinic name, speciality, and city. Then set up your doctors and services — we suggest defaults to get you going.',
              },
              {
                num: '02',
                title: 'Issue receipts from day one',
                body: 'Your 30 free receipts start the moment your clinic is created. No credit card, no verification calls.',
              },
              {
                num: '03',
                title: 'Buy a key when you\'re ready',
                body: 'When the trial ends, contact us on WhatsApp or email. You\'ll have your license key within 2–4 hours. Enter it directly in the app.',
              },
            ].map((step) => (
              <div key={step.num} className="lp-how-step">
                <div className="lp-how-num">{step.num}</div>
                <div className="lp-how-title">{step.title}</div>
                <div className="lp-how-body">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRICING
      ════════════════════════════════════════ */}
      <section className="lp-section" id="pricing" ref={pricingRef as any}>
        <div className="lp-container">
          <div className="lp-pricing-intro">
            <div className="lp-section-tag">
              <Receipt size={12} /> Plans
            </div>
            <h2 className="lp-section-heading">Straightforward pricing</h2>
            <p className="lp-section-sub" style={{ margin: '0 auto' }}>
              Try the full system free for 30 receipts. No credit card required.
              Upgrade when you're ready — or ask us a question first.
            </p>
          </div>

          <div className="lp-pricing-grid">

            {/* Free Trial */}
            <div className="lp-plan-card" id="plan-free-trial">
              <div>
                <div className="lp-plan-name">Free Trial</div>
                <div className="lp-plan-price-row" style={{ marginTop: '0.75rem' }}>
                  <span className="lp-plan-price-currency">₹</span>
                  <span className="lp-plan-price">0</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', marginTop: '0.25rem' }}>30 receipts, no card needed</div>
              </div>
              <div className="lp-plan-desc">
                Everything you need to evaluate Clinvo for your clinic.
                No time limit — just a receipt cap.
              </div>
              <ul className="lp-plan-features">
                <Feat available={true}>1 staff login</Feat>
                <Feat available={true}>30 receipts total</Feat>
                <Feat available={true}>Receipt history (last 7 days)</Feat>
                <Feat available={true}>PDF receipt download</Feat>
                <Feat available={false}>Multiple staff logins</Feat>
                <Feat available={false}>Financial reports & CSV</Feat>
                <Feat available={false}>Custom clinic branding</Feat>
                <Feat available={false}>Data backup & restore</Feat>
              </ul>
              <div className="lp-plan-cta">
                <button
                  id="pricing-trial-btn"
                  className="lp-btn lp-btn--brand-outline"
                  onClick={onStartOnboarding}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Start Free Trial <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Growth — featured */}
            <div className="lp-plan-card lp-plan-card--featured" id="plan-growth">
              <div className="lp-plan-badge">Most Popular</div>
              <div>
                <div className="lp-plan-name" style={{ color: 'var(--brand)' }}>Growth</div>
                <div className="lp-plan-price-row" style={{ marginTop: '0.75rem' }}>
                  <span className="lp-plan-price-currency">₹</span>
                  <span className="lp-plan-price">1,999</span>
                  <span className="lp-plan-price-period">/mo</span>
                </div>
              </div>
              <div className="lp-plan-desc">
                For an active clinic with multiple staff.
                Removes all limits and unlocks reporting tools.
              </div>
              <ul className="lp-plan-features">
                <Feat available={true}>Up to 5 staff logins</Feat>
                <Feat available={true}>Unlimited receipts</Feat>
                <Feat available={true}>Full receipt history</Feat>
                <Feat available={true}>Financial reports & CSV export</Feat>
                <Feat available={true}>Custom clinic branding on receipts</Feat>
                <Feat available={true}>Data backup & restore</Feat>
                <Feat available={false}>GDPR audit logs</Feat>
                <Feat available={false}>Multi-branch / chain management</Feat>
              </ul>
              <div className="lp-plan-cta">
                <button
                  id="pricing-growth-btn"
                  className="lp-btn lp-btn--brand"
                  onClick={() => scrollTo(contactRef)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Buy Growth Plan <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Enterprise */}
            <div className="lp-plan-card" id="plan-enterprise">
              <div>
                <div className="lp-plan-name">Enterprise</div>
                <div className="lp-plan-price-row" style={{ marginTop: '0.75rem' }}>
                  <span className="lp-plan-price-currency">₹</span>
                  <span className="lp-plan-price">4,999</span>
                  <span className="lp-plan-price-period">/mo</span>
                </div>
              </div>
              <div className="lp-plan-desc">
                For polyclinics, diagnostic chains, and practices
                that need compliance-grade tooling.
              </div>
              <ul className="lp-plan-features">
                <Feat available={true}>Unlimited staff logins</Feat>
                <Feat available={true}>Unlimited receipts</Feat>
                <Feat available={true}>Full receipt history</Feat>
                <Feat available={true}>Financial reports & CSV export</Feat>
                <Feat available={true}>Custom clinic branding</Feat>
                <Feat available={true}>Data backup & restore</Feat>
                <Feat available={true}>GDPR Article 30 audit logs</Feat>
                <Feat available={true}>Multi-branch chain management</Feat>
              </ul>
              <div className="lp-plan-cta">
                <button
                  id="pricing-enterprise-btn"
                  className="lp-btn lp-btn--ghost"
                  onClick={() => scrollTo(contactRef)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Contact for Enterprise
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT / BUY
      ════════════════════════════════════════ */}
      <section className="lp-contact" id="contact" ref={contactRef as any}>
        <div className="lp-container">
          <div className="lp-contact-inner">

            {/* Left — contact options */}
            <div>
              <div className="lp-section-tag">
                <MessageCircle size={12} /> Get a license key
              </div>
              <h2 className="lp-section-heading" style={{ fontSize: '2rem' }}>
                Ready to upgrade?
              </h2>
              <p className="lp-section-sub" style={{ fontSize: '0.95rem' }}>
                We don't have an automated checkout yet — just message us
                directly and we'll get you a key within 2–4 hours.
              </p>

              <div className="lp-contact-options">
                <a
                  href="https://wa.me/91XXXXXXXXXX?text=Hi%2C+I%27d+like+to+buy+the+Clinvo+Growth+plan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-contact-option"
                  id="contact-whatsapp-btn"
                >
                  <div className="lp-contact-option-icon" style={{ background: '#dcfce7' }}>
                    💬
                  </div>
                  <div className="lp-contact-option-text">
                    <div className="lp-contact-option-title">WhatsApp</div>
                    <div className="lp-contact-option-sub">+91 XXXXX XXXXX · Fastest response</div>
                  </div>
                  <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--ink-faint)', flexShrink: 0 }} />
                </a>

                <a
                  href="mailto:sales@clinvo.in?subject=Clinvo%20License%20Key%20Request&body=Hi%2C%20I'd%20like%20to%20purchase%20the%20Growth%20plan%20for%20my%20clinic."
                  className="lp-contact-option"
                  id="contact-email-btn"
                >
                  <div className="lp-contact-option-icon" style={{ background: '#dbeafe' }}>
                    <Mail size={18} style={{ color: '#1d4ed8' }} />
                  </div>
                  <div className="lp-contact-option-text">
                    <div className="lp-contact-option-title">Email</div>
                    <div className="lp-contact-option-sub">sales@clinvo.in</div>
                  </div>
                  <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--ink-faint)', flexShrink: 0 }} />
                </a>

                <div className="lp-contact-option" style={{ cursor: 'not-allowed', opacity: 0.6 }} id="contact-razorpay-placeholder">
                  <div className="lp-contact-option-icon" style={{ background: '#fef3c7' }}>💳</div>
                  <div className="lp-contact-option-text">
                    <div className="lp-contact-option-title">Online Payment</div>
                    <div className="lp-contact-option-sub">Razorpay — coming soon</div>
                  </div>
                </div>
              </div>

              <div className="lp-contact-note">
                After payment confirmation, you'll receive your license key via WhatsApp or email.
                Enter it directly inside the app — no reinstall required.
              </div>
            </div>

            {/* Right — key entry demo */}
            <div className="lp-contact-key-demo">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--ink)', marginBottom: '0.4rem' }}>
                  Already have a key?
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                  Enter it directly in the app after signing in to your clinic.
                </div>
              </div>

              <div>
                <div className="lp-key-demo-label">Your License Key</div>
                <div className="lp-key-demo-input-row" style={{ marginTop: '0.5rem' }}>
                  <input
                    className="lp-key-demo-input"
                    type="text"
                    placeholder="CLNV-XXXX-XXXX-XXXX-G"
                    readOnly
                    onClick={onStartOnboarding}
                    style={{ cursor: 'pointer' }}
                    id="demo-key-input"
                    title="Sign in to your clinic to enter your key"
                  />
                  <button
                    className="lp-btn lp-btn--brand"
                    onClick={onStartOnboarding}
                    id="demo-activate-btn"
                    style={{ flexShrink: 0 }}
                  >
                    Activate
                  </button>
                </div>
              </div>

              <div className="lp-key-demo-steps">
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>
                  How activation works
                </div>
                {[
                  'Create your clinic profile or sign in',
                  'Go to Settings → License Key',
                  'Enter the key you received and click Activate',
                  'All features unlock instantly — no restart needed',
                ].map((step, i) => (
                  <div key={i} className="lp-key-demo-step">
                    <div className="lp-key-demo-step-num">{i + 1}</div>
                    {step}
                  </div>
                ))}
              </div>

              <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--ink-faint)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={14} style={{ color: 'var(--brand)' }} />
                  License keys are tied to your clinic ID. One key per clinic.
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-logo">
              <img src={logoImg} alt="Clinvo" style={{ height: 24, filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
              <span className="lp-footer-wordmark">Clinvo</span>
            </div>

            <nav className="lp-footer-links">
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo(featuresRef); }}>Features</a>
              <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo(pricingRef); }}>Pricing</a>
              <a href="mailto:sales@clinvo.in">Contact</a>
              <a href="#" onClick={(e) => { e.preventDefault(); onOpenPlatformAdmin(); }}>Platform Admin</a>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="lp-footer-gdpr">
                <ShieldCheck size={11} /> GDPR Compliant
              </span>
              <span className="lp-footer-copy">
                © {new Date().getFullYear()} Clinvo. All rights reserved.
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

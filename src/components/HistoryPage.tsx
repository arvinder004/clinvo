import React, { useState, useMemo } from 'react';
import {
  Search, Printer, Edit2, Trash2, Calendar, TrendingUp,
  FileText, User, Stethoscope, ChevronDown, ChevronRight, Download
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { calculateAgeFromDob, type Doctor, type Receipt } from '../lib/storage';
import { storage } from '../lib/storage';

// ─── Types ───────────────────────────────────────────────────────────────────

type HistoryView = 'patient' | 'financial' | 'doctor';
type PatientSubView = 'by-name' | 'by-phone' | 'by-doctor';
type FinancialSubView = 'by-month' | 'by-week' | 'by-range';

interface Props {
  receipts: Receipt[];
  doctors: Doctor[];
  onPrint: (receipts: Receipt | Receipt[]) => void;
  onDownload: (receipts: Receipt | Receipt[]) => void;
  onEdit: (receipt: Receipt) => void;
  onDelete: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rupee = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const rDate = (r: Receipt) => r.date.split(' ')[0];
const billable = (r: Receipt) => r.paymentMethod === 'FREE' ? 0 : (Number(r.total) || 0);

// ─── Shared Receipt Row ───────────────────────────────────────────────────────

const ReceiptRow: React.FC<{
  r: Receipt;
  onPrint: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
  showPatient?: boolean;
  showDoctor?: boolean;
}> = ({ r, onPrint, onDownload, onEdit, onDelete, showPatient = true, showDoctor = true }) => (
  <tr>
    <td><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>#{r.receiptNumber}</span><div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{rDate(r)}</div></td>
    {showPatient && (
      <td>
        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{r.patientName}</div>
        {r.patientPhone && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{r.patientPhone}</div>}
        {r.patientDob && <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '1px', fontWeight: 500 }}>{calculateAgeFromDob(r.patientDob)} / {r.patientGender}</div>}
      </td>
    )}
    {showDoctor && (
      <td><div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.doctorName}</div></td>
    )}
    <td>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>{r.items.map(i => <span key={i.id} style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>{i.description}</span>)}</div>
    </td>
    <td>
      <span className={`bento-badge badge-${(r.paymentMethod || 'CASH').toLowerCase()}`}>{r.paymentMethod || 'CASH'}</span>
    </td>
    <td style={{ textAlign: 'right' }}><span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{rupee(billable(r))}</span></td>
    <td style={{ textAlign: 'right' }}>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
        <button className="bento-btn-ghost" style={{ padding: '0.4rem' }} onClick={() => onPrint(r)} title="Print"><Printer size={14} /></button>
        <button className="bento-btn-ghost" style={{ padding: '0.4rem' }} onClick={() => onDownload(r)} title="Download PDF"><Download size={14} /></button>
        <button className="bento-btn-ghost" style={{ padding: '0.4rem', color: '#0284c7' }} onClick={() => onEdit(r)} title="Edit"><Edit2 size={14} /></button>
        <button className="bento-btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => onDelete(r.id)} title="Delete"><Trash2 size={14} /></button>
      </div>
    </td>
  </tr>
);

// ─── Collapsible Group ────────────────────────────────────────────────────────

const GroupBlock: React.FC<{
  label: string;
  meta?: string;
  total: number;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ label, meta, total, count, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bento-list-card" style={{ marginBottom: '1rem' }}>
      <div className="bento-list-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)' }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{label}</span>
          {meta && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{meta}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{count} visit{count !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{rupee(total)}</span>
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
};

// ─── Receipt Mini Table ───────────────────────────────────────────────────────

const ReceiptTable: React.FC<{
  rows: Receipt[];
  onPrint: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
  showPatient?: boolean;
  showDoctor?: boolean;
}> = ({ rows, onPrint, onDownload, onEdit, onDelete, showPatient = true, showDoctor = true }) => (
  <div style={{ overflowX: 'auto' }}>
    <table className="bento-table">
      <thead>
        <tr>
          <th>Receipt / Date</th>
          {showPatient && <th>Patient</th>}
          {showDoctor && <th>Doctor</th>}
          <th>Services</th>
          <th>Mode</th>
          <th style={{ textAlign: 'right' }}>Amount</th>
          <th style={{ textAlign: 'right' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <ReceiptRow
            key={r.id}
            r={r}
            onPrint={onPrint}
            onDownload={onDownload}
            onEdit={onEdit}
            onDelete={onDelete}
            showPatient={showPatient}
            showDoctor={showDoctor}
          />
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Patient View ─────────────────────────────────────────────────────────────

const PatientView: React.FC<{
  receipts: Receipt[];
  subView: PatientSubView;
  onPrint: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, subView, onPrint, onDownload, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return receipts;
    const q = search.toLowerCase();
    return receipts.filter(r =>
      r.patientName.toLowerCase().includes(q) ||
      (r.patientPhone || '').includes(q) ||
      (r.doctorName || '').toLowerCase().includes(q)
    );
  }, [receipts, search]);

  const groups: Record<string, Receipt[]> = useMemo(() => {
    const acc: Record<string, Receipt[]> = {};
    filtered.forEach(r => {
      const key =
        subView === 'by-name' ? r.patientName :
          subView === 'by-phone' ? (r.patientPhone || 'No Phone') :
            (r.doctorName || 'General');
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
    });
    return acc;
  }, [filtered, subView]);

  const sorted = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder={
            subView === 'by-name' ? 'Search by patient name…' :
              subView === 'by-phone' ? 'Search by phone number…' :
                'Search by doctor or patient…'
          }
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bento-input-search"
          style={{ width: '100%', maxWidth: 'none' }}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="hist-empty">No records found.</div>
      ) : sorted.map(([key, rows]) => (
        <GroupBlock
          key={key}
          label={key}
          meta={subView === 'by-name' && rows[0]?.patientPhone ? rows[0].patientPhone : undefined}
          total={rows.reduce((s, r) => s + billable(r), 0)}
          count={rows.length}
        >
          <ReceiptTable
            rows={rows.slice().sort((a, b) => rDate(b).localeCompare(rDate(a)))}
            onPrint={onPrint}
            onDownload={onDownload}
            onEdit={onEdit}
            onDelete={onDelete}
            showPatient={subView === 'by-doctor'}
            showDoctor={subView !== 'by-doctor'}
          />
        </GroupBlock>
      ))}
    </div>
  );
};

// ─── Financial View ───────────────────────────────────────────────────────────

const FinancialView: React.FC<{
  receipts: Receipt[];
  subView: FinancialSubView;
  onPrint: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, subView, onPrint, onDownload, onEdit, onDelete }) => {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const filtered = useMemo(() => {
    if (subView !== 'by-range') return receipts;
    return receipts.filter(r => {
      const d = rDate(r);
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    });
  }, [receipts, subView, rangeStart, rangeEnd]);

  const groups: Record<string, Receipt[]> = useMemo(() => {
    const acc: Record<string, Receipt[]> = {};
    filtered.forEach(r => {
      let key: string;
      try {
        const d = parseISO(rDate(r));
        if (subView === 'by-month') key = format(d, 'MMMM yyyy');
        else if (subView === 'by-week') {
          const ws = startOfWeek(d, { weekStartsOn: 1 });
          const we = endOfWeek(d, { weekStartsOn: 1 });
          key = `${format(ws, 'd MMM')} – ${format(we, 'd MMM yyyy')}`;
        } else key = rDate(r);
      } catch { key = rDate(r); }
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
    });
    return acc;
  }, [filtered, subView]);

  const sorted = Object.entries(groups).sort((a, b) => {
    const la = a[1][0] ? rDate(a[1][0]) : '';
    const lb = b[1][0] ? rDate(b[1][0]) : '';
    return lb.localeCompare(la);
  });

  const totalAll = filtered.reduce((s, r) => s + billable(r), 0);
  const cashAll = filtered.filter(r => (r.paymentMethod || 'CASH') === 'CASH').reduce((s, r) => s + billable(r), 0);
  const onlineAll = filtered.filter(r => r.paymentMethod === 'ONLINE').reduce((s, r) => s + billable(r), 0);
  const freeCount = filtered.filter(r => r.paymentMethod === 'FREE').length;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: 'var(--primary)', borderRadius: '12px', padding: '1rem 1.25rem', color: 'white', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginRight: '0.5rem' }}>
          <TrendingUp size={24} />
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collection</span>
            <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700 }}>{rupee(totalAll)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cash</span>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>{rupee(cashAll)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>{rupee(onlineAll)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free Visits</span>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 700 }}>{freeCount}</span>
          </div>
        </div>
        <button onClick={() => storage.exportToExcel()} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '6px', padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
          <FileText size={14} /> Export CSV
        </button>
      </div>

      {/* Date range picker */}
      {subView === 'by-range' && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '160px' }}>
            <span style={{ position: 'absolute', left: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 1, pointerEvents: 'none' }}>From</span>
            <Calendar size={14} style={{ position: 'absolute', left: '4.5rem', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <input type="date" className="bento-input" style={{ paddingLeft: '6.25rem', width: '100%' }} value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '160px' }}>
            <span style={{ position: 'absolute', left: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', zIndex: 1, pointerEvents: 'none' }}>To</span>
            <Calendar size={14} style={{ position: 'absolute', left: '3.5rem', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <input type="date" className="bento-input" style={{ paddingLeft: '5.25rem', width: '100%' }} value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
          </div>
          {(rangeStart || rangeEnd) && (
            <button className="bento-btn-ghost" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => { setRangeStart(''); setRangeEnd(''); }}>Clear</button>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="hist-empty">No records found.</div>
      ) : sorted.map(([key, rows]) => (
        <GroupBlock
          key={key}
          label={key}
          total={rows.reduce((s, r) => s + billable(r), 0)}
          count={rows.length}
          defaultOpen={sorted.length === 1}
        >
          <ReceiptTable
            rows={rows.slice().sort((a, b) => rDate(b).localeCompare(rDate(a)))}
            onPrint={onPrint}
            onDownload={onDownload}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </GroupBlock>
      ))}
    </div>
  );
};

// ─── Doctor View ──────────────────────────────────────────────────────────────
// Shows each doctor as a card: total earnings, visit breakdown by payment mode,
// top services, and an expandable receipt list sorted by date.

const DoctorView: React.FC<{
  receipts: Receipt[];
  doctors: Doctor[];
  onPrint: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, doctors, onPrint, onDownload, onEdit, onDelete }) => {
  const [search, setSearch] = useState('');

  const groups: Record<string, Receipt[]> = useMemo(() => {
    const acc: Record<string, Receipt[]> = {};
    receipts.forEach(r => {
      const key = r.doctorName || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
    });
    return acc;
  }, [receipts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return Object.entries(groups);
    const q = search.toLowerCase();
    return Object.entries(groups).filter(([name]) => name.toLowerCase().includes(q));
  }, [groups, search]);

  const sorted = filtered.sort((a, b) => {
    const ta = a[1].reduce((s, r) => s + billable(r), 0);
    const tb = b[1].reduce((s, r) => s + billable(r), 0);
    return tb - ta; // highest earner first
  });

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          placeholder="Search doctor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bento-input-search"
          style={{ width: '100%', maxWidth: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sorted.map(([name, rows]) => {
          const total = rows.reduce((s, r) => s + billable(r), 0);
          const cash = rows.filter(r => (r.paymentMethod || 'CASH') === 'CASH').reduce((s, r) => s + billable(r), 0);
          const online = rows.filter(r => r.paymentMethod === 'ONLINE').reduce((s, r) => s + billable(r), 0);
          const freeCount = rows.filter(r => r.paymentMethod === 'FREE').length;
          const doctor = doctors.find(d => d.name === name);

          // Top 3 services by frequency
          const svcCount: Record<string, number> = {};
          rows.forEach(r => r.items.forEach(i => { svcCount[i.description] = (svcCount[i.description] || 0) + 1; }));
          const topSvcs = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

          return (
            <GroupBlock
              key={name}
              label={name}
              meta={doctor?.specialization}
              total={total}
              count={rows.length}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cash</span><span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{rupee(cash)}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span><span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{rupee(online)}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free</span><span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{freeCount} visits</span></div>
                {topSvcs.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Services</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>{topSvcs.map(([s, c]) => `${s} (${c})`).join(' · ')}</span>
                  </div>
                )}
              </div>
              <ReceiptTable
                rows={rows.slice().sort((a, b) => rDate(b).localeCompare(rDate(a)))}
                onPrint={onPrint}
                onDownload={onDownload}
                onEdit={onEdit}
                onDelete={onDelete}
                showDoctor={false}
              />
            </GroupBlock>
          );
        })}
      </div>

      {sorted.length === 0 && <div className="bento-empty bento-list-card">No doctor records found.</div>}
    </div>
  );
};

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────

const SubTabs: React.FC<{
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}> = ({ options, active, onChange }) => (
  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
    {options.map(o => (
      <button
        key={o.value}
        style={{
          padding: '0.6rem 1.25rem', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 600,
          color: active === o.value ? 'white' : 'var(--text-muted)', 
          background: active === o.value ? 'var(--primary)' : 'var(--surface)', 
          border: `1px solid ${active === o.value ? 'var(--primary)' : 'var(--border)'}`,
          cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)'
        }}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// ─── Main HistoryPage ─────────────────────────────────────────────────────────

const HistoryPage: React.FC<Props> = ({ receipts, doctors, onPrint, onDownload, onEdit, onDelete }) => {
  const [view, setView] = useState<HistoryView>('patient');
  const [patientSub, setPatientSub] = useState<PatientSubView>('by-name');
  const [financialSub, setFinancialSub] = useState<FinancialSubView>('by-month');

  const topTabs: { value: HistoryView; label: string; icon: React.ReactNode }[] = [
    { value: 'patient', label: 'Patient History', icon: <User size={16} /> },
    { value: 'financial', label: 'Financial History', icon: <TrendingUp size={16} /> },
    { value: 'doctor', label: 'Doctor History', icon: <Stethoscope size={16} /> },
  ];

  return (
    <div className="bento-page no-print">
      {/* Top-level tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {topTabs.map(t => (
          <button
            key={t.value}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '1rem 1.5rem', fontSize: '1rem', fontWeight: 700, 
              color: view === t.value ? 'var(--primary)' : 'var(--text-muted)',
              background: view === t.value ? 'rgba(14, 165, 233, 0.1)' : 'var(--surface)', 
              border: `2px solid ${view === t.value ? 'var(--primary)' : 'transparent'}`,
              borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onClick={() => setView(t.value)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Patient sub-tabs */}
      {view === 'patient' && (
        <SubTabs
          options={[
            { value: 'by-name', label: 'By Patient Name' },
            { value: 'by-phone', label: 'By Phone Number' },
            { value: 'by-doctor', label: 'By Doctor' },
          ]}
          active={patientSub}
          onChange={v => setPatientSub(v as PatientSubView)}
        />
      )}

      {/* Financial sub-tabs */}
      {view === 'financial' && (
        <SubTabs
          options={[
            { value: 'by-month', label: 'By Month' },
            { value: 'by-week', label: 'By Week' },
            { value: 'by-range', label: 'Date Range' },
          ]}
          active={financialSub}
          onChange={v => setFinancialSub(v as FinancialSubView)}
        />
      )}

      {/* Content */}
      {view === 'patient' && (
        <PatientView
          receipts={receipts}
          subView={patientSub}
          onPrint={onPrint}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {view === 'financial' && (
        <FinancialView
          receipts={receipts}
          subView={financialSub}
          onPrint={onPrint}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {view === 'doctor' && (
        <DoctorView
          receipts={receipts}
          doctors={doctors}
          onPrint={onPrint}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

    </div>
  );
};

export default HistoryPage;

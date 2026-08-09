import React, { useState, useMemo } from 'react';
import {
  Search, Printer, Edit2, Trash2, Calendar, Users, TrendingUp,
  FileText, Filter, User, Phone, Stethoscope, BarChart2, ChevronDown, ChevronRight
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from 'date-fns';
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
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
  showPatient?: boolean;
  showDoctor?: boolean;
}> = ({ r, onPrint, onEdit, onDelete, showPatient = true, showDoctor = true }) => (
  <tr className="receipt-table-row">
    <td><span className="r-num">#{r.receiptNumber}</span><div className="r-date-small">{rDate(r)}</div></td>
    {showPatient && (
      <td>
        <div className="r-name">{r.patientName}</div>
        {r.patientPhone && <div className="r-ph">{r.patientPhone}</div>}
        {r.patientDob && <div className="r-age">{calculateAgeFromDob(r.patientDob)} / {r.patientGender}</div>}
      </td>
    )}
    {showDoctor && (
      <td><div className="r-dr">{r.doctorName}</div></td>
    )}
    <td>
      <div className="r-services">{r.items.map(i => <span key={i.id} className="service-tag">{i.description}</span>)}</div>
    </td>
    <td>
      <span className={`payment-badge ${(r.paymentMethod || 'CASH').toLowerCase()}`}>{r.paymentMethod || 'CASH'}</span>
    </td>
    <td className="text-right"><span className="r-amt">{rupee(billable(r))}</span></td>
    <td className="text-right">
      <div className="action-buttons">
        <button className="btn-icon-xs print-btn" onClick={() => onPrint(r)} title="Print"><Printer size={14} /></button>
        <button className="btn-icon-xs edit-btn" onClick={() => onEdit(r)} title="Edit"><Edit2 size={14} /></button>
        <button className="btn-icon-xs delete-btn" onClick={() => onDelete(r.id)} title="Delete"><Trash2 size={14} /></button>
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
    <div className="hist-group">
      <div className="hist-group-header" onClick={() => setOpen(o => !o)}>
        <div className="hist-group-left">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="hist-group-label">{label}</span>
          {meta && <span className="hist-group-meta">{meta}</span>}
        </div>
        <div className="hist-group-right">
          <span className="hist-group-count">{count} visit{count !== 1 ? 's' : ''}</span>
          <span className="hist-group-total">{rupee(total)}</span>
        </div>
      </div>
      {open && <div className="hist-group-body">{children}</div>}
    </div>
  );
};

// ─── Receipt Mini Table ───────────────────────────────────────────────────────

const ReceiptTable: React.FC<{
  rows: Receipt[];
  onPrint: (r: Receipt) => void;
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
  showPatient?: boolean;
  showDoctor?: boolean;
}> = ({ rows, onPrint, onEdit, onDelete, showPatient = true, showDoctor = true }) => (
  <div className="receipt-items-table-container">
    <table className="history-table">
      <thead>
        <tr>
          <th>Receipt / Date</th>
          {showPatient && <th>Patient</th>}
          {showDoctor && <th>Doctor</th>}
          <th>Services</th>
          <th>Mode</th>
          <th className="text-right">Amount</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <ReceiptRow
            key={r.id}
            r={r}
            onPrint={onPrint}
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
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, subView, onPrint, onEdit, onDelete }) => {
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
    <div className="hist-view">
      <div className="hist-search-bar">
        <Search size={15} className="hist-search-icon" />
        <input
          placeholder={
            subView === 'by-name' ? 'Search by patient name…' :
            subView === 'by-phone' ? 'Search by phone number…' :
            'Search by doctor or patient…'
          }
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hist-search-input"
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
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, subView, onPrint, onEdit, onDelete }) => {
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
    <div className="hist-view">
      {/* Summary strip */}
      <div className="fin-summary-strip">
        <div className="fin-metric main">
          <TrendingUp size={18} />
          <div>
            <span className="fin-label">Total Collection</span>
            <span className="fin-value">{rupee(totalAll)}</span>
          </div>
        </div>
        <div className="fin-metric">
          <div>
            <span className="fin-label">Cash</span>
            <span className="fin-value">{rupee(cashAll)}</span>
          </div>
        </div>
        <div className="fin-metric">
          <div>
            <span className="fin-label">Online</span>
            <span className="fin-value">{rupee(onlineAll)}</span>
          </div>
        </div>
        <div className="fin-metric">
          <div>
            <span className="fin-label">Free Visits</span>
            <span className="fin-value">{freeCount}</span>
          </div>
        </div>
        <button className="btn-export-sm" onClick={() => storage.exportToExcel()}>
          <FileText size={14} /> Export CSV
        </button>
      </div>

      {/* Date range picker */}
      {subView === 'by-range' && (
        <div className="fin-range-row">
          <div className="filter-input-wrapper calendar-picker">
            <span className="input-label-inline">From</span>
            <Calendar size={14} className="input-icon shifted" />
            <input type="date" className="date-input" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
          </div>
          <div className="filter-input-wrapper calendar-picker">
            <span className="input-label-inline">To</span>
            <Calendar size={14} className="input-icon shifted" />
            <input type="date" className="date-input" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
          </div>
          {(rangeStart || rangeEnd) && (
            <button className="btn-reset" onClick={() => { setRangeStart(''); setRangeEnd(''); }}>Clear</button>
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
  onEdit: (r: Receipt) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, doctors, onPrint, onEdit, onDelete }) => {
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
    <div className="hist-view">
      <div className="hist-search-bar">
        <Search size={15} className="hist-search-icon" />
        <input
          placeholder="Search doctor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="hist-search-input"
        />
      </div>

      <div className="dr-cards-grid">
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
              <div className="dr-stats-row">
                <div className="dr-stat"><span className="dr-stat-label">Cash</span><span className="dr-stat-val">{rupee(cash)}</span></div>
                <div className="dr-stat"><span className="dr-stat-label">Online</span><span className="dr-stat-val">{rupee(online)}</span></div>
                <div className="dr-stat"><span className="dr-stat-label">Free</span><span className="dr-stat-val">{freeCount} visits</span></div>
                {topSvcs.length > 0 && (
                  <div className="dr-stat wide">
                    <span className="dr-stat-label">Top Services</span>
                    <span className="dr-stat-val small">{topSvcs.map(([s, c]) => `${s} (${c})`).join(' · ')}</span>
                  </div>
                )}
              </div>
              <ReceiptTable
                rows={rows.slice().sort((a, b) => rDate(b).localeCompare(rDate(a)))}
                onPrint={onPrint}
                onEdit={onEdit}
                onDelete={onDelete}
                showDoctor={false}
              />
            </GroupBlock>
          );
        })}
      </div>

      {sorted.length === 0 && <div className="hist-empty">No doctor records found.</div>}
    </div>
  );
};

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────

const SubTabs: React.FC<{
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}> = ({ options, active, onChange }) => (
  <div className="hist-subtabs">
    {options.map(o => (
      <button
        key={o.value}
        className={`hist-subtab ${active === o.value ? 'active' : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

// ─── Main HistoryPage ─────────────────────────────────────────────────────────

const HistoryPage: React.FC<Props> = ({ receipts, doctors, onPrint, onEdit, onDelete }) => {
  const [view, setView] = useState<HistoryView>('patient');
  const [patientSub, setPatientSub] = useState<PatientSubView>('by-name');
  const [financialSub, setFinancialSub] = useState<FinancialSubView>('by-month');

  const topTabs: { value: HistoryView; label: string; icon: React.ReactNode }[] = [
    { value: 'patient',   label: 'Patient History',   icon: <User size={16} /> },
    { value: 'financial', label: 'Financial History',  icon: <TrendingUp size={16} /> },
    { value: 'doctor',    label: 'Doctor History',     icon: <Stethoscope size={16} /> },
  ];

  return (
    <div className="history-page">
      {/* Top-level tabs */}
      <div className="hist-top-tabs">
        {topTabs.map(t => (
          <button
            key={t.value}
            className={`hist-top-tab ${view === t.value ? 'active' : ''}`}
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
            { value: 'by-name',   label: 'By Patient Name' },
            { value: 'by-phone',  label: 'By Phone Number' },
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
            { value: 'by-week',  label: 'By Week' },
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
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {view === 'financial' && (
        <FinancialView
          receipts={receipts}
          subView={financialSub}
          onPrint={onPrint}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {view === 'doctor' && (
        <DoctorView
          receipts={receipts}
          doctors={doctors}
          onPrint={onPrint}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}

      <style>{`
        .history-page { display: flex; flex-direction: column; gap: 0; }

        /* ── Top tabs ── */
        .hist-top-tabs {
          display: flex; gap: 0; border-bottom: 2px solid var(--border);
          margin-bottom: 0; background: white;
          border-radius: 12px 12px 0 0; overflow: hidden;
          border: 1px solid var(--border);
        }
        .hist-top-tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 1rem 1.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-muted);
          background: #f8fafc; border: none; border-right: 1px solid var(--border);
          cursor: pointer; transition: all 0.2s;
        }
        .hist-top-tab:last-child { border-right: none; }
        .hist-top-tab:hover { background: #f0f9ff; color: var(--primary); }
        .hist-top-tab.active { background: white; color: var(--primary); border-bottom: 3px solid var(--primary); }

        /* ── Sub tabs ── */
        .hist-subtabs {
          display: flex; gap: 0.5rem; padding: 1rem 1rem 0;
          background: white; border-left: 1px solid var(--border); border-right: 1px solid var(--border);
        }
        .hist-subtab {
          padding: 0.45rem 1.1rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600;
          color: var(--text-muted); background: #f1f5f9; border: 1px solid transparent;
          cursor: pointer; transition: all 0.2s;
        }
        .hist-subtab:hover { background: #e0f2fe; color: var(--primary); }
        .hist-subtab.active { background: var(--primary); color: white; }

        /* ── View container ── */
        .hist-view {
          background: white; border: 1px solid var(--border); border-top: none;
          border-radius: 0 0 12px 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;
        }

        /* ── Search bar ── */
        .hist-search-bar {
          position: relative; display: flex; align-items: center;
          border: 1px solid var(--border); border-radius: 8px; background: #f8fafc;
          overflow: hidden;
        }
        .hist-search-icon { position: absolute; left: 0.85rem; color: var(--text-muted); pointer-events: none; }
        .hist-search-input {
          width: 100%; padding: 0.65rem 1rem 0.65rem 2.5rem;
          border: none; background: transparent; font-size: 0.9rem; font-family: inherit;
          color: var(--text-main);
        }
        .hist-search-input:focus { outline: none; }

        /* ── Group blocks ── */
        .hist-group {
          border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
        }
        .hist-group-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.85rem 1.1rem; background: #f8fafc; cursor: pointer;
          transition: background 0.15s; user-select: none;
        }
        .hist-group-header:hover { background: #f0f9ff; }
        .hist-group-left { display: flex; align-items: center; gap: 0.6rem; color: var(--text-main); }
        .hist-group-label { font-weight: 700; font-size: 0.95rem; }
        .hist-group-meta { font-size: 0.75rem; color: var(--text-muted); }
        .hist-group-right { display: flex; align-items: center; gap: 1.25rem; }
        .hist-group-count { font-size: 0.75rem; color: var(--text-muted); }
        .hist-group-total { font-size: 0.95rem; font-weight: 700; color: var(--primary); }
        .hist-group-body { border-top: 1px solid var(--border); }

        /* ── Receipt table ── */
        .receipt-items-table-container { overflow: hidden; }
        .history-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .history-table th {
          background: #f8fafc; padding: 0.6rem 1rem; text-align: left;
          font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border);
          font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .history-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .receipt-table-row:last-child td { border-bottom: none; }
        .receipt-table-row:hover { background: #f8fafc; }

        .r-num { color: var(--text-muted); font-size: 0.75rem; font-family: monospace; }
        .r-date-small { font-size: 0.7rem; color: #94a3b8; margin-top: 2px; }
        .r-name { font-weight: 600; color: var(--text-main); font-size: 0.9rem; }
        .r-ph { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }
        .r-age { font-size: 0.72rem; color: var(--primary); margin-top: 1px; font-weight: 500; }
        .r-dr { font-size: 0.85rem; color: var(--text-muted); }
        .r-amt { font-weight: 700; color: var(--text-main); }
        .r-services { display: flex; flex-wrap: wrap; gap: 0.3rem; }
        .service-tag { font-size: 0.7rem; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }

        .action-buttons { display: flex; gap: 0.4rem; justify-content: flex-end; }
        .btn-icon-xs {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          border-radius: 6px; border: 1px solid #e2e8f0; color: #64748b; background: white; transition: all 0.2s; cursor: pointer;
        }
        .btn-icon-xs.print-btn:hover { color: var(--primary); border-color: #e0f2fe; background: #f0f9ff; }
        .btn-icon-xs.edit-btn:hover { color: #0284c7; border-color: #e0f2fe; background: #f0f9ff; }
        .btn-icon-xs.delete-btn:hover { color: #ef4444; border-color: #fee2e2; background: #fef2f2; }

        .text-right { text-align: right !important; }
        .hist-empty { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.9rem; }

        .payment-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .payment-badge.cash { background: #fef3c7; color: #92400e; }
        .payment-badge.online { background: #dcfce7; color: #166534; }
        .payment-badge.free { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }

        /* ── Financial summary strip ── */
        .fin-summary-strip {
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
          background: var(--primary); border-radius: 10px; padding: 1rem 1.25rem; color: white; margin-bottom: 0.25rem;
        }
        .fin-metric { display: flex; align-items: center; gap: 0.6rem; }
        .fin-metric.main { margin-right: 0.5rem; }
        .fin-label { display: block; font-size: 0.65rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
        .fin-value { display: block; font-size: 1rem; font-weight: 700; }
        .btn-export-sm {
          margin-left: auto; display: flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.2); color: white; border-radius: 6px;
          padding: 0.5rem 0.9rem; font-size: 0.8rem; font-weight: 600; border: none; cursor: pointer;
          transition: background 0.2s;
        }
        .btn-export-sm:hover { background: rgba(255,255,255,0.3); }

        /* ── Range pickers ── */
        .fin-range-row {
          display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.25rem;
        }
        .filter-input-wrapper { position: relative; display: flex; align-items: center; flex: 1; min-width: 160px; }
        .filter-input-wrapper .input-icon { position: absolute; left: 1rem; color: var(--text-muted); pointer-events: none; z-index: 1; }
        .filter-input-wrapper .input-icon.shifted { left: 4.5rem; }
        .input-label-inline {
          position: absolute; left: 1rem; font-size: 0.75rem; font-weight: 700; color: var(--primary);
          text-transform: uppercase; letter-spacing: 0.05em; z-index: 1; pointer-events: none;
        }
        .date-input {
          padding-left: 6.25rem; width: 100%; border: 1px solid var(--border); border-radius: 8px; height: 44px;
          font-family: 'Outfit', sans-serif; font-size: 0.9rem; color: var(--text-main); background: white;
        }
        .date-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
        .btn-reset {
          background: #fee2e2; color: #ef4444; font-size: 0.8rem; font-weight: 600;
          padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap;
        }

        /* ── Doctor stats ── */
        .dr-cards-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .dr-stats-row {
          display: flex; flex-wrap: wrap; gap: 0.75rem;
          padding: 0.75rem 1rem; background: #f8fafc; border-bottom: 1px solid var(--border);
        }
        .dr-stat { display: flex; flex-direction: column; gap: 2px; }
        .dr-stat.wide { flex: 1; min-width: 200px; }
        .dr-stat-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .dr-stat-val { font-size: 0.9rem; font-weight: 700; color: var(--text-main); }
        .dr-stat-val.small { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default HistoryPage;

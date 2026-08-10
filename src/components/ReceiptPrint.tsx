import React from 'react';
import { format } from 'date-fns';
import { calculateAgeFromDob, type Doctor, type Receipt } from '../lib/storage';

interface ReceiptPrintProps {
  receipt: Receipt;
  doctor: Doctor | undefined;
  isDuplicate?: boolean;
}

// ── Shared receipt page (used for both original and patient copy) ─────────────

const ReceiptPage: React.FC<{
  receipt: Receipt;
  doctor: Doctor | undefined;
  copyLabel: string;
}> = ({ receipt, doctor, copyLabel }) => {
  const age = receipt.patientDob
    ? calculateAgeFromDob(receipt.patientDob)
    : receipt.patientAge;

  const dateStr = (() => {
    try { return format(new Date(receipt.date), 'dd MMM yyyy'); }
    catch { return receipt.date || '—'; }
  })();

  const billableAmt = (item: { amount: number }) =>
    receipt.paymentMethod === 'FREE' ? 0 : Number(item.amount) || 0;

  return (
    <div className="rp-page">
      {/* ── Header ── */}
      <div className="rp-header">
        <div className="rp-clinic-left">
          <div className="rp-doctor-name">{doctor?.name || receipt.doctorName}</div>
          {doctor?.qualifications && (
            <div className="rp-doctor-qual">{doctor.qualifications}</div>
          )}
          {doctor?.specialization && (
            <div className="rp-doctor-spec">{doctor.specialization}</div>
          )}
        </div>
        <div className="rp-clinic-right">
          {doctor?.address && (
            <div className="rp-clinic-addr">{doctor.address}</div>
          )}
          {doctor?.phone && (
            <div className="rp-clinic-contact">Ph: {doctor.phone}</div>
          )}
        </div>
      </div>

      {/* ── Title bar ── */}
      <div className="rp-title-bar">
        <span className="rp-title-text">CONSULTATION RECORD</span>
        <span className="rp-copy-label">{copyLabel}</span>
      </div>

      {/* ── Patient + Bill info ── */}
      <div className="rp-info-row">
        <div className="rp-info-block">
          <div className="rp-info-heading">PATIENT DETAILS</div>
          <table className="rp-info-table">
            <tbody>
              <tr>
                <td className="rp-info-key">Name</td>
                <td className="rp-info-val">{receipt.patientName}</td>
              </tr>
              <tr>
                <td className="rp-info-key">Age / Gender</td>
                <td className="rp-info-val">{age || '—'} / {receipt.patientGender}</td>
              </tr>
              <tr>
                <td className="rp-info-key">Phone</td>
                <td className="rp-info-val">{receipt.patientPhone || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rp-info-divider" />
        <div className="rp-info-block">
          <div className="rp-info-heading">RECEIPT DETAILS</div>
          <table className="rp-info-table">
            <tbody>
              <tr>
                <td className="rp-info-key">Receipt No.</td>
                <td className="rp-info-val rp-receipt-num">#{receipt.receiptNumber}</td>
              </tr>
              <tr>
                <td className="rp-info-key">Date</td>
                <td className="rp-info-val">{dateStr}</td>
              </tr>
              <tr>
                <td className="rp-info-key">Payment</td>
                <td className="rp-info-val">{receipt.paymentMethod}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Diagnosis ── */}
      {receipt.diagnosis && receipt.diagnosis.trim() && (
        <div className="rp-diagnosis">
          <div className="rp-section-heading">DIAGNOSIS / CLINICAL NOTES</div>
          <div className="rp-diagnosis-text">{receipt.diagnosis}</div>
        </div>
      )}

      {/* ── Medicines ── */}
      {receipt.medicines && receipt.medicines.length > 0 && (
        <>
          <div className="rp-section-heading" style={{ marginBottom: '4pt' }}>PRESCRIBED MEDICINES</div>
          <table className="rp-services-table">
            <thead>
              <tr>
                <th className="rp-th-sr">No.</th>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {receipt.medicines.map((med, i) => (
                <tr key={med.id || i}>
                  <td className="rp-td-sr">{i + 1}</td>
                  <td>{med.name}</td>
                  <td>{med.dosage}</td>
                  <td>{med.duration}</td>
                  <td>{med.instructions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── Services table ── */}
      <div className="rp-section-heading" style={{ marginBottom: '4pt' }}>SERVICES & CHARGES</div>
      <table className="rp-services-table">
        <thead>
          <tr>
            <th className="rp-th-sr">No.</th>
            <th className="rp-th-desc">Description</th>
            <th className="rp-th-amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((item, i) => (
            <tr key={item.id || i}>
              <td className="rp-td-sr">{i + 1}</td>
              <td className="rp-td-desc">{item.description}</td>
              <td className="rp-td-amt">
                {receipt.paymentMethod === 'FREE'
                  ? <span className="rp-free-amt">₹{Number(item.amount).toFixed(2)}</span>
                  : `₹${billableAmt(item).toFixed(2)}`
                }
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="rp-total-row">
            <td colSpan={2} className="rp-total-label">
              Total Payable Amount
              {receipt.paymentMethod === 'FREE' && (
                <span className="rp-free-note"> (Free / Waived)</span>
              )}
            </td>
            <td className="rp-total-val">₹{(Number(receipt.total) || 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── Amount in words ── */}
      <div className="rp-words">
        Amount in words: <em>Rupees {(Number(receipt.total) || 0).toLocaleString('en-IN')} Only</em>
      </div>

      {/* ── Footer ── */}
      <div className="rp-footer">
        <div className="rp-terms">
          <div>• This is a computer-generated receipt.</div>
          <div>• Fees once paid are non-refundable.</div>
        </div>
        <div className="rp-signature">
          <div className="rp-sig-line" />
          <div className="rp-sig-label">Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
};

// ── Main export: renders original + patient copy ──────────────────────────────

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ receipt, doctor, isDuplicate }) => {
  const copyLabel = isDuplicate ? 'DUPLICATE COPY' : '';
  return (
    <>
      {/* Page 1 — Original */}
      <ReceiptPage receipt={receipt} doctor={doctor} copyLabel={copyLabel} />

      <style>{`
        /* ── Page setup ── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }

        /* ── Page container ── */
        .rp-page {
          width: 210mm;
          min-height: 148mm;
          padding: 10mm 12mm;
          box-sizing: border-box;
          font-family: 'Times New Roman', 'Georgia', serif;
          font-size: 9.5pt;
          color: #000;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .rp-page-break {
          height: 0;
        }

        /* ── Header ── */
        .rp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2pt solid #000;
          padding-bottom: 5pt;
          margin-bottom: 5pt;
        }
        .rp-doctor-name {
          font-size: 16pt;
          font-weight: 700;
          line-height: 1.15;
          color: #000;
          letter-spacing: -0.3pt;
        }
        .rp-doctor-qual {
          font-size: 9pt;
          font-weight: 600;
          color: #111;
          margin-top: 1pt;
        }
        .rp-doctor-spec {
          font-size: 8.5pt;
          color: #333;
          font-style: italic;
        }
        .rp-clinic-right {
          text-align: right;
          font-size: 8pt;
          color: #222;
          max-width: 45%;
        }
        .rp-clinic-addr {
          line-height: 1.4;
          white-space: pre-wrap;
          margin-bottom: 2pt;
        }
        .rp-clinic-contact {
          font-weight: 600;
        }

        /* ── Title bar ── */
        .rp-title-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8pt;
          border: 1pt solid #000;
          padding: 3pt 8pt;
          margin-bottom: 6pt;
          background: #f8f8f8;
        }
        .rp-title-text {
          font-size: 11pt;
          font-weight: 700;
          letter-spacing: 2pt;
          text-transform: uppercase;
          color: #000;
        }
        .rp-copy-label {
          font-size: 7.5pt;
          font-weight: 600;
          color: #555;
          border: 0.75pt solid #999;
          padding: 1pt 4pt;
          border-radius: 2pt;
          letter-spacing: 0.5pt;
        }

        /* ── Info row ── */
        .rp-info-row {
          display: flex;
          gap: 0;
          margin-bottom: 6pt;
          border: 1pt solid #000;
        }
        .rp-info-block {
          flex: 1;
          padding: 4pt 6pt;
        }
        .rp-info-divider {
          width: 1pt;
          background: #000;
          flex-shrink: 0;
        }
        .rp-info-heading {
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8pt;
          color: #000;
          border-bottom: 0.5pt solid #ccc;
          padding-bottom: 2pt;
          margin-bottom: 3pt;
        }
        .rp-info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
        .rp-info-table td {
          padding: 1pt 0;
          vertical-align: top;
          border: none;
        }
        .rp-info-key {
          color: #444;
          white-space: nowrap;
          padding-right: 6pt !important;
          min-width: 70pt;
        }
        .rp-info-key::after { content: ':'; }
        .rp-info-val {
          font-weight: 600;
          color: #000;
        }
        .rp-receipt-num {
          font-size: 9pt;
          font-weight: 700;
        }

        /* ── Diagnosis ── */
        .rp-diagnosis {
          border: 1pt solid #ccc;
          padding: 4pt 6pt;
          margin-bottom: 6pt;
          background: #fafafa;
        }
        .rp-diagnosis-text {
          font-size: 8.5pt;
          color: #111;
          white-space: pre-wrap;
          line-height: 1.5;
        }

        /* ── Section heading ── */
        .rp-section-heading {
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8pt;
          color: #000;
          margin-bottom: 3pt;
        }

        /* ── Services table ── */
        .rp-services-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4pt;
          font-size: 8.5pt;
        }
        .rp-services-table th,
        .rp-services-table td {
          border: 0.75pt solid #000;
          padding: 3pt 5pt;
          color: #000;
        }
        .rp-services-table thead {
          background: #f0f0f0;
        }
        .rp-services-table th {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4pt;
          text-align: left;
        }
        .rp-th-sr  { width: 22pt; text-align: center; }
        .rp-th-amt { width: 52pt; text-align: right; }
        .rp-td-sr  { text-align: center; color: #444; }
        .rp-td-amt { text-align: right; font-weight: 600; }
        .rp-td-desc { }

        .rp-free-amt {
          text-decoration: line-through;
          color: #888;
        }

        /* ── Total row ── */
        .rp-total-row td {
          background: #f0f0f0;
          border-top: 1pt solid #000 !important;
        }
        .rp-total-label {
          text-align: right;
          font-weight: 700;
          font-size: 9pt;
          padding-right: 8pt !important;
        }
        .rp-free-note {
          font-weight: 400;
          font-size: 7.5pt;
          color: #555;
        }
        .rp-total-val {
          text-align: right !important;
          font-size: 10pt;
          font-weight: 700;
          white-space: nowrap;
        }

        /* ── Amount in words ── */
        .rp-words {
          font-size: 7.5pt;
          color: #333;
          margin-bottom: 6pt;
          font-style: italic;
        }

        /* ── Footer ── */
        .rp-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 0.75pt solid #aaa;
          padding-top: 4pt;
        }
        .rp-terms {
          font-size: 6.5pt;
          color: #555;
          line-height: 1.6;
        }
        .rp-signature {
          text-align: center;
          min-width: 100pt;
        }
        .rp-sig-line {
          border-top: 1pt solid #000;
          width: 90pt;
          margin: 0 auto 2pt;
        }
        .rp-sig-label {
          font-size: 7pt;
          font-weight: 600;
          color: #000;
        }
      `}</style>
    </>
  );
};

export default ReceiptPrint;

import React from 'react';
import { type Doctor, type Receipt } from '../lib/storage';
import { Users, Receipt as ReceiptIcon, DollarSign, TrendingUp, PlusCircle, Clock, ArrowRight, Activity } from 'lucide-react';

interface DashboardProps {
  doctors: Doctor[];
  receipts: Receipt[];
  onNewReceipt: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ doctors, receipts, onNewReceipt }) => {
  const totalRevenue = receipts.reduce((sum, r) => sum + (r.paymentMethod === 'FREE' ? 0 : r.total), 0);
  const recentReceipts = receipts.slice(-5).reverse();
  const avgReceipt = receipts.length ? (totalRevenue / receipts.length).toFixed(0) : 0;
  const growth = receipts.length > 5 ? '+12%' : '0%'; // placeholder for visual effect

  return (
    <div className="bento-dashboard no-print">
      
      {/* ── HERO SECTION ── */}
      <div className="bento-hero">
        <div className="bento-hero-bg">
          <div className="bento-blob blob-1"></div>
          <div className="bento-blob blob-2"></div>
        </div>
        <div className="bento-hero-content">
          <div className="bento-hero-text">
            <h2>Welcome back, Admin</h2>
            <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button className="bento-btn-primary" onClick={onNewReceipt}>
            <PlusCircle size={20} />
            New Receipt
          </button>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="bento-metrics">
        
        {/* Metric 1 */}
        <div className="bento-card bento-metric-card metric-blue">
          <div className="bento-metric-header">
            <div className="bento-icon-wrapper"><Users size={20} /></div>
            <span className="bento-trend positive">{growth}</span>
          </div>
          <div className="bento-metric-body">
            <span className="bento-metric-label">Total Doctors</span>
            <span className="bento-metric-value">{doctors.length}</span>
          </div>
          <div className="bento-metric-bg-icon"><Users size={120} /></div>
        </div>

        {/* Metric 2 */}
        <div className="bento-card bento-metric-card metric-green">
          <div className="bento-metric-header">
            <div className="bento-icon-wrapper"><ReceiptIcon size={20} /></div>
            <span className="bento-trend positive">Active</span>
          </div>
          <div className="bento-metric-body">
            <span className="bento-metric-label">Receipts Generated</span>
            <span className="bento-metric-value">{receipts.length}</span>
          </div>
          <div className="bento-metric-bg-icon"><ReceiptIcon size={120} /></div>
        </div>

        {/* Metric 3 */}
        <div className="bento-card bento-metric-card metric-purple">
          <div className="bento-metric-header">
            <div className="bento-icon-wrapper"><DollarSign size={20} /></div>
            <Activity size={20} className="bento-spark-icon" />
          </div>
          <div className="bento-metric-body">
            <span className="bento-metric-label">Total Revenue</span>
            <span className="bento-metric-value">₹{totalRevenue.toLocaleString()}</span>
          </div>
          <div className="bento-metric-bg-icon"><DollarSign size={120} /></div>
        </div>

        {/* Metric 4 */}
        <div className="bento-card bento-metric-card metric-orange">
          <div className="bento-metric-header">
            <div className="bento-icon-wrapper"><TrendingUp size={20} /></div>
            <Activity size={20} className="bento-spark-icon" />
          </div>
          <div className="bento-metric-body">
            <span className="bento-metric-label">Avg. per Receipt</span>
            <span className="bento-metric-value">₹{avgReceipt}</span>
          </div>
          <div className="bento-metric-bg-icon"><TrendingUp size={120} /></div>
        </div>

      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="bento-bottom-row">
        
        {/* Recent Activity */}
        <div className="bento-card bento-activity">
          <div className="bento-card-header">
            <h3>Recent Receipts</h3>
            <button className="bento-btn-ghost">View All</button>
          </div>
          <div className="bento-activity-list">
            {recentReceipts.length === 0 ? (
              <div className="bento-empty">No receipts generated yet.</div>
            ) : (
              recentReceipts.map((r, i) => (
                <div key={r.id || i} className="bento-activity-item">
                  <div className="bento-activity-icon">
                    <ReceiptIcon size={18} />
                  </div>
                  <div className="bento-activity-details">
                    <span className="bento-activity-title">{r.patientName}</span>
                    <span className="bento-activity-meta">#{r.receiptNumber} • {new Date(r.date).toLocaleDateString()}</span>
                  </div>
                  <div className="bento-activity-trailing">
                    <span className="bento-activity-amount">₹{(Number(r.total) || 0).toLocaleString()}</span>
                    <span className={`bento-badge badge-${r.paymentMethod.toLowerCase()}`}>
                      {r.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bento-card bento-actions">
          <div className="bento-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="bento-action-grid">
            <button className="bento-action-btn" onClick={onNewReceipt}>
              <div className="action-icon-circle blue"><PlusCircle size={22} /></div>
              <span>Generate Receipt</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
            <button className="bento-action-btn">
              <div className="action-icon-circle purple"><Clock size={22} /></div>
              <span>View History</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
            <button className="bento-action-btn">
              <div className="action-icon-circle green"><Users size={22} /></div>
              <span>Manage Doctors</span>
              <ArrowRight size={16} className="action-arrow" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;

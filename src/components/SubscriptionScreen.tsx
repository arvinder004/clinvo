import React, { useState } from 'react';
import { KeyRound, CheckCircle } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface SubscriptionScreenProps {
  onActivated: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onActivated }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleActivate = async () => {
    if (!key.trim()) {
      setError('Please enter a license key.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await (window as any).licensing.activate(key);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onActivated();
        }, 1500);
      } else {
        setError(result.message || 'Invalid or expired license key.');
      }
    } catch (err) {
      setError('An error occurred while verifying the key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-fullscreen-overlay">
      <div className="bento-auth-card" style={{ maxWidth: '420px', alignItems: 'center', textAlign: 'center' }}>
        <img src={logoImg} alt="Clinvo Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#0f172a' }}>Subscription Expired</h1>
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Your Clinvo trial or subscription has expired. Please enter a valid License Key to continue using the application.
        </p>

        {success ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#16a34a', gap: '0.5rem' }}>
            <CheckCircle size={48} strokeWidth={1.5} />
            <p style={{ fontWeight: 600, margin: 0 }}>License Activated!</p>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="DOC-XXXX-XXXX"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                className="form-input"
                style={{ textAlign: 'center', letterSpacing: '1px', fontFamily: 'monospace' }}
              />
              {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>{error}</p>}
            </div>

            <button
              className="btn-primary"
              onClick={handleActivate}
              disabled={loading || !key.trim()}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <KeyRound size={16} />
              {loading ? 'Verifying...' : 'Activate License'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionScreen;

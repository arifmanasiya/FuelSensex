import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SalesCTA() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="cta-drawer">
      <button
        aria-label="Close"
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: '#e5e7eb',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        ×
      </button>
      <div className="pill" style={{ background: 'rgba(255,255,255,0.08)', color: '#c7d2fe' }}>
        Feedback
      </div>
      <div style={{ fontWeight: 800, fontSize: '1.05rem', marginTop: '0.35rem' }}>
        Tell us what you need next
      </div>
      <div className="muted" style={{ color: '#cbd5e1', marginTop: '0.35rem' }}>
        2 minutes to share what’s working and what’s missing. Your feedback guides our roadmap.
      </div>
      <div className="cta-actions">
        <a
          className="button"
          href="https://docs.google.com/forms/d/e/1FAIpQLSeOPX0KhXKh5SC-gtiGF1jRyO_3oN_bLUerx5BxiVVlenbHIQ/viewform?usp=header"
          target="_blank"
          rel="noreferrer"
        >
          Give feedback
        </a>
        <button className="button ghost" onClick={() => navigate('/alerts')}>
          Review issues
        </button>
      </div>
    </div>
  );
}

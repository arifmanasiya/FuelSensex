export default function FeedbackBanner() {
  return (
    <div className="card" style={{ background: '#0b1a2d', color: '#e5e7eb', marginBottom: '1rem' }}>
      <div className="card-header">
        <div style={{ fontWeight: 800 }}>Help us improve FuelSense</div>
        <a
          className="button"
          style={{ background: '#0ea5e9', color: '#fff' }}
          href="https://docs.google.com/forms/d/e/1FAIpQLSeOPX0KhXKh5SC-gtiGF1jRyO_3oN_bLUerx5BxiVVlenbHIQ/viewform?usp=header"
          target="_blank"
          rel="noreferrer"
        >
          Give feedback
        </a>
      </div>
      <div className="muted" style={{ color: '#cbd5e1' }}>
        2 minutes to share what you like and what’s missing. Your input shapes the product.
      </div>
    </div>
  );
}

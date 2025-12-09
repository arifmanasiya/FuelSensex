export default function ContactPage() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div style={{ fontWeight: 800 }}>Contact Us</div>
          <div className="muted">We are here to help you stop fuel loss and stay stocked.</div>
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Technology</div>
            </div>
            <div className="muted">Aarif K Manasiya · artmanasiya@yahoo.com · 512-412-5580</div>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Product</div>
            </div>
            <div className="muted">Arshad Momin · 713-518-5540</div>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Live ATG setup</div>
            </div>
            <div className="muted">
              Tired of guessing what is happening with your fuel? Test the mock to see how alerts and ordering work. If it feels right,
              reach out and we will connect your real ATG feed so you can see your own numbers.
            </div>
          </div>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Need a live demo?</div>
            </div>
            <div className="muted">See it in action, then let us wire your real ATG feed to your account.</div>
            <div style={{ marginTop: '0.5rem' }}>
              <a
                className="button ghost"
                href="https://docs.google.com/forms/d/e/1FAIpQLSeOPX0KhXKh5SC-gtiGF1jRyO_3oN_bLUerx5BxiVVlenbHIQ/viewform?usp=header"
                target="_blank"
                rel="noreferrer"
              >
                Book my setup
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

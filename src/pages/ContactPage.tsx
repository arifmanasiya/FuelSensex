
export default function ContactPage() {
  const base = import.meta.env.BASE_URL;
  const logo = `${base}logo_new.png`;
  const loginHref = `${base}login`;
  const faqHref = `${base}faq`;
  const backHref = base;

  return (
    <div className="public-shell">
      <div className="public-hero">
        <div className="public-hero__top">
          <div className="public-hero__brand">
            <img src={logo} alt="FuelSensex" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.35rem', color: '#002f4b' }}>Contact FuelSensex</div>
              <div className="muted">We are here to help you stop fuel loss and stay stocked.</div>
            </div>
          </div>
          <div className="public-hero__cta">
            <a className="button" href={loginHref}>View demo</a>
            <a className="button ghost" href={faqHref}>FAQ</a>
            <a className="button ghost" href={backHref}>Back</a>
          </div>
        </div>
      </div>

      <div className="public-section">
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
              Test the mock to see alerts and ordering. If it fits, we will connect your real ATG feed so you can see your own numbers.
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
                href="https://forms.gle/D3x9MPPv3HmNvnCh9"
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

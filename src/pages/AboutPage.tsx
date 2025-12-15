export default function AboutPage() {
  const base = import.meta.env.BASE_URL;
  const loginHref = `${base}login`;
  const topHref = `${base}#home-hero`;
  const logo = `${base}logo_new.png`;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'grid', gap: '0.75rem', placeItems: 'center', textAlign: 'center', marginBottom: '1rem' }}>
        <img src={logo} alt="FuelSensex" style={{ height: 48 }} />
        <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>About FuelSensex</div>
        <div className="muted" style={{ maxWidth: '78ch' }}>Built for real fuel operations</div>
      </div>

      <section className="card" id="about-us">
        <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800 }}>About FuelSensex</div>
            <div className="muted">Built for real fuel operations</div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a className="button ghost" href={loginHref}>View demo</a>
          </div>
        </div>

        <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gap: '0.4rem', maxWidth: '78ch' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>
              Built for operators who need proof — not assumptions.
            </div>
            <div className="muted">
              FuelSensex was created to solve a simple but costly problem: fuel operations generate critical data,
              but operators rarely get clear answers when something goes wrong.
            </div>
          </div>

          <div className="list-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800 }}>Why we built FuelSensex</div>
            <div className="muted" style={{ maxWidth: '80ch' }}>
              Independent operators lose money in ways that are hard to see and even harder to prove.
              Deliveries don’t always reconcile cleanly. Tanks drift. Variance accumulates quietly.
              By the time issues surface, the opportunity to correct them is often gone.
            </div>

            <div className="muted">
              FuelSensex exists to change that by making fuel activity visible, explainable, and defensible — while it’s still actionable.
            </div>
          </div>

          <div className="list-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800 }}>How we think about fuel operations</div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <div className="muted">• ATG data should tell a story, not require interpretation</div>
              <div className="muted">• Deliveries should be verifiable, not assumed</div>
              <div className="muted">• Exceptions should surface early, not during audits</div>
              <div className="muted">• Manual actions should be traceable, not invisible</div>
            </div>
          </div>

          <div className="list-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800 }}>What guides the platform</div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <div className="muted">• Designed around real ATG and delivery workflows</div>
              <div className="muted">• Supports human judgment with full audit history</div>
              <div className="muted">• Built for multi-site operations without added complexity</div>
              <div className="muted">• Focused on operational clarity, not generic analytics</div>
            </div>

            <div className="muted" style={{ marginTop: '0.25rem' }}>
              FuelSensex is not about replacing operators — it’s about giving them the information they need to make confident decisions.
            </div>
          </div>

          <div className="list-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800 }}>Who FuelSensex is for</div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-gray">Independent operators</span>
              <span className="badge badge-gray">Multi-site owners</span>
              <span className="badge badge-gray">Fuel managers</span>
              <span className="badge badge-gray">Compliance &amp; finance teams</span>
            </div>

            <div className="muted">Anyone responsible for fuel decisions, accountability, or outcomes.</div>
          </div>

          <div className="list-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '70ch' }}>
              <div style={{ fontWeight: 800 }}>Our mission</div>
              <div className="muted">
                To ensure operators never lose money because fuel activity went unnoticed, unexplained, or undocumented.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a className="button" href={loginHref}>View demo</a>
              <a className="button ghost" href={topHref}>Back to top</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function FAQPage() {
  const base = import.meta.env.BASE_URL;
  const loginHref = `${base}login`;
  const contactHref = `${base}contact`;
  const backHref = base;
  const logo = `${base}logo_new.png`;

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'grid', gap: '0.75rem', placeItems: 'center', textAlign: 'center', marginBottom: '1rem' }}>
        <img src={logo} alt="FuelSensex" style={{ height: 48 }} />
        <div style={{ fontWeight: 800, fontSize: '1.4rem' }}>FuelSensex FAQ</div>
        <div className="muted" style={{ maxWidth: '78ch' }}>Clear answers for owners, jobbers, and back-office teams.</div>
      </div>

      <section className="card" id="faq" style={{ margin: '0 auto', maxWidth: '980px' }}>
        <div className="card-header" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800 }}>FuelSensex FAQ</div>
            <div className="muted">Clear answers for owners, jobbers, and back-office teams.</div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a className="button" href={loginHref}>View demo</a>
            <a className="button ghost" href={contactHref}>Contact</a>
            <a className="button ghost" href={backHref}>Back</a>
          </div>
        </div>

        <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
          <div className="muted" style={{ maxWidth: '78ch' }}>
            If you don’t see your question here, use the Contact page and we’ll help you quickly.
          </div>

          <div className="list-grid" style={{ display: 'grid', gap: '0.65rem' }}>
            <details className="list-card" open>
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>What problems does FuelSensex solve?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                FuelSensex provides a single operational view across ATG readings, deliveries, orders, and POs—so teams can reconcile faster,
                identify exceptions earlier, and maintain a defensible operational history.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>How does unsolicited delivery handling work?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                FuelSensex flags unplanned drops, provides a guided flow to link the delivery to an order and PO, and preserves the audit trail—so variance can be addressed with clarity and confidence.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>How are deliveries matched to orders?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                FuelSensex uses ATG start/end volumes and BOL details to suggest matches. Operators can confirm, adjust, or link manually. Every change is recorded with timestamps.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>How often is ATG data refreshed?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                In the mock environment, updates may appear as frequently as every minute. In production, refresh follows the cadence your ATG bridge publishes events—so “live” reflects current site data.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>Do I need special hardware?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                FuelSensex works with your existing ATG feed via an ATG bridge connection. No new console is required. Data is transmitted securely.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>Is FuelSensex multi-site friendly?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                Yes. FuelSensex supports multi-site views, per-site drilldowns, and role-based access for different teams and responsibilities.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>What about audit and compliance?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                Every alert, delivery link, override, and comment is recorded with timestamps, providing a defensible record when questions arise.
              </div>
            </details>

            <details className="list-card">
              <summary style={{ cursor: 'pointer', fontWeight: 800, listStyle: 'none' }}>How do I get help?</summary>
              <div className="muted" style={{ marginTop: '0.5rem', maxWidth: '92ch' }}>
                Use the Contact page for support or to request a walkthrough. FuelSensex is built for operators, and support is intended to be direct and practical.
              </div>
            </details>
          </div>
        </div>
      </section>

      <style>{`
        #faq details > summary::-webkit-details-marker { display: none; }
        #faq details > summary { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; }
        #faq details > summary::after { content: "▾"; color: inherit; opacity: 0.7; font-weight: 800; }
        #faq details[open] > summary::after { content: "▴"; }
      `}</style>
    </div>
  );
}

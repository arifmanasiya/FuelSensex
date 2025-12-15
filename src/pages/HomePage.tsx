import logo from "../assets/logo_new.png";

﻿export default function HomePage() {
  const base = import.meta.env.BASE_URL;
  const loginHref = `${base}login`;
  const aboutHref = `${base}about`;
  const faqHref = `${base}faq`;
  const contactHref = `${base}contact`;

  return (
    <div className="fs-home" aria-label="FuelSensex Home">
      <header className="fs-topnav">
        <div className="fs-topnav__brand" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <img src={logo} alt="FuelSensex" style={{ height: 32, width: 'auto' }} />
          <span style={{ fontWeight: 800 }}>FuelSensex</span>
        </div>
        <a className="fs-topnav__login" href={loginHref}>Login</a>
      </header>
      <div className="fs-subnav">
        <nav className="fs-topnav__links fs-subnav__links" aria-label="Primary">
          <a href="#features">Product</a>
          <a href="#how">How It Works</a>
          <a href="#demo">Demo</a>
        </nav>
      </div>

      <main>
        <section className="fs-section fs-hero" id="top">
          <div className="fs-container fs-hero__grid">
            <div className="fs-hero__copy">
              <p className="fs-eyebrow">Fuel Operations • ATG Intelligence • Delivery Reconciliation</p>
              <h1 className="fs-h1">From ATG data to operational clarity.</h1>
              <p className="fs-lead">
                FuelSensex unifies live tank readings, deliveries, orders, and POs into a single operational cockpit—so teams can reconcile faster,
                surface root causes, and maintain defensible records while keeping supply and pricing decisions fully aligned.
              </p>

              <div className="fs-cta">
                <a className="fs-btn fs-btn--primary" href={loginHref}>View Demo</a>
                <a className="fs-btn fs-btn--ghost" href="#features">Learn More</a>
              </div>

              <div className="fs-hero__notes">
                <span className="fs-note">Secure access</span>
                <span className="fs-dot" aria-hidden="true"></span>
                <span className="fs-note">Operational workflows</span>
                <span className="fs-dot" aria-hidden="true"></span>
                <span className="fs-note">Audit-ready history</span>
              </div>
            </div>

            <div className="fs-hero__visual" aria-label="Product preview placeholder">
              <div className="fs-mock">
                <div className="fs-mock__top">
                  <div className="fs-mock__pill">Multi-site overview</div>
                  <div className="fs-mock__pill">Unmatched deliveries</div>
                  <div className="fs-mock__pill">Tank levels</div>
                </div>
                <div className="fs-mock__body">
                  <div className="fs-mock__card">
                    <div className="fs-mock__title">Today</div>
                    <div className="fs-mock__row"><span className="fs-mock__label">Sites online</span><span className="fs-mock__val">12</span></div>
                    <div className="fs-mock__row"><span className="fs-mock__label">Exceptions</span><span className="fs-mock__val fs-mock__val--warn">3</span></div>
                    <div className="fs-mock__row"><span className="fs-mock__label">Deliveries</span><span className="fs-mock__val">7</span></div>
                  </div>
                  <div className="fs-mock__card">
                    <div className="fs-mock__title">Reconciliation</div>
                    <div className="fs-mock__bar"><div style={{ width: '72%' }}></div></div>
                    <div className="fs-mock__hint">72% matched automatically</div>
                  </div>
                  <div className="fs-mock__card">
                    <div className="fs-mock__title">Audit trail</div>
                    <div className="fs-mock__lines">
                      <div className="fs-mock__line"></div>
                      <div className="fs-mock__line"></div>
                      <div className="fs-mock__line"></div>
                    </div>
                    <div className="fs-mock__hint">Every decision logged</div>
                  </div>
                </div>
              </div>
              <div className="fs-hero__visualNote">Replace with dashboard screenshot(s) when ready.</div>
            </div>
          </div>
        </section>

        <section className="fs-section" id="problem">
          <div className="fs-container">
            <div className="fs-sectionHead">
              <h2 className="fs-h2">The reality operators face</h2>
              <p className="fs-sub">When tank readings, deliveries, and orders don’t line up, close-out becomes manual and risk increases.</p>
            </div>

            <div className="fs-flow">
              <article className="fs-step">
                <div className="fs-step__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="fs-step__body">
                  <h3 className="fs-h3">Across sites and systems</h3>
                  <p className="fs-p">ATG data is fragmented, with no single operational view.</p>
                </div>
              </article>

              <article className="fs-step">
                <div className="fs-step__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5" /><path d="M4 20l6-6" /><path d="M21 3l-7 7" /><path d="M16 21h5v-5" /><path d="M4 4l6 6" /><path d="M21 21l-7-7" />
                  </svg>
                </div>
                <div className="fs-step__body">
                  <h3 className="fs-h3">When deliveries arrive</h3>
                  <p className="fs-p">Drops don’t always match orders, and reconciliation turns manual.</p>
                </div>
              </article>

              <article className="fs-step">
                <div className="fs-step__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10 2h4l8 14H2L10 2Z" />
                  </svg>
                </div>
                <div className="fs-step__body">
                  <h3 className="fs-h3">When things go off-plan</h3>
                  <p className="fs-p">Unsolicited deliveries and missing BOLs create exposure and delays.</p>
                </div>
              </article>

              <article className="fs-step">
                <div className="fs-step__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <div className="fs-step__body">
                  <h3 className="fs-h3">Day-to-day close-out</h3>
                  <p className="fs-p">Spreadsheets, texts, and phone calls slow down close-out and increase errors.</p>
                </div>
              </article>

              <article className="fs-step">
                <div className="fs-step__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2 20 6v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4Z" />
                  </svg>
                </div>
                <div className="fs-step__body">
                  <h3 className="fs-h3">The result</h3>
                  <p className="fs-p">Weak audit trails increase compliance and financial risk.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="fs-section fs-section--alt" id="approach">
          <div className="fs-container">
            <div className="fs-sectionHead">
              <h2 className="fs-h2">The FuelSensex way</h2>
              <p className="fs-sub">One operational view. Clear actions. Defensible outcomes.</p>
            </div>

            <div className="fs-solutionGrid">
              <article className="fs-solutionCard">
                <div className="fs-solutionCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3h7v7H3z" /><path d="M14 3h7v7h-7z" /><path d="M3 14h7v7H3z" /><path d="M14 14h7v7h-7z" />
                  </svg>
                </div>
                <h3 className="fs-h3">Centralize everything</h3>
                <p className="fs-p">Unify tank readings, deliveries, orders, and POs into one operational view.</p>
              </article>

              <article className="fs-solutionCard">
                <div className="fs-solutionCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22a10 10 0 1 0-10-10" /><path d="M12 12l7-7" /><path d="M12 12l6 6" /><path d="M12 12H2" />
                  </svg>
                </div>
                <h3 className="fs-h3">Surface exceptions early</h3>
                <p className="fs-p">Automatically flag mismatches, anomalies, and unsolicited deliveries.</p>
              </article>

              <article className="fs-solutionCard">
                <div className="fs-solutionCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
                  </svg>
                </div>
                <h3 className="fs-h3">Guide the operator</h3>
                <p className="fs-p">Clear flows to link deliveries to orders and close out discrepancies.</p>
              </article>

              <article className="fs-solutionCard">
                <div className="fs-solutionCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 21v-7" /><path d="M4 10V3" /><path d="M12 21v-9" /><path d="M12 8V3" /><path d="M20 21v-5" /><path d="M20 12V3" />
                    <path d="M2 14h4" /><path d="M10 12h4" /><path d="M18 16h4" />
                  </svg>
                </div>
                <h3 className="fs-h3">Keep human control</h3>
                <p className="fs-p">Manual overrides are supported—with full traceability and history.</p>
              </article>

              <article className="fs-solutionCard">
                <div className="fs-solutionCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 2h6v3H9z" /><path d="M7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
                  </svg>
                </div>
                <h3 className="fs-h3">Stand up to scrutiny</h3>
                <p className="fs-p">Build a defensible audit trail across sites, tanks, and jobbers.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="fs-section" id="features">
          <div className="fs-container">
            <div className="fs-sectionHead">
              <h2 className="fs-h2">Core capabilities</h2>
              <p className="fs-sub">Built for operational workflows: visibility, reconciliation, and audit-ready history.</p>
            </div>

            <div className="fs-featureGrid">
              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2s7 7 7 12a7 7 0 0 1-14 0C5 9 12 2 12 2Z" />
                  </svg>
                </div>
                <h3 className="fs-h3">Real-time tank visibility</h3>
                <p className="fs-p">Live and historical ATG levels across every site, with water and temperature context.</p>
              </article>

              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                </div>
                <h3 className="fs-h3">Delivery reconciliation</h3>
                <p className="fs-p">Match deliveries to orders using ATG readings and BOLs; resolve short/over deliveries quickly.</p>
              </article>

              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 22V2" /><path d="M4 4h13l-2 4 2 4H4" />
                  </svg>
                </div>
                <h3 className="fs-h3">Unsolicited delivery handling</h3>
                <p className="fs-p">Identify unplanned drops and link them to orders and POs without losing control.</p>
              </article>

              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 17h4V5H2v12h2" /><path d="M14 8h4l4 4v5h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
                <h3 className="fs-h3">Order & jobber management</h3>
                <p className="fs-p">Track orders, jobbers, and PO numbers with clear status from request to delivered.</p>
              </article>

              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h3" />
                  </svg>
                </div>
                <h3 className="fs-h3">Audit & compliance readiness</h3>
                <p className="fs-p">Defensible records for every transaction, change, and override—ready when needed.</p>
              </article>

              <article className="fs-featureCard">
                <div className="fs-featureCard__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 11V8a5 5 0 0 1 10 0v3" /><path d="M6 11h12v10H6z" />
                  </svg>
                </div>
                <h3 className="fs-h3">Secure, role-based access</h3>
                <p className="fs-p">Control who can view, reconcile, and approve actions with enterprise-grade security.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="fs-section fs-section--alt" id="how">
          <div className="fs-container">
            <div className="fs-sectionHead">
              <h2 className="fs-h2">How it works</h2>
              <p className="fs-sub">A straightforward operational flow—from ingest to close-out.</p>
            </div>

            <ol className="fs-how">
              <li className="fs-how__item">
                <div className="fs-how__num">1</div>
                <div className="fs-how__body">
                  <h3 className="fs-h3">Connect your data</h3>
                  <p className="fs-p">Ingest ATG events alongside orders, deliveries, and POs into one operational model.</p>
                </div>
              </li>
              <li className="fs-how__item">
                <div className="fs-how__num">2</div>
                <div className="fs-how__body">
                  <h3 className="fs-h3">Review what the system finds</h3>
                  <p className="fs-p">See unmatched deliveries, anomalies, and low-tank risks in one unified view.</p>
                </div>
              </li>
              <li className="fs-how__item">
                <div className="fs-how__num">3</div>
                <div className="fs-how__body">
                  <h3 className="fs-h3">Take action with confidence</h3>
                  <p className="fs-p">Link deliveries to orders, reconcile discrepancies, and handle unsolicited drops—every step tracked.</p>
                </div>
              </li>
              <li className="fs-how__item">
                <div className="fs-how__num">4</div>
                <div className="fs-how__body">
                  <h3 className="fs-h3">Close with certainty</h3>
                  <p className="fs-p">Every decision is logged for financial, compliance, and service follow-up.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="fs-section" id="trust">
          <div className="fs-container">
            <div className="fs-sectionHead">
              <h2 className="fs-h2">Built for serious fuel operations</h2>
              <p className="fs-sub">Operational workflows first—visibility, control, and defensible history.</p>
            </div>

            <div className="fs-trustGrid">
              <div className="fs-trustItem">
                <span className="fs-check" aria-hidden="true">✓</span>
                <p className="fs-p">Designed for multi-site operators, jobbers, and compliance teams.</p>
              </div>
              <div className="fs-trustItem">
                <span className="fs-check" aria-hidden="true">✓</span>
                <p className="fs-p">Built around real ATG and delivery workflows—no generic analytics positioning.</p>
              </div>
              <div className="fs-trustItem">
                <span className="fs-check" aria-hidden="true">✓</span>
                <p className="fs-p">Supports manual overrides with traceability and approvals.</p>
              </div>
              <div className="fs-trustItem">
                <span className="fs-check" aria-hidden="true">✓</span>
                <p className="fs-p">Enterprise security, data integrity, and operational resilience.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="fs-section fs-final" id="demo">
          <div className="fs-container fs-final__grid">
            <div>
              <h2 className="fs-h2">Operational clarity you can act on.</h2>
              <p className="fs-sub">
                Replace spreadsheets and guesswork with a single operational view and structured reconciliation—built for real close-out.
              </p>
            </div>
            <div className="fs-final__cta">
              <a className="fs-btn fs-btn--primary fs-btn--lg" href={loginHref}>View Demo</a>
              <div className="fs-final__note muted">Secure login • No installation required</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fs-footer">
        <div className="fs-footer__links">
          <a href={aboutHref}>About Us</a>
          <a href={faqHref}>FAQ</a>
          <a href={contactHref}>Contact Us</a>
        </div>
        <div className="muted small">FuelSensex • Built for real operations</div>
      </footer>
    </div>
  );
}

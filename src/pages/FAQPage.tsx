import type { ReactNode } from 'react';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div className="muted">{children}</div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div style={{ fontWeight: 800 }}>FuelSense FAQ</div>
          <div className="muted">Quick, clear answers for station owners.</div>
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <Section title="What does FuelSense actually do?">
            FuelSense watches your tanks, pumps, deliveries, and variance 24/7 and alerts you the moment something goes wrong - water,
            shortages, runout risk, theft, POS/ATG mismatches, and more. It is like having a full-time fuel manager who never sleeps.
          </Section>

          <Section title="How do notifications work?">
            We continuously read your ATG data and variance signals. When something looks off, you get an instant alert on the dashboard,
            in the notifications center, and at the store level. You can add notes, assign the alert, or close it when resolved - everything
            is tracked.
          </Section>

          <Section title="Can FuelSense help me audit deliveries?">
            Yes - better than any manual process. FuelSense automatically suggests order quantities, tracks delivery windows, compares BOL
            vs actual tank increase, flags any short or suspicious delivery, and logs everything for proof later. No more guessing or
            relying on paper tickets.
          </Section>

          <Section title="Does FuelSense help with service issues?">
            Absolutely. From any notification or tank card, you can open a service ticket to your preferred provider (set in Settings). You
            will see issue details, tank/grade affected, time detected, and ticket status until it is closed. Everything stays organized and
            traceable.
          </Section>

          <Section title="How is Fuel Loss History calculated?">
            FuelSense aggregates every variance event - by day, week, month, and grade. You can see where you are losing gallons, patterns
            over time, and how much those losses cost. This is your proof when something feels off.
          </Section>

          <Section title="Can I switch between stores quickly?">
            Yes. Use the store selector in the header or open All Notifications for a multi-site overview. Works whether you run one flagship
            location or a growing network of sites.
          </Section>

          <Section title="Do I need special hardware?">
            FuelSense connects securely to your ATG data with a lightweight on-site bridge. It is turnkey, tidy, and does not require a
            complex install.
          </Section>

          <Section title="Will this replace my POS or back office system?">
            No - FuelSense sits on top of your ATG and POS. It does not replace anything. It simply gives you visibility they do not provide.
          </Section>

          <Section title="Is it hard to use?">
            Not at all. FuelSense is designed for busy operators - the ones who do not have time for spreadsheets, portals, or tech
            headaches. If you can navigate WhatsApp or Facebook, you can use FuelSense.
          </Section>

          <Section title="Can I trust the data?">
            Yes. FuelSense reads directly from your ATG and reconciles it against your POS and deliveries. We do not guess - we measure.
          </Section>

          <Section title="How do I get help?">
            You can use the Contact page anytime. We are here to support independent operators - not send you to offshore call centers.
          </Section>

          <Section title="Why do owners call FuelSense the holy grail?">
            Because it finally solves the biggest hidden drain in their business: fuel loss they cannot see, prove, or stop. FuelSense shows
            real numbers, proves what happened, catches problems early, saves thousands, pays for itself immediately, and gives owners back
            control.
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div style={{ fontWeight: 800 }}>About FuelSense</div>
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <p>
            FuelSense exists for one simple reason: independent gas station owners lose too much money without ever seeing it happen.
            Fuel gets stolen, deliveries come up short, tanks run low, and POS/ATG numbers never quite match - and most of the time, you
            only find out days or weeks later. We built FuelSense to stop that.
          </p>
          <p>
            Created by LabUDIS © with real operators in mind, FuelSense is a fuel loss prevention and station intelligence platform that
            watches your tanks, pumps, and deliveries 24/7 - so you do not have to. Our goal is to give small operators the same visibility
            and control big chains have, without the complexity, cost, or IT headaches.
          </p>

          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>We understand the pain</div>
            </div>
            <ul className="muted" style={{ paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem' }}>
              <li>Running a single store is hard. Running two or three is exhausting.</li>
              <li>Variance you cannot explain.</li>
              <li>Deliveries you are not fully sure about.</li>
              <li>Tanks that run low at the worst possible time.</li>
              <li>Employees who mean well but make costly mistakes.</li>
              <li>Vendors who do not always tell the full story.</li>
            </ul>
            <p className="muted" style={{ marginTop: '0.25rem' }}>
            FuelSense is built to remove that stress and give owners back control over the one thing that keeps the lights on: fuel.
            </p>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Our approach</div>
            </div>
            <p className="muted">
              We blend reliable ATG data with modern analytics to catch problems early, reduce shrink, predict runouts, verify every
              delivery, and automate the daily checks owners hate doing. No spreadsheets. No manual reconciliation. No guessing.
            </p>
          </div>

          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>What FuelSense delivers</div>
            </div>
            <ul className="muted" style={{ paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem' }}>
              <li>Instant alerts for water, shortages, theft, variance spikes, and runout risk.</li>
              <li>Fuel ordering suggestions with supplier info and delivery audit trails.</li>
              <li>Service ticket routing to your preferred vendors with full context.</li>
              <li>Clear variance history so you can quantify losses - and the money you are saving.</li>
              <li>Simple dashboards designed for busy operators, not data analysts.</li>
            </ul>
          </div>

          <p>
            FuelSense is built to be practical, fast, and owner-friendly - a real tool for real operators who cannot afford to lose a gallon.
            Because at the end of the day, every gallon matters, and losing even a little adds up fast. Our mission is to make sure you never
            lose money because of fuel again.
          </p>
        </div>
      </div>
    </div>
  );
}

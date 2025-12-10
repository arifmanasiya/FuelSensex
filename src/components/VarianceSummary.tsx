import type { VarianceEvent } from '../types';

interface Props {
  todayGallons: number;
  todayValue: number;
  last7Gallons: number;
  last7Value: number;
  events: VarianceEvent[];
}

export default function VarianceSummary({ todayGallons, todayValue, last7Gallons, last7Value, events }: Props) {
  const gradeLabel = (code: string) => {
    if (code === 'REG') return 'Regular 87';
    if (code === 'MID') return 'Midgrade 89';
    if (code === 'PREM') return 'Premium 93';
    if (code === 'DSL') return 'Diesel';
    return code;
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>Fuel loss history</div>
        <div className="muted">Today compared to last 7 days</div>
      </div>
      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="card kpi" style={{ margin: 0 }}>
          <div className="label">Today</div>
          <div className="value">
            {todayGallons.toFixed(0)} gal ({todayValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
          </div>
        </div>
        <div className="card kpi" style={{ margin: 0 }}>
          <div className="label">Last 7 Days</div>
          <div className="value">
            {last7Gallons.toFixed(0)} gal ({last7Value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})
          </div>
        </div>
      </div>
      <div className="list-grid">
        {sortedEvents.map((e) => (
          <div key={e.id} className="list-card">
            <div className="list-meta">
              <div>
                <div style={{ fontWeight: 700 }}>{gradeLabel(e.gradeCode)}</div>
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {new Date(e.timestamp).toLocaleString()}
                </div>
              </div>
              <span
                className={`badge ${
                  e.severity === 'CRITICAL' ? 'badge-red' : e.severity === 'WARNING' ? 'badge-yellow' : 'badge-green'
                }`}
              >
                {e.severity}
              </span>
            </div>
            <div className="list-meta" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <span className="muted">
                Expected {e.expectedGallons.toLocaleString()} gal · Metered {e.actualGallons.toLocaleString()} gal
              </span>
              <span
                className={`badge ${
                  e.varianceGallons < 0 ? 'badge-red' : e.varianceGallons > 0 ? 'badge-green' : 'badge-yellow'
                }`}
              >
                {e.varianceGallons.toLocaleString()} gal
              </span>
            </div>
            {e.note ? <div className="muted">{e.note}</div> : null}
          </div>
        ))}
      </div>
      {events.length === 0 ? <div className="muted">No variance events recorded.</div> : null}
    </div>
  );
}

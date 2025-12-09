import type { VarianceEvent } from '../types';

interface Props {
  todayGallons: number;
  todayValue: number;
  last7Gallons: number;
  last7Value: number;
  events: VarianceEvent[];
}

export default function VarianceSummary({ todayGallons, todayValue, last7Gallons, last7Value, events }: Props) {
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
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Fuel type</th>
            <th>Expected gallons</th>
            <th>Metered gallons</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{new Date(e.timestamp).toLocaleString()}</td>
              <td>{e.gradeCode}</td>
              <td>{e.expectedGallons.toLocaleString()}</td>
              <td>{e.actualGallons.toLocaleString()}</td>
              <td style={{ color: e.varianceGallons < 0 ? '#ef4444' : '#16a34a' }}>
                {e.varianceGallons.toLocaleString()} gal
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 ? <div className="muted">No variance events recorded.</div> : null}
    </div>
  );
}

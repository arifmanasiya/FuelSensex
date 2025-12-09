import type { DeliveryRecord } from '../types';

interface Props {
  deliveries: DeliveryRecord[];
  onMarkOk?: (id: string) => void;
  onMarkShort?: (id: string) => void;
  onReportIssue?: (id: string) => void;
}

function statusBadge(status: DeliveryRecord['status']) {
  if (status === 'OK') return <span className="badge badge-green">OK</span>;
  if (status === 'SHORT') return <span className="badge badge-red">Short</span>;
  return <span className="badge badge-yellow">Check</span>;
}

export default function DeliveryTable({ deliveries, onMarkOk, onMarkShort, onReportIssue }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>Recent Deliveries</div>
        <div className="muted">{deliveries.length} records</div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Date/Time</th>
            <th>Supplier</th>
            <th>Grade</th>
            <th>Delivery ticket (gal)</th>
            <th>Previous level (gal)</th>
            <th>Tank reading (gal)</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.id}>
              {/** simple mock: derive previous level as current reading minus delivered gallons if not provided */}              
              <td>{new Date(d.timestamp).toLocaleString()}</td>
              <td>{d.supplier}</td>
              <td>{d.gradeCode}</td>
              <td>{d.bolGallons.toLocaleString()}</td>
              <td>{(d.preDeliveryGallons ?? Math.max(d.atgReceivedGallons - d.bolGallons, 0)).toLocaleString()}</td>
              <td>{d.atgReceivedGallons.toLocaleString()}</td>
              <td>{statusBadge(d.status)}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {d.status === 'CHECK' && onMarkOk ? (
                    <button
                      className="button"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      onClick={() => onMarkOk(d.id)}
                    >
                      Mark received
                    </button>
                  ) : null}
                  {d.status === 'CHECK' && onMarkShort ? (
                    <button
                      className="button ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      onClick={() => onMarkShort(d.id)}
                    >
                      Mark short
                    </button>
                  ) : null}
                  {onReportIssue ? (
                    <button
                      className="button ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                      onClick={() => onReportIssue(d.id)}
                    >
                      Report issue
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deliveries.length === 0 ? <div className="muted">No deliveries recorded.</div> : null}
    </div>
  );
}

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
  const sortedDeliveries = [...deliveries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>Recent Deliveries</div>
        <div className="muted">{deliveries.length} records</div>
      </div>
      <div className="list-grid">
        {sortedDeliveries.map((d) => {
          const prevLevel = d.preDeliveryGallons ?? Math.max(d.atgReceivedGallons - d.bolGallons, 0);
          return (
            <div key={d.id} className="list-card">
              <div className="list-meta">
                <div>
                  <div style={{ fontWeight: 700 }}>{d.supplier}</div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {new Date(d.timestamp).toLocaleString()}
                  </div>
                </div>
                {statusBadge(d.status)}
              </div>
              <div className="list-meta">
                <div className="muted">{d.gradeCode} • Ticket {d.bolGallons.toLocaleString()} gal</div>
              </div>
              <div className="muted">
                Prev: {prevLevel.toLocaleString()} gal · Tank reading: {d.atgReceivedGallons.toLocaleString()} gal
              </div>
              <div className="list-actions">
                {d.status === 'CHECK' && onMarkOk ? (
                  <button className="button" onClick={() => onMarkOk(d.id)}>
                    Mark received
                  </button>
                ) : null}
                {d.status === 'CHECK' && onMarkShort ? (
                  <button className="button ghost" onClick={() => onMarkShort(d.id)}>
                    Mark short
                  </button>
                ) : null}
                {onReportIssue ? (
                  <button className="button ghost" onClick={() => onReportIssue(d.id)}>
                    Report issue
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {deliveries.length === 0 ? <div className="muted">No deliveries recorded.</div> : null}
    </div>
  );
}

import type { Alert } from '../types';
import AlertBadge from './AlertBadge';

interface Props {
  alerts: Alert[];
  title?: string;
  onClose?: (alert: Alert) => void;
  onAction?: (alert: Alert, action: string) => void;
}

function formatType(type: Alert['type']) {
  const map: Record<Alert['type'], string> = {
    POSSIBLE_THEFT: 'Possible theft',
    SHORT_DELIVERY: 'Short delivery',
    RUNOUT_RISK: 'Low fuel risk',
    WATER_DETECTED: 'Water in tank',
    ATG_POS_MISMATCH: 'Meter vs register mismatch',
    ATG_ALARM: 'ATG alarm',
  };
  return map[type] ?? type.replace(/_/g, ' ');
}

const issueCatalog: Record<
  Alert['type'],
  {
    actions: { key: string; label: string }[];
  }
> = {
  POSSIBLE_THEFT: { actions: [{ key: 'view', label: 'View details' }] },
  SHORT_DELIVERY: { actions: [{ key: 'service', label: 'Request service' }] },
  RUNOUT_RISK: { actions: [{ key: 'reorder', label: 'Order fuel' }] },
  WATER_DETECTED: { actions: [{ key: 'service', label: 'Request service' }] },
  ATG_POS_MISMATCH: { actions: [{ key: 'view', label: 'View details' }] },
  ATG_ALARM: { actions: [{ key: 'service', label: 'Request service' }] },
};

export default function AlertList({ alerts, title = 'Notifications', onClose, onAction }: Props) {
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div className="muted">{alerts.length} items</div>
      </div>
      <div className="grid" style={{ gap: '0.75rem' }}>
        {sortedAlerts.map((alert) => (
          <div key={alert.id} className="list-card" style={{ display: 'grid', gap: '0.5rem' }}>
            <div className="list-meta" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{formatType(alert.type)}</div>
                <div className="muted" style={{ fontSize: '0.9rem' }}>
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
              <AlertBadge severity={alert.severity} />
            </div>
            <div className="muted">{alert.message}</div>
            <div className="list-actions" style={{ justifyContent: 'flex-end' }}>
              {(issueCatalog[alert.type]?.actions || []).map((act) => (
                <button
                  key={act.key}
                  className="button ghost"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', opacity: alert.isOpen ? 1 : 0.4, minWidth: '110px', justifyContent: 'center' }}
                  disabled={!alert.isOpen}
                  onClick={() => alert.isOpen && onAction && onAction(alert, act.key)}
                >
                  {act.label}
                </button>
              ))}
              <button
                className="button ghost"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', opacity: alert.isOpen ? 1 : 0.4, minWidth: '90px', justifyContent: 'center' }}
                disabled={!alert.isOpen}
                onClick={() => onClose && alert.isOpen && onClose(alert)}
              >
                Close
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 ? <div className="muted">No alerts.</div> : null}
      </div>
    </div>
  );
}

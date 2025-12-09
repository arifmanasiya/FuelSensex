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
};

export default function AlertList({ alerts, title = 'Notifications', onClose, onAction }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div className="muted">{alerts.length} items</div>
      </div>
      <div className="grid" style={{ gap: '0.75rem' }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertBadge severity={alert.severity} />
                <div>
                  <div style={{ fontWeight: 600 }}>{formatType(alert.type)}</div>
                <div className="muted">{alert.message}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '220px', justifyContent: 'flex-end' }}>
              <div className="muted" style={{ fontSize: '0.9rem' }}>{new Date(alert.timestamp).toLocaleString()}</div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
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
          </div>
        ))}
        {alerts.length === 0 ? <div className="muted">No alerts.</div> : null}
      </div>
    </div>
  );
}

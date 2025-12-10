import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api/apiClient';
import type { Alert, SiteSummary } from '../types';
import AlertBadge from '../components/AlertBadge';

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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const navigate = useNavigate();
  const [viewAlert, setViewAlert] = useState<Alert | null>(null);
  const [closeAlert, setCloseAlert] = useState<Alert | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [alertTab, setAlertTab] = useState<'OPEN' | 'CLOSED'>('OPEN');

  useEffect(() => {
    get<Alert[]>('/alerts').then(setAlerts);
    get<SiteSummary[]>('/sites').then(setSites);
  }, []);

  const siteName = (id: string) => sites.find((s) => s.id === id)?.name || id;

  return (
    <div className="page">
      <h1 style={{ margin: 0 }}>Notifications</h1>
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
          <button
            className={alertTab === 'OPEN' ? 'button' : 'button ghost'}
            style={{ position: 'relative', paddingRight: '2.2rem' }}
            onClick={() => setAlertTab('OPEN')}
            type="button"
          >
            Open
            <span className="count-badge">{alerts.filter((a) => a.isOpen).length}</span>
          </button>
          <button
            className={alertTab === 'CLOSED' ? 'button' : 'button ghost'}
            style={{ position: 'relative', paddingRight: '2.2rem' }}
            onClick={() => setAlertTab('CLOSED')}
            type="button"
          >
            Closed
            <span className="count-badge">{alerts.filter((a) => !a.isOpen).length}</span>
          </button>
        </div>
        <div className="alerts-grid">
          {[...alerts]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .filter((a) => (alertTab === 'OPEN' ? a.isOpen : !a.isOpen))
            .map((a) => (
              <div key={a.id} className="alert-card">
                <div className="alert-meta">
                  <div>
                    <div style={{ fontWeight: 700 }}>{siteName(a.siteId)}</div>
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <AlertBadge severity={a.severity} />
                </div>
                <div className="alert-meta">
                  <div style={{ fontWeight: 600 }}>{formatType(a.type)}</div>
                </div>
                <div className="muted">{a.message}</div>
                {a.isOpen ? (
                  <div className="alert-actions">
                    <button className="button ghost" onClick={() => setViewAlert(a)}>
                      View
                    </button>
                    {(a.type === 'RUNOUT_RISK' || a.type === 'SHORT_DELIVERY') && (
                      <button className="button" onClick={() => navigate(`/sites/${a.siteId}#ordering`)}>
                        Re-order
                      </button>
                    )}
                    {a.type === 'WATER_DETECTED' && (
                      <button
                        className="button ghost"
                        onClick={() =>
                          setAlerts((prev) => [
                            {
                              id: `svc-${a.id}`,
                              siteId: a.siteId,
                              timestamp: new Date().toISOString(),
                              severity: 'WARNING',
                              type: 'WATER_DETECTED',
                              message: 'Service ticket opened (mock) for tank issue',
                              isOpen: true,
                            },
                            ...prev,
                          ])
                        }
                      >
                        Service
                      </button>
                    )}
                    <button
                      className="button ghost"
                      onClick={() => {
                        setCloseAlert(a);
                        setCloseNote('');
                      }}
                    >
                      Close
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
        {alerts.length === 0 ? <div className="muted">No alerts.</div> : null}
      </div>
      {viewAlert ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="card-header">
              <div style={{ fontWeight: 800 }}>Alert details</div>
              <button
                className="button ghost"
                style={{ width: 36, height: 36, padding: 0 }}
                onClick={() => setViewAlert(null)}
              >
                ×
              </button>
            </div>
            <div className="grid" style={{ gap: '0.35rem' }}>
              <div><strong>Site:</strong> {siteName(viewAlert.siteId)}</div>
              <div><strong>Type:</strong> {formatType(viewAlert.type)}</div>
              <div><strong>Severity:</strong> {viewAlert.severity}</div>
              <div><strong>Time:</strong> {new Date(viewAlert.timestamp).toLocaleString()}</div>
              <div><strong>Message:</strong> {viewAlert.message}</div>
            </div>
          </div>
        </div>
      ) : null}
      {closeAlert ? (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="card-header">
              <div style={{ fontWeight: 800 }}>Close notification</div>
              <button
                className="button ghost"
                style={{ width: 36, height: 36, padding: 0 }}
                onClick={() => setCloseAlert(null)}
              >
                ×
              </button>
            </div>
            <div className="form-field">
              <label>Closing note</label>
              <textarea
                rows={3}
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}
              />
            </div>
            <button
              className="button"
              onClick={() => {
                setAlerts((prev) =>
                  prev.map((al) =>
                    al.id === closeAlert.id ? { ...al, isOpen: false, message: `${al.message} (closed: ${closeNote || 'no note'})` } : al
                  )
                );
                setCloseAlert(null);
                setCloseNote('');
              }}
            >
              Close notification
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

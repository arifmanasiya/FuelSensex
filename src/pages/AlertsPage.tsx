import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Alert } from '../types';
import type { Ticket } from '../models/types';
import AlertBadge from '../components/AlertBadge';
import PageHeader from '../components/PageHeader';
import { useAlerts, useCreateTicket, usePageHeaders, useSites, useUpdateAlert, useOrders, useServiceCompanies, useServiceTickets } from '../api/hooks';
import ConfirmModal from '../components/ConfirmModal';

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

export default function AlertsPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts(selectedSiteId || undefined);
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: pageHeaders } = usePageHeaders();
  const { data: orders = [] } = useOrders(selectedSiteId);
  const { data: serviceCompanies = [] } = useServiceCompanies(selectedSiteId);
  const { data: existingTickets = [] } = useServiceTickets(selectedSiteId);
  const updateAlert = useUpdateAlert();

  const navigate = useNavigate();
  const [viewAlert, setViewAlert] = useState<Alert | null>(null);
  const [closeAlert, setCloseAlert] = useState<Alert | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [alertTab, setAlertTab] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [serviceLoadingId, setServiceLoadingId] = useState<string | null>(null);
  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const createTicket = useCreateTicket();
  const [existingTicketPrompt, setExistingTicketPrompt] = useState<{ open: boolean; siteId: string }>({ open: false, siteId: '' });

  useEffect(() => {
    if (!selectedSiteId && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  const siteName = (id: string) => sites.find((s) => s.id === id)?.name || id;
  const filteredAlerts = alerts.filter((a) => !selectedSiteId || a.siteId === selectedSiteId);
  const header = pageHeaders?.alerts;

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Notifications'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: sites.map((s) => ({ id: s.id, label: s.name })),
        }}
      />
      <div className="card">
        <div className="card-header" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
          <button
            className={alertTab === 'OPEN' ? 'button' : 'button ghost'}
            style={{ position: 'relative', paddingRight: '2.2rem' }}
            onClick={() => setAlertTab('OPEN')}
            type="button"
          >
            Open
            <span className="count-badge">{filteredAlerts.filter((a) => a.isOpen).length}</span>
          </button>
          <button
            className={alertTab === 'CLOSED' ? 'button' : 'button ghost'}
            style={{ position: 'relative', paddingRight: '2.2rem' }}
            onClick={() => setAlertTab('CLOSED')}
            type="button"
          >
            Closed
            <span className="count-badge">{filteredAlerts.filter((a) => !a.isOpen).length}</span>
          </button>
        </div>
        <div className="alerts-grid">
          {(alertsLoading || sitesLoading) ? <div>Loading...</div> : [...filteredAlerts]
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
                      <button
                        className="button"
                        disabled={reorderLoadingId === a.id}
                        onClick={async () => {
                          setReorderLoadingId(a.id);
                          try {
                            const hasActive = orders.some(
                              (o) =>
                                o.status !== 'DELIVERED' &&
                                o.status !== 'DELIVERED_SHORT' &&
                                o.status !== 'DELIVERED_OVER' &&
                                o.status !== 'CANCELLED',
                            );
                            if (hasActive) {
                              updateAlert.mutate({ id: a.id, data: { isOpen: false, note: 'Order already exists' } });
                              return;
                            }
                            navigate(`/orders/new?siteId=${a.siteId}`);
                          } finally {
                            setReorderLoadingId(null);
                          }
                        }}
                      >
                        {reorderLoadingId === a.id ? 'Checking…' : 'Re-order'}
                      </button>
                    )}
                    {(a.type === 'WATER_DETECTED' || a.type === 'ATG_ALARM') && (
                      <button
                        className="button ghost"
                        disabled={serviceLoadingId === a.id}
                        onClick={async () => {
                          setServiceLoadingId(a.id);
                          try {
                            const partner = serviceCompanies[0];
                            if (!partner) {
                              navigate('/issues', { state: { siteId: a.siteId, openModal: true, partnerType: 'SERVICE' } });
                              return;
                            }
                            const active = existingTickets.find((t: Ticket) => t.serviceCompanyId === partner.id && t.status !== 'RESOLVED');
                            if (active) {
                              setExistingTicketPrompt({ open: true, siteId: a.siteId });
                              return;
                            }
                            await createTicket.mutateAsync({
                              id: `tkt-${Date.now()}`,
                              siteId: a.siteId,
                              serviceCompanyId: partner.id,
                              jobberId: undefined,
                              orderId: undefined,
                              type: 'OTHER',
                              description: `Service needed for alert: ${a.message}`,
                              status: 'OPEN',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            });
                            navigate('/issues');
                          } finally {
                            setServiceLoadingId(null);
                          }
                        }}
                      >
                        {serviceLoadingId === a.id ? 'Creating…' : 'Service'}
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
        {alerts.length === 0 && !alertsLoading ? <div className="muted">No alerts.</div> : null}
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
                updateAlert.mutate({ id: closeAlert.id, data: { isOpen: false, note: closeNote || 'no note' } });
                setCloseAlert(null);
                setCloseNote('');
              }}
            >
              Close notification
            </button>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        open={existingTicketPrompt.open}
        title="Open service ticket"
        message="There is already an open service ticket for this site. Do you want to view it?"
        confirmLabel="View ticket"
        onConfirm={() => {
          navigate('/issues', { state: { siteId: existingTicketPrompt.siteId } });
          setExistingTicketPrompt({ open: false, siteId: '' });
          setServiceLoadingId(null);
        }}
        onCancel={() => {
          setExistingTicketPrompt({ open: false, siteId: '' });
          setServiceLoadingId(null);
        }}
      />
    </div>
  );
}

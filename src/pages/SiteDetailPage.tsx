import { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { get, post, put } from '../api/apiClient';
import { useCreateTicket, useLiveStatus, useOrders, useTickets, useSiteTanks } from '../api/hooks';
import type { Ticket as CanonTicket, Order as CanonOrder } from '../models/types';

import type {
  Alert,
  BackOfficeSyncResult,
  DeliveryRecord,
  FuelOrder,
  FuelOrderStatus,
    RunoutPrediction,
  ServiceCompany,
  ServiceTicket,
  VarianceEvent,
} from '../types';
import type { Site } from '../models/types';
import type { UITank } from '../components/TankCard';

import TankCard from '../components/TankCard';
import Dropdown from '../components/Dropdown';
import VarianceSummary from '../components/VarianceSummary';
import AlertList from '../components/AlertList';

import ConfirmModal from '../components/ConfirmModal';



interface VarianceResponse {
  today: { gallons: number; value: number };
  last7Days: { gallons: number; value: number };
  events: VarianceEvent[];
}



export default function SiteDetailPage() {
  const { siteId } = useParams();
  const { data: canonTanks = [] } = useSiteTanks(siteId || '');
  const { data: canonOrders = [] } = useOrders(siteId);
  const { data: liveStatus } = useLiveStatus(siteId || '');
  const { data: canonTickets = [] } = useTickets(siteId);
  const createTicket = useCreateTicket();
  const [site, setSite] = useState<Site | null>(null);

  const [tanks, setTanks] = useState<UITank[]>([]);

  const [variance, setVariance] = useState<VarianceResponse | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  const [runout, setRunout] = useState<RunoutPrediction[]>([]);

  const [loading, setLoading] = useState(true);



  const [backOfficeMessage, setBackOfficeMessage] = useState('');

  const [viewTab, setViewTab] = useState<'overview' | 'loss' | 'alerts' | 'service'>('overview');


  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; onConfirm: () => void }>({

    open: false,

    message: '',

    onConfirm: () => {},

  });

  const [alertTab, setAlertTab] = useState<'OPEN' | 'CLOSED'>('OPEN');



  const [serviceCompanies, setServiceCompanies] = useState<ServiceCompany[]>([]);

  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);

  const [serviceModal, setServiceModal] = useState<{
    open: boolean;
    issue: string;
    providerId: string;
    contactName: string;
    phone: string;
    notes: string;
  }>({ open: false, issue: '', providerId: '', contactName: '', phone: '', notes: '' });

  const [ticketForm, setTicketForm] = useState<{ type: CanonTicket['type']; description: string; orderId: string }>({
    type: 'SHORT_DELIVERY',
    description: '',
    orderId: '',
  });

  const fuelOrders = useMemo<FuelOrder[]>(() => {
    const statusMap: Record<CanonOrder['status'], FuelOrderStatus> = {
      DRAFT: 'REQUESTED',
      PENDING: 'REQUESTED',
      CONFIRMED: 'CONFIRMED',
      DISPATCHED: 'EN_ROUTE',
      DELIVERED: 'DELIVERED',
      DELIVERED_SHORT: 'DELIVERED',
      DELIVERED_OVER: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };
    return canonOrders.map((o) => {
      const lines = (o.lines && o.lines.length
        ? o.lines
        : [{ tankId: o.tankId || 'unknown', quantityGallonsRequested: o.quantityGallonsRequested }]
      ).map((line, idx) => {
        const lineTank = canonTanks.find((t) => t.id === line.tankId);
        const lineGrade =
          lineTank?.productType === 'REGULAR'
            ? 'REG'
            : lineTank?.productType === 'PREMIUM'
            ? 'PREM'
            : lineTank?.productType === 'DIESEL'
            ? 'DSL'
            : 'MID';
        return { id: `${o.id}-line-${idx}`, gradeCode: lineGrade, requestedGallons: line.quantityGallonsRequested };
      });
      return {
        id: o.id,
        siteId: o.siteId,
        supplierId: o.jobberId,
        status: statusMap[o.status] ?? 'REQUESTED',
        createdAt: o.createdAt,
        requestedDeliveryWindowStart: o.createdAt,
        requestedDeliveryWindowEnd: o.updatedAt,
        lines,
        notes: '',
      };
    });
  }, [canonOrders, canonTanks]);



  const todayGallons = variance?.today.gallons ?? 0;
  const todayValue = variance?.today.value ?? 0;
  const last7Gallons = variance?.last7Days.gallons ?? 0;
  const last7Value = variance?.last7Days.value ?? 0;
  const last30Gallons =
    variance?.events
      .filter((v) => Date.now() - new Date(v.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, v) => sum + v.varianceGallons, 0) ?? 0;

  useEffect(() => {
    if (!canonTanks.length) return;
    const mappedTanks: UITank[] = canonTanks.map((t) => ({
      id: t.id,
      siteId: t.siteId,
      name: t.name,
      productType: t.productType,
      gradeCode:
        t.productType === 'REGULAR'
          ? 'REG'
          : t.productType === 'PREMIUM'
          ? 'PREM'
          : t.productType === 'DIESEL'
          ? 'DSL'
          : 'MID',
      capacityGallons: t.capacityGallons,
      currentGallons: t.currentVolumeGallons,
      waterLevelInches: t.waterLevel ?? 0,
      temperatureC: t.temperatureF ? Math.round(((t.temperatureF - 32) * 5) / 9) : undefined,
      status: t.statusFlags?.includes('ALARM_ACTIVE') ? 'CRITICAL' : 'OK',
    }));
    setTanks(mappedTanks);
  }, [canonTanks]);

  useEffect(() => {
    if (!liveStatus) return;
    if (liveStatus.alerts?.length) {
      setAlerts(liveStatus.alerts as Alert[]);
    }
    if (liveStatus.runout?.length) {
      setRunout(liveStatus.runout as RunoutPrediction[]);
    }
  }, [liveStatus]);

  useEffect(() => {
    if (liveStatus?.site) {
      setSite((prev) => prev ?? (liveStatus.site as unknown as Site));
    }
  }, [liveStatus]);



useEffect(() => {

    if (!siteId) return;

    setLoading(true);

    Promise.all([
      get<VarianceResponse>(`/api/sites/${siteId}/variance`),
      get<DeliveryRecord[]>(`/api/sites/${siteId}/deliveries`),
      get<ServiceCompany[]>(`/api/sites/${siteId}/service-companies`),
      get<ServiceTicket[]>(`/api/sites/${siteId}/service-tickets`),
    ])

      .then(

        ([
          varianceRes,
          delivRes,
          svcRes,
          ticketRes,
        ]) => {
          setVariance(varianceRes);

          setDeliveries(delivRes);

          setServiceCompanies(svcRes);

          setServiceTickets(ticketRes);

        }

      )

      .finally(() => setLoading(false));

  }, [siteId]);



  const timeline = useMemo(() => {

    const entries: { time: string; title: string; detail: string }[] = [];

    alerts.forEach((a) =>

      entries.push({

        time: a.timestamp,

        title: `${formatType(a.type)} (${a.severity.toLowerCase()})`,

        detail: a.message,

      })

    );

    deliveries.forEach((d) =>

      entries.push({

        time: d.timestamp,

        title: `Delivery from ${d.supplier} (${d.gradeCode})`,

        detail: `Ticket ${d.bolGallons.toLocaleString()} gal vs tank ${d.atgReceivedGallons.toLocaleString()} gal - ${d.status}`,

      })

    );

    variance?.events.forEach((v) =>

      entries.push({

        time: v.timestamp,

        title: `Loss event (${v.gradeCode})`,

        detail: `Expected ${v.expectedGallons} gal, saw ${v.actualGallons} gal`,

      })

    );

    return entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

  }, [alerts, deliveries, variance]);

  const viewSelectValue = viewTab === 'service' ? 'overview' : viewTab;
  const openAlertCount = alerts.filter((a) => a.isOpen).length;
  const isStillLoading = loading || (!site && !liveStatus?.site);
  const physicalTanks = useMemo(() => tanks.filter((t) => t.gradeCode !== 'MID' && t.productType !== 'VIRTUAL_MIDGRADE'), [tanks]);
  const lowestTankPercent =
    physicalTanks.length > 0 ? Math.round(Math.min(...physicalTanks.map((t) => (t.currentGallons / t.capacityGallons) * 100))) : 0;

  if (!siteId) return <div>Missing site id</div>;
  if (isStillLoading) return <div className="muted">Loading site...</div>;
  if (!site) return <div>Site not found</div>;



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

  async function handleBackOfficeSyncAll() {

    if (!siteId) return;

    setBackOfficeMessage('');

    try {

      const res = await post<BackOfficeSyncResult>(`/api/sites/${siteId}/sync-backoffice`, {
        gradeCode: 'ALL',
      });

      setBackOfficeMessage(res.message || 'Back office sync completed (mock).');

    } catch (err) {

      console.error(err);

      setBackOfficeMessage('Back office sync failed (mock).');

    } finally {

    }

  }



  function openServiceModal(issue: string) {

    const providerId = serviceCompanies[0]?.id || '';

    setServiceModal({

      open: true,

      issue,

      providerId,

      contactName: serviceCompanies[0]?.contactName || '',

      phone: serviceCompanies[0]?.phone || '',

      notes: serviceCompanies[0]?.notes || '',

    });

  }



  async function submitServiceTicket() {

    if (!siteId) return;

    const payload = {

      providerId: serviceModal.providerId,

      issue: serviceModal.issue,

      contactName: serviceModal.contactName,

      phone: serviceModal.phone,

      notes: serviceModal.notes || serviceCompanies.find((c) => c.id === serviceModal.providerId)?.notes,

    };

    try {

      const created = await post<ServiceTicket>(`/api/sites/${siteId}/service-tickets`, payload);

      setServiceTickets((prev) => [created, ...prev]);

      setServiceModal({ open: false, issue: '', providerId: '', contactName: '', phone: '', notes: '' });

    } catch (err) {

      // ignore

    }

  }

  function submitCanonicalTicket() {
    if (!siteId || createTicket.isPending) return;
    if (!ticketForm.description.trim()) {
      window.alert('Please add a brief description.');
      return;
    }
    const selectedOrder = canonOrders.find((o) => o.id === ticketForm.orderId);
    const payload: CanonTicket = {
      id: '',
      siteId,
      orderId: ticketForm.orderId || undefined,
      jobberId: selectedOrder ? selectedOrder.jobberId : undefined,
      type: ticketForm.type,
      description: ticketForm.description.trim(),
      status: 'OPEN',
      createdAt: '',
      updatedAt: '',
    };
    createTicket.mutate(payload, {
      onSuccess: () => {
        setTicketForm({ type: 'SHORT_DELIVERY', description: '', orderId: '' });
      },
    });
  }



  async function closeServiceTicket(ticket: ServiceTicket) {

    if (!siteId) return;

    try {

      const updated = await put<ServiceTicket>(`/api/sites/${siteId}/service-tickets/${ticket.id}`, { status: 'CLOSED' });

      setServiceTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    } catch (err) {

      // ignore

    }

  }



  return (

    <div className="page">

      <div className="card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{site.name}</div>
            <div className="muted">{site.address}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Dropdown
                trigger={
                  <span>
                    {viewSelectValue === 'overview' ? 'Views' : viewSelectValue === 'loss' ? 'Fuel Loss History' : 'Notifications'}
                  </span>
                }
                items={[
                  { id: 'overview', label: 'Overview', onSelect: () => setViewTab('overview') },
                  { id: 'loss', label: 'Fuel Loss History', onSelect: () => setViewTab('loss') },
                  {
                    id: 'alerts',
                    label: `Notifications (${openAlertCount})`,
                    onSelect: () => setViewTab('alerts'),
                  },
                ]}
                selectedId={viewTab}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Dropdown
                trigger={<span>Actions</span>}
                items={[
                  { id: 'service', label: 'Request Service', onSelect: () => setViewTab('service') },
                  { id: 'sync', label: 'Sync with back office', onSelect: () => handleBackOfficeSyncAll() },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {viewTab === 'overview' ? (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0 0 0.75rem' }}>
            <span
              className={`badge ${todayGallons < 0 ? 'badge-red' : todayGallons > 0 ? 'badge-green' : 'badge-yellow'}`}
              style={{ fontSize: '0.8rem' }}
            >
              Loss today: {todayGallons.toLocaleString()} gal
            </span>
            <span className="badge badge-yellow" style={{ fontSize: '0.8rem' }}>
              Loss value: {variance ? todayValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0'}
            </span>
            <span
              className={`badge ${last7Gallons < 0 ? 'badge-red' : last7Gallons > 0 ? 'badge-green' : 'badge-yellow'}`}
              style={{ fontSize: '0.8rem' }}
            >
              This week: {last7Gallons.toLocaleString()} gal
            </span>
            <span
              className={`badge ${last30Gallons < 0 ? 'badge-red' : last30Gallons > 0 ? 'badge-green' : 'badge-yellow'}`}
              style={{ fontSize: '0.8rem' }}
            >
              This month: {last30Gallons.toLocaleString()} gal
            </span>
            <span className="badge badge-yellow" style={{ fontSize: '0.8rem' }}>
              Active alerts: {alerts.length}
            </span>
            <span
              className={`badge ${
                lowestTankPercent <= 10 ? 'badge-red' : lowestTankPercent <= 20 ? 'badge-yellow' : 'badge-green'
              }`}
              style={{ fontSize: '0.8rem' }}
            >
              Lowest tank: {lowestTankPercent}%
            </span>
          </div>
          {backOfficeMessage ? <div className="muted">{backOfficeMessage}</div> : null}
          <div className="tanks-grid">
            {tanks
              .slice()
              .sort((a, b) => gradeSortKey(a) - gradeSortKey(b))
              .map((tank) => (
                <TankCard
                  key={tank.id}
                  tank={tank}
                  runout={runout.find((r) => r.tankId === tank.id)}
                  lossTodayGallons={
                    variance
                      ? variance.events
                          .filter(
                            (v) =>
                              v.gradeCode === tank.gradeCode &&
                              new Date(v.timestamp).toDateString() === new Date().toDateString()
                          )
                          .reduce((sum, v) => sum + v.varianceGallons, 0)
                      : undefined
                  }
                  lossWeekGallons={
                    variance
                      ? variance.events
                          .filter(
                            (v) =>
                              v.gradeCode === tank.gradeCode &&
                              Date.now() - new Date(v.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000
                          )
                          .reduce((sum, v) => sum + v.varianceGallons, 0)
                      : undefined
                  }
                  lossMonthGallons={
                    variance
                      ? variance.events
                          .filter(
                            (v) =>
                              v.gradeCode === tank.gradeCode &&
                              Date.now() - new Date(v.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000
                          )
                          .reduce((sum, v) => sum + v.varianceGallons, 0)
                      : undefined
                  }
                />
              ))}
          </div>
        </>
      ) : null}

      {viewTab === 'loss' ? (
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700 }}>Fuel loss history</div>
              <div className="muted">Variance trends and recent loss events</div>
            </div>
          </div>
          {variance ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span
                  className={`badge ${todayGallons < 0 ? 'badge-red' : todayGallons > 0 ? 'badge-green' : 'badge-yellow'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  Loss today: {todayGallons.toLocaleString()} gal
                </span>
                <span
                  className={`badge ${last7Gallons < 0 ? 'badge-red' : last7Gallons > 0 ? 'badge-green' : 'badge-yellow'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  This week: {last7Gallons.toLocaleString()} gal
                </span>
                <span
                  className={`badge ${last30Gallons < 0 ? 'badge-red' : last30Gallons > 0 ? 'badge-green' : 'badge-yellow'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  This month: {last30Gallons.toLocaleString()} gal
                </span>
              </div>
              <VarianceSummary
                todayGallons={todayGallons}
                todayValue={todayValue}
                last7Gallons={last7Gallons}
                last7Value={last7Value}
                events={variance.events}
              />
              <div className="card" style={{ margin: 0 }}>
                <div className="card-header">
                  <div style={{ fontWeight: 700 }}>Recent loss events</div>
                  <div className="muted">{variance.events.length} records</div>
                </div>
                <div className="list-grid">
                  {[...variance.events]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((v) => (
                    <div className="list-card" key={v.id}>
                      <div className="list-meta">
                        <div>
                          <div style={{ fontWeight: 700 }}>{gradeLabel(v.gradeCode)}</div>
                          <div className="muted">{new Date(v.timestamp).toLocaleString()}</div>
                        </div>
                        <span
                          className={`badge ${
                            v.severity === 'CRITICAL' ? 'badge-red' : v.severity === 'WARNING' ? 'badge-yellow' : 'badge-green'
                          }`}
                        >
                          {v.severity}
                        </span>
                      </div>
                      <div className="list-meta" style={{ justifyContent: 'flex-start', gap: '0.4rem' }}>
                        <span
                          className={`badge ${v.varianceGallons < 0 ? 'badge-red' : v.varianceGallons > 0 ? 'badge-green' : 'badge-yellow'}`}
                          style={{ fontSize: '0.8rem' }}
                        >
                          {v.varianceGallons.toLocaleString()} gal
                        </span>
                        <span className="muted">{v.note || 'No note provided'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {variance.events.length === 0 ? <div className="muted">No loss events logged.</div> : null}
              </div>
            </>
          ) : (
            <div className="muted">No variance data.</div>
          )}
        </div>
      ) : null}

      {viewTab === 'alerts' ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
      <div className="card">
        <div className="card-header">
          <div style={{ fontWeight: 700 }}>Notifications</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className={alertTab === 'OPEN' ? 'button' : 'button ghost'}
                  style={{ position: 'relative', paddingRight: '2.2rem' }}
                  type="button"
                  onClick={() => setAlertTab('OPEN')}
                >
                  Open
                  <span className="count-badge">{alerts.filter((a) => a.isOpen).length}</span>
                </button>
                <button
                  className={alertTab === 'CLOSED' ? 'button' : 'button ghost'}
                  style={{ position: 'relative', paddingRight: '2.2rem' }}
                  type="button"
                  onClick={() => setAlertTab('CLOSED')}
                >
                  Closed
                  <span className="count-badge">{alerts.filter((a) => !a.isOpen).length}</span>
                </button>
              </div>
            </div>
            <AlertList
              alerts={alerts.filter((a) => (alertTab === 'OPEN' ? a.isOpen : !a.isOpen))}
              title={`${alertTab === 'OPEN' ? 'Open' : 'Closed'} notifications`}
              onClose={(a) =>
                setAlerts((prev) => prev.map((al) => (al.id === a.id ? { ...al, isOpen: false } : al)))
              }
              onAction={(a, action) => {
                if (action === 'reorder') {
                  window.location.href = '/orders';
                } else if (action === 'service') {
                  openServiceModal(`Service requested for issue: ${a.message}`);
                } else if (action === 'view') {
                  alert(`Details: ${a.message}`);
                }
              }}
            />
          </div>
        <div className="card">
          <div className="card-header">
            <div style={{ fontWeight: 700 }}>Incident timeline</div>
            <div className="muted">Latest alerts, deliveries, and loss events</div>
          </div>
          <div className="timeline">
            {timeline.map((t) => (
              <div key={t.time + t.title} className="timeline-item">
                <div style={{ fontWeight: 600 }}>{new Date(t.time).toLocaleString()}</div>
                <div>{t.title}</div>
                <div className="muted">{t.detail}</div>
              </div>
            ))}
            {timeline.length === 0 ? <div className="muted">No recent activity.</div> : null}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700 }}>Issue tickets</div>
              <div className="muted">Canonical tickets from the unified API</div>
            </div>
          </div>
          <div className="grid" style={{ gap: '0.75rem' }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>New ticket</div>
                {createTicket.isPending ? <div className="muted">Submitting...</div> : null}
              </div>
              <div className="grid" style={{ gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="form-field">
                  <label>Type</label>
                  <select
                    value={ticketForm.type}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, type: e.target.value as CanonTicket['type'] }))}
                  >
                    <option value="SHORT_DELIVERY">Short delivery</option>
                    <option value="QUALITY_ISSUE">Quality issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Order (optional)</label>
                  <select
                    value={ticketForm.orderId}
                    onChange={(e) => setTicketForm((prev) => ({ ...prev, orderId: e.target.value }))}
                  >
                    <option value="">No order selected</option>
                    {fuelOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.createdAt).toLocaleDateString()} - {o.lines.map((l) => l.gradeCode).join(', ')} ({o.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}
                  placeholder="Briefly describe the issue"
                />
              </div>
              <button className="button" onClick={submitCanonicalTicket} disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Submitting...' : 'Create ticket'}
              </button>
            </div>
            {canonTickets.map((t: CanonTicket) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0.5rem',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{t.type.replace('_', ' ')}</div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {t.description || 'No description provided'}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <span className={t.status === 'RESOLVED' ? 'badge badge-green' : t.status === 'IN_PROGRESS' ? 'badge badge-yellow' : 'badge badge-red'}>
                  {t.status}
                </span>
              </div>
            ))}
            {canonTickets.length === 0 ? <div className="muted">No issue tickets yet.</div> : null}
          </div>
        </div>
      </div>
      ) : null}
      {viewTab === 'service' ? (
        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700 }}>Service tickets</div>
              <div className="muted">Dispatch your preferred vendor with context.</div>
            </div>
            <button className="button ghost" onClick={() => openServiceModal('Service visit needed')}>
              New service ticket
            </button>
          </div>
          <div className="grid" style={{ gap: '0.75rem' }}>
            {serviceTickets.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0.5rem',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {serviceCompanies.find((c) => c.id === t.providerId)?.name || t.providerId}
                  </div>
                  <div className="muted">{t.issue}</div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {new Date(t.createdAt).toLocaleString()} · {t.contactName || 'Dispatch'} {t.phone || ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span className={`badge ${t.status === 'OPEN' ? 'badge-yellow' : 'badge-green'}`}>{t.status}</span>
                  {t.status === 'OPEN' ? (
                    <button
                      className="button ghost"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                      onClick={() => closeServiceTicket(t)}
                    >
                      Close ticket
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
            {serviceTickets.length === 0 ? <div className="muted">No service tickets yet.</div> : null}
          </div>
        </div>
      ) : null}
      <ConfirmModal

        open={confirmState.open}

        message={confirmState.message}

        onConfirm={confirmState.onConfirm}

        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: () => {} })}

      />



      {serviceModal.open ? (

        <div className="modal-backdrop">

          <div className="modal">

            <div className="card-header">

              <div style={{ fontWeight: 800 }}>Create service ticket</div>

              <button

                className="button ghost"

                style={{ width: 36, height: 36, padding: 0 }}

                onClick={() => setServiceModal({ open: false, issue: '', providerId: '', contactName: '', phone: '', notes: '' })}

              >

                x

              </button>

            </div>

            <div className="form-field">

              <label>Provider</label>

              <select

                value={serviceModal.providerId}

                onChange={(e) => {

                  const provider = serviceCompanies.find((c) => c.id === e.target.value);

                  setServiceModal((prev) => ({

                    ...prev,

                    providerId: e.target.value,

                    contactName: provider?.contactName || prev.contactName,

                    phone: provider?.phone || prev.phone,

                    notes: provider?.notes || prev.notes,

                  }));

                }}

              >

                {serviceCompanies.map((c) => (

                  <option key={c.id} value={c.id}>

                    {c.name}

                  </option>

                ))}

              </select>

            </div>

            <div className="form-field">

              <label>Issue</label>

              <textarea

                rows={3}

                value={serviceModal.issue}

                onChange={(e) => setServiceModal((prev) => ({ ...prev, issue: e.target.value }))}

                style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}

              />

            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>

              <div className="form-field">

                <label>Contact name</label>

                <input

                  value={serviceModal.contactName}

                  onChange={(e) => setServiceModal((prev) => ({ ...prev, contactName: e.target.value }))}

                />

              </div>

              <div className="form-field">

                <label>Phone</label>

                <input value={serviceModal.phone} onChange={(e) => setServiceModal((prev) => ({ ...prev, phone: e.target.value }))} />

              </div>

            </div>

            <div className="form-field">

              <label>Notes to provider</label>

              <textarea

                rows={2}

                value={serviceModal.notes}

                onChange={(e) => setServiceModal((prev) => ({ ...prev, notes: e.target.value }))}

                style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid var(--border)', fontFamily: 'inherit' }}

              />

            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

              <button className="button" onClick={submitServiceTicket}>

                Send ticket

              </button>

              <button

                className="button ghost"

                onClick={() => setServiceModal({ open: false, issue: '', providerId: '', contactName: '', phone: '', notes: '' })}

              >

                Cancel

              </button>

            </div>

          </div>

        </div>

      ) : null}



    </div>

  );

}



function gradeSortKey(tank: UITank) {

  const nameMatch = tank.name.match(/(\d{2})/);

  const octane = nameMatch ? parseInt(nameMatch[1], 10) : undefined;

  if (tank.gradeCode === 'DSL' || tank.name.toLowerCase().includes('diesel')) return 1000;

  if (octane) return octane;

  if (tank.gradeCode === 'REG') return 87;

  if (tank.gradeCode === 'MID') return 89;

  if (tank.gradeCode === 'PREM') return 93;

  return 999;

}



function gradeLabel(code: string) {

  if (code === 'REG') return 'Regular 87';

  if (code === 'MID') return 'Midgrade 89';

  if (code === 'PREM') return 'Premium 93';

  if (code === 'DSL') return 'Diesel';

  return code;

}




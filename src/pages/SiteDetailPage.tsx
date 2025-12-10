import { useEffect, useMemo, useRef, useState } from 'react';

import { useParams } from 'react-router-dom';

import { get, post, put } from '../api/apiClient';

import type {
  Alert,
  BackOfficeSyncResult,
  DeliveryRecord,
  FuelOrder,
  FuelOrderStatus,
  OrderSuggestion,
  RunoutPrediction,
  ServiceCompany,
  ServiceTicket,
  SiteSummary,
  Supplier,
  Tank,
  VarianceEvent,
} from '../types';

import TankCard from '../components/TankCard';
import Dropdown from '../components/Dropdown';
import VarianceSummary from '../components/VarianceSummary';
import AlertList from '../components/AlertList';

import DeliveryTable from '../components/DeliveryTable';

import OrderModal, { type OrderForm } from '../components/OrderModal';

import ConfirmModal from '../components/ConfirmModal';



interface VarianceResponse {
  today: { gallons: number; value: number };
  last7Days: { gallons: number; value: number };
  events: VarianceEvent[];
}



const orderStatusFlow: FuelOrderStatus[] = ['REQUESTED', 'CONFIRMED', 'EN_ROUTE', 'DELIVERED'];



export default function SiteDetailPage() {
  const { siteId } = useParams();
  const [site, setSite] = useState<SiteSummary | null>(null);

  const [tanks, setTanks] = useState<Tank[]>([]);

  const [variance, setVariance] = useState<VarianceResponse | null>(null);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);

  const [runout, setRunout] = useState<RunoutPrediction[]>([]);

  const [loading, setLoading] = useState(true);

  const [orderTank, setOrderTank] = useState<Tank | null>(null);

  const [orderForm, setOrderForm] = useState<OrderForm>({

    supplier: 'Preferred Supplier',

    gallons: 3000,

    windowStartDate: new Date().toISOString().slice(0, 10),

    windowEndDate: new Date().toISOString().slice(0, 10),

    windowStartTime: '15:00',

    windowEndTime: '18:00',

    contactName: 'On-site Manager',

    contactPhone: '(555) 123-4567',

    poNumber: '',

    notes: '',

    priority: 'RUSH',

  });

  const supplierOptions = ['Preferred Supplier', 'Local Jobber', 'Major Brand', 'Independent'];



  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [orderSuggestion, setOrderSuggestion] = useState<OrderSuggestion | null>(null);

  const [fuelOrders, setFuelOrders] = useState<FuelOrder[]>([]);

  const [orderLoading, setOrderLoading] = useState(false);

  const [orderMessage, setOrderMessage] = useState('');

  const [orderLines, setOrderLines] = useState<{ gradeCode: string; gallons: number }[]>([]);

  const [orderSupplierId, setOrderSupplierId] = useState('');

  const [orderWindowStart, setOrderWindowStart] = useState(new Date().toISOString().slice(0, 16));

  const [orderWindowEnd, setOrderWindowEnd] = useState(new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16));

  const [orderNotes, setOrderNotes] = useState('');

  const [backOfficeSyncing, setBackOfficeSyncing] = useState<string | null>(null);
  const [backOfficeMessage, setBackOfficeMessage] = useState('');

  const [viewTab, setViewTab] = useState<'overview' | 'loss' | 'orders' | 'alerts' | 'service'>('overview');


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

  const orderingRef = useRef<HTMLDivElement | null>(null);



  const todayGallons = variance?.today.gallons ?? 0;

  const todayValue = variance?.today.value ?? 0;

  const last7Gallons = variance?.last7Days.gallons ?? 0;

  const last7Value = variance?.last7Days.value ?? 0;

  const last30Gallons =
    variance?.events
      .filter((v) => Date.now() - new Date(v.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000)
      .reduce((sum, v) => sum + v.varianceGallons, 0) ?? 0;



  useEffect(() => {

    if (!siteId) return;

    setLoading(true);

    Promise.all([
      get<SiteSummary>(`/sites/${siteId}`),
      get<Tank[]>(`/sites/${siteId}/tanks`),
      get<VarianceResponse>(`/sites/${siteId}/variance`),
      get<Alert[]>(`/sites/${siteId}/alerts`),
      get<DeliveryRecord[]>(`/sites/${siteId}/deliveries`),
      get<RunoutPrediction[]>(`/sites/${siteId}/runout`),
      get<OrderSuggestion>(`/sites/${siteId}/order-suggestions`),
      get<FuelOrder[]>(`/sites/${siteId}/orders`),
      get<Supplier[]>('/suppliers'),
      get<ServiceCompany[]>(`/sites/${siteId}/service-companies`),
      get<ServiceTicket[]>(`/sites/${siteId}/service-tickets`),
    ])

      .then(

        ([
          siteRes,
          tankRes,
          varianceRes,
          alertsRes,
          delivRes,
          runoutRes,
          suggestionRes,
          ordersRes,
          supplierRes,
          svcRes,
          ticketRes,
        ]) => {
          setSite(siteRes);
          setTanks(tankRes);

          setVariance(varianceRes);

          const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

          const normalizedAlerts = alertsRes

            .map((a) => {

              const ageMs = Date.now() - new Date(a.timestamp).getTime();

              if (ageMs > sixtyDaysMs) {

                return { ...a, isOpen: false };

              }

              return a;

            })

            .filter((a) => Date.now() - new Date(a.timestamp).getTime() <= sixtyDaysMs);

          setAlerts(normalizedAlerts);

          setDeliveries(delivRes);

          setRunout(runoutRes);

          setOrderSuggestion(suggestionRes);

          setFuelOrders(ordersRes);

          setSuppliers(supplierRes);

          setServiceCompanies(svcRes);

          setServiceTickets(ticketRes);

        }

      )

      .finally(() => setLoading(false));

  }, [siteId]);



  useEffect(() => {

    if (orderSuggestion) {

      setOrderLines(

        orderSuggestion.suggestedLines.map((l) => ({

          gradeCode: l.gradeCode,

          gallons: Math.max(Math.round(l.suggestedOrderGallons / 10) * 10, 0),

        }))

      );

    }

  }, [orderSuggestion]);



  useEffect(() => {

    if (!orderSupplierId && suppliers.length) {

      setOrderSupplierId(suppliers[0].id);

    }

  }, [suppliers, orderSupplierId]);



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


  if (!siteId) return <div>Missing site id</div>;

  if (loading && !site) return <div className="muted">Loading site...</div>;

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





  function getActiveOrder(tank: Tank) {

    return deliveries.find(

      (d) =>

        d.siteId === site!.id &&

        d.gradeCode === tank.gradeCode &&

        d.status === 'CHECK' &&

        d.supplier.toLowerCase().includes('supplier')

    );

  }



  function getRecommendedGallons(tank: Tank) {

    const remaining = Math.max(tank.capacityGallons - tank.currentGallons, 0);

    const targetFill = Math.max(tank.capacityGallons * 0.85 - tank.currentGallons, 0);

    return Math.min(remaining, Math.max(Math.round(targetFill / 10) * 10, 0));

  }



  function openOrderModal(tank?: Tank) {

    const target = tank ?? tanks[0];

    if (!target) return;

    setOrderTank(target);

    const active = getActiveOrder(target);

    if (active) {

      setOrderForm({

        ...orderForm,

        supplier: active.supplier,

        gallons: active.bolGallons,

      });

    } else {

      setOrderForm({

        ...orderForm,

        supplier: supplierOptions[0],

        gallons: getRecommendedGallons(target),

      });

    }

  }



  function submitOrder() {

    if (!site || !orderTank) return;

    const remaining = Math.max(orderTank.capacityGallons - orderTank.currentGallons, 0);

    if (orderForm.gallons > remaining) {

      window.alert(`Order exceeds tank capacity. Max you can order now is ${remaining.toLocaleString()} gallons.`);

      return;

    }

    const existing = getActiveOrder(orderTank);

    if (existing) {

      setDeliveries((prev) =>

        prev.map((d) =>

          d.id === existing.id

            ? { ...d, supplier: orderForm.supplier, bolGallons: orderForm.gallons, timestamp: new Date().toISOString() }

            : d

        )

      );

      setAlerts((prev) =>

        prev.map((a) =>

          a.message.includes('Fuel order placed') && a.siteId === site.id

            ? {

                ...a,

                message: `Fuel order placed for ${orderTank.name} (mock) - ${orderForm.gallons} gal, ${orderForm.supplier}, ${orderForm.windowStartDate} ${orderForm.windowStartTime} to ${orderForm.windowEndDate} ${orderForm.windowEndTime}`,

              }

            : a

        )

      );

    } else {

      const now = new Date();

      const delivery: DeliveryRecord = {

        id: `order-${now.getTime()}`,

        siteId: site.id,

        timestamp: now.toISOString(),

        supplier: orderForm.supplier,

        gradeCode: orderTank.gradeCode,

        bolGallons: orderForm.gallons,

        atgReceivedGallons: 0,

        status: 'CHECK',

      };

      const orderAlert: Alert = {

        id: `order-alert-${now.getTime()}`,

        siteId: site.id,

        timestamp: now.toISOString(),

        severity: 'WARNING',

        type: 'RUNOUT_RISK',

        message: `Fuel order placed for ${orderTank.name} (mock) - ${orderForm.gallons} gal, ${orderForm.supplier}, ${orderForm.windowStartDate} ${orderForm.windowStartTime} to ${orderForm.windowEndDate} ${orderForm.windowEndTime}`,

        isOpen: true,

      };

      setDeliveries((prev) => [delivery, ...prev]);

      setAlerts((prev) => [orderAlert, ...prev]);

    }

    setOrderTank(null);

  }



  async function submitFuelOrder() {

    if (!siteId) return;

    setOrderLoading(true);

    setOrderMessage('');

    const payload = {

      supplierId: orderSupplierId || suppliers[0]?.id,

      requestedDeliveryWindowStart: new Date(orderWindowStart).toISOString(),

      requestedDeliveryWindowEnd: new Date(orderWindowEnd).toISOString(),

      notes: orderNotes,

      lines: orderLines.map((l) => ({ gradeCode: l.gradeCode, requestedGallons: l.gallons })),

    };

    try {

      const created = await post<FuelOrder>(`/sites/${siteId}/orders`, payload);

      setFuelOrders((prev) => [created, ...prev]);

      setOrderMessage('Order created (mock)');

    } catch (err) {

      setOrderMessage('Failed to create order (mock)');

    } finally {

      setOrderLoading(false);

    }

  }



  async function advanceOrder(order: FuelOrder) {

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return;

    const next = nextOrderStatus(order.status);

    if (next === order.status) return;

    try {

      const updated = await put<FuelOrder>(`/sites/${order.siteId}/orders/${order.id}`, { status: next });

      setFuelOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

      if (next === 'DELIVERED') {

        const now = new Date().toISOString();

        const newDeliveries: DeliveryRecord[] = order.lines.map((line, idx) => {

          const tank = tanks.find((t) => t.siteId === order.siteId && t.gradeCode === line.gradeCode);

          const preLevel = tank ? tank.currentGallons : 0;

          const expectedReading = preLevel + line.requestedGallons;

          return {

            id: `order-del-${order.id}-${idx}`,

            siteId: order.siteId,

            timestamp: now,

            supplier: suppliers.find((s) => s.id === order.supplierId)?.name || order.supplierId,

            gradeCode: line.gradeCode,

            bolGallons: line.requestedGallons,

            atgReceivedGallons: expectedReading,

            preDeliveryGallons: preLevel,

            expectedReadingGallons: expectedReading,

            status: 'OK',

          };

        });

        setDeliveries((prev) => [...newDeliveries, ...prev]);

        setTanks((prev) =>

          prev.map((t) => {

            const delivered = newDeliveries.find((d) => d.gradeCode === t.gradeCode && d.siteId === t.siteId);

            return delivered ? { ...t, currentGallons: delivered.atgReceivedGallons } : t;

          })

        );

      }

    } catch (err) {

      // ignore

    }

  }



  async function cancelOrder(order: FuelOrder) {

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return;

    setConfirmState({

      open: true,

      message: 'Cancel this fuel order?',

      onConfirm: async () => {

        try {

          const updated = await put<FuelOrder>(`/sites/${order.siteId}/orders/${order.id}`, { status: 'CANCELLED' });

          setFuelOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

        } finally {

          setConfirmState({ open: false, message: '', onConfirm: () => {} });

        }

      },

    });

  }



  function jumpToOrdering(prefillFromAlert?: Alert) {

    if (orderSuggestion) {

      setOrderLines(

        orderSuggestion.suggestedLines.map((l) => ({

          gradeCode: l.gradeCode,

          gallons: Math.max(Math.round(l.suggestedOrderGallons / 10) * 10, 0),

        }))

      );

    }

    if (!orderSupplierId && suppliers[0]) setOrderSupplierId(suppliers[0].id);

    if (prefillFromAlert) setOrderMessage('Order prefilled from notification (mock)');

    setViewTab('orders');

    setTimeout(() => orderingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);

  }



  async function handleBackOfficeSync(tank: Tank) {

    if (!siteId) return;

    setBackOfficeSyncing(tank.id);

    setBackOfficeMessage('');

    try {

      const res = await post<BackOfficeSyncResult>(`/sites/${siteId}/backoffice-sync`, {

        tankId: tank.id,

        gradeCode: tank.gradeCode,

      });

      setBackOfficeMessage(res.message);

    } catch (err) {

      console.error(err);

      setBackOfficeMessage('Back office sync failed (mock).');

    } finally {

      setBackOfficeSyncing(null);

    }

  }

  async function handleBackOfficeSyncAll() {

    if (!siteId) return;

    setBackOfficeSyncing('ALL');

    setBackOfficeMessage('');

    try {

      const res = await post<BackOfficeSyncResult>(`/sites/${siteId}/backoffice-sync`, {

        gradeCode: 'ALL',

      });

      setBackOfficeMessage(res.message);

    } catch (err) {

      console.error(err);

      setBackOfficeMessage('Back office sync failed (mock).');

    } finally {

      setBackOfficeSyncing(null);

    }

  }



  function handleRequestService(tank: Tank) {

    openServiceModal(`Service requested for ${tank.name} to address water/critical status.`);

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

      const created = await post<ServiceTicket>(`/sites/${siteId}/service-tickets`, payload);

      setServiceTickets((prev) => [created, ...prev]);

      setServiceModal({ open: false, issue: '', providerId: '', contactName: '', phone: '', notes: '' });

    } catch (err) {

      // ignore

    }

  }



  async function closeServiceTicket(ticket: ServiceTicket) {

    if (!siteId) return;

    try {

      const updated = await put<ServiceTicket>(`/sites/${siteId}/service-tickets/${ticket.id}`, { status: 'CLOSED' });

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
            <div className="muted">
              {site.address} - {site.city}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <Dropdown
                trigger={
                  <span>
                    {viewSelectValue === 'overview'
                      ? 'Views'
                      : viewSelectValue === 'loss'
                      ? 'Fuel Loss History'
                      : viewSelectValue === 'orders'
                      ? 'Orders & deliveries'
                      : 'Notifications'}
                  </span>
                }
                items={[
                  { id: 'overview', label: 'Overview', onSelect: () => setViewTab('overview') },
                  { id: 'loss', label: 'Fuel Loss History', onSelect: () => setViewTab('loss') },
                  { id: 'orders', label: 'Orders & deliveries', onSelect: () => setViewTab('orders') },
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
                  { id: 'order', label: 'Order fuel', onSelect: () => setViewTab('orders') },
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
                site.lowestTankPercent <= 10 ? 'badge-red' : site.lowestTankPercent <= 20 ? 'badge-yellow' : 'badge-green'
              }`}
              style={{ fontSize: '0.8rem' }}
            >
              Lowest tank: {site.lowestTankPercent}%
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
                  onOrder={openOrderModal}
                  onService={handleRequestService}
                  onSync={handleBackOfficeSync}
                  syncing={backOfficeSyncing === tank.id}
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

      {viewTab === 'orders' ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
            <div className="card">
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Recent orders</div>
                <div className="muted">{fuelOrders.length} records</div>
              </div>
              <div className="list-grid">
                {[...fuelOrders]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((o) => {
                  const supplierName = suppliers.find((s) => s.id === o.supplierId)?.name || o.supplierId;
                  const totalGallons = o.lines.reduce((sum, l) => sum + l.requestedGallons, 0);
                  return (
                    <div className="list-card" key={o.id}>
                      <div className="list-meta">
                        <div>
                          <div style={{ fontWeight: 700 }}>{supplierName}</div>
                          <div className="muted" style={{ fontSize: '0.9rem' }}>
                            {new Date(o.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className="badge badge-yellow">{o.status}</span>
                      </div>
                      <div className="list-meta" style={{ justifyContent: 'flex-start', gap: '0.4rem' }}>
                        {o.lines.map((l) => (
                          <span key={l.id} className="badge">
                            {gradeLabel(l.gradeCode)} {l.requestedGallons.toLocaleString()} gal
                          </span>
                        ))}
                      </div>
                      <div className="muted">
                        {new Date(o.requestedDeliveryWindowStart).toLocaleString()} –{' '}
                        {new Date(o.requestedDeliveryWindowEnd).toLocaleString()}
                      </div>
                      <div className="list-meta">
                        <span className="badge badge-blue">{totalGallons.toLocaleString()} gal total</span>
                        <div className="list-actions">
                          {o.status !== 'DELIVERED' && o.status !== 'CANCELLED' ? (
                            <>
                              <button className="button ghost" style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} onClick={() => advanceOrder(o)}>
                                Advance
                              </button>
                              <button
                                className="button ghost"
                                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', color: '#ef4444' }}
                                onClick={() => cancelOrder(o)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {fuelOrders.length === 0 ? <div className="muted">No orders yet.</div> : null}
            </div>

            <DeliveryTable
              deliveries={deliveries}
              onMarkOk={(id) => {
                setDeliveries((prev) =>
                  prev.map((d) => (d.id === id ? { ...d, status: 'OK' as const, atgReceivedGallons: d.bolGallons } : d))
                );
                setAlerts((prev) =>
                  prev.map((a) => (a.message.includes('Fuel order placed') ? { ...a, isOpen: false } : a))
                );
              }}
              onMarkShort={(id) => {
                const delivery = deliveries.find((d) => d.id === id);
                if (!delivery) return;
                setConfirmState({
                  open: true,
                  message: 'Mark this delivery as short?',
                  onConfirm: () => {
                    setDeliveries((prev) =>
                      prev.map((d) =>
                        d.id === id
                          ? { ...d, status: 'SHORT' as const, atgReceivedGallons: Math.max(d.bolGallons - 150, 0) }
                          : d
                      )
                    );
                    const shortAlert: Alert = {
                      id: `short-${id}`,
                      siteId: delivery.siteId,
                      timestamp: new Date().toISOString(),
                      severity: 'WARNING',
                      type: 'SHORT_DELIVERY',
                      message: `Delivery marked short for ${delivery.gradeCode} (mock)`,
                      isOpen: true,
                    };
                    setAlerts((prev) => [shortAlert, ...prev]);
                    setConfirmState({ open: false, message: '', onConfirm: () => {} });
                  },
                });
              }}
              onReportIssue={(id) => {
                const note = 'Ticket opened with supplier (mock); notifications sent per alert settings.';
                setDeliveries((prev) => prev.map((d) => (d.id === id ? { ...d, issueNote: note } : d)));
                const delivery = deliveries.find((d) => d.id === id);
                if (delivery) {
                  const issueAlert: Alert = {
                    id: `issue-${id}`,
                    siteId: delivery.siteId,
                    timestamp: new Date().toISOString(),
                    severity: 'INFO',
                    type: 'ATG_POS_MISMATCH',
                    message: `Issue ticket created for ${delivery.gradeCode} delivery (mock); supplier notified.`,
                    isOpen: true,
                  };
                  setAlerts((prev) => [issueAlert, ...prev]);
                }
              }}
            />
          </div>

          <div className="card" ref={orderingRef} id="ordering">
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Fuel Ordering</div>
              {orderMessage ? <div className="muted">{orderMessage}</div> : null}
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <div style={{ fontWeight: 700 }}>Suggested order</div>
                <div className="muted">
                  Generated {orderSuggestion ? new Date(orderSuggestion.generatedAt).toLocaleString() : ''}
                </div>
              </div>
              <div className="grid" style={{ gap: '0.5rem' }}>
                {orderLines.map((line, idx) => (
                  <div
                    key={`${line.gradeCode}-${idx}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{gradeLabel(line.gradeCode)}</div>
                      <div className="muted">
                        {orderSuggestion?.suggestedLines
                          .find((l) => l.gradeCode === line.gradeCode)
                          ?.percentFull.toFixed(0)}
                        % full · recommend{' '}
                        {orderSuggestion?.suggestedLines
                          .find((l) => l.gradeCode === line.gradeCode)
                          ?.suggestedOrderGallons.toLocaleString()}{' '}
                        gal
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={line.gallons}
                      onChange={(e) =>
                        setOrderLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, gallons: Number(e.target.value) } : l))
                        )
                      }
                      style={{ width: 120, padding: '0.5rem' }}
                    />
                  </div>
                ))}
              </div>
              <div
                className="grid"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}
              >
                <div className="form-field">
                  <label>Supplier</label>
                  <select value={orderSupplierId} onChange={(e) => setOrderSupplierId(e.target.value)}>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Notes</label>
                  <input value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-field">
                  <label>Window start</label>
                  <input
                    type="datetime-local"
                    value={orderWindowStart}
                    onChange={(e) => setOrderWindowStart(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Window end</label>
                  <input
                    type="datetime-local"
                    value={orderWindowEnd}
                    onChange={(e) => setOrderWindowEnd(e.target.value)}
                  />
                </div>
              </div>
              <button className="button" style={{ marginTop: '0.75rem' }} disabled={orderLoading} onClick={submitFuelOrder}>
                {orderLoading ? 'Submitting...' : 'Submit order'}
              </button>
            </div>
          </div>
        </>
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
                  jumpToOrdering(a);
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
      {orderTank ? (

        <OrderModal

          tank={orderTank}

          form={orderForm}

          suppliers={supplierOptions}

          recommendedGallons={getRecommendedGallons(orderTank)}

          maxGallons={Math.max(orderTank.capacityGallons - orderTank.currentGallons, 0)}

          onChange={setOrderForm}

          isOpen={!!orderTank}

          existingOrder={getActiveOrder(orderTank) || undefined}

          onClose={() => setOrderTank(null)}

          onSubmit={submitOrder}

          onCancelOrder={() => setOrderTank(null)}

        />

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



function gradeSortKey(tank: Tank) {

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



function nextOrderStatus(current: FuelOrderStatus) {

  const idx = orderStatusFlow.indexOf(current);

  if (idx === -1 || idx === orderStatusFlow.length - 1) return current;

  return orderStatusFlow[idx + 1];

}



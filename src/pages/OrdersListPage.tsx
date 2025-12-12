import { useMemo, useState } from 'react';
import { useJobbers, useOrderAction, useOrders, useSiteTanks, useSites } from '../api/hooks';
import PageHeader from '../components/PageHeader';
import { pageHeaderConfig } from '../config/pageHeaders';

export default function OrdersListPage() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const { data: orders = [] } = useOrders(selectedSiteId || undefined);
  const { data: tanks = [] } = useSiteTanks(selectedSiteId || '');
  const { data: jobbers = [] } = useJobbers();
  const orderAction = useOrderAction();
  const [poDrafts, setPoDrafts] = useState<Record<string, string>>({});

  const tankLookup = useMemo(() => {
    const map = new Map<string, (typeof tanks)[number]>();
    const active = selectedSiteId ? tanks : sites.flatMap((s) => s.tanks || []);
    active.forEach((t) => map.set(t.id, t));
    return map;
  }, [tanks, sites, selectedSiteId]);

  const siteLookup = useMemo(() => {
    const map = new Map<string, (typeof sites)[number]>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

  const ordersBySite = useMemo(
    () =>
      orders
        .filter((o) => !selectedSiteId || o.siteId === selectedSiteId)
        .filter(
          (o) =>
            o.status !== 'DELIVERED' &&
            o.status !== 'DELIVERED_SHORT' &&
            o.status !== 'DELIVERED_OVER' &&
            o.status !== 'CANCELLED',
        ),
    [orders, selectedSiteId],
  );

  const gradeLabel = (tankId: string) => {
    const code = tankLookup.get(tankId)?.productType;
    if (code === 'REGULAR') return 'REG';
    if (code === 'PREMIUM') return 'PRM';
    if (code === 'DIESEL') return 'DSL';
    if (code === 'VIRTUAL_MIDGRADE') return 'MID';
    return tankLookup.get(tankId)?.name || tankId;
  };

  const statusBadgeClass = (status: string) => {
    if (status === 'PENDING' || status === 'REQUESTED') return 'badge badge-yellow';
    if (status === 'CONFIRMED') return 'badge badge-blue';
    if (status === 'DISPATCHED') return 'badge badge-blue';
    if (status === 'DELIVERED' || status === 'DELIVERED_SHORT' || status === 'DELIVERED_OVER') return 'badge badge-green';
    if (status === 'CANCELLED') return 'badge badge-gray';
    return 'badge badge-yellow';
  };

  const header = pageHeaderConfig.ordersList;

  return (
    <div className="page">
      <PageHeader
        title={header.title}
        subtitle={header.subtitle}
        infoTooltip={header.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: [{ id: '', label: 'All sites' }, ...sites.map((s) => ({ id: s.id, label: s.name }))],
        }}
      />

      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ fontWeight: 700 }}>Orders</div>
            <div className="muted">{ordersBySite.length} records</div>
          </div>
        </div>
        <div className="list-grid">
          {[...ordersBySite]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((o) => {
              const jobberLabel = jobbers.find((j) => j.id === o.jobberId)?.name || o.jobberId;
              const siteLabel = siteLookup.get(o.siteId)?.name || o.siteId;
              const lines = o.lines?.length ? o.lines : [{ tankId: o.tankId || 'unknown', quantityGallonsRequested: o.quantityGallonsRequested }];
              const total = lines.reduce((sum, l) => sum + (l.quantityGallonsRequested || 0), 0);
              const delivered = lines.reduce((sum, l) => sum + (l.quantityGallonsDelivered || 0), 0);
              const poDraft = poDrafts[o.id] ?? '';
              const canConfirm = o.status === 'PENDING';
              const canDispatch = o.status === 'CONFIRMED';
              const canDeliver = o.status === 'DISPATCHED';
              const isTerminal = o.status === 'DELIVERED' || o.status === 'DELIVERED_SHORT' || o.status === 'DELIVERED_OVER' || o.status === 'CANCELLED';
              return (
                <div className="list-card" key={o.id}>
                  <div className="list-meta" style={{ alignItems: 'flex-start', gap: '0.5rem', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Order {o.orderNumber || o.id}</div>
                      <div className="muted" style={{ fontSize: '0.9rem' }}>
                        {jobberLabel} • {siteLabel} • {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={statusBadgeClass(o.status)}>{o.status}</span>
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.35rem' }}>
                    {lines.map((line) => (
                      <div key={line.tankId} className="muted" style={{ fontSize: '0.9rem' }}>
                        • {gradeLabel(line.tankId)}: {line.quantityGallonsRequested.toLocaleString()} gal
                        {typeof line.quantityGallonsDelivered === 'number'
                          ? ` (delivered ${line.quantityGallonsDelivered.toLocaleString()} gal)`
                          : ''}
                      </div>
                    ))}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
                    Total {total.toLocaleString()} gal
                    {delivered ? ` • Delivered ${delivered.toLocaleString()} gal` : ''}
                    {o.jobberPoNumber ? ` • PO ${o.jobberPoNumber}` : ''}
                  </div>
                  {!isTerminal ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.65rem' }}>
                      {canConfirm ? (
                        <>
                          <input
                            type="text"
                            placeholder="PO number (optional)"
                            value={poDraft}
                            onChange={(e) => setPoDrafts((p) => ({ ...p, [o.id]: e.target.value }))}
                            style={{ minWidth: 160 }}
                          />
                          <button
                            className="button"
                            onClick={() => orderAction.mutate({ id: o.id, action: 'confirm', data: { jobberPoNumber: poDraft || undefined } })}
                          >
                            Confirm
                          </button>
                        </>
                      ) : null}
                      {canDispatch ? (
                        <button className="button ghost" onClick={() => orderAction.mutate({ id: o.id, action: 'dispatch' })}>
                          Dispatch
                        </button>
                      ) : null}
                      {canDeliver ? (
                        <button className="button ghost" onClick={() => orderAction.mutate({ id: o.id, action: 'deliver' })}>
                          Mark delivered (simulate)
                        </button>
                      ) : null}
                      <button className="button ghost" onClick={() => orderAction.mutate({ id: o.id, action: 'cancel' })}>
                        Cancel
                      </button>
                      {orderAction.isPending ? <span className="muted">Updating...</span> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
        {ordersBySite.length === 0 ? <div className="muted">No orders for this site yet.</div> : null}
      </div>
    </div>
  );
}

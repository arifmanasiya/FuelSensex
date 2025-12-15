import { useMemo, useState } from 'react';
import { useJobbers, useOrderAction, useOrders, useSiteTanks, useSites, usePageHeaders } from '../api/hooks';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';

export default function OrdersListPage() {
  const { data: sites = [] } = useSites();
  const { data: pageHeaders } = usePageHeaders();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const { data: orders = [] } = useOrders(selectedSiteId || undefined);
  const { data: tanks = [] } = useSiteTanks(selectedSiteId || '');
  const { data: jobbers = [] } = useJobbers();
  const orderAction = useOrderAction();
  const [actionError, setActionError] = useState<string | null>(null);

  const extractErrorMessage = (err: unknown): string | undefined => {
    if (err instanceof Error) return err.message;
    if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as { message?: unknown }).message === 'string'
    ) {
      return (err as { message?: string }).message;
    }
    return undefined;
  };

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
    if (code === 'PREMIUM') return 'SUP';
    if (code === 'DIESEL') return 'DSL';
    if (code === 'VIRTUAL_MIDGRADE') return 'MID';
    return tankLookup.get(tankId)?.name || tankId;
  };

  const statusBadge = (status: string) => {
    if (status === 'CANCELLED') {
      return { text: 'CANCELLED', className: 'status status--cancelled' };
    }
    const delivered = status === 'DELIVERED' || status === 'DELIVERED_SHORT' || status === 'DELIVERED_OVER';
    return {
      text: delivered ? 'DELIVERED' : 'PENDING',
      className: delivered ? 'status status--ok' : 'status status--pending',
    };
  };

  const header = pageHeaders?.ordersList;

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Recent Orders'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: [{ id: '', label: 'All sites' }, ...sites.map((s) => ({ id: s.id, label: s.name }))],
        }}
      />

      <div className="orders-card" aria-label="Orders">
        <div className="orders-card__header">
          <div>
            <div className="orders-title">Orders</div>
            <div className="orders-subtitle muted">
              {ordersBySite.length} record{ordersBySite.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        <div className="ol-head" role="rowgroup">
          <div className="ol-row ol-row--head" role="row">
            <div className="ol-cell" role="columnheader">Supplier</div>
            <div className="ol-cell" role="columnheader">Site &amp; time</div>
            <div className="ol-cell" role="columnheader">Order / PO</div>
            <div className="ol-cell" role="columnheader">Lines</div>
            <div className="ol-cell" role="columnheader">Total</div>
            <div className="ol-cell ol-cell--right" role="columnheader">Status</div>
            <div className="ol-cell ol-cell--right" role="columnheader">Actions</div>
          </div>
        </div>
        <div className="ol-body" role="rowgroup">
          {[...ordersBySite]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((o) => {
              const jobberLabel = jobbers.find((j) => j.id === o.jobberId)?.name || o.jobberId;
              const siteLabel = siteLookup.get(o.siteId)?.name || o.siteId;
              const lines = o.lines?.length ? o.lines : [{ tankId: o.tankId || 'unknown', quantityGallonsRequested: o.quantityGallonsRequested }];
              const total = lines.reduce((sum, l) => sum + (l.quantityGallonsRequested || 0), 0);
              const delivered = lines.reduce((sum, l) => sum + (l.quantityGallonsDelivered || 0), 0);
              const canDeliver = o.status === 'CONFIRMED' || o.status === 'PENDING';
              const isTerminal = o.status === 'DELIVERED' || o.status === 'DELIVERED_SHORT' || o.status === 'DELIVERED_OVER' || o.status === 'CANCELLED';
              return (
                <div className="ol-row" role="row" key={o.id}>
                  <div className="ol-cell" role="cell" data-label="Supplier">
                    <div className="primary">{jobberLabel}</div>
                  </div>
                  <div className="ol-cell" role="cell" data-label="Site &amp; time">
                    <div className="primary">{siteLabel}</div>
                    <div className="muted small">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="ol-cell" role="cell" data-label="Order / PO">
                    <div className="primary">
                      Order <span className="mono">{o.orderNumber || o.id}</span>
                    </div>
                    {o.jobberPoNumber ? (
                      <div className="muted small">
                        PO <span className="mono">{o.jobberPoNumber}</span>
                      </div>
                    ) : (
                      <div className="muted small">PO —</div>
                    )}
                  </div>
                  <div className="ol-cell" role="cell" data-label="Lines">
                    <div className="lines">
                      {lines.map((line) => (
                        <div key={line.tankId} className="line-item">
                          {gradeLabel(line.tankId)}: <strong>{line.quantityGallonsRequested.toLocaleString()}</strong> gal
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ol-cell" role="cell" data-label="Total">
                    <div className="primary">
                      <strong>{total.toLocaleString()}</strong> gal
                    </div>
                    {delivered ? <div className="muted small">Delivered {delivered.toLocaleString()} gal</div> : <div className="muted small">Total</div>}
                  </div>
                  <div className="ol-cell ol-cell--right" role="cell" data-label="Status">
                    {(() => {
                      const badge = statusBadge(o.status);
                      return <span className={badge.className}>{badge.text}</span>;
                    })()}
                  </div>
                  <div className="ol-cell ol-cell--right" role="cell" data-label="Actions">
                    <div className="actions">
                      {!isTerminal && canDeliver ? (
                        <button
                          className="btn btn--ghost"
                          onClick={async () => {
                            setActionError(null);
                            try {
                              await orderAction.mutateAsync({ id: o.id, action: 'deliver' });
                            } catch (err: unknown) {
                              setActionError(
                                extractErrorMessage(err) ||
                                  'No delivery event found after order creation time. Cannot mark delivered. If you think this is an error, please contact your system administrator.',
                              );
                            }
                          }}
                        >
                          Mark delivered
                        </button>
                      ) : null}
                      {!isTerminal ? (
                        <button
                          className="btn btn--ghost btn--danger"
                          onClick={async () => {
                            setActionError(null);
                            try {
                              await orderAction.mutateAsync({ id: o.id, action: 'cancel' });
                            } catch (err: unknown) {
                              setActionError(extractErrorMessage(err) || 'Failed to cancel order');
                            }
                          }}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          {ordersBySite.length === 0 ? <div className="muted" style={{ padding: '0.75rem' }}>No orders for this site yet.</div> : null}
        </div>
        <ConfirmModal
          open={!!actionError}
          title="Unable to mark delivered"
          message={
            actionError ||
            'No delivery event found after order creation time. Cannot mark delivered. If you think this is an error, please contact your system administrator.'
          }
          confirmLabel="Close"
          cancelLabel=""
          onConfirm={() => setActionError(null)}
          onCancel={() => setActionError(null)}
        />
      </div>
    </div>
  );
}

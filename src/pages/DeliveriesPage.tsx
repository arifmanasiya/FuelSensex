import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api/apiClient';
import { useCreateTicket, useOrders, useSites, useTickets } from '../api/hooks';
import type { DeliveryRecord } from '../types';
import PageHeader from '../components/PageHeader';
import { pageHeaderConfig } from '../config/pageHeaders';

export default function DeliveriesPage() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: orders = [] } = useOrders(selectedSiteId || undefined);
  const { data: tickets = [] } = useTickets(selectedSiteId || undefined);
  const createTicket = useCreateTicket();
  const [pendingTicket, setPendingTicket] = useState<Record<string, boolean>>({});
  const [loggedTicket, setLoggedTicket] = useState<Record<string, boolean>>({});
  const siteLookup = useMemo(() => {
    const map = new Map<string, (typeof sites)[number]>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      if (!sites.length) {
        setDeliveries([]);
        setLoading(false);
        return;
      }
      if (selectedSiteId) {
        const data = await get<DeliveryRecord[]>(`/api/sites/${selectedSiteId}/deliveries`);
        setDeliveries(data);
        setLoading(false);
        return;
      }
      const all = await Promise.all(
        sites.map((s) => get<DeliveryRecord[]>(`/api/sites/${s.id}/deliveries`).catch(() => []))
      );
      setDeliveries(all.flat());
      setLoading(false);
    };
    load();
  }, [selectedSiteId, sites]);

  const grouped = useMemo(() => {
    const map = new Map<string, DeliveryRecord[]>();
    deliveries.forEach((d) => {
      const key = d.orderNumber || 'unlinked';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return Array.from(map.entries()).map(([orderNumber, list]) => ({
      orderNumber,
      items: list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    }));
  }, [deliveries]);

  const statusBadge = (status: DeliveryRecord['status']) => {
    const base = { fontSize: '0.8rem', padding: '0.15rem 0.4rem' };
    if (status === 'OK') return <span className="badge badge-green" style={base}>OK</span>;
    if (status === 'SHORT') return <span className="badge badge-red" style={base}>Short</span>;
    if (status === 'OVER') return <span className="badge badge-yellow" style={base}>Over</span>;
    return <span className="badge badge-gray" style={base}>Missing</span>;
  };

  const deriveStatus = (record: DeliveryRecord): DeliveryRecord['status'] => {
    const diff = record.atgReceivedGallons - record.bolGallons;
    const tolerance = Math.max(record.bolGallons * 0.01, 50); // 1% or 50 gal, whichever is larger
    if (diff > tolerance) return 'OVER';
    if (diff < -tolerance) return 'SHORT';
    return 'OK';
  };

  const orderLookup = useMemo(() => {
    const map = new Map<string, (typeof orders)[number]>();
    orders.forEach((o) => map.set(o.orderNumber || o.id, o));
    return map;
  }, [orders]);

  const openTicketByOrder = useMemo(() => {
    const map = new Map<string, string>();
    tickets
      .filter((t) => t.orderNumber || t.orderId)
      .forEach((t) => {
        const key = t.orderNumber || t.orderId!;
        map.set(key, t.id);
      });
    return map;
  }, [tickets]);

  const handleCreateTicket = (orderNumber: string, supplier: string) => {
    const order = orderLookup.get(orderNumber);
    const key = `${orderNumber}-${supplier}`;
    setPendingTicket((p) => ({ ...p, [key]: true }));
    const ticket = {
      id: `tkt-${Date.now()}`,
      siteId: order?.siteId || selectedSiteId,
      orderId: order?.id,
      orderNumber,
      jobberId: order?.jobberId,
      type: 'SHORT_DELIVERY' as const,
      description: `Issue logged for order ${orderNumber} from ${supplier}.`,
      status: 'OPEN' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createTicket.mutate(ticket, {
      onSuccess: () => {
        setLoggedTicket((p) => ({ ...p, [key]: true }));
      },
      onSettled: () => {
        setPendingTicket((p) => ({ ...p, [key]: false }));
      },
    });
  };

  const displayGrade = (grade: string) => {
    if (grade === 'PREM' || grade === 'PREMIUM') return 'PRM';
    if (grade === 'REG' || grade === 'REGULAR') return 'REG';
    if (grade === 'DSL' || grade === 'DIESEL') return 'DSL';
    return grade;
  };

  const header = pageHeaderConfig.deliveries;

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
            <div style={{ fontWeight: 700 }}>Recent deliveries</div>
            <div className="muted">From site ATG feeds</div>
          </div>
        </div>
        {loading ? <div className="muted">Loading deliveries...</div> : null}
        <div className="list-grid">
          {grouped.map((group) => {
            const first = group.items[0];
            const supplier = first?.supplier || 'Jobber';
            const siteLabel = first?.siteId ? siteLookup.get(first.siteId)?.name || first.siteId : selectedSiteId ? siteLookup.get(selectedSiteId)?.name || selectedSiteId : 'Site';
            const orderKey = `${group.orderNumber}-${supplier}`;
            const existingTicketId = group.orderNumber ? openTicketByOrder.get(group.orderNumber) : undefined;
            return (
              <div key={group.orderNumber} className="list-card">
                <div className="list-meta">
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {group.orderNumber === 'unlinked' ? 'Unlinked delivery' : `Order ${group.orderNumber}`}
                    </div>
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      {supplier} • {siteLabel} • {new Date(first.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.4rem' }}>
                  {group.items.map((d) => (
                    <div key={d.id} className="muted" style={{ fontSize: '0.9rem' }}>
                      • {displayGrade(d.gradeCode)} — Ticket {d.bolGallons.toLocaleString()} gal, ATG {d.atgReceivedGallons.toLocaleString()} gal
                      <span style={{ marginLeft: '0.35rem' }}>{statusBadge(deriveStatus(d))}</span>
                    </div>
                  ))}
                </div>
                {group.orderNumber !== 'unlinked' ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {existingTicketId ? (
                      <Link className="button ghost" to={`/issues/${existingTicketId}`}>
                        View open issue
                      </Link>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {pendingTicket[orderKey] ? <span className="muted">Submitting…</span> : null}
                        {loggedTicket[orderKey] ? (
                          <Link className="button ghost" to="/issues">
                            View open issue
                          </Link>
                        ) : (
                          <button
                            className="button ghost"
                            onClick={() => handleCreateTicket(group.orderNumber, supplier)}
                            disabled={!!pendingTicket[orderKey]}
                          >
                            Log issue ticket
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        {grouped.length === 0 && !loading ? <div className="muted">No deliveries recorded.</div> : null}
      </div>
    </div>
  );
}

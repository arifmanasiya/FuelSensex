import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../api/apiClient';
import { useCreateTicket, useDeliveries, useOrders, useSites, useTickets, useJobbers, usePageHeaders } from '../api/hooks';
import type { DeliveryRecord } from '../types';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';
import { formatNumber } from '../utils/format';

export default function DeliveriesPage() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const { data: deliveries = [], isLoading: loading } = useDeliveries(selectedSiteId);
  const { data: orders = [] } = useOrders(selectedSiteId || undefined);
  const { data: tickets = [] } = useTickets(selectedSiteId || undefined);
  const { data: jobbers = [] } = useJobbers();
  const { data: pageHeaders } = usePageHeaders();
  const createTicket = useCreateTicket();
  const [pendingTicket, setPendingTicket] = useState<Record<string, boolean>>({});
  const [collapsedLink, setCollapsedLink] = useState<Record<string, boolean>>({});
  const [linkDrafts, setLinkDrafts] = useState<
    Record<string, { orderNumber: string; po: string; bolByDelivery: Record<string, string>; jobberId?: string; submitting?: boolean }>
  >({});
  const [detailDeliveries, setDetailDeliveries] = useState<DeliveryRecord[] | null>(null);
  const [detailBolMap, setDetailBolMap] = useState<Record<string, string>>({});
  const [alertModal, setAlertModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const formatInputValue = (value: number) => {
    if (!Number.isFinite(value)) return '';
    return parseFloat(value.toFixed(4)).toString();
  };

  const siteLookup = useMemo(() => {
    const map = new Map<string, (typeof sites)[number]>();
    sites.forEach((s) => map.set(s.id, s));
    return map;
  }, [sites]);

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
    if (status === 'OK') return <span className="tag tag--blue" style={base}>OK</span>;
    if (status === 'SHORT') return <span className="tag tag--yellow" style={base}>Short</span>;
    if (status === 'OVER') return <span className="tag tag--yellow" style={base}>Over</span>;
    return <span className="tag tag--gray" style={base}>No order</span>;
  };

  const deriveStatus = (record: DeliveryRecord): DeliveryRecord['status'] => {
    const diff = record.atgReceivedGallons - record.bolGallons;
    const tolerance = Math.max(record.bolGallons * 0.01, 50); // 1% or 50 gal
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
      onSettled: () => setPendingTicket((p) => ({ ...p, [key]: false })),
    });
  };

  const displayGrade = (grade: string) => {
  if (grade === 'SUP' || grade === 'PREM' || grade === 'PREMIUM') return 'SUP';
    if (grade === 'REG' || grade === 'REGULAR') return 'REG';
    if (grade === 'DSL' || grade === 'DIESEL') return 'DSL';
    return grade;
  };

  const handleLinkDelivery = async (groupKey: string, deliveryIds: string[]) => {
    const draft = linkDrafts[groupKey];
    if (!draft) {
      setAlertModal({ open: true, message: 'Select an order to link.' });
      return;
    }
    if (draft.orderNumber === 'SYSTEM_ORDER' && (!draft.po || !draft.jobberId)) {
      setAlertModal({ open: true, message: 'PO number and Jobber are required when creating a system order.' });
      return;
    }
    setLinkDrafts((p) => ({ ...p, [groupKey]: { ...draft, submitting: true } }));
    try {
      let orderNumber = draft.orderNumber === 'SYSTEM_ORDER' ? undefined : draft.orderNumber;
      for (const id of deliveryIds) {
        const bolValue = draft.bolByDelivery?.[id];
        const res = await post<{ ok: boolean; orderNumber?: string }>('/api/deliveries/link', {
          deliveryId: id,
          orderNumber,
          bolGallons: bolValue ? Number(bolValue) : undefined,
          poNumber: draft.po || undefined,
          jobberId: draft.orderNumber === 'SYSTEM_ORDER' ? draft.jobberId : undefined,
        });
        if (!orderNumber && res.orderNumber) {
          orderNumber = res.orderNumber;
        }
      }
      // await loadDeliveries(selectedSiteId);
    } catch (err: unknown) {
      let message: string | undefined;
      if (err instanceof Error) {
        message = err.message;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message?: unknown }).message === 'string'
      ) {
        message = (err as { message?: string }).message;
      }
      const msg =
        message === 'This PO is already used for another delivery of the same product. Use a different PO or unlink first.'
          ? 'This PO is already used for another delivery of the same product. Please choose a different PO (unlinking is not available yet).'
          : message || 'Failed to link delivery. Please try again.';
      setAlertModal({ open: true, message: msg });
    } finally {
      setLinkDrafts((p) => ({ ...p, [groupKey]: { ...draft, submitting: false } }));
    }
  };

  const header = pageHeaders?.deliveries;

  const openDeliveryDetails = (records: DeliveryRecord[] | DeliveryRecord) => {
    const list = Array.isArray(records) ? records : [records];
    setDetailDeliveries(list);
    const map: Record<string, string> = {};
    list.forEach((r) => {
      const src = r.bolGallons ?? r.atgReceivedGallons;
      map[r.id] = formatInputValue(src);
    });
    setDetailBolMap(map);
  };

  const saveDetailBol = async () => {
    if (!detailDeliveries) return;
    for (const r of detailDeliveries) {
      const val = detailBolMap[r.id];
      const next = Number(val) || 0;
      const current = r.bolGallons || 0;
      if (Math.abs(next - current) < 0.0001) continue;
      await post('/api/deliveries/update-bol', { deliveryId: r.id, bolGallons: next });
    }
    // await loadDeliveries(selectedSiteId);
    setDetailDeliveries(null);
  };

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Deliveries'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: [{ id: '', label: 'All sites' }, ...sites.map((s) => ({ id: s.id, label: s.name }))],
        }}
      />

                  <div className="deliveries-card" aria-label="Recent deliveries">
        <div className="deliveries-card__header">
          <div>
            <div className="deliveries-title">Recent deliveries</div>
            <div className="deliveries-subtitle muted">From site ATG feeds</div>
          </div>
        </div>
        {loading ? <div className="muted" style={{ padding: "0.75rem 0.85rem" }}>Loading deliveries...</div> : null}

        <div className="dl-body" role="rowgroup">
          {grouped.map((group) => {
            const first = group.items[0];
            const siteLabel =
              first?.siteId ? siteLookup.get(first.siteId)?.name || first.siteId : selectedSiteId ? siteLookup.get(selectedSiteId)?.name || selectedSiteId : "Site";
            const existingTicketId = group.orderNumber ? openTicketByOrder.get(group.orderNumber) : undefined;
            const isUnlinked = !group.orderNumber || group.orderNumber === "unlinked" || group.orderNumber.startsWith("DROP-");
            const ordersForSite = orders
              .filter((o) => o.siteId === (first?.siteId || selectedSiteId))
              .filter((o) => new Date(o.createdAt).getTime() <= new Date(first.timestamp).getTime())
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            const suggestedOrderNumber = ordersForSite[0]?.orderNumber || ordersForSite[0]?.id || "SYSTEM_ORDER";
            const draft = linkDrafts[group.orderNumber] ?? {
              orderNumber: suggestedOrderNumber,
              po: "",
              bolByDelivery: group.items.reduce<Record<string, string>>((acc, d) => {
                acc[d.id] = formatInputValue(d.atgReceivedGallons);
                return acc;
              }, {}),
              jobberId: ordersForSite[0]?.jobberId || jobbers[0]?.id,
              submitting: false,
            };
            const isCollapsed = collapsedLink[group.orderNumber] ?? true;
            const linkRow = isUnlinked ? (
              <div className="dl-card-row">
                <div className="linkform">
                  {!isCollapsed ? (
                    <div className="linkform__rowgrid">
                      <div className="linkform__col linkform__bol">
                        {group.items.map((d) => (
                          <div key={d.id} className="bol">
                            <div className="bol-head">
                              <label className="bol__label muted">{displayGrade(d.gradeCode)}</label>
                              <div className="muted small bol-atg">ATG {formatNumber(d.atgReceivedGallons)} gal</div>
                            </div>
                            <input
                              className="control"
                              type="number"
                              step="0.001"
                              value={draft.bolByDelivery?.[d.id] ?? formatInputValue(d.atgReceivedGallons)}
                              placeholder="Gallons (BOL)"
                              onChange={(e) =>
                                setLinkDrafts((p) => ({
                                  ...p,
                                  [group.orderNumber]: {
                                    ...draft,
                                    bolByDelivery: { ...draft.bolByDelivery, [d.id]: e.target.value },
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <div className="linkform__col linkform__side">
                        <div className="linkform__top">
                          <label className="linkform__field">
                            <span className="muted small">Order</span>
                            <select
                              className="control"
                              aria-label="Link method"
                              value={draft.orderNumber}
                              onChange={(e) =>
                                setLinkDrafts((p) => ({
                                  ...p,
                                  [group.orderNumber]: { ...draft, orderNumber: e.target.value },
                                }))
                              }
                            >
                              <option value="SYSTEM_ORDER">Link Order Manually</option>
                              {ordersForSite.map((o) => (
                                <option key={o.id} value={o.orderNumber || o.id}>
                                  {o.orderNumber || o.id}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="linkform__field">
                            <span className="muted small">Jobber</span>
                            <select
                              className="control"
                              aria-label="Jobber"
                              value={draft.jobberId || ""}
                              onChange={(e) =>
                                setLinkDrafts((p) => ({
                                  ...p,
                                  [group.orderNumber]: { ...draft, jobberId: e.target.value },
                                }))
                              }
                            >
                              <option value="">Choose Jobber</option>
                              {jobbers.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="linkform__field">
                            <span className="muted small">
                              PO number <span className="required" title="Required">*</span>
                            </span>
                            <input
                              className="control"
                              type="text"
                              placeholder="PO number"
                              aria-label="PO number"
                              value={draft.po}
                              onChange={(e) =>
                                setLinkDrafts((p) => ({
                                  ...p,
                                  [group.orderNumber]: { ...draft, po: e.target.value },
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="linkform__actions">
                          <div className="rhs">
                            <button
                              className="btn btn--primary btn--block"
                              type="button"
                              onClick={() => handleLinkDelivery(group.orderNumber, group.items.map((i) => i.id))}
                              disabled={draft.submitting}
                            >
                              {draft.submitting ? "Linking." : "Link to order"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null;

            const infoRow = isUnlinked ? (
              <div className="dl-card-row">
                <div className="dl-card-top">
                  <div className="dl-card-meta">
                    <div className="primary">{siteLabel}</div>
                    <div className="muted small">{new Date(first.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dl-card-row">
                <div className="dl-card-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div className="dl-card-meta">
                    <div className="primary">{siteLabel}</div>
                    <div className="muted small">{new Date(first.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="rhs" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {existingTicketId ? <span className="tag tag--orange">Issue</span> : null}
                    <button className="btn btn--ghost btn--block" type="button" onClick={() => openDeliveryDetails(group.items)}>
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );

            const summaryRow = (
              <div className="dl-card-row">
                <div className="dl-card-meta" style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", width: "100%" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
                    {group.items.map((d) => (
                      <div key={d.id} className="muted small" style={{ fontWeight: 600 }}>
                        {displayGrade(d.gradeCode)} � ATG {formatNumber(d.atgReceivedGallons)} gal
                      </div>
                    ))}
                  </div>
                  {isUnlinked ? (
                    <div className="linkform__header" style={{ alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                      <span className="tag tag--yellow">No order</span>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ padding: "8px 10px" }}
                        onClick={() =>
                          setCollapsedLink((p) => ({
                            ...p,
                            [group.orderNumber]: !isCollapsed,
                          }))
                        }
                      >
                        {isCollapsed ? "Link to order" : "Hide form"}
                      </button>
                    </div>
                  ) : (
                    <div className="rhs" style={{ alignItems: "center", gap: "0.5rem", display: "flex", marginLeft: "auto" }}>
                      {existingTicketId ? <span className="tag tag--orange">Issue</span> : null}
                      <button className="btn btn--ghost btn--block" type="button" onClick={() => openDeliveryDetails(group.items)}>
                        Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );

            return (
              <div key={group.orderNumber} className="dl-card">
                {infoRow}
                {summaryRow}
                {linkRow}

                {/* Row 3: actions (linked only) */}
                {!isUnlinked ? null : null}
              </div>
            );
          })}
        </div>

        {grouped.length === 0 && !loading ? <div className="muted" style={{ padding: "0.75rem 0.85rem" }}>No deliveries recorded.</div> : null}
      </div>

      {detailDeliveries && detailDeliveries.length ? (
        (() => {
          const detailList = detailDeliveries!;
          const detailFirst = detailList[0];
          if (!detailFirst) return null;
          return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', padding: '1rem' }}>
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Delivery details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ fontWeight: 700 }}>
                    {siteLookup.get(detailFirst.siteId)?.name || detailFirst.siteId}
                  </div>
                  <div className="muted" style={{ fontSize: '0.95rem' }}>
                    {new Date(detailFirst.timestamp).toLocaleString()}
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {detailFirst.supplier}
                    {detailFirst.poNumber ? `PO ${detailFirst.poNumber}` : ''}
                  </div>
                  {detailFirst.orderNumber ? (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      Order {detailFirst.orderNumber}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {detailList.map((d) => (
                <div
                  key={d.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <div style={{ fontWeight: 700 }}>{displayGrade(d.gradeCode)}</div>
                    <span>{statusBadge(deriveStatus(d))}</span>
                  </div>
                  <div className="muted">ATG: {formatNumber(d.atgReceivedGallons)} gal</div>
                  <label className="form-field" style={{ margin: 0 }}>
                    <span>Ticket (BOL) gallons</span>
                    <input
                      type="number"
                      value={detailBolMap[d.id] ?? formatInputValue(d.atgReceivedGallons)}
                      onChange={(e) =>
                        setDetailBolMap((prev) => ({
                          ...prev,
                          [d.id]: e.target.value,
                        }))
                      }
                      style={{ width: '100%', height: 38 }}
                    />
                  </label>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Delivery ID: {d.id}
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    Updated: {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '�'} by {d.updatedBy || 'System'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {(() => {
                const detailOrderNumber = detailFirst.orderNumber || detailFirst.id;
                const detailSupplier = detailFirst.supplier || 'Jobber';
                const detailTicketId = detailFirst.orderNumber ? openTicketByOrder.get(detailFirst.orderNumber) : undefined;
                const pendingKey = `${detailOrderNumber}-${detailSupplier}`;
                return detailTicketId ? (
                  <Link className="button ghost" to={`/app/issues/${detailTicketId}`}>
                    View issue
                  </Link>
                ) : (
                  <button
                    className="button ghost"
                    onClick={() => handleCreateTicket(detailOrderNumber, detailSupplier)}
                    disabled={!!pendingTicket[pendingKey]}
                  >
                    {pendingTicket[pendingKey] ? 'Submitting�' : 'Log issue'}
                  </button>
                );
              })()}
              <button className="button ghost" onClick={() => setDetailDeliveries(null)}>
                Close
              </button>
              <button className="button ghost" onClick={saveDetailBol}>
                Save and Close
              </button>
            </div>
          </div>
        </div>
          );
        })()
      ) : null}
      <ConfirmModal
        open={alertModal.open}
        title="Notice"
        message={alertModal.message}
        confirmLabel="Close"
        cancelLabel={undefined}
        onConfirm={() => setAlertModal({ open: false, message: '' })}
        onCancel={() => setAlertModal({ open: false, message: '' })}
      />
    </div>
  );
}







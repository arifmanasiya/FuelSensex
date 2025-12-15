import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateOrder, useJobbers, useSiteSettings, useSiteTanks, useSites, usePageHeaders } from '../api/hooks';
import PageHeader from '../components/PageHeader';

type OrderLine = {
  tankId: string;
  gallons: number;
  suggested: number;
  remaining: number;
  capacity: number;
};

export default function CreateOrderPage() {
  const { data: sites = [] } = useSites();
  const defaultSiteId = sites[0]?.id ?? '';
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const activeSiteId = selectedSiteId || defaultSiteId;
  const { data: tanks = [] } = useSiteTanks(activeSiteId);
  const { data: jobbers = [] } = useJobbers();
  const defaultJobberId = jobbers[0]?.id ?? '';
  const [jobberId, setJobberId] = useState('');
  const activeJobberId = jobberId || defaultJobberId;
  const { data: siteSettings } = useSiteSettings(activeSiteId);
  const { data: pageHeaders } = usePageHeaders();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const [lineOverrides, setLineOverrides] = useState<Record<string, Record<string, number>>>({});

  const baseLines = useMemo(() => {
    const physicalTanks = tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE');
    if (!physicalTanks.length) return [];
    const defaults: Record<string, number | undefined> = {
      REGULAR: siteSettings?.defaultLoadRegGallons,
      PREMIUM: siteSettings?.defaultLoadPremGallons,
      DIESEL: siteSettings?.defaultLoadDslGallons,
      VIRTUAL_MIDGRADE: siteSettings?.defaultLoadMidGallons,
    };
    return physicalTanks.map((t) => {
      const remaining = Math.max(t.capacityGallons - t.currentVolumeGallons, 0);
      const targetGap =
        typeof t.targetFillGallons === 'number' ? Math.max(t.targetFillGallons - t.currentVolumeGallons, 0) : undefined;
      const defaultLoad = defaults[t.productType];
      const baseTarget = typeof targetGap === 'number' ? targetGap : defaultLoad ?? remaining;
      const suggestedRaw = Math.min(remaining, baseTarget ?? remaining, t.capacityGallons);
      const suggested = Math.max(0, Math.round(suggestedRaw));
      return {
        tankId: t.id,
        gallons: suggested,
        suggested,
        remaining,
        capacity: t.capacityGallons,
      };
    });
  }, [tanks, siteSettings]);

  const baseLineMap = useMemo(() => {
    const map = new Map<string, OrderLine>();
    baseLines.forEach((line) => map.set(line.tankId, line));
    return map;
  }, [baseLines]);

  const lines = useMemo(
    () =>
      baseLines.map((line) => ({
        ...line,
        gallons: (lineOverrides[activeSiteId] ?? {})[line.tankId] ?? line.gallons,
      })),
    [activeSiteId, baseLines, lineOverrides],
  );

  const tankLookup = useMemo(() => {
    const map = new Map<string, (typeof tanks)[number]>();
    tanks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tanks]);

  const readyToSubmit = !!activeSiteId && !!activeJobberId && lines.some((l) => l.gallons > 0);
  const header = pageHeaders?.createOrder;

  const applyLineGallons = (tankId: string, gallons: number) => {
    const base = baseLineMap.get(tankId);
    if (!base) return;
    const clamped = Math.max(0, Math.min(gallons, base.capacity));
    setLineOverrides((prev) => {
      const siteOverrides = { ...(prev[activeSiteId] ?? {}) };
      siteOverrides[tankId] = clamped;
      return { ...prev, [activeSiteId]: siteOverrides };
    });
  };

  const commitGallons = (tankId: string, value: string) => {
    const num = Math.max(0, Number(value) || 0);
    applyLineGallons(tankId, num);
  };

  const applySuggested = (line: OrderLine) => {
    applyLineGallons(line.tankId, line.suggested);
  };

  const applyRemaining = (line: OrderLine) => {
    applyLineGallons(line.tankId, Math.round(line.remaining));
  };

  const clearLine = (line: OrderLine) => {
    applyLineGallons(line.tankId, 0);
  };

  async function submitOrders() {
    if (!readyToSubmit) return;
    const payloads = lines.filter((l) => l.gallons > 0).map((l) => ({ tankId: l.tankId, quantityGallonsRequested: l.gallons }));
    try {
      await createOrder.mutateAsync({
        siteId: activeSiteId,
        jobberId: activeJobberId,
        lines: payloads,
      });
      navigate('/app/orders');
    } catch (error) {
      console.error('Failed to submit order', error);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Create Order'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId || defaultSiteId,
          onChange: setSelectedSiteId,
          options: sites.map((s) => ({ id: s.id, label: s.name })),
        }}
      />

      <div className="card">
        <div className="order-table" role="table" aria-label="Fuel order lines">
          <div className="ot-head" role="rowgroup">
            <div className="ot-row ot-row--head" role="row">
              <div className="ot-cell" role="columnheader">Grade</div>
              <div className="ot-cell" role="columnheader">Tank status</div>
              <div className="ot-cell" role="columnheader">Order qty (gal)</div>
              <div className="ot-cell" role="columnheader">Actions</div>
            </div>
          </div>
          <div className="ot-body" role="rowgroup">
            {lines.map((line) => {
              const tank = tankLookup.get(line.tankId);
              if (!tank) return null;
              const capacity = line.capacity || tank.capacityGallons || 1;
              const percent = Math.round((tank.currentVolumeGallons / capacity) * 100);
              const orderGallons = Math.max(0, Math.min(line.gallons, capacity - tank.currentVolumeGallons));
              const percentOrder = Math.min(100, Math.max(0, (orderGallons / capacity) * 100));
              const percentEmpty = Math.max(0, 100 - percent - percentOrder);
              const productLabel =
                tank.productType === 'REGULAR'
                  ? 'REG'
                  : tank.productType === 'PREMIUM'
                  ? 'SUP'
                  : tank.productType === 'DIESEL'
                  ? 'DSL'
                  : tank.productType === 'VIRTUAL_MIDGRADE'
                  ? 'MID'
                  : tank.productType;
              const pill =
                line.gallons === 0
                  ? { label: 'Not ordered', className: 'pill pill--muted' }
                  : line.gallons === line.suggested
                  ? { label: 'Suggested', className: 'pill pill--ok' }
                  : { label: 'Custom', className: 'pill pill--warn' };
              return (
                <div className="ot-row" role="row" key={line.tankId}>
                  <div className="ot-cell ot-grade" role="cell" data-label="Grade">
                    <div className="grade-name">{productLabel}</div>
                    <div className="ot-meta">{tank.name || ''}</div>
                  </div>
                  <div className="ot-cell" role="cell" data-label="Tank status">
                    <div
                      className="tankbar tankbar--multi"
                      title={`Current: ${tank.currentVolumeGallons.toLocaleString()} gal • Order: ${orderGallons.toLocaleString()} gal • Empty: ${Math.max(
                        0,
                        capacity - tank.currentVolumeGallons - orderGallons,
                      ).toLocaleString()} gal`}
                    >
                      <div className="tankbar__fill tankbar__fill--current" style={{ width: `${percent}%` }} />
                      <div className="tankbar__fill tankbar__fill--order" style={{ width: `${percentOrder}%` }} />
                      <div className="tankbar__fill tankbar__fill--empty" style={{ width: `${percentEmpty}%` }} />
                    </div>
                    <div className="tank-status-meta">
                      <div className="ot-sub">
                        {tank.currentVolumeGallons.toLocaleString()} / {tank.capacityGallons.toLocaleString()} gal
                      </div>
                      <div className="ot-sub">
                        {Math.round(line.remaining).toLocaleString()} gal available
                      </div>
                    </div>
                  </div>
                  <div className="ot-cell" role="cell" data-label="Order qty">
                    <div className="qty">
                      <label className="qty__label" htmlFor={`qty-${line.tankId}`}>
                        Order qty
                      </label>
                      <div className="qty__control">
                        <input
                          id={`qty-${line.tankId}`}
                          className={`qty__input${line.gallons === line.suggested ? '' : ' qty__input--custom'}`}
                          type="number"
                          min={0}
                          max={line.capacity}
                          value={line.gallons}
                          inputMode="numeric"
                          onChange={(e) => commitGallons(line.tankId, e.target.value)}
                        />
                          <button
                            className="qty__clear"
                            type="button"
                            aria-label="Clear quantity"
                            onClick={() => clearLine(line)}
                          >
                          ×
                        </button>
                      </div>
                      <div className="qty__meta">
                        <span className={pill.className}>{pill.label}</span>
                        <div className="qty__hint">
                          Max <strong>{Math.round(line.remaining).toLocaleString()}</strong> | Suggested <strong>{line.suggested.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ot-cell" role="cell" data-label="Actions">
                    <div className="actions">
                      <button className="btn btn--ghost" type="button" onClick={() => applySuggested(line)}>
                        Suggested
                      </button>
                      <button className="btn btn--ghost" type="button" onClick={() => applyRemaining(line)}>
                        Fill
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {lines.length === 0 ? <div className="muted" style={{ padding: '0.75rem' }}>No physical tanks for this site.</div> : null}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
          <div className="form-field" style={{ minWidth: 200, marginBottom: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ margin: 0 }}>Jobber</label>
              <select value={jobberId || defaultJobberId} onChange={(e) => setJobberId(e.target.value)}>
              {jobbers.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button" onClick={submitOrders} disabled={!readyToSubmit || createOrder.isPending}>
            {createOrder.isPending ? 'Submitting...' : 'Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

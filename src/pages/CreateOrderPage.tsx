import { useEffect, useMemo, useState } from 'react';
import { get } from '../api/apiClient';
import { useCreateOrder, useJobbers, useSiteTanks, useSites } from '../api/hooks';
import type { SiteSettings } from '../types';
import PageHeader from '../components/PageHeader';
import { pageHeaderConfig } from '../config/pageHeaders';

type OrderLine = {
  tankId: string;
  gallons: number;
  suggested: number;
  remaining: number;
  capacity: number;
};

export default function CreateOrderPage() {
  const { data: sites = [] } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const { data: tanks = [] } = useSiteTanks(selectedSiteId || '');
  const { data: jobbers = [] } = useJobbers();
  const createOrder = useCreateOrder();
  const [jobberId, setJobberId] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    if (sites.length && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  useEffect(() => {
    if (jobbers.length && !jobberId) {
      setJobberId(jobbers[0].id);
    }
  }, [jobbers, jobberId]);

  useEffect(() => {
    if (!selectedSiteId) {
      setSiteSettings(null);
      return;
    }
    get<SiteSettings>(`/sites/${selectedSiteId}/settings`).then(setSiteSettings);
  }, [selectedSiteId]);

  useEffect(() => {
    const physicalTanks = tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE');
    if (!physicalTanks.length) {
      setLines([]);
      return;
    }

    const defaults = {
      REGULAR: siteSettings?.defaultLoadRegGallons,
      PREMIUM: siteSettings?.defaultLoadPremGallons,
      DIESEL: siteSettings?.defaultLoadDslGallons,
      VIRTUAL_MIDGRADE: siteSettings?.defaultLoadMidGallons,
    } as Record<string, number | undefined>;

    const mapped = physicalTanks.map((t) => {
      const remaining = Math.max(t.capacityGallons - t.currentVolumeGallons, 0);
      const targetGap = typeof t.targetFillGallons === 'number' ? Math.max(t.targetFillGallons - t.currentVolumeGallons, 0) : undefined;
      const defaultLoad = defaults[t.productType] ?? undefined;
      const baseTarget = typeof targetGap === 'number' ? targetGap : defaultLoad ?? remaining;
      const suggestedRaw = Math.min(remaining, baseTarget, t.capacityGallons);
      const suggested = Math.max(0, Math.round(suggestedRaw));
      return {
        tankId: t.id,
        gallons: suggested,
        suggested,
        remaining,
        capacity: t.capacityGallons,
      };
    });
    setLines(mapped);
  }, [tanks, siteSettings]);

  const tankLookup = useMemo(() => {
    const map = new Map<string, (typeof tanks)[number]>();
    tanks.forEach((t) => map.set(t.id, t));
    return map;
  }, [tanks]);

  const readyToSubmit = !!selectedSiteId && !!jobberId && lines.some((l) => l.gallons > 0);

  const commitGallons = (tankId: string, value: string) => {
    const num = Math.max(0, Number(value) || 0);
    setLines((prev) => prev.map((l) => (l.tankId === tankId ? { ...l, gallons: Math.min(num, l.capacity) } : l)));
  };

  async function submitOrders() {
    if (!readyToSubmit) return;
    const payloads = lines.filter((l) => l.gallons > 0).map((l) => ({ tankId: l.tankId, quantityGallonsRequested: l.gallons }));
    await createOrder.mutateAsync({
      siteId: selectedSiteId,
      jobberId,
      lines: payloads,
    });
  }

  return (
    <div className="page">
      <PageHeader
        title={pageHeaderConfig.createOrder.title}
        subtitle={pageHeaderConfig.createOrder.subtitle}
        infoTooltip={pageHeaderConfig.createOrder.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: sites.map((s) => ({ id: s.id, label: s.name })),
        }}
      />

      <div className="card">
        <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Order details</div>
            <div className="muted">Select jobber and adjust gallons per tank.</div>
          </div>
          <div className="form-field" style={{ minWidth: 200 }}>
            <label>Jobber</label>
            <select value={jobberId} onChange={(e) => setJobberId(e.target.value)}>
              {jobbers.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="list-grid">
          {lines.map((line) => {
            const tank = tankLookup.get(line.tankId);
            if (!tank) return null;
            return (
              <div className="list-card" key={line.tankId} style={{ gap: '0.65rem' }}>
                <div className="list-meta">
                  <div>
                    <div style={{ fontWeight: 700 }}>{tank.name}</div>
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      {tank.productType} • {tank.currentVolumeGallons.toLocaleString()} / {tank.capacityGallons.toLocaleString()} gal
                    </div>
                  </div>
                  <span className="badge badge-blue">Remaining {Math.round(line.remaining).toLocaleString()} gal</span>
                </div>
                <div className="form-field" style={{ marginTop: '0.25rem' }}>
                  <label>Gallons</label>
                  <input
                    type="number"
                    min={0}
                    max={line.capacity}
                    value={line.gallons}
                    onChange={(e) => commitGallons(line.tankId, e.target.value)}
                  />
                  <div className="muted" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Suggested {line.suggested.toLocaleString()} gal</span>
                    <span
                      className="muted"
                      title="We suggest the smaller of the set target for this tank, the default load for its grade, and the space left in the tank."
                      style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4" strokeLinecap="round" />
                        <path d="M12 8h.01" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {lines.length === 0 ? <div className="muted">No physical tanks for this site.</div> : null}
        </div>
        <button className="button" style={{ marginTop: '0.75rem' }} onClick={submitOrders} disabled={!readyToSubmit || createOrder.isPending}>
          {createOrder.isPending ? 'Submitting...' : 'Submit order'}
        </button>
      </div>
    </div>
  );
}

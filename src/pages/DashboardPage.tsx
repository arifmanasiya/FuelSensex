import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSites } from '../api/hooks';
import type { Site } from '../models/types';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import { pageHeaderConfig } from '../config/pageHeaders';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: sites = [], isLoading } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const lossTrendGallons = useMemo(() => [60, 80, 50, 90, 110, 70, 100, 120], []);
  const [activeTrendIndex, setActiveTrendIndex] = useState(lossTrendGallons.length - 1);
  const activeGallons = lossTrendGallons[activeTrendIndex] ?? 0;
  const activeValue = activeGallons * 3.5;

  const filteredSites = useMemo(
    () => (selectedSiteId ? sites.filter((s) => s.id === selectedSiteId) : sites),
    [sites, selectedSiteId]
  );

  const totals = useMemo(() => {
    const totalSites = filteredSites.length;
    const totalVolume = filteredSites.reduce((sum, s) => {
      const physicalTanks = s.tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE');
      return sum + physicalTanks.reduce((tSum, t) => tSum + (t.currentVolumeGallons ?? 0), 0);
    }, 0);
    const openIssues = filteredSites.filter((s) => s.status !== 'HEALTHY').length;
    const atRisk = filteredSites
      .flatMap((s) =>
        s.tanks
          .filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE')
          .map((t) => ({ site: s, tank: t, percent: Math.round((t.currentVolumeGallons / t.capacityGallons) * 100) }))
          .filter((x) => x.percent <= 20)
      )
      .slice(0, 4);
    return { totalSites, totalVolume, openIssues, atRisk };
  }, [filteredSites]);

  const header = pageHeaderConfig.dashboard;

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
      <div className="hero hero-grid">
        <div>
          <div className="pill" style={{ background: 'rgba(255,255,255,0.08)', color: '#dbeafe' }}>
            FuelSense Watchtower
          </div>
          <h1>Make FuelSense of your fuel business: ordering, timing, and data in one place.</h1>
          <div style={{ opacity: 0.9, marginBottom: '1rem' }}>
            We're seeing {totals.openIssues} open issues across your {totals.totalSites} stores. Estimated daily exposure is 115 gallons.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="button" onClick={() => navigate('/alerts')}>
              Review alerts now
            </button>
            <button className="button ghost" onClick={() => navigate('/settings')}>
              Tune thresholds
            </button>
            <a
              className="button ghost"
              href="https://forms.gle/D3x9MPPv3HmNvnCh9"
              target="_blank"
              rel="noreferrer"
            >
              Early Access / Feedback
            </a>
          </div>
        </div>
        <div className="card gradient">
          <div className="card-header">
            <div style={{ fontWeight: 700 }}>Savings snapshot</div>
            <div className="muted" style={{ color: '#0b1a2d' }}>
              Opportunity if fixed today
            </div>
          </div>
          <div className="kpi" style={{ gap: '0.5rem' }}>
            <div className="label" style={{ color: '#0b1a2d' }}>Total volume (gal)</div>
            <div className="value" style={{ color: '#0b1a2d' }}>
              {totals.totalVolume.toLocaleString()}
            </div>
            <div className="label" style={{ color: '#0b1a2d' }}>Open issues</div>
            <div className="value" style={{ color: '#0b1a2d' }}>
              {totals.openIssues}
            </div>
            <div className="label" style={{ color: '#0b1a2d' }}>Loss trend (last 8 days)</div>
            <div
              className="muted"
              style={{
                color: '#0b1a2d',
                fontWeight: 700,
                display: 'flex',
                gap: '0.8rem',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span>
                Day {activeTrendIndex + 1} -{' '}
                {new Date(Date.now() - (lossTrendGallons.length - activeTrendIndex - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
              <span>-{activeGallons} gal</span>
              <span>
                -{activeValue.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </span>
            </div>
            <div className="sparkline" style={{ marginTop: '0.25rem', gap: '0.5rem' }}>
              {lossTrendGallons.map((gals, idx) => {
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <div
                      className="sparkline-bar"
                      style={{
                        height: `${gals * 0.8}px`,
                        background: idx === activeTrendIndex ? '#0b1a2d' : undefined,
                      }}
                      onMouseEnter={() => setActiveTrendIndex(idx)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Day ${idx + 1}: ${gals} gallons lost`}
                      onFocus={() => setActiveTrendIndex(idx)}
                    />
                  </div>
                );
              })}
            </div>
            <div className="muted" style={{ color: '#0b1a2d' }}>
              Trend: losses are spiking this week - act now to lock in savings.
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Stores being watched" value={`${totals.totalSites}`} />
        <KpiCard label="Total volume on hand" value={`${totals.totalVolume.toLocaleString()} gal`} />
        <KpiCard label="Open issues" value={`${totals.openIssues}`} />
      </div>

      <div className="site-grid">
        {isLoading ? <div className="muted">Loading sites...</div> : null}
        {sites.map((site: Site) => {
          const lowestPercent =
            site.tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE').length > 0
              ? Math.round(
                  Math.min(
                    ...site.tanks
                      .filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE')
                      .map((t) => (t.currentVolumeGallons / t.capacityGallons) * 100)
                  )
                )
              : 0;
          const tankCount = site.tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE').length;
          return (
            <div key={site.id} className="card site-card" onClick={() => navigate(`/sites/${site.id}`)}>
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700 }}>{site.name}</div>
                  <div className="muted">{site.address}</div>
                </div>
                <StatusBadge status={site.status} />
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                <span
                  className={
                    site.status === 'CRITICAL' ? 'badge badge-red' : site.status === 'ATTENTION' ? 'badge badge-yellow' : 'badge badge-green'
                  }
                  style={{ fontSize: '0.85rem' }}
                >
                  Tanks: {tankCount}
                </span>
                <span
                  className={
                    lowestPercent <= 10 ? 'badge badge-red' : lowestPercent <= 20 ? 'badge badge-yellow' : 'badge badge-green'
                  }
                  style={{ fontSize: '0.85rem' }}
                >
                  Lowest tank: {lowestPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Site['status'] }) {
  if (status === 'HEALTHY') return <span className="badge badge-green">Healthy</span>;
  if (status === 'ATTENTION') return <span className="badge badge-yellow">Attention</span>;
  return <span className="badge badge-red">Critical</span>;
}

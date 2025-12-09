import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api/apiClient';
import type { SiteSummary } from '../types';
import KpiCard from '../components/KpiCard';

export default function DashboardPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const lossTrendGallons = useMemo(() => [60, 80, 50, 90, 110, 70, 100, 120], []);
  const [activeTrendIndex, setActiveTrendIndex] = useState(lossTrendGallons.length - 1);
  const activeGallons = lossTrendGallons[activeTrendIndex] ?? 0;
  const activeValue = activeGallons * 3.5;

  useEffect(() => {
    get<SiteSummary[]>('/sites')
      .then(setSites)
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const totalAlerts = sites.reduce((sum, s) => sum + s.openAlertCount, 0);
    const totalVarianceGallons = sites.reduce((sum, s) => sum + s.currentDailyVarianceGallons, 0);
    const totalVarianceValue = sites.reduce((sum, s) => sum + s.currentDailyVarianceValue, 0);
    return { totalAlerts, totalVarianceGallons, totalVarianceValue };
  }, [sites]);

  return (
    <div className="page">
      <div className="hero hero-grid">
        <div>
          <div className="pill" style={{ background: 'rgba(255,255,255,0.08)', color: '#dbeafe' }}>
            FuelSense Watchtower
          </div>
          <h1>Stop hidden fuel loss before it drains profit</h1>
          <div style={{ opacity: 0.9, marginBottom: '1rem' }}>
            We are seeing {totals.totalAlerts} open notifications across your {sites.length} stores. Estimated daily loss is{' '}
            {Math.abs(totals.totalVarianceGallons).toLocaleString()} gal.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="button" onClick={() => navigate('/alerts')}>
              Review alerts now
            </button>
            <button className="button ghost" onClick={() => navigate('/settings')}>
              Tune thresholds
            </button>
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
            <div className="label" style={{ color: '#0b1a2d' }}>Recoverable today</div>
            <div className="value" style={{ color: '#0b1a2d' }}>
              {totals.totalVarianceValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
            <div className="label" style={{ color: '#0b1a2d' }}>Projected monthly savings</div>
            <div className="value" style={{ color: '#0b1a2d' }}>
              {(totals.totalVarianceValue * 30).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
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
                Day {activeTrendIndex + 1} ·{' '}
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
              Trend: losses are spiking this week — act now to lock in savings.
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Stores being watched" value={`${sites.length}`} />
        <KpiCard label="Open notifications" value={`${totals.totalAlerts}`} />
        <KpiCard
          label="Fuel loss today"
          value={`${totals.totalVarianceGallons.toLocaleString()} gal lost`}
          subtext={totals.totalVarianceValue.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
          })}
        />
      </div>

      <div className="site-grid">
        {loading ? <div className="muted">Loading sites...</div> : null}
        {sites.map((site) => (
          <div key={site.id} className="card site-card" onClick={() => navigate(`/sites/${site.id}`)}>
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>{site.name}</div>
                <div className="muted">{site.city}</div>
              </div>
              <StatusBadge status={site.status} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              <span
                className={site.currentDailyVarianceGallons < 0 ? 'badge badge-red' : 'badge badge-green'}
                style={{ fontSize: '0.85rem' }}
              >
                Loss today: {site.currentDailyVarianceGallons} gal ($
                {site.currentDailyVarianceValue})
              </span>
              <span
                className={site.openAlertCount > 0 ? 'badge badge-yellow' : 'badge badge-green'}
                style={{ fontSize: '0.85rem' }}
              >
                Open notifications: {site.openAlertCount}
              </span>
              <span
                className={
                  site.lowestTankPercent <= 10
                    ? 'badge badge-red'
                    : site.lowestTankPercent <= 20
                    ? 'badge badge-yellow'
                    : 'badge badge-green'
                }
                style={{ fontSize: '0.85rem' }}
              >
                Lowest tank: {site.lowestTankPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SiteSummary['status'] }) {
  if (status === 'HEALTHY') return <span className="badge badge-green">Healthy</span>;
  if (status === 'ATTENTION') return <span className="badge badge-yellow">Attention</span>;
  return <span className="badge badge-red">Critical</span>;
}

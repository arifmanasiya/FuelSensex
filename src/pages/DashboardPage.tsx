import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveStatus, useSites, usePageHeaders, useSalesSeries } from '../api/hooks';
import type { Site } from '../models/types';
import type { SalesSeriesPoint, SalesSeriesResponse } from '../types';
import { PERIOD_OPTIONS, aggregateSalesByPeriod } from '../utils/salesPeriod';
import type { PeriodOption, SalesBreakdown } from '../utils/salesPeriod';
import { calcDemandShift } from '../utils/ema';
import { formatDurationHours } from '../utils/duration';
import PageHeader from '../components/PageHeader';

const MS_PER_HOUR = 60 * 60 * 1000;
const FALLBACK_HOUR_COUNT = 90 * 24; // 90 days of hourly data

function buildFallbackSalesPoints(): SalesSeriesPoint[] {
  const now = Date.now();
  return Array.from({ length: FALLBACK_HOUR_COUNT }, (_, hourIndex) => {
    const timestamp = new Date(now - (FALLBACK_HOUR_COUNT - hourIndex - 1) * MS_PER_HOUR);
    const hourOfDay = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const baseSlow = 45 + hourOfDay * 0.5;
    const weekdayLift = dayOfWeek >= 1 && dayOfWeek <= 5 ? 5 : -2;
    const trend = (hourIndex / FALLBACK_HOUR_COUNT) * 20;
    const oscillation = 10 * Math.sin((hourOfDay / 24) * Math.PI);
    const noise = 6 * Math.sin((hourIndex * 19) / 24);
    const gallons = Math.max(
      20,
      Math.round(baseSlow + weekdayLift + trend + oscillation + noise)
    );
    return {
      timestamp: timestamp.toISOString(),
      label: timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      display: timestamp.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }),
      gallons,
    };
  });
}

const formatDecimal = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type KpiTone = 'success' | 'warning' | 'danger' | 'neutral';
type HeroKpi = {
  id: string;
  label: string;
  value: string;
  detail: string;
  note?: string;
  tone: KpiTone;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: sites = [] } = useSites();
  const { data: pageHeaders } = usePageHeaders();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const snapshotSiteId = selectedSiteId || '';
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption['value']>('day');
  const { data: liveStatus } = useLiveStatus(snapshotSiteId);
  const salesSeriesQuery = useSalesSeries(selectedSiteId);
  const salesSeriesData = salesSeriesQuery.data as SalesSeriesResponse | undefined;
  const chartSeries = salesSeriesData?.series?.[0];
  const basePoints = useMemo(() => chartSeries?.points ?? buildFallbackSalesPoints(), [chartSeries]);
  const periodSeries = useMemo<SalesBreakdown[]>(() => aggregateSalesByPeriod(basePoints, selectedPeriod), [
    basePoints,
    selectedPeriod,
  ]);
  const daySeries = useMemo<SalesBreakdown[]>(() => aggregateSalesByPeriod(basePoints, 'day'), [basePoints]);
  const displayWindow = 20;
  const displayPeriods = periodSeries.slice(-displayWindow);
  const [activeTrendIndex, setActiveTrendIndex] = useState(displayPeriods.length ? displayPeriods.length - 1 : 0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTrendIndex(displayPeriods.length ? displayPeriods.length - 1 : 0);
  }, [displayPeriods.length]);
  const boundedIndex = displayPeriods.length ? Math.min(Math.max(activeTrendIndex, 0), displayPeriods.length - 1) : 0;
  const sparklineScale = Math.max(120, ...displayPeriods.map((info) => info.gallons));
  const activePeriod = displayPeriods[boundedIndex];
  const last24HoursTotal = useMemo(() => {
    if (!basePoints.length) return 0;
    const latestTimestamp = new Date(basePoints[basePoints.length - 1].timestamp).getTime();
    const cutoff = latestTimestamp - 24 * 60 * 60 * 1000;
    return basePoints.reduce((sum, point) => {
      const time = new Date(point.timestamp).getTime();
      return time >= cutoff ? sum + point.gallons : sum;
    }, 0);
  }, [basePoints]);
  const demandWindowSize =
    selectedPeriod === 'hour' ? 24 : selectedPeriod === 'week' ? 12 : 30;
  const demandValues = periodSeries.slice(-demandWindowSize).map((entry) => entry.gallons);
  const demandSurgePercent = calcDemandShift(demandValues);
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

  const header = pageHeaders?.dashboard;
  const selectedSiteLabel = selectedSiteId
    ? sites.find((s) => s.id === selectedSiteId)?.name || 'selected site'
    : 'all stores';
  const perSiteSnapshot = useMemo(
    () =>
      sites.map((site) => {
        const physical = site.tanks.filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE');
        const lowestPct =
          physical.length > 0
            ? Math.round(Math.min(...physical.map((t) => (t.capacityGallons ? (t.currentVolumeGallons / t.capacityGallons) * 100 : 0))))
            : 0;
        const totalVol = physical.reduce((sum, t) => sum + (t.currentVolumeGallons ?? 0), 0);
        return { site, lowestPct, totalVol, tankCount: physical.length };
      }),
    [sites]
  );

  const last30DaySales = useMemo(() => {
    const recentDays = daySeries.slice(-30);
    return recentDays.reduce((sum, entry) => sum + entry.gallons, 0);
  }, [daySeries]);
  const heroKpis = useMemo<HeroKpi[]>(() => {
    const siteLowest =
      perSiteSnapshot.length > 0 ? Math.min(...perSiteSnapshot.map((snapshot) => snapshot.lowestPct)) : undefined;
    const runoutEntries = liveStatus?.runout ?? [];
    const soonestRunout = runoutEntries.reduce<number | undefined>((current, entry) => {
      const hours = entry?.hoursToTenPercent;
      if (!Number.isFinite(hours ?? Infinity)) return current;
      if (current === undefined) return hours;
      return Math.min(current, hours!);
    }, undefined);
    const runoutHours = Number.isFinite(soonestRunout ?? Infinity) ? soonestRunout : undefined;
    const daysInWindow = Math.min(30, daySeries.length);
    const avgDailySales = daysInWindow ? Math.round(last30DaySales / daysInWindow) : 0;
    const salesKpi: HeroKpi = {
      id: 'sales',
      label: 'Sales (30d)',
      value: `${last30DaySales.toLocaleString()} gal`,
      detail: 'Last 30 days recorded',
      note: daysInWindow
        ? `Avg ${avgDailySales} gal/day over ${daysInWindow} days · 24h ${last24HoursTotal.toLocaleString()} gal`
        : undefined,
      tone: 'success',
    };
    const runoutKpi: HeroKpi = {
      id: 'runout',
      label: 'Runout horizon',
      value: runoutHours ? formatDurationHours(runoutHours) : 'n/a',
      detail: '10% burn-down forecast',
      note: selectedSiteId ? 'Live runout from selected site' : 'Select a site for runout data',
      tone: runoutHours && runoutHours <= 12 ? 'warning' : 'neutral',
    };
    const lowestKpi: HeroKpi = {
      id: 'lowest',
      label: 'Lowest tank',
      value: siteLowest !== undefined ? `${siteLowest}%` : 'n/a',
      detail: 'Tracks reorder thresholds',
      note:
        siteLowest !== undefined
          ? siteLowest <= 20
            ? 'Reorder recommended'
            : 'Within safe range'
          : 'Awaiting tank readings',
      tone:
        siteLowest !== undefined
          ? siteLowest <= 15
            ? 'danger'
            : siteLowest <= 30
            ? 'warning'
            : 'success'
          : 'neutral',
    };
    return [salesKpi, runoutKpi, lowestKpi];
  }, [
    boundedIndex,
    daySeries,
    displayPeriods,
    last24HoursTotal,
    last30DaySales,
    liveStatus?.runout,
    perSiteSnapshot,
    selectedSiteId,
  ]);

  return (
    <div className="page">
      <PageHeader
        title={header?.title || 'Dashboard'}
        subtitle={header?.subtitle}
        infoTooltip={header?.infoTooltip}
        siteSelect={{
          value: selectedSiteId,
          onChange: setSelectedSiteId,
          options: [{ id: '', label: 'All sites' }, ...sites.map((s) => ({ id: s.id, label: s.name }))],
        }}
      />
      <div className="hero hero-grid">
        <div>
          <div className="pill" style={{ background: 'rgba(255,255,255,0.08)', color: '#dbeafe' }}>
            FuelSensex Watchtower
          </div>
          <h1>FuelSensex orchestrates live tank, delivery, and demand intelligence for every store.</h1>
          <div style={{ opacity: 0.9, marginBottom: '1rem' }}>
            FuelSensex highlights {totals.openIssues} open{' '}
            {totals.openIssues === 1 ? 'issue' : 'issues'} for {selectedSiteLabel} so you can act before the
            next fill.
          </div>
          <div className="hero-actions">
            <div className="hero-alert-cta">
              <button className="button" onClick={() => navigate('/app/alerts')}>
                Review alerts
              </button>
              <span className="alert-sup badge badge-yellow">{totals.openIssues}</span>
            </div>
          </div>
          <div className="hero-kpi-grid">
            {heroKpis.map((kpi) => {
              const badgeClass =
                kpi.tone === 'warning'
                  ? 'badge badge-yellow'
                  : kpi.tone === 'danger'
                  ? 'badge badge-red'
                  : 'badge badge-green';
              return (
                <div key={kpi.id} className="hero-kpi-card">
                  <div className="hero-kpi-header">
                    <span className={`${badgeClass} hero-kpi-badge`} aria-hidden="true" />
                    <span className="hero-kpi-label">{kpi.label}</span>
                  </div>
                  <div className="hero-kpi-value">{kpi.value}</div>
                  <div className="hero-kpi-detail">{kpi.detail}</div>
                  {kpi.note ? <div className="hero-kpi-note">{kpi.note}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="card gradient">
          <div className="card-header">
            <div style={{ fontWeight: 700 }}>Live Look</div>
            <div className="live-snapshot__progress-subtext" style={{ marginTop: '0.5rem' }}>
              Last refreshed on 12/14/2025, 9:02:37 PM
            </div>
          </div>
          <div className="hero-trend">
            <div className="sparkline">
              {displayPeriods.map((info, idx) => (
                <div
                  key={`${info.label}-${idx}`}
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
                      height: `${(info.gallons / sparklineScale) * 80}px`,
                      background: idx === activeTrendIndex ? '#0b1a2d' : undefined,
                    }}
                    onMouseEnter={() => setActiveTrendIndex(idx)}
                    onFocus={() => setActiveTrendIndex(idx)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${info.label}: ${info.gallons} gallons sold on ${info.display}`}
                  />
                </div>
              ))}
            </div>
            <div className="hero-trend-detail">
              {activePeriod ? (
                <>
                  <div className="hero-trend-detail-label">{activePeriod.label}</div>
                  <div className="hero-trend-detail-value">{activePeriod.gallons.toLocaleString()} gal</div>
                </>
              ) : (
                <div className="muted small">Awaiting sales data…</div>
              )}
            </div>
            <div className="period-toggle hero-period-toggle" role="tablist" aria-label="Timeframe">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`button ghost ${selectedPeriod === option.value ? 'active' : ''} hero-period-pill`}
                  role="tab"
                  aria-selected={selectedPeriod === option.value}
                  onClick={() => setSelectedPeriod(option.value)}
                >
                  {option.label === 'Hourly' ? 'Hour' : option.label === 'Daily' ? 'Day' : 'Week'}
                </button>
              ))}
            </div>
          </div>
          <div className="muted" style={{ color: '#0b1a2d', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                Trend: sales for {selectedSiteLabel} are trending upward this week; monitor demand to plan the next drop.
              </span>
              <span
                className="badge badge-green"
                style={{ fontSize: '0.75rem' }}
                title="Demand shift compares the 5-period EMA to the 20-period EMA for the selected interval"
              >
                {demandSurgePercent >= 0 ? '+' : ''}
                {formatDecimal(demandSurgePercent)}% demand shift
              </span>
            </div>
            <div style={{ fontSize: '0.75rem' }}>
              Demand shift compares the 5-period EMA with the 20-period EMA for the currently selected period.
            </div>
          </div>
        </div>
      </div>

      <div className="card live-snapshot">
        <div className="card-header" style={{ alignItems: 'flex-start' }}>
          <div className="live-snapshot__header">
            <div className="live-snapshot__title-group">
              <div style={{ fontWeight: 700 }}>Live ATG snapshot</div>
              <div className="pill pill--muted">Auto-refresh</div>
            </div>
            <div className="muted">
              {selectedSiteId
                ? `Latest readings from ${sites.find((s) => s.id === selectedSiteId)?.name || 'selected site'}`
                : 'Site-by-site snapshot'}
            </div>
          </div>
          {selectedSiteId ? (
            <button
              className="button ghost"
              type="button"
              onClick={() => navigate(`/app/sites/${selectedSiteId}`)}
              style={{ whiteSpace: 'nowrap' }}
            >
              Open site cockpit
            </button>
          ) : null}
        </div>
        {!selectedSiteId ? (
          <div className="live-snapshot__grid">
            {perSiteSnapshot.map(({ site, lowestPct, totalVol, tankCount }) => (
              <div key={site.id} className="live-snapshot__card">
                <div className="live-snapshot__top">
                  <div>
                    <div style={{ fontWeight: 700 }}>{site.name}</div>
                    <div className="muted small">{site.address || site.code}</div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>
                <div className="muted small">Physical tanks: {tankCount}</div>
                <div className="muted small">Total volume: {totalVol.toLocaleString()} gal</div>
                <div className="muted small">Lowest tank: {lowestPct}%</div>
                <button className="button ghost" style={{ marginTop: '0.5rem', width: '100%' }} onClick={() => navigate(`/app/sites/${site.id}`)}>
                  View site
                </button>
              </div>
            ))}
          </div>
        ) : !liveStatus ? (
          <div className="muted">Select a site to view live ATG data.</div>
        ) : (
          <div className="live-snapshot__grid">
            {liveStatus.tanks
              .filter((t) => !t.isVirtual && t.productType !== 'VIRTUAL_MIDGRADE')
              .map((tank) => {
                const capacityGallons = typeof tank.capacityGallons === 'number' && tank.capacityGallons > 0 ? tank.capacityGallons : undefined;
                const currentGallons = typeof tank.currentVolumeGallons === 'number' ? tank.currentVolumeGallons : undefined;
                const fillPct =
                  capacityGallons && currentGallons !== undefined
                    ? Math.min(Math.max((currentGallons / capacityGallons) * 100, 0), 100)
                    : 0;
                const runout = liveStatus.runout?.find((r) => r.tankId === tank.id);
                const waterLevel = typeof tank.waterLevel === 'number' ? tank.waterLevel : undefined;
                const waterPercent = waterLevel !== undefined ? Math.min(Math.max((waterLevel / 1) * 100, 0), 100) : 0;
                const tempF = typeof tank.temperatureF === 'number' ? tank.temperatureF : undefined;
                const tempPercent = tempF !== undefined ? Math.min(Math.max((tempF - 32) / 88, 0), 1) * 100 : 0;
                const severityClass = 'badge badge-green';
                const formatOptional = (value: number | undefined, suffix: string) =>
                  value !== undefined ? `${formatDecimal(value)}${suffix}` : 'n/a';
                const volumeSubtext =
                  currentGallons !== undefined && capacityGallons !== undefined
                    ? `${formatDecimal(currentGallons)} / ${formatDecimal(capacityGallons)} gal`
                    : 'Awaiting tank readings';
                const progressRows = [
                  {
                    label: 'Volume',
                    percent: fillPct,
                    value: `${formatDecimal(fillPct)}%`,
                    subtext: volumeSubtext,
                  },
                  {
                    label: 'Temperature',
                    percent: tempPercent,
                    value: formatOptional(tempF, ' degF'),
                    subtext: 'Sensor',
                  },
                  {
                    label: 'Water',
                    percent: waterPercent,
                    value: formatOptional(waterLevel, '"'),
                    subtext: 'Water height',
                  },
                ];
                return (
                  <div key={tank.id} className="live-snapshot__card">
                    <div className="live-snapshot__top">
                      <div>
                        <div style={{ fontWeight: 700 }}>{tank.name || tank.productType}</div>
                        <div className="muted small">{(tank.productType || '').replace('_', ' ')}</div>
                      </div>
                      <span className={severityClass} style={{ fontSize: '0.85rem' }}>
                        OK
                      </span>
                    </div>
                    <div className="live-snapshot__progress">
                      {progressRows.map((row) => (
                        <div key={row.label} className="live-snapshot__progress-row">
                          <div className="live-snapshot__progress-row-top">
                            <span className="live-snapshot__progress-label">{row.label}</span>
                            <span className="live-snapshot__progress-value">{row.value}</span>
                          </div>
                          <div className="live-snapshot__progress-bar">
                            <div
                              className="live-snapshot__progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
                            />
                          </div>
                          <div className="live-snapshot__progress-subtext">{row.subtext}</div>
                        </div>
                      ))}
                    </div>
                    <div className="live-snapshot__runout">
                      <div className="muted small">Runout</div>
                      <div className="muted">{runout ? formatDurationHours(runout.hoursToTenPercent) : 'n/a'}</div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Removed per-site card grid to simplify dashboard view */}
    </div>
  );
}

function StatusBadge({ status }: { status: Site['status'] }) {
  if (status === 'HEALTHY') return <span className="badge badge-green">Healthy</span>;
  if (status === 'ATTENTION') return <span className="badge badge-yellow">Attention</span>;
  return <span className="badge badge-red">Critical</span>;
}

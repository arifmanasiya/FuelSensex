import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AlertList from '../components/AlertList';
import PageHeader from '../components/PageHeader';
import { calcDemandShift } from '../utils/ema';
import { aggregateSalesByPeriod, PERIOD_OPTIONS } from '../utils/salesPeriod';
import type { PeriodValue } from '../utils/salesPeriod';
import { formatDurationHours } from '../utils/duration';
import {
  useAlerts,
  useDeliveries,
  useLiveStatus,
  usePageHeaders,
  useRunoutPredictions,
  useSalesSeries,
  useServiceTickets,
  useSites,
  useSiteDetails,
  useVariance,
} from '../api/hooks';
import type { DeliveryRecord, RunoutPrediction, SiteStatus, VarianceEvent } from '../types';
import type { Site } from '../models/types';

const CHART_WIDTH = 620;
const CHART_HEIGHT = 180;
const CHART_WINDOW = 48; // hours

type VarianceResponse = {
  today: { gallons: number; value: number };
  last7Days: { gallons: number; value: number };
  events: VarianceEvent[];
};

type SalesSeriesResponse = {
  updatedAt?: string;
  windowDays: number;
  series: {
    gradeCode: string;
    points: {
      timestamp: string;
      gallons: number;
      middle?: number;
      upper?: number;
      lower?: number;
    }[];
  }[];
};

const deliveryTagClass: Record<DeliveryRecord['status'], string> = {
  OK: 'tag tag--blue',
  SHORT: 'tag tag--yellow',
  OVER: 'tag tag--yellow',
  MISSING: 'tag tag--yellow',
};
const deliveryLabelMap: Record<DeliveryRecord['status'], string> = {
  OK: 'OK',
  SHORT: 'Short',
  OVER: 'Over',
  MISSING: 'No order',
};

const demandBadgeClass = (score: number) =>
  score > 10 ? 'badge badge-red' : score < -10 ? 'badge badge-green' : 'badge badge-yellow';

const pricePressureLabel = (point?: { gallons: number; middle?: number }) => {
  if (!point || typeof point.middle !== 'number') return 'Trend pending';
  if (point.gallons > point.middle * 1.15) return 'Demand surge';
  if (point.gallons < point.middle * 0.85) return 'Softening demand';
  return 'Balanced throughput';
};

function StatusPill({ status }: { status?: SiteStatus }) {
  if (status === 'HEALTHY') {
    return <span className="badge badge-green">Healthy</span>;
  }
  if (status === 'ATTENTION') {
    return <span className="badge badge-yellow">Attention</span>;
  }
  if (status === 'CRITICAL') {
    return <span className="badge badge-red">Critical</span>;
  }
  return <span className="badge badge-yellow">Unknown</span>;
}

export default function SiteDetailPage() {
  const navigate = useNavigate();
  const { siteId: routeSiteId } = useParams<{ siteId: string }>();
  const { data: sites = [] } = useSites();
  const { data: pageHeaders } = usePageHeaders();
  const fallbackSiteId = routeSiteId || sites[0]?.id || '';
  const targetSiteId = fallbackSiteId;

  const siteDetailsQuery = useSiteDetails(targetSiteId);
  const siteDetails = siteDetailsQuery.data as Site | undefined;
  const liveStatusQuery = useLiveStatus(targetSiteId);
  const liveStatus = liveStatusQuery.data;
  const varianceQuery = useVariance(targetSiteId);
  const varianceData = varianceQuery.data as VarianceResponse | undefined;
  const salesSeriesQuery = useSalesSeries(targetSiteId);
  const salesSeriesData = salesSeriesQuery.data as SalesSeriesResponse | undefined;
  const alertsQuery = useAlerts(targetSiteId || undefined);
  const alerts = alertsQuery.data ?? [];
  const deliveriesQuery = useDeliveries(targetSiteId || undefined);
  const serviceTicketsQuery = useServiceTickets(targetSiteId);
  const serviceTickets = serviceTicketsQuery.data ?? [];
  const runoutsQuery = useRunoutPredictions(targetSiteId);
  const runouts = useMemo(
    () => (runoutsQuery.data ?? []) as RunoutPrediction[],
    [runoutsQuery.data],
  );

  const siteOptions = useMemo(
    () => sites.map((site) => ({ id: site.id, label: site.name })),
    [sites]
  );

  const openAlerts = useMemo(() => (alertsQuery.data ?? []).filter((alert) => alert.isOpen), [alertsQuery.data]);
  const physicalTanks = useMemo(
    () => (liveStatus?.tanks ?? []).filter((tank) => !tank.isVirtual),
    [liveStatus?.tanks]
  );

  const inventoryRows = useMemo(() => {
    if (!physicalTanks.length) return [];
    return physicalTanks.map((tank) => {
      const fillPercent = tank.capacityGallons
        ? Math.round((tank.currentVolumeGallons / tank.capacityGallons) * 100)
        : 0;
      const runout = runouts.find((r) => r.tankId === tank.id);
      return {
        id: tank.id,
        name: tank.name,
        fillPercent: Math.min(Math.max(fillPercent, 0), 100),
        currentGallons: tank.currentVolumeGallons,
        capacityGallons: tank.capacityGallons,
        runout,
        gradeCode: tank.productType,
      };
    });
  }, [physicalTanks, runouts]);

  const lowestTankPercent = useMemo(() => {
    if (!inventoryRows.length) return 0;
    return Math.min(...inventoryRows.map((row) => row.fillPercent));
  }, [inventoryRows]);

  const soonestRunout = useMemo(() => {
    const hours = runouts.map((r) => r.hoursToTenPercent ?? Infinity);
    return hours.length ? Math.min(...hours) : Infinity;
  }, [runouts]);

  const anomalies = useMemo(() => {
    const events = varianceData?.events ?? [];
    return [...events]
      .sort((a, b) => Math.abs(b.varianceGallons) - Math.abs(a.varianceGallons))
      .slice(0, 3);
  }, [varianceData]);

  const recentDeliveries = useMemo(() => (deliveriesQuery.data ?? []).slice(0, 3), [deliveriesQuery.data]);

  const deliverySummary = useMemo(() => {
    const nextDelivery = deliveriesQuery.data ? deliveriesQuery.data[0] : undefined;
    if (!nextDelivery) return 'No deliveries tracked yet.';
    const timeLabel = new Date(nextDelivery.timestamp).toLocaleTimeString();
    return `${nextDelivery.gradeCode} run completed at ${timeLabel} by ${nextDelivery.supplier}`;
  }, [deliveriesQuery.data]);

  const chartSeries = salesSeriesData?.series?.[0];
  const chartPoints = useMemo(() => {
    if (!chartSeries) return [];
    return chartSeries.points.slice(-CHART_WINDOW);
  }, [chartSeries]);

  const salesWindow = useMemo(() => {
    if (!chartPoints.length) return { total: 0, hours: 0 };
    const windowSize = 24;
    const slice = chartPoints.slice(-windowSize);
    const total = slice.reduce((sum, point) => sum + point.gallons, 0);
    return { total: Math.round(total), hours: slice.length };
  }, [chartPoints]);

  const chartBounds = useMemo(() => {
    if (!chartPoints.length) return { max: 1 };
    const max = Math.max(...chartPoints.map((point) => point.gallons));
    return { max: max || 1 };
  }, [chartPoints]);

  const chartPath = useMemo(() => {
    if (chartPoints.length < 2) return '';
    return chartPoints
      .map((point, index) => {
        const x = (index / (chartPoints.length - 1)) * CHART_WIDTH;
        const y = CHART_HEIGHT - (point.gallons / chartBounds.max) * CHART_HEIGHT;
        return `${x},${y}`;
      })
      .join(' ');
  }, [chartPoints, chartBounds.max]);

  const averageHourlySales = salesWindow.hours ? Math.round(salesWindow.total / salesWindow.hours) : 0;

  const heroKpis = useMemo(() => {
    return [
      {
        label: 'Sales (last 24h)',
        value: `${salesWindow.total.toLocaleString()} gal`,
        tone: 'badge badge-green',
        note: `Avg ${averageHourlySales} gal/hr`,
      },
      {
        label: 'Alerts',
        value: `${openAlerts.length}`,
        note: `${alerts.length - openAlerts.length} closed`,
      },
      {
        label: 'Lowest tank',
        value: `${lowestTankPercent}%`,
        note: 'Triggers reorder at critical thresholds',
      },
      {
        label: 'Runout horizon',
        value: formatDurationHours(soonestRunout),
        note: '10% burn-down forecast',
      },
    ];
  }, [averageHourlySales, alerts.length, lowestTankPercent, openAlerts.length, salesWindow.total, soonestRunout]);

  const latestPoint = chartPoints[chartPoints.length - 1];
  const [selectedTimeframe, setSelectedTimeframe] = useState<PeriodValue>('day');
  const timeframeLabel = PERIOD_OPTIONS.find((option) => option.value === selectedTimeframe)?.label || 'Daily';
  const aggregatedSeries = useMemo(
    () => aggregateSalesByPeriod(chartSeries?.points ?? [], selectedTimeframe),
    [chartSeries, selectedTimeframe]
  );
  const demandSurgePercent = useMemo(
    () => calcDemandShift(aggregatedSeries.map((entry) => entry.gallons)),
    [aggregatedSeries]
  );

  const handleSiteChange = (nextId: string) => {
    if (!nextId || nextId === targetSiteId) return;
    navigate(`/app/sites/${nextId}`);
  };

  if (!targetSiteId) {
    return (
      <div className="page">
        <div className="muted">Choose a site to unlock the cockpit view.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={pageHeaders?.dashboard?.title ?? 'Site cockpit'}
        subtitle={siteDetails?.address}
        infoTooltip="Live ATG, alerts, and service context in a single pane."
        siteSelect={{
          value: targetSiteId,
          onChange: handleSiteChange,
          options: siteOptions,
          placeholder: 'Select site',
        }}
      />

      <div className="hero hero-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{siteDetails?.name || 'Site overview'}</h1>
            <StatusPill status={siteDetails?.status} />
          </div>
          <div className="muted" style={{ marginBottom: '0.5rem' }}>
            {siteDetails?.address}
          </div>
          <div className="muted" style={{ marginBottom: '0.5rem' }}>
            {deliverySummary}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="button"
              type="button"
              style={{ flex: '1 1 160px', minWidth: 160 }}
              onClick={() => navigate(`/app/orders/new?siteId=${targetSiteId}`)}
            >
              Order fuel
            </button>
            <button
              type="button"
              className="button"
              style={{ flex: '1 1 160px', minWidth: 160 }}
              onClick={() => navigate(`/app/alerts?siteId=${targetSiteId}`)}
            >
              Review alerts
            </button>
          </div>
        </div>
        <div className="kpi-grid">
          {heroKpis.map((kpi) => (
            <div key={kpi.label} className="card kpi" style={{ padding: '0.75rem' }}>
              <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {kpi.label}
                {kpi.tone ? <span className={kpi.tone} style={{ width: 6, height: 6, borderRadius: '50%' }} /> : null}
              </div>
              <div className="value" style={{ fontSize: '1.3rem' }}>
                {kpi.value}
              </div>
              {kpi.note ? <div className="muted">{kpi.note}</div> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid responsive-grid" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>Inventory pulse</div>
                <div className="muted">Fill percent and burn rates.</div>
              </div>
              <span
                className={`badge ${
                  lowestTankPercent <= 10
                    ? 'badge-red'
                    : lowestTankPercent <= 25
                    ? 'badge-yellow'
                    : 'badge-green'
                }`}
              >
                {lowestTankPercent}% lowest
              </span>
            </div>
            <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {inventoryRows.length ? (
                inventoryRows.map((row) => (
                  <div key={row.id} style={{ display: 'grid', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                        <div className="muted" style={{ fontSize: '0.9rem' }}>
                          {row.gradeCode}
                        </div>
                      </div>
                      <div className="muted" style={{ fontSize: '0.85rem' }}>
                        {row.currentGallons?.toLocaleString() ?? '—'} / {row.capacityGallons?.toLocaleString() ?? '—'} gal
                      </div>
                    </div>
                    <div className="tank-bar">
                      <div className="tank-bar-fill" style={{ width: `${row.fillPercent}%` }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                      <span className="muted">{row.fillPercent}% full</span>
                      {row.runout ? (
                        <span className="muted">
                          10% in {formatDurationHours(row.runout.hoursToTenPercent)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">Live tank readings are still syncing.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700 }}>Sales signal</div>
                <div className="muted">
                  {chartSeries?.gradeCode ?? 'Fuel'} burn rate ({salesSeriesData?.windowDays ?? 0}d window)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={demandBadgeClass(demandSurgePercent)} style={{ fontSize: '0.85rem' }}>
                  {demandSurgePercent >= 0 ? '+' : ''}{demandSurgePercent}% demand shift
                </span>
                <span className="muted">
                  {salesSeriesData?.updatedAt ? `Updated ${new Date(salesSeriesData.updatedAt).toLocaleTimeString()}` : 'Awaiting data'}
                </span>
              </div>
            </div>
            <div className="period-toggle" style={{ marginBottom: '0.75rem' }}>
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`button ghost ${selectedTimeframe === option.value ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(option.value)}
                  style={{ flex: '1 1 auto', minWidth: 90, padding: '0.25rem 0.9rem' }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              Showing {timeframeLabel} demand signal and averages.
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {chartPath ? (
                <svg
                  width="100%"
                  height={CHART_HEIGHT}
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  role="img"
                  aria-label="Sales trend line"
                >
                  <polyline
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                points={chartPath}
              />
            </svg>
          ) : (
            <div className="muted">Gathering sales data...</div>
          )}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div className="card kpi" style={{ padding: '0.65rem' }}>
              <div className="label">Demand shift</div>
              <div className="value">{demandSurgePercent >= 0 ? '+' : ''}{demandSurgePercent}%</div>
              <div className="muted">Vs. the rolling average</div>
            </div>
            <div className="card kpi" style={{ padding: '0.65rem' }}>
              <div className="label">Price pressure</div>
              <div className="value">{pricePressureLabel(latestPoint)}</div>
              <div className="muted">Bollinger bands signal</div>
            </div>
            <div className="card kpi" style={{ padding: '0.65rem' }}>
              <div className="label">Last reading</div>
              <div className="value">
                    {latestPoint ? new Date(latestPoint.timestamp).toLocaleString() : 'Awaiting data'}
                  </div>
                  <div className="muted">{chartSeries?.gradeCode ?? 'Grade'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AlertList
            alerts={openAlerts.slice(0, 4)}
            title={`Active alerts (${openAlerts.length})`}
            onAction={(alert, action) => {
              if (action === 'reorder') {
                navigate(`/app/orders/new?siteId=${targetSiteId}`);
              } else if (action === 'service') {
                navigate('/app/issues');
              } else if (action === 'view') {
                window.alert(alert.message);
              }
            }}
            onClose={(alert) => {
              window.alert(`Mock close requested for ${alert.type}`);
            }}
          />

          <div className="card">
            <div className="card-header">
              <div style={{ fontWeight: 700 }}>Anomaly spotlight</div>
              <div className="muted">Variance events flagged for review</div>
            </div>
            <div className="grid" style={{ gap: '0.75rem' }}>
              {anomalies.length ? (
                anomalies.map((event) => (
                  <div key={event.id} className="list-card">
                    <div className="list-meta" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{event.gradeCode}</div>
                        <div className="muted" style={{ fontSize: '0.9rem' }}>
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`badge ${event.varianceGallons < 0 ? 'badge-red' : 'badge-green'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {event.varianceGallons.toFixed(1)} gal
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: '0.9rem' }}>
                      {event.note || 'ATG drop deviated from expected volumes.'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">No anomalies detected in the selected window.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid responsive-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '1.2rem' }}>
                Deliveries
                <span
                  className="muted"
                  title="Filter by site to review delivered loads and any short/over/missing statuses."
                  style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4" strokeLinecap="round"></path>
                    <path d="M12 8h.01" strokeLinecap="round"></path>
                  </svg>
                </span>
              </div>
              <div className="muted">Track recent deliveries and variance status.</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                className="form-field"
                style={{
                  minWidth: 220,
                  marginBottom: 0,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <label style={{ margin: 0 }}>Site</label>
                <select value={targetSiteId} onChange={(e) => handleSiteChange(e.target.value)}>
                  {siteOptions.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="button ghost" type="button" onClick={() => navigate('/app/deliveries')}>
                View all
              </button>
            </div>
          </div>
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentDeliveries.length ? (
              recentDeliveries.map((delivery) => (
                <div key={delivery.id} className="list-card">
                  <div className="list-meta" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{delivery.gradeCode}</div>
                      <div className="muted" style={{ fontSize: '0.9rem' }}>
                        {new Date(delivery.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className={deliveryTagClass[delivery.status]}>{deliveryLabelMap[delivery.status]}</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>
                    {delivery.supplier} · {delivery.atgReceivedGallons.toLocaleString()} gal recorded
                  </div>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {delivery.issueNote}
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">No deliveries yet for this site.</div>
            )}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button" type="button" onClick={() => navigate(`/app/orders/new?siteId=${targetSiteId}`)}>
              Reorder suggested fuel
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div style={{ fontWeight: 700 }}>Service & compliance</div>
              <div className="muted">Open service tickets and dispatch status</div>
            </div>
            <button className="button ghost" type="button" onClick={() => navigate('/app/issues')}>
              Log ticket
            </button>
          </div>
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {serviceTickets.length ? (
              serviceTickets.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="list-card">
                  <div className="list-meta" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ticket.description || ticket.type}</div>
                      <div className="muted" style={{ fontSize: '0.9rem' }}>
                        {(ticket.jobberId || ticket.serviceCompanyId || 'Provider')} · {new Date(ticket.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`badge ${ticket.status === 'OPEN' ? 'badge-yellow' : 'badge-green'}`}>
                      {ticket.status}
                    </span>
                  </div>
                  {ticket.comments && ticket.comments.length ? (
                    <div className="muted" style={{ fontSize: '0.85rem' }}>
                      {ticket.comments[0].text}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="muted">No service tickets logged.</div>
            )}
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="button" type="button" onClick={() => navigate('/app/issues')}>
              Review issues
            </button>
            <button className="button ghost" type="button" onClick={() => navigate('/app/settings')}>
              Adjust service partners
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

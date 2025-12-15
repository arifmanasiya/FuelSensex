import type { RunoutPrediction } from '../types';
import type { Tank as CanonTank } from '../models/types';
import { formatDurationHours } from '../utils/duration';

export type UITank = {
  id: string;
  siteId: string;
  name: string;
  productType: CanonTank['productType'];
  gradeCode: 'REG' | 'SUP' | 'MID' | 'DSL';
  capacityGallons: number;
  currentGallons: number;
  waterLevelInches?: number;
  temperatureC?: number;
  status?: 'OK' | 'LOW' | 'CRITICAL' | 'WATER';
  alertThresholds?: { lowPercent?: number; criticalPercent?: number };
};

interface Props {
  tank: UITank;
  runout?: RunoutPrediction;
  lossTodayGallons?: number;
  lossWeekGallons?: number;
  lossMonthGallons?: number;
}

function statusBadge(status?: UITank['status']) {
  if (status === 'LOW') return <span className="badge badge-yellow">Low</span>;
  if (status === 'CRITICAL') return <span className="badge badge-red">Critical</span>;
  if (status === 'WATER') return <span className="badge badge-red">Water</span>;
  return <span className="badge badge-green">OK</span>;
}

export default function TankCard({
  tank,
  runout,
  lossTodayGallons,
  lossWeekGallons,
  lossMonthGallons,
}: Props) {
  const percent = Math.round((tank.currentGallons / tank.capacityGallons) * 100);
  const tempC = typeof tank.temperatureC === 'number' ? tank.temperatureC : undefined;
  const water = typeof tank.waterLevelInches === 'number' ? tank.waterLevelInches : 0;
  const waterPercent = Math.min(Math.max(water / 1, 0), 1) * 100; // normalize to 0-1" for a simple gauge
  const tempPercent =
    tempC !== undefined ? Math.min(Math.max((tempC - 0) / 50, 0), 1) * 100 : 0; // normalize 0-50°C for gauge
  const lowTh = tank.alertThresholds?.lowPercent;
  const critTh = tank.alertThresholds?.criticalPercent;
  const thresholdBadge =
    critTh !== undefined && percent >= critTh
      ? { className: 'badge badge-red', label: `Above ${critTh}% threshold` }
      : lowTh !== undefined && percent >= lowTh
      ? { className: 'badge badge-yellow', label: `Above ${lowTh}% threshold` }
      : percent >= 95
      ? { className: 'badge badge-red', label: 'Above 95% threshold' }
      : percent >= 80
      ? { className: 'badge badge-yellow', label: 'Above 80% threshold' }
      : null;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ fontWeight: 700 }}>{tank.name}</div>
          <div className="muted">{tank.gradeCode}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {statusBadge(tank.status)}
          {thresholdBadge ? <span className={thresholdBadge.className}>{thresholdBadge.label}</span> : null}
          {tank.gradeCode === 'MID' ? (
            <span className="badge badge-yellow" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Blend/virtual
              <span
              title="No physical tank; derived from Regular/Super mix to gauge demand."
                aria-label="Midgrade is a derived blend"
                style={{ fontWeight: 700, cursor: 'help' }}
              >
                ⓘ
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="value">{percent}%</div>
          <div className="muted">{tank.currentGallons.toLocaleString()} gal</div>
        </div>
        <div className="muted">
          Water: {water}" | {tempC !== undefined ? `${tempC}°C` : 'n/a'}
        </div>
      </div>
      <div className="tank-bar">
        <div className="tank-bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div style={{ marginTop: '0.4rem' }}>
        <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span>Water & temp</span>
          <span>
            {water}" {tempC !== undefined ? `| ${tempC}°C` : ''}
          </span>
        </div>
        <div style={{ marginTop: '0.25rem', display: 'grid', gap: '4px' }}>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: 'linear-gradient(90deg, #22d3ee 0%, #0ea5e9 50%, #1d4ed8 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label={`Water level ${water.toFixed(2)} inches`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Math.min(Math.max(water, 0), 1)}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${Math.min(Math.max(waterPercent, 0), 100)}%`,
                background: 'rgba(255,255,255,0.6)',
                boxShadow: '0 0 4px rgba(0,0,0,0.15) inset',
                transition: 'width 160ms ease',
              }}
            />
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
            aria-label={`Temperature ${tempC !== undefined ? tempC : 'n/a'} Celsius`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={50}
            aria-valuenow={tempC ?? 0}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${Math.min(Math.max(tempPercent, 0), 100)}%`,
                background: 'rgba(255,255,255,0.6)',
                boxShadow: '0 0 4px rgba(0,0,0,0.15) inset',
                transition: 'width 160ms ease',
              }}
            />
          </div>
        </div>
      </div>
      {runout ? (
        <div className="muted" style={{ marginTop: '0.35rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-yellow" style={{ fontSize: '0.75rem' }}>
            10% in {formatDurationHours(runout.hoursToTenPercent)}
          </span>
          <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>
            Empty in {formatDurationHours(runout.hoursToEmpty)}
          </span>
        </div>
      ) : null}
      {typeof lossTodayGallons === 'number' ||
      typeof lossWeekGallons === 'number' ||
      typeof lossMonthGallons === 'number' ? (
        <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {typeof lossTodayGallons === 'number' ? (
            <span
              className={`badge ${
                lossTodayGallons < 0 ? 'badge-red' : lossTodayGallons > 0 ? 'badge-green' : 'badge-yellow'
              }`}
              style={{ fontSize: '0.8rem' }}
            >
              Today: {lossTodayGallons.toLocaleString()} gal
            </span>
          ) : null}
          {typeof lossWeekGallons === 'number' ? (
            <span
              className={`badge ${
                lossWeekGallons < 0 ? 'badge-red' : lossWeekGallons > 0 ? 'badge-green' : 'badge-yellow'
              }`}
              style={{ fontSize: '0.8rem' }}
            >
              7d: {lossWeekGallons.toLocaleString()} gal
            </span>
          ) : null}
          {typeof lossMonthGallons === 'number' ? (
            <span
              className={`badge ${
                lossMonthGallons < 0 ? 'badge-red' : lossMonthGallons > 0 ? 'badge-green' : 'badge-yellow'
              }`}
              style={{ fontSize: '0.8rem' }}
            >
              30d: {lossMonthGallons.toLocaleString()} gal
            </span>
          ) : null}
        </div>
      ) : null}
      {/* Action buttons removed; use row dropdown instead */}
    </div>
  );
}

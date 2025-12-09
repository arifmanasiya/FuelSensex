import type { RunoutPrediction, Tank } from '../types';

interface Props {
  tank: Tank;
  onOrder?: (tank: Tank) => void;
  onService?: (tank: Tank) => void;
  runout?: RunoutPrediction;
  lossTodayGallons?: number;
  lossWeekGallons?: number;
  lossMonthGallons?: number;
}

function statusBadge(status: Tank['status']) {
  if (status === 'OK') return <span className="badge badge-green">OK</span>;
  if (status === 'LOW') return <span className="badge badge-yellow">Low</span>;
  if (status === 'CRITICAL') return <span className="badge badge-red">Critical</span>;
  return <span className="badge badge-red">Water</span>;
}

export default function TankCard({ tank, onOrder, onService, runout, lossTodayGallons, lossWeekGallons, lossMonthGallons }: Props) {
  const percent = Math.round((tank.currentGallons / tank.capacityGallons) * 100);
  const urgentOrder = percent <= 25 || tank.status === 'LOW' || tank.status === 'CRITICAL';
  const showService = tank.status === 'WATER';

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ fontWeight: 700 }}>{tank.name}</div>
          <div className="muted">{tank.gradeCode}</div>
        </div>
        {statusBadge(tank.status)}
      </div>
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="value">{percent}%</div>
          <div className="muted">{tank.currentGallons.toLocaleString()} gal</div>
        </div>
        <div className="muted">
          Water: {tank.waterLevelInches}" | {tank.temperatureC}°C
        </div>
      </div>
      <div className="tank-bar">
        <div className="tank-bar-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {runout ? (
        <div className="muted" style={{ marginTop: '0.35rem', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-yellow" style={{ fontSize: '0.75rem' }}>
            10% in {runout.hoursToTenPercent}h
          </span>
          <span className="badge badge-red" style={{ fontSize: '0.75rem' }}>
            Empty in {runout.hoursToEmpty}h
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
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          className={urgentOrder ? 'button' : 'button ghost'}
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
          onClick={() => (onOrder ? onOrder(tank) : alert(`Ordering fuel for ${tank.name} (mock)`))}
        >
          Order fuel now
        </button>
        {showService ? (
          <button
            className="button ghost"
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
            onClick={() => (onService ? onService(tank) : alert(`Requesting service for ${tank.name} (mock)`))}
          >
            Request service
          </button>
        ) : null}
      </div>
    </div>
  );
}

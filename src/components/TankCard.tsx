import Dropdown from './Dropdown';
import type { RunoutPrediction, Tank } from '../types';

interface Props {
  tank: Tank;
  onOrder?: (tank: Tank) => void;
  onService?: (tank: Tank) => void;
  onSync?: (tank: Tank) => void;
  syncing?: boolean;
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

export default function TankCard({
  tank,
  onOrder,
  onService,
  onSync,
  runout,
  lossTodayGallons,
  lossWeekGallons,
  lossMonthGallons,
}: Props) {
  const percent = Math.round((tank.currentGallons / tank.capacityGallons) * 100);
  const showService = tank.status === 'WATER';

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div style={{ fontWeight: 700 }}>{tank.name}</div>
          <div className="muted">{tank.gradeCode}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {statusBadge(tank.status)}
          {tank.gradeCode === 'MID' ? (
            <span className="badge badge-yellow" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              Blend/virtual
              <span
                title="No physical tank; derived from Regular/Premium mix to gauge demand."
                aria-label="Midgrade is a derived blend"
                style={{ fontWeight: 700, cursor: 'help' }}
              >
                ⓘ
              </span>
            </span>
          ) : null}
          <Dropdown
            variant="row"
            align="right"
            trigger={<span>•••</span>}
            items={[
              { id: 'order', label: 'Order fuel', onSelect: () => (onOrder ? onOrder(tank) : alert(`Ordering fuel for ${tank.name} (mock)`)) },
              ...(tank.gradeCode !== 'MID'
                ? [{ id: 'sync', label: 'Sync with back office', onSelect: () => (onSync ? onSync(tank) : alert(`Syncing ${tank.name} with back office (mock) to align inventory/tickets.`)) }]
                : []),
              ...(showService ? [{ id: 'service', label: 'Request service', onSelect: () => (onService ? onService(tank) : alert(`Requesting service for ${tank.name} (mock)`)) }] : []),
            ]}
          />
        </div>
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
      {/* Action buttons removed; use row dropdown instead */}
    </div>
  );
}

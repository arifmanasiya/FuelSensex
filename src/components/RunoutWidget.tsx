import type { RunoutPrediction, Tank } from '../types';
import { formatDurationHours } from '../utils/duration';

interface Props {
  predictions: RunoutPrediction[];
  tanks: Tank[];
}

export default function RunoutWidget({ predictions, tanks }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ fontWeight: 700 }}>Tank run-out forecast</div>
        <div className="muted">When each product hits 10% and empty</div>
      </div>
      <div className="runout-grid">
        {predictions.map((p) => {
          const tank = tanks.find((t) => t.id === p.tankId);
          return (
            <div key={p.tankId} className="runout-tile">
              <div className="runout-title">{tank?.name || p.gradeCode}</div>
              <div className="muted">10% in {formatDurationHours(p.hoursToTenPercent)}</div>
              <div className="badge badge-yellow">Empty in {formatDurationHours(p.hoursToEmpty)}</div>
            </div>
          );
        })}
        {predictions.length === 0 ? <div className="muted">No forecast available.</div> : null}
      </div>
    </div>
  );
}

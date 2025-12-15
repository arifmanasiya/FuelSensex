import type { SalesSeriesPoint } from '../types';

export const PERIOD_OPTIONS = [
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
] as const;
export type PeriodOption = (typeof PERIOD_OPTIONS)[number];
export type PeriodValue = PeriodOption['value'];

export type SalesBreakdown = { key: string; label: string; display: string; gallons: number; start: Date };

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const shift = (day + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - shift);
  return copy;
}

function getPeriodStart(date: Date, period: PeriodValue) {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  if (period === 'hour') {
    return copy;
  }
  copy.setHours(0, 0, 0, 0);
  if (period === 'week') {
    return getWeekStart(copy);
  }
  return copy;
}

function getPeriodKey(date: Date, period: PeriodValue) {
  const start = getPeriodStart(date, period);
  if (period === 'hour') {
    return start.toISOString();
  }
  if (period === 'week') {
    return `${start.getFullYear()}-W${Math.ceil((start.getDate() + 6) / 7)}`;
  }
  return start.toISOString().split('T')[0];
}

function getPeriodLabel(displayDate: Date, period: PeriodValue) {
  if (period === 'hour') {
    return `Hour of ${displayDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}`;
  }
  if (period === 'week') {
    return `Week of ${displayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return displayDate.toLocaleDateString();
}

export function aggregateSalesByPeriod(points: SalesSeriesPoint[], period: PeriodValue): SalesBreakdown[] {
  const map = new Map<string, SalesBreakdown>();
  points.forEach((point) => {
    const date = new Date(point.timestamp);
    const key = getPeriodKey(date, period);
    const start = getPeriodStart(date, period);
    const label = getPeriodLabel(start, period);
    const display = period === 'hour'
      ? start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : start.toLocaleDateString();
    const existing = map.get(key);
    if (existing) {
      existing.gallons += point.gallons;
    } else {
      map.set(key, { key, start, label, display, gallons: point.gallons });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.start.getTime() - b.start.getTime());
}

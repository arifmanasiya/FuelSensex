export function formatDurationHours(hours?: number): string {
  if (!Number.isFinite(hours ?? NaN)) {
    return 'n/a';
  }
  const rounded = Math.max(0, Math.round(hours ?? 0));
  if (rounded === 0) {
    return '0h';
  }
  const days = Math.floor(rounded / 24);
  const remainder = rounded % 24;
  if (days > 0 && remainder > 0) {
    return `${days}d ${remainder}h`;
  }
  if (days > 0) {
    return `${days}d`;
  }
  return `${remainder}h`;
}

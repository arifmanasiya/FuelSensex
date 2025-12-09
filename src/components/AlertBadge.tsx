import type { Severity } from '../types';

interface Props {
  severity: Severity;
}

export default function AlertBadge({ severity }: Props) {
  if (severity === 'CRITICAL') return <span className="badge badge-red">Critical</span>;
  if (severity === 'WARNING') return <span className="badge badge-yellow">Warning</span>;
  return <span className="badge badge-green">Info</span>;
}

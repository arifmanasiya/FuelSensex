interface Props {
  label: string;
  value: string;
  subtext?: string;
}

export default function KpiCard({ label, value, subtext }: Props) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {subtext ? <div className="muted">{subtext}</div> : null}
    </div>
  );
}

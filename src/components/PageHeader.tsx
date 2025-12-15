import type { ReactNode } from 'react';

type SiteOption = { id: string; label: string };

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
  siteSelect?: {
    options: SiteOption[];
    value: string;
    onChange: (id: string) => void;
    placeholder?: string;
  };
  rightExtra?: ReactNode;
}

export default function PageHeader({ title, subtitle, infoTooltip, siteSelect, rightExtra }: PageHeaderProps) {
  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-header" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '1.2rem' }}>
            {title}
            {infoTooltip ? (
              <span
                className="muted"
                title={infoTooltip}
                style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center' }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4" strokeLinecap="round"></path>
                  <path d="M12 8h.01" strokeLinecap="round"></path>
                </svg>
              </span>
            ) : null}
          </div>
          {subtitle ? <div className="muted">{subtitle}</div> : null}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {siteSelect ? (
            <div className="form-field" style={{ minWidth: 220, marginBottom: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ margin: 0 }}>Site</label>
              <select value={siteSelect.value} onChange={(e) => siteSelect.onChange(e.target.value)}>
                {siteSelect.placeholder ? <option value="">{siteSelect.placeholder}</option> : null}
                {siteSelect.options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {rightExtra}
        </div>
      </div>
    </div>
  );
}

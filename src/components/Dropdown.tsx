import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type DropdownVariant = 'standard' | 'store' | 'row';

export interface DropdownItem {
  id: string;
  label: string;
  description?: string;
  status?: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  onSelect?: () => void;
}

interface Props {
  variant?: DropdownVariant;
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect?: (item: DropdownItem) => void;
  closeOnSelect?: boolean;
  align?: 'left' | 'right';
  searchable?: boolean;
  selectedId?: string;
}

export default function Dropdown({
  variant = 'standard',
  trigger,
  items,
  onSelect,
  closeOnSelect = true,
  align = 'left',
  searchable = false,
  selectedId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current || !triggerRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target) && !triggerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onKey);
    }
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    return items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));
  }, [items, search, searchable]);

  function handleSelect(item: DropdownItem) {
    item.onSelect?.();
    onSelect?.(item);
    if (closeOnSelect) setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!open && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[highlighted];
      if (item) handleSelect(item);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const containerClass = `dropdown-surface ${isMobile ? 'sheet' : 'card'} ${open ? 'open' : 'closed'} ${variant}`;

  return (
    <div className="dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        className="dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        {trigger}
      </button>

      {open ? (
        <>
          {isMobile ? <div className="dropdown-overlay" onClick={() => setOpen(false)} /> : null}
          <div
            ref={menuRef}
            className={containerClass}
            role="menu"
            style={{ right: !isMobile && align === 'right' ? 0 : undefined }}
          >
            {variant === 'store' && searchable ? (
              <div className="dropdown-search">
                <input
                  type="text"
                  placeholder="Search stores"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            ) : null}

            <div className="dropdown-items">
              {filtered.map((item, idx) => (
                <button
                  key={item.id}
                  role="menuitem"
                  className={`dropdown-item ${idx === highlighted ? 'highlighted' : ''} ${
                    selectedId === item.id ? 'selected' : ''
                  }`}
                  onMouseEnter={() => setHighlighted(idx)}
                  onClick={() => handleSelect(item)}
                >
                  <div className="dropdown-item-main">
                    <span>{item.label}</span>
                    {item.status ? <StatusBadge status={item.status} /> : null}
                  </div>
                  {item.description ? <div className="dropdown-item-desc">{item.description}</div> : null}
                </button>
              ))}
              {!filtered.length ? <div className="dropdown-empty">No matches</div> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: DropdownItem['status'] }) {
  const map: Record<NonNullable<DropdownItem['status']>, { label: string; color: string }> = {
    HEALTHY: { label: 'Healthy', color: '#10B981' },
    ATTENTION: { label: 'Attention', color: '#FACC15' },
    CRITICAL: { label: 'Critical', color: '#EF4444' },
  };
  const data = map[status!];
  return (
    <span
      className="dropdown-badge"
      style={{ background: `${data.color}22`, color: data.color, borderColor: `${data.color}55` }}
    >
      {data.label}
    </span>
  );
}

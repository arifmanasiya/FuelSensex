import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo_new.png';
import ConfirmModal from './ConfirmModal';

type NavItem =
  | { to: string; label: string; icon: keyof typeof icons }
  | { href: string; label: string; icon: keyof typeof icons };

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3 3.5 9.5v11h6v-6h5v6h6v-11z"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm7.5 2.5a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a7.4 7.4 0 0 0-1.8-1L15 2h-4l-.3 3a7.4 7.4 0 0 0-1.8 1l-2.3-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.4 7.4 0 0 0 1.8 1l.3 3h4l.3-3a7.4 7.4 0 0 0 1.8-1l2.3.9 2-3.4-2-1.5a7.5 7.5 0 0 0 .1-1Z"
      />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M6 9a6 6 0 1 1 12 0c0 3 1 5 2 6H4c1-1 2-3 2-6Z"
        strokeLinecap="round"
      />
      <path stroke="currentColor" strokeWidth="1.6" d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.6" d="M7 5h10v16H7z" />
      <rect x="9" y="3" width="6" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M9 10h6m-6 4h6" strokeLinecap="round" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M3 6h11v9H3zM14 10h3l3 3v2h-6z"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16.5" cy="18" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M12 3 2.5 20h19L12 3Z"
        strokeLinejoin="round"
      />
      <path stroke="currentColor" strokeWidth="1.6" d="M12 9.5v4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M12 10v6m0-8V7" strokeLinecap="round" />
    </svg>
  ),
  help: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M9.1 8.5a3.3 3.3 0 0 1 5.8 2c0 1.8-1.5 2.6-2.4 3.2-.9.6-.9 1-.9 2M12 17.9h.01"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M4 7.5 12 12l8-4.5" strokeLinecap="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M5 18.5 3.5 21 6 20c4.5 0 12 .5 12-.5S20 17 20 15V7c0-1-.5-2-1.5-2H5C4 5 3.5 6 3.5 7v8c0 1 .5 1.5 1.5 1.5Z"
      />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m4-16 4 4m0 0-4 4m4-4H10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const productLinks: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: 'dashboard' },
  { to: '/app/alerts', label: 'Notifications', icon: 'bell' },
  { to: '/app/orders', label: 'Orders', icon: 'clipboard' },
  { to: '/app/orders/new', label: 'Create Order', icon: 'plus' },
  { to: '/app/deliveries', label: 'Deliveries', icon: 'truck' },
  { to: '/app/issues', label: 'Issues', icon: 'alert' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' },
];

const companyLinks: NavItem[] = [
  {
    href: 'https://forms.gle/D3x9MPPv3HmNvnCh9',
    label: 'Feedback',
    icon: 'chat',
  },
];

export default function SideNav({ isOpen, onLinkClick }: { isOpen?: boolean; onLinkClick?: () => void }) {
  const [productOpen, setProductOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(true);
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  function handleLogout() {
    localStorage.removeItem('fuelguard-token');
    localStorage.removeItem('fuelguard-user');
    navigate('/');
  }

  const sidebarClass = `sidebar${isOpen ? ' open' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <img src={logo} alt="FuelSensex" style={{ height: 32, width: 'auto' }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>FuelSensex</span>
        </div>
      </div>

      <div className="nav-group">
        <button
          className="group-toggle desktop-only"
          type="button"
          aria-expanded={productOpen}
          onClick={() => setProductOpen((prev) => !prev)}
        >
          <span>FuelSensex Menu</span>
          <span>{productOpen ? '▾' : '▸'}</span>
        </button>
        <nav className={`nav-links ${productOpen ? 'open' : 'closed'}`}>
          {productLinks.map((link) =>
            'to' in link ? (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/app' || link.to === '/app/orders' || link.to === '/app/deliveries'}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={onLinkClick}
              >
                <span className="nav-icon">{icons[link.icon]}</span>
                <span className="nav-label">{link.label}</span>
              </NavLink>
            ) : (
              <a
                key={link.href}
                className="nav-link"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={onLinkClick}
              >
                <span className="nav-icon">{icons[link.icon]}</span>
                <span className="nav-label">{link.label}</span>
              </a>
            )
          )}
        </nav>
      </div>

      <div className="nav-group company-group">
        <button
          className="group-toggle desktop-only"
          type="button"
          aria-expanded={companyOpen}
          onClick={() => setCompanyOpen((prev) => !prev)}
        >
          <span>Company Menu</span>
          <span>{companyOpen ? '▾' : '▸'}</span>
        </button>
        <div className={`nav-links company-links ${companyOpen ? 'open' : 'closed'}`}>
          {companyLinks.map((link) =>
            'href' in link ? (
              <a
                key={link.label}
                className="nav-link"
                href={link.href}
                target="_blank"
                rel="noreferrer"
                onClick={onLinkClick}
              >
                <span className="nav-icon">{icons[link.icon]}</span>
                <span className="nav-label">{link.label}</span>
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                onClick={onLinkClick}
              >
                <span className="nav-icon">{icons[link.icon]}</span>
                <span className="nav-label">{link.label}</span>
              </NavLink>
            )
          )}
          <button className="nav-link nav-action" type="button" onClick={() => setConfirmLogout(true)}>
            <span className="nav-icon">{icons.logout}</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
      <ConfirmModal
        open={confirmLogout}
        title="Confirm logout"
        message="You are about to sign out of FuelSensex."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmLogout(false);
          handleLogout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />
    </aside>
  );
}

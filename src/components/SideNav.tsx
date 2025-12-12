import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

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
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/alerts', label: 'Alerts', icon: 'settings' },
  { to: '/orders', label: 'Orders', icon: 'settings' },
  { to: '/orders/new', label: 'Create Order', icon: 'settings' },
  { to: '/deliveries', label: 'Deliveries', icon: 'settings' },
  { to: '/issues', label: 'Issues', icon: 'settings' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const companyLinks: NavItem[] = [
  { to: '/about', label: 'About Us', icon: 'info' },
  { to: '/faq', label: 'FAQ', icon: 'help' },
  { to: '/contact', label: 'Contact Us', icon: 'mail' },
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

  function handleLogout() {
    localStorage.removeItem('fuelguard-token');
    localStorage.removeItem('fuelguard-user');
    navigate('/login');
  }

  const sidebarClass = `sidebar${isOpen ? ' open' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={logo} alt="FuelSense" style={{ height: 80, width: 'auto' }} />
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>FuelSense</span>
        </div>
      </div>

      <div className="nav-group">
        <button
          className="group-toggle desktop-only"
          type="button"
          aria-expanded={productOpen}
          onClick={() => setProductOpen((prev) => !prev)}
        >
          <span>FuelSense Menu</span>
          <span>{productOpen ? '▾' : '▸'}</span>
        </button>
        <nav className={`nav-links ${productOpen ? 'open' : 'closed'}`}>
          {productLinks.map((link) =>
            'to' in link ? (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/' || link.to === '/orders' || link.to === '/deliveries'}
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
          <button className="nav-link nav-action" type="button" onClick={handleLogout}>
            <span className="nav-icon">{icons.logout}</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

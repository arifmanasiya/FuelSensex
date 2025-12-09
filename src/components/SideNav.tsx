import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { get } from '../api/apiClient';
import type { Alert } from '../types';

const productLinks = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/alerts', label: 'All Notifications', icon: '🚨' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const companyLinks = [
  { to: '/about', label: 'About Us', icon: 'ℹ️' },
  { to: '/faq', label: 'FAQ', icon: '❓' },
  { to: '/contact', label: 'Contact Us', icon: '✉️' },
];

export default function SideNav() {
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    get<Alert[]>('/alerts')
      .then((res) => setOpenAlerts(res.filter((a) => a.isOpen).length))
      .catch(() => setOpenAlerts(0));
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">FuelSense</div>
      <nav className="nav-links">
        {productLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <span>{link.icon}</span>
            <span className="nav-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {link.label}
              {link.to === '/alerts' && openAlerts > 0 ? (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.05rem 0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {openAlerts}
                </span>
              ) : null}
            </span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-extra">
        <div className="muted" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Company
        </div>
        <div className="nav-links">
          {companyLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <span>{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}

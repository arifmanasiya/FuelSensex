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

export default function SideNav({ isOpen, onLinkClick }: { isOpen?: boolean; onLinkClick?: () => void }) {
  const [openAlerts, setOpenAlerts] = useState(0);
  const [companyOpen, setCompanyOpen] = useState(true);

  useEffect(() => {
    get<Alert[]>('/alerts')
      .then((res) => setOpenAlerts(res.filter((a) => a.isOpen).length))
      .catch(() => setOpenAlerts(0));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCompanyOpen(window.innerWidth > 900);
    }
  }, []);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="brand">FuelSense</div>
      <nav className="nav-links">
        {productLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            onClick={onLinkClick}
          >
            <span className="nav-icon">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
            {link.to === '/alerts' && openAlerts > 0 ? <span className="nav-count">{openAlerts}</span> : null}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-extra">
        <button
          className="sidebar-section-toggle"
          type="button"
          aria-expanded={companyOpen}
          onClick={() => setCompanyOpen((prev) => !prev)}
        >
          <span>Company</span>
          <span>{companyOpen ? '▾' : '▸'}</span>
        </button>
        <div className={`nav-links company-links ${companyOpen ? 'open' : 'closed'}`}>
          {companyLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={onLinkClick}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </aside>
  );
}

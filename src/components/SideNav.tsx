import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const [productOpen, setProductOpen] = useState(true);
  const [companyOpen, setCompanyOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    get<Alert[]>('/alerts')
      .then((res) => setOpenAlerts(res.filter((a) => a.isOpen).length))
      .catch(() => setOpenAlerts(0));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth > 900;
      setProductOpen(isDesktop);
      setCompanyOpen(isDesktop);
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('fuelguard-token');
    localStorage.removeItem('fuelguard-user');
    navigate('/login');
  }

  const sidebarClass = `sidebar${isOpen ? ' open' : ''}`;

  return (
    <aside className={sidebarClass}>
      <div className="sidebar-header">
        <div className="brand">FuelSense</div>
        <button
          className="group-toggle mobile-only"
          type="button"
          aria-expanded={productOpen}
          onClick={() => setProductOpen((prev) => !prev)}
        >
          <span>FuelSense Menu</span>
          <span>{productOpen ? '▾' : '▸'}</span>
        </button>
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
        <button
          className="group-toggle mobile-only"
          type="button"
          aria-expanded={companyOpen}
          onClick={() => setCompanyOpen((prev) => !prev)}
        >
          <span>Company Menu</span>
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
          <button className="nav-link nav-action" type="button" onClick={handleLogout}>
            <span className="nav-icon">⎋</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

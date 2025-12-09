import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import SideNav from './SideNav';
import SalesCTA from './SalesCTA';
import FeedbackBanner from './FeedbackBanner';
import { useState } from 'react';

interface Props {
  children: ReactNode;
}

export default function Layout({ children }: Props) {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('fuelguard-token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="layout">
      <SideNav isOpen={mobileNavOpen} onLinkClick={() => setMobileNavOpen(false)} />
      <div className="main-shell">
        <TopNav onMenuToggle={() => setMobileNavOpen((prev) => !prev)} />
        <main className="content">
          <FeedbackBanner />
          {children}
        </main>
        <footer className="footer">
          <div>
            <div style={{ fontWeight: 700 }}>FuelSense</div>
            <div className="muted">A product of LabUDIS ©</div>
          </div>
        </footer>
      </div>
      <SalesCTA />
      {mobileNavOpen ? <div className="backdrop" onClick={() => setMobileNavOpen(false)} /> : null}
    </div>
  );
}

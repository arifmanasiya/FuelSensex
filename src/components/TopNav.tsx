import { useNavigate } from 'react-router-dom';

interface Props {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: Props) {
  const userName = localStorage.getItem('fuelguard-user') || 'Station Owner';
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('fuelguard-token');
    localStorage.removeItem('fuelguard-user');
    navigate('/login');
  }

  return (
    <header className="topnav">
      <div className="title">
        <span role="img" aria-label="shield">
          ⛽️
        </span>
        FuelSense Demo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button className="button ghost responsive-button mobile-menu-button" type="button" onClick={onMenuToggle}>
          <span className="icon" aria-hidden="true">
            ☰
          </span>
          <span className="text">Menu</span>
        </button>
        <a
          className="button ghost responsive-button"
          href="https://docs.google.com/forms/d/e/1FAIpQLSeOPX0KhXKh5SC-gtiGF1jRyO_3oN_bLUerx5BxiVVlenbHIQ/viewform?usp=header"
          target="_blank"
          rel="noreferrer"
        >
          <span className="icon" aria-hidden="true">
            💬
          </span>
          <span className="text">Feedback</span>
        </a>
        <div className="pill">{userName}</div>
        <button className="button ghost responsive-button" type="button" onClick={handleLogout}>
          <span className="icon" aria-hidden="true">
            ⎋
          </span>
          <span className="text">Logout</span>
        </button>
      </div>
    </header>
  );
}

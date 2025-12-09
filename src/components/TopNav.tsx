import { useNavigate } from 'react-router-dom';

export default function TopNav() {
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
        <a
          className="button ghost"
          href="https://docs.google.com/forms/d/e/1FAIpQLSeOPX0KhXKh5SC-gtiGF1jRyO_3oN_bLUerx5BxiVVlenbHIQ/viewform?usp=header"
          target="_blank"
          rel="noreferrer"
        >
          Feedback
        </a>
        <div className="pill">{userName}</div>
        <button className="button ghost" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

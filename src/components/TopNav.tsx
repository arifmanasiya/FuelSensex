import logo from '../assets/logo.png';

interface Props {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: Props) {
  return (
    <header className="topnav" style={{ justifyContent: 'flex-start' }}>
      <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img src={logo} alt="FuelSense" style={{ height: 80, width: 'auto' }} />
        <span style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>FuelSense</span>
      </div>
      <div style={{ marginLeft: 'auto' }}>
        <button
          className="button ghost responsive-button mobile-menu-button mobile-only"
          type="button"
          aria-label="Open navigation"
          onClick={onMenuToggle}
        >
          <span className="icon" aria-hidden="true">
            ☰
          </span>
          <span className="text">Menu</span>
        </button>
      </div>
    </header>
  );
}

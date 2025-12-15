import logo from '../assets/logo_new.png';

interface Props {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: Props) {
  return (
    <header className="topnav" style={{ justifyContent: 'flex-start' }}>
      <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <img src={logo} alt="FuelSensex" style={{ height: 32, width: 'auto' }} />
        <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>FuelSensex</span>
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

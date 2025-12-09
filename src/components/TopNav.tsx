interface Props {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: Props) {
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
      </div>
    </header>
  );
}

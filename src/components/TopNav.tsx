interface Props {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: Props) {
  return (
    <header className="topnav" style={{ justifyContent: 'flex-start' }}>
      <div className="title">FuelSense Demo</div>
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

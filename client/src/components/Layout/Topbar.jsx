import { useAuth } from '../../context/AuthContext';

function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="app-topbar">
      <div style={{ fontWeight: 600 }}>EventSphere</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user && (
          <>
            <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
              {user.name} ({user.role})
            </span>
            <button className="button-ghost" onClick={logout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Topbar;

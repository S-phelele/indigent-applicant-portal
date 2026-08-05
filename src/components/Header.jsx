import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 style={{ cursor: 'pointer' }}>Indigent Register</h1>
      </Link>
      <div className="header-actions">
        <button className="header-link" type="button">
          <span>❓</span> Get Help
        </button>
        {user ? (
          <>
            <Link to="/my-applications" className="header-link">My Applications</Link>
            <button
              className="header-link"
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="header-link">Sign in</Link>
            <Link to="/register" className="header-link">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './ui/Icon';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <Link to="/" className="brand-lockup" style={{ textDecoration: 'none' }}>
        <span className="sidebar-mark" aria-hidden="true">IR</span>
        <span className="brand-text">
          <span className="brand-name">Indigent Register</span>
          <span className="brand-sub">Municipal Support</span>
        </span>
      </Link>

      <nav className="header-actions" aria-label="Main">
        {user ? (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `header-link${isActive ? ' active' : ''}`}
            >
              My account
            </NavLink>
            <button
              className="header-link"
              type="button"
              onClick={() => { logout(); navigate('/'); }}
            >
              <Icon name="logout" size={15} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="header-link">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Apply now</Link>
          </>
        )}
      </nav>
    </header>
  );
}

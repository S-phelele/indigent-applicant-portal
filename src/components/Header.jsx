import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ showBack }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <h1>Indigent Register</h1>
      <div className="header-actions">
        <button className="header-link" type="button">
          <span>❓</span> Get Help
        </button>
        {user ? (
          <>
            <Link to="/my-applications" className="header-link">My Applications</Link>
            <button className="header-link" onClick={() => { logout(); navigate('/'); }}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="header-link">Sign in</Link>
        )}
      </div>
    </header>
  );
}

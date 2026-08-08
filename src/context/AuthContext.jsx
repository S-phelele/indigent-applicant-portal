import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import useIdleTimeout from '../hooks/useIdleTimeout';
import IdleWarning from '../components/IdleWarning';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          /**
           * Merged over the cached user rather than replacing it.
           *
           * /auth/me returns the account, not the session, so overwriting would
           * drop the idle-timeout policy on every page reload and quietly fall
           * back to the defaults.
           */
          let cached = {};
          try { cached = JSON.parse(localStorage.getItem('user')) || {}; } catch { /* ignore */ }
          const merged = { session: cached.session, previousSignIn: cached.previousSignIn, ...res.data.data };
          setUser(merged);
          localStorage.setItem('user', JSON.stringify(merged));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /** Keep the session policy alongside the account so it survives a reload. */
  const store = ({ user: account, token, session, previousSignIn }) => {
    const withSession = { ...account, session, previousSignIn };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(withSession));
    sessionStorage.removeItem('signout_reason');
    setUser(withSession);
    return withSession;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return store(res.data.data);
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    return store(res.data.data);
  };

  /**
   * End the session.
   *
   * `reason` is stashed for the sign-in screen, because a session that ends with
   * no explanation looks like the site broke. Somebody signed out for being idle
   * should be told that is what happened.
   */
  const logout = (reason = null) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (reason) sessionStorage.setItem('signout_reason', reason);
    else sessionStorage.removeItem('signout_reason');
    setUser(null);
  };

  /**
   * Sign out for inactivity.
   *
   * A household member may well be filling this in on a shared phone or at a
   * library computer, which is exactly where an abandoned session matters — the
   * form holds their ID number, their income and where they live.
   */
  const idleSignOut = () => {
    logout('idle');
    if (!window.location.pathname.includes('/login')) window.location.href = '/login';
  };

  const session = useIdleTimeout({
    enabled: Boolean(user),
    idleMinutes: user?.session?.idleMinutes ?? 20,
    warningMinutes: user?.session?.idleWarningMinutes ?? 2,
    onTimeout: idleSignOut,
    storageKey: 'last_active',
  });

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
      {session.warning ? (
        <IdleWarning
          secondsLeft={session.secondsLeft}
          onStay={session.staySignedIn}
          onSignOutNow={idleSignOut}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

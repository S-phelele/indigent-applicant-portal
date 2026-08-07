import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Icon from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { friendlyError } from '../utils/apiError';

const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        toast.info('Redirecting', 'Administrator accounts are managed in the admin portal.');
        window.location.href = ADMIN_PORTAL_URL;
        return;
      }
      toast.success('Signed in', `Welcome back, ${user.firstName || 'there'}.`);
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err, 'We could not sign you in. Check your details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page">
      <Header />
      <div className="login-page" style={{ minHeight: 'auto', flex: 1 }}>
        <aside className="login-brand">
          <h2>Welcome back</h2>
          <p>
            Sign in to continue an application, upload outstanding documents, or check the status of a
            submission.
          </p>
          <div className="login-brand-points">
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Your progress is saved as you go</span>
            </div>
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Upload documents at your own pace</span>
            </div>
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Track the outcome of your application</span>
            </div>
          </div>
        </aside>

        <main className="login-form-wrap">
          <div className="login-card">
            <h1>Sign in</h1>
            <p>Enter the email address you registered with.</p>

            {error ? (
              <div className="alert alert-error" role="alert">
                <Icon name="alert-circle" size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="login-foot">
              Don&apos;t have an account? <Link to="/register">Register to apply</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

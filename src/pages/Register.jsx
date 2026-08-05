import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';

function getPasswordRules(password) {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };
}

function isPasswordValid(rules) {
  return rules.minLength && rules.hasUpper && rules.hasLower && rules.hasSpecial;
}

export default function Register() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    cellNumber: '',
    idNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const rules = useMemo(() => getPasswordRules(form.password), [form.password]);
  const passwordsMatch = form.password === form.confirmPassword;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid(rules)) {
      setError('Password does not meet the required rules.');
      setShowRules(true);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      navigate('/apply');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const RuleItem = ({ ok, label }) => (
    <li style={{ color: ok ? '#047857' : 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
      {ok ? '✓' : '○'} {label}
    </li>
  );

  return (
    <div>
      <Header />
      <div className="login-page" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="login-brand">
          <h1>Welcome to the Indigent Register Portal</h1>
        </div>
        <div className="login-form-wrap">
          <div className="login-card">
            <h2>Create your account</h2>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Surname</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="13-digit SA ID" />
              </div>
              <div className="form-group">
                <label>Cell Number</label>
                <input name="cellNumber" value={form.cellNumber} onChange={handleChange} placeholder="e.g. 081 591 2000" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={() => setShowRules(true)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {(showRules || form.password) && (
                  <ul style={{ listStyle: 'none', marginTop: '0.5rem', padding: 0 }}>
                    <RuleItem ok={rules.minLength} label="At least 8 characters" />
                    <RuleItem ok={rules.hasUpper} label="At least one capital letter (A–Z)" />
                    <RuleItem ok={rules.hasLower} label="At least one small letter (a–z)" />
                    <RuleItem ok={rules.hasSpecial} label="At least one special character (@, !, #, %, &, …)" />
                  </ul>
                )}
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁'}
                  </button>
                </div>
                {form.confirmPassword && !passwordsMatch && (
                  <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Passwords do not match
                  </p>
                )}
                {form.confirmPassword && passwordsMatch && form.password && (
                  <p style={{ color: '#047857', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    ✓ Passwords match
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={loading || !isPasswordValid(rules) || !passwordsMatch}
              >
                {loading ? 'Creating account...' : 'Register & Apply'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link to="/login">Already have an account? Sign in</Link>
            </p>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <Link to="/">← Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

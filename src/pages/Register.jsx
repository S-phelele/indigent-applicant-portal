import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Icon from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { friendlyError } from '../utils/apiError';

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
  const toast = useToast();

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
      const user = await register(payload);
      toast.success('Account created', `Welcome, ${user.firstName || 'there'}. Let's start your application.`);
      navigate('/dashboard');
    } catch (err) {
      setError(friendlyError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const RuleItem = ({ ok, label }) => (
    <li className={`req-item${ok ? ' met' : ''}`}>
      <Icon name={ok ? 'check-circle' : 'circle'} size={14} />
      <span>{label}</span>
    </li>
  );

  return (
    <div className="app-page">
      <Header />
      <div className="login-page" style={{ minHeight: 'auto', flex: 1 }}>
        <aside className="login-brand">
          <h2>Apply for indigent support</h2>
          <p>
            Create an account to start your application. Your progress is saved automatically, so you can
            come back and finish it later.
          </p>
          <div className="login-brand-points">
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Takes about ten minutes</span>
            </div>
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Upload documents from your phone</span>
            </div>
            <div className="login-brand-point">
              <Icon name="check" size={15} />
              <span>Reviewed within 14 days</span>
            </div>
          </div>
        </aside>
        <main className="login-form-wrap">
          <div className="login-card">
            <h1>Create your account</h1>
            <p>You will need your ID number and a cell number we can verify.</p>
            {error && (
              <div className="alert alert-error" role="alert">
                <Icon name="alert-circle" size={16} />
                <span>{error}</span>
              </div>
            )}
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
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                {(showRules || form.password) && (
                  <ul className="req-list">
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
                    <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                {form.confirmPassword && !passwordsMatch && (
                  <p style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Passwords do not match
                  </p>
                )}
                {form.confirmPassword && passwordsMatch && form.password && (
                  <p style={{ color: '#047857', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                    Passwords match
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading || !isPasswordValid(rules) || !passwordsMatch}
              >
                {loading ? 'Creating account…' : 'Create account and apply'}
              </button>
            </form>
            <p className="login-foot">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/ui/Icon';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { friendlyError } from '../utils/apiError';

function Inner() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', cellNumber: '', idNumber: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      cellNumber: user.cellNumber || '',
      idNumber: user.idNumber || '',
    });
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPwField = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/auth/me', form);
      setUser(res.data.data);
      localStorage.setItem('user', JSON.stringify(res.data.data));
      toast.success('Profile updated', 'Your details have been saved.');
    } catch (err) {
      const msg = friendlyError(err, 'We could not save your details.');
      setError(msg);
      toast.error('Could not save', msg);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword !== pw.confirmPassword) {
      setPwError('The new passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed', 'Use your new password next time you sign in.');
    } catch (err) {
      const msg = friendlyError(err, 'We could not change your password.');
      setPwError(msg);
      toast.error('Could not change password', msg);
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Profile</h1>
          <p>Your personal details and account security.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Account</h3>
          <span className={`badge ${user?.isVerified ? 'badge-approved' : 'badge-pending'}`}>
            {user?.isVerified ? 'Cell number verified' : 'Cell number not verified'}
          </span>
        </div>

        <div className="form-group">
          <span className="field-label">Email address</span>
          <p>{user?.email}</p>
          <div className="field-hint">
            Your email address cannot be changed here. Contact your municipal office if it is wrong.
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Personal details</h3>

        {error ? (
          <div className="alert alert-error" role="alert">
            <Icon name="alert-circle" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={saveProfile}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First name</label>
              <input id="firstName" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Surname</label>
              <input id="lastName" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="idNumber">ID number</label>
              <input id="idNumber" value={form.idNumber} onChange={set('idNumber')} placeholder="13 digits" inputMode="numeric" />
            </div>
            <div className="form-group">
              <label htmlFor="cellNumber">Cell number</label>
              <input id="cellNumber" value={form.cellNumber} onChange={set('cellNumber')} placeholder="e.g. 081 591 2000" inputMode="tel" />
              <div className="field-hint">
                Changing this will require verifying the new number again.
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3 className="panel-title">Change password</h3>

        {pwError ? (
          <div className="alert alert-error" role="alert">
            <Icon name="alert-circle" size={16} />
            <span>{pwError}</span>
          </div>
        ) : null}

        <form onSubmit={changePassword}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current password</label>
            <div className="password-field">
              <input
                id="currentPassword"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={setPwField('currentPassword')}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
              >
                <Icon name={showPw ? 'eye-off' : 'eye'} size={16} />
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={setPwField('newPassword')}
                required
              />
              <div className="field-hint">
                At least 8 characters, with a capital, a small letter and a special character.
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={pw.confirmPassword}
                onChange={setPwField('confirmPassword')}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={pwSaving}>
              {pwSaving ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

export default function Profile() {
  return (
    <AppLayout title="Profile">
      <Inner />
    </AppLayout>
  );
}

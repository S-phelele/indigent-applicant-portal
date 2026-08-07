import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Icon from '../components/ui/Icon';
import AppLayout from '../components/AppLayout';
import { friendlyError } from '../utils/apiError';

const STATUS_CLASS = {
  DRAFT: 'badge-draft',
  PENDING: 'badge-pending',
  APPROVED: 'badge-approved',
  DECLINED: 'badge-declined',
};

const STATUS_HELP = {
  DRAFT: 'Not yet submitted. Continue where you left off.',
  PENDING: 'Submitted and waiting for a municipal official to review it.',
  APPROVED: 'Approved. The discount is applied to your municipal account.',
  DECLINED: 'Not approved. See the notes from the reviewer.',
};

const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/applications/mine')
      .then((res) => setApps(res.data.data || []))
      .catch((err) => setError(friendlyError(err, 'We could not load your applications.')))
      .finally(() => setLoading(false));
  }, []);

  const draft = apps.find((a) => a.status === 'DRAFT');

  if (loading) {
    return <AppLayout title="My applications"><div className="loading"><span className="spinner" /> Loading your applications…</div></AppLayout>;
  }

  return (
    <AppLayout title="My applications">
      <div className="page-head">
        <div>
          <h1>My applications</h1>
          <p>Track the status of any application you have started or submitted.</p>
        </div>
        {draft ? (
          <Link to="/apply" className="btn btn-primary">
            Continue application
            <Icon name="arrow-right" size={15} />
          </Link>
        ) : (
          <Link to="/apply" className="btn btn-primary">
            <Icon name="plus" size={15} />
            New application
          </Link>
        )}
      </div>

      {error ? (
        <div className="alert alert-error" role="alert">
          <Icon name="alert-circle" size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {draft ? (
        <div className="alert alert-info">
          <Icon name="info" size={16} />
          <span>
            You have an application in progress at step {draft.currentStep} of 5. You can only have one
            application open at a time — finish this one before starting another.
          </span>
        </div>
      ) : null}

      {apps.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div className="doc-row-icon" style={{ width: 44, height: 44, margin: '0 auto 1rem' }}>
            <Icon name="applications" size={20} />
          </div>
          <h3 style={{ marginBottom: '.4rem' }}>You have no applications yet</h3>
          <p className="muted" style={{ maxWidth: 420, margin: '0 auto 1.25rem' }}>
            Applying takes about ten minutes. Have your ID, three months of bank statements and a signed
            affidavit ready before you begin.
          </p>
          <Link to="/apply" className="btn btn-primary btn-lg">Start an application</Link>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Status</th>
                  <th className="num">Household income</th>
                  <th>Date</th>
                  <th>Progress</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id}>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '.8125rem' }}>
                      {app.id.slice(0, 8)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[app.status] || 'badge-draft'}`}>
                        {titleCase(app.status)}
                      </span>
                      <div className="muted" style={{ fontSize: '.75rem', marginTop: '.25rem', maxWidth: 260 }}>
                        {STATUS_HELP[app.status]}
                      </div>
                    </td>
                    <td className="num">
                      {app.totalHouseholdIncome != null
                        ? `R ${Number(app.totalHouseholdIncome).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="nowrap">
                      {new Date(app.submittedAt || app.createdAt).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="nowrap">
                      {app.status === 'DRAFT' ? `Step ${app.currentStep} of 5` : 'Complete'}
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'inline-flex', gap: '.35rem' }}>
                        <Link to={`/applications/${app.id}`} className="btn btn-outline btn-sm">View</Link>
                        {app.status === 'DRAFT' ? (
                          <Link to="/apply" className="btn btn-primary btn-sm">Continue</Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {apps.some((a) => a.status === 'DECLINED') ? (
        <div className="alert alert-warning" style={{ marginTop: '1.25rem' }}>
          <Icon name="info" size={16} />
          <span>
            If your application was declined and your circumstances have changed, you may apply again.
            Contact your municipal office if you need help understanding the outcome.
          </span>
        </div>
      ) : null}
    </AppLayout>
  );
}

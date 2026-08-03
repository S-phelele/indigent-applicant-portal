import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/applications/mine')
      .then((res) => setApps(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status) => {
    const map = {
      DRAFT: 'badge-draft',
      PENDING: 'badge-pending',
      APPROVED: 'badge-approved',
      DECLINED: 'badge-declined',
    };
    return <span className={`badge ${map[status] || 'badge-draft'}`}>{status}</span>;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app-content" style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem' }}>My Applications</h2>
        <Link to="/apply" className="btn btn-primary">New Application</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {apps.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1rem' }}>You have no applications yet.</p>
          <Link to="/apply" className="btn btn-primary">Start Application</Link>
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Status</th>
                <th>Total Income</th>
                <th>Date</th>
                <th>Step</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{app.id.slice(0, 8)}…</td>
                  <td>{statusBadge(app.status)}</td>
                  <td>
                    {app.totalHouseholdIncome != null
                      ? `R ${Number(app.totalHouseholdIncome).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td>
                    {app.submittedAt
                      ? new Date(app.submittedAt).toLocaleDateString('en-ZA')
                      : new Date(app.createdAt).toLocaleDateString('en-ZA')}
                  </td>
                  <td>{app.status === 'DRAFT' ? `Step ${app.currentStep}/5` : '—'}</td>
                  <td>
                    {app.status === 'DRAFT' && (
                      <Link to="/apply" className="btn btn-outline btn-sm">Continue</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

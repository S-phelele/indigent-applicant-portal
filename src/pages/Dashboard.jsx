import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout, { useApplication } from '../components/AppLayout';
import Timeline from '../components/Timeline';
import Icon from '../components/ui/Icon';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_CLASS = {
  DRAFT: 'badge-draft', PENDING: 'badge-pending', APPROVED: 'badge-approved', DECLINED: 'badge-declined',
};

const money = (v) =>
  v != null ? `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function Inner() {
  const { user } = useAuth();
  const { application, applications, loading } = useApplication();
  const [timeline, setTimeline] = useState(null);
  const [tlLoading, setTlLoading] = useState(false);

  useEffect(() => {
    if (!application) { setTimeline(null); return; }
    setTlLoading(true);
    api.get(`/applications/${application.id}/timeline`)
      .then((res) => setTimeline(res.data.data))
      .catch(() => setTimeline(null))
      .finally(() => setTlLoading(false));
  }, [application?.id, application?.updatedAt]);

  if (loading) return <div className="loading"><span className="spinner" /> Loading your dashboard…</div>;

  // ---- No application yet -------------------------------------------------
  if (!application) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>{greeting()}{user?.firstName ? `, ${user.firstName}` : ''}</h1>
            <p>You have not started an application yet.</p>
          </div>
        </div>

        <div className="panel" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div className="doc-row-icon" style={{ width: 44, height: 44, margin: '0 auto 1rem' }}>
            <Icon name="applications" size={20} />
          </div>
          <h3 style={{ marginBottom: '.4rem' }}>Ready to apply?</h3>
          <p className="muted" style={{ maxWidth: 460, margin: '0 auto 1.25rem' }}>
            The form takes about ten minutes and saves as you go. Nothing is submitted until you say so.
          </p>
          <Link to="/apply" className="btn btn-primary btn-lg">Start an application</Link>
        </div>

        <section className="panel">
          <h3 className="panel-title">What you will need</h3>
          <div className="criteria-list" style={{ maxWidth: 'none' }}>
            {[
              'A certified copy of your ID',
              'Three months of bank statements',
              'A signed affidavit',
              'Your water and electricity meter numbers',
              'Income details for everyone living on the property',
            ].map((item) => (
              <div className="criteria-item" key={item}>
                <Icon name="check-circle" size={16} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  // ---- With an application ------------------------------------------------
  const docs = application.documents || [];
  const required = docs.filter((d) => d.importance === 'REQUIRED');
  const uploadedRequired = required.filter((d) => d.status === 'Uploaded');
  const rejected = docs.filter((d) => d.status === 'Rejected');
  const optionalUploaded = docs.filter((d) => d.importance !== 'REQUIRED' && d.status === 'Uploaded');
  const next = timeline?.nextAction;
  const waiting = daysSince(application.submittedAt);
  const pct = required.length ? Math.round((uploadedRequired.length / required.length) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greeting()}{user?.firstName ? `, ${user.firstName}` : ''}</h1>
          <p>
            Application {application.reference || application.id.slice(0, 8)} ·{' '}
            <span className={`badge ${STATUS_CLASS[application.status]}`}>
              {application.status.charAt(0) + application.status.slice(1).toLowerCase()}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <Link to={`/applications/${application.id}`} className="btn btn-outline">
            View application
          </Link>
          {application.status === 'DRAFT' ? (
            <Link to="/apply" className="btn btn-primary">
              Continue <Icon name="arrow-right" size={15} />
            </Link>
          ) : null}
        </div>
      </div>

      {/* The single most useful thing on the page: what to do next. */}
      {next ? (
        <div className={`alert ${rejected.length ? 'alert-warning' : 'alert-info'}`}>
          <Icon name={rejected.length ? 'alert-triangle' : 'info'} size={16} />
          <span style={{ flex: 1 }}><strong>{next.label}.</strong> {next.detail}</span>
          {next.to ? <Link to={next.to} className="btn btn-primary btn-sm">Go</Link> : null}
        </div>
      ) : application.status === 'PENDING' ? (
        <div className="alert alert-info">
          <Icon name="clock" size={16} />
          <span>
            Nothing is needed from you. Your application has been with the municipality for{' '}
            {waiting === 0 ? 'less than a day' : `${waiting} day${waiting === 1 ? '' : 's'}`} — decisions
            are usually made within 14 days.
          </span>
        </div>
      ) : null}

      {application.status === 'APPROVED' ? (
        <div className="alert alert-success">
          <Icon name="check-circle" size={16} />
          <span>Approved. The discount will be applied to your municipal account.</span>
        </div>
      ) : null}
      {application.status === 'DECLINED' ? (
        <div className="alert alert-error">
          <Icon name="alert-circle" size={16} />
          <span>
            Not approved.{application.reviewNotes ? ` Reviewer notes: ${application.reviewNotes}` : ''}
          </span>
        </div>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Required documents</div>
          <div className="stat-value">
            {uploadedRequired.length}
            <span style={{ fontSize: '1rem', color: 'var(--gray-500)' }}> / {required.length}</span>
          </div>
          <div className="applicant-status-bar" style={{ background: 'var(--gray-200)', marginTop: '.6rem' }}>
            <div className="applicant-status-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Household income</div>
          <div className="stat-value" style={{ fontSize: '1.35rem' }}>{money(application.totalHouseholdIncome)}</div>
          <div className="stat-foot">
            {application.totalIncomePerPerson != null
              ? `${money(application.totalIncomePerPerson)} per person`
              : 'Captured at step 3'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cell number</div>
          <div style={{ marginTop: '.5rem' }}>
            <span className={`badge ${application.cellVerified ? 'badge-approved' : 'badge-pending'}`}
                  style={{ fontSize: '.8125rem', padding: '.3rem .7rem' }}>
              {application.cellVerified ? 'Verified' : 'Not verified'}
            </span>
          </div>
          <div className="stat-foot">{application.cellNumber || 'Not captured'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Optional documents</div>
          <div className="stat-value">{optionalUploaded.length}</div>
          <div className="stat-foot">
            {optionalUploaded.length === 0 ? 'None added — they are not required' : 'Added to support your case'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '1.25rem' }} className="overview-grid">
        <section className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3 className="panel-title">Where your application is</h3>
            <Link to={`/applications/${application.id}`} className="btn btn-outline btn-sm">
              Details <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          {tlLoading ? (
            <div className="loading"><span className="spinner" /> Loading progress…</div>
          ) : (
            <Timeline stages={timeline?.stages || []} />
          )}
        </section>

        <section className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3 className="panel-title">Document checklist</h3>
            <Link to="/documents" className="btn btn-outline btn-sm">
              Manage <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.6rem' }}>
            {docs.map((doc) => {
              const done = doc.status === 'Uploaded';
              const bad = doc.status === 'Rejected';
              return (
                <li key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <span
                    className="doc-row-icon"
                    style={{
                      width: 24, height: 24, flex: 'none',
                      background: bad ? 'var(--danger-soft)' : done ? 'var(--success-soft)' : 'var(--gray-100)',
                      color: bad ? 'var(--danger)' : done ? 'var(--success)' : 'var(--gray-400)',
                    }}
                  >
                    <Icon name={bad ? 'close' : done ? 'check' : 'circle'} size={12} strokeWidth={2.4} />
                  </span>
                  <span style={{ fontSize: '.8125rem', flex: 1, color: done ? 'var(--ink)' : 'var(--gray-600)' }}>
                    {doc.name}
                  </span>
                  {doc.importance === 'REQUIRED' ? (
                    <span className="badge badge-required" style={{ fontSize: '.6875rem' }}>Required</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {applications.length > 1 ? (
        <section className="panel">
          <h3 className="panel-title">Your other applications</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.6rem' }}>
            {applications.filter((a) => a.id !== application.id).map((a) => (
              <li key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <span className={`badge ${STATUS_CLASS[a.status]}`}>
                  {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
                </span>
                <span style={{ fontSize: '.8125rem', flex: 1 }}>
                  {a.reference || a.id.slice(0, 8)} · {new Date(a.createdAt).toLocaleDateString('en-ZA')}
                </span>
                <Link to={`/applications/${a.id}`} className="btn btn-outline btn-sm">View</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <Inner />
    </AppLayout>
  );
}

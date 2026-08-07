import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Timeline from '../components/Timeline';
import Icon from '../components/ui/Icon';
import api from '../services/api';
import { friendlyError } from '../utils/apiError';

const STATUS_CLASS = {
  DRAFT: 'badge-draft', PENDING: 'badge-pending', APPROVED: 'badge-approved', DECLINED: 'badge-declined',
};

const money = (v) =>
  v != null ? `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—';
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');

function Field({ label, children }) {
  return (
    <div className="form-group">
      <span className="field-label">{label}</span>
      <p>{children}</p>
    </div>
  );
}

function Inner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [app, tl] = await Promise.all([
          api.get(`/applications/${id}`),
          api.get(`/applications/${id}/timeline`),
        ]);
        if (cancelled) return;
        setApplication(app.data.data);
        setTimeline(tl.data.data);
      } catch (err) {
        if (!cancelled) setError(friendlyError(err, 'We could not load this application.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="loading"><span className="spinner" /> Loading your application…</div>;

  if (!application) {
    return (
      <>
        <div className="alert alert-error"><Icon name="alert-circle" size={16} /><span>{error || 'Application not found.'}</span></div>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/my-applications')}>
          <Icon name="arrow-left" size={15} /> Back to my applications
        </button>
      </>
    );
  }

  const docs = application.documents || [];
  const next = timeline?.nextAction;

  return (
    <>
      <button type="button" className="back-link" onClick={() => navigate('/my-applications')}>
        <Icon name="arrow-left" size={15} /> Back to my applications
      </button>

      <div className="page-head">
        <div>
          <h1>Application {application.reference || application.id.slice(0, 8)}</h1>
          <p>
            Started {new Date(application.createdAt).toLocaleDateString('en-ZA')}
            {application.submittedAt ? ` · Submitted ${new Date(application.submittedAt).toLocaleDateString('en-ZA')}` : ''}
          </p>
        </div>
        <span className={`badge ${STATUS_CLASS[application.status]}`} style={{ fontSize: '.8125rem', padding: '.3rem .7rem' }}>
          {application.status.charAt(0) + application.status.slice(1).toLowerCase()}
        </span>
      </div>

      {next ? (
        <div className="alert alert-info">
          <Icon name="info" size={16} />
          <span style={{ flex: 1 }}>
            <strong>{next.label}.</strong> {next.detail}
          </span>
          {next.to ? <Link to={next.to} className="btn btn-primary btn-sm">Continue</Link> : null}
        </div>
      ) : null}

      {application.status === 'APPROVED' ? (
        <div className="alert alert-success">
          <Icon name="check-circle" size={16} />
          <span>Your application was approved. The discount will be applied to your municipal account.</span>
        </div>
      ) : null}

      {application.status === 'DECLINED' && application.reviewNotes ? (
        <div className="alert alert-error">
          <Icon name="info" size={16} />
          <span><strong>Reviewer notes:</strong> {application.reviewNotes}</span>
        </div>
      ) : null}

      <section className="panel">
        <h3 className="panel-title">Progress</h3>
        <Timeline stages={timeline?.stages || []} />
      </section>

      {(timeline?.events || []).length > 0 ? (
        <section className="panel">
          <h3 className="panel-title">Activity</h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.8rem' }}>
            {timeline.events.map((e, i) => (
              <li key={`${e.at}-${i}`} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                <Icon name="clock" size={15} className="muted" style={{ marginTop: '.15rem' }} />
                <div>
                  <div style={{ fontSize: '.875rem' }}>{e.label}</div>
                  <div className="muted" style={{ fontSize: '.75rem' }}>
                    {new Date(e.at).toLocaleString('en-ZA')} · {e.by}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h3 className="panel-title">Household income</h3>
        <div className="form-row">
          <Field label="Salary">{money(application.salary)}</Field>
          <Field label="Old age pension">{money(application.oldAgePension)}</Field>
        </div>
        <div className="form-row">
          <Field label="Disability pension">{money(application.disabilityPension)}</Field>
          <Field label="Business income">{money(application.businessIncome)}</Field>
        </div>
        <div className="form-row">
          <Field label="Renting income">{money(application.rentingIncome)}</Field>
          <Field label="People on property">{application.peopleOnProperty ?? '—'}</Field>
        </div>
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '.85rem 1rem', background: 'var(--gray-50)',
            border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
          }}
        >
          <span style={{ fontWeight: 600 }}>Total household income</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 650 }}>{money(application.totalHouseholdIncome)}</span>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Documents</h3>
        <div className="doc-list">
          {docs.map((doc) => (
            <div className={`doc-row${doc.status === 'Uploaded' ? ' is-uploaded' : ''}`} key={doc.id}>
              <div className="doc-row-info">
                <span className="doc-row-icon">
                  <Icon name={doc.status === 'Uploaded' ? 'check' : doc.status === 'Rejected' ? 'close' : 'file'} size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="doc-row-title">{doc.name}</div>
                  <div className="doc-row-meta">
                    <span className={`badge ${doc.importance === 'REQUIRED' ? 'badge-required' : 'badge-optional'}`}>
                      {doc.importance === 'REQUIRED' ? 'Required' : 'Optional'}
                    </span>
                    <span className={`badge ${doc.status === 'Uploaded' ? 'badge-uploaded' : doc.status === 'Rejected' ? 'badge-declined' : 'badge-pending'}`}>
                      {doc.status}
                    </span>
                    {doc.fileName ? <span>{doc.fileName}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {application.status === 'DRAFT' ? (
          <div className="form-actions">
            <Link to="/documents" className="btn btn-outline">Manage documents</Link>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <h3 className="panel-title">General information</h3>
        <Field label="Owns immovable property?">{yesNo(application.ownsImmovableProperty)}</Field>
        <Field label="Full-time occupant?">{yesNo(application.isFullTimeOccupant)}</Field>
        <Field label="Declared income R4 200 or less?">{yesNo(application.incomeBelowThreshold)}</Field>
        <Field label="Municipal arrears?">{yesNo(application.hasMunicipalArrears)}</Field>
        <Field label="Arrangement to pay arrears?">{yesNo(application.hasArrearsArrangement)}</Field>
      </section>
    </>
  );
}

export default function ApplicationDetail() {
  return (
    <AppLayout title="Application">
      <Inner />
    </AppLayout>
  );
}

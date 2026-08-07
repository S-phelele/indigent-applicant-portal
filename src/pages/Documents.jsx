import { useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout, { useApplication } from '../components/AppLayout';
import Icon from '../components/ui/Icon';
import api from '../services/api';
import { useToast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/Modal';
import { friendlyError } from '../utils/apiError';

function Inner() {
  const { application, refresh, loading } = useApplication();
  const toast = useToast();
  const [busyId, setBusyId] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [extraType, setExtraType] = useState('OTHER');

  /**
   * Upload a document with no pre-existing slot. Sending no documentId tells the
   * API to create a new OPTIONAL row rather than fill one of the standard six.
   */
  const addExtra = async (file) => {
    setBusyId('new');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', extraType);
    try {
      await api.post(`/documents/${application.id}/upload`, fd);
      await refresh();
      toast.success('Document added', file.name);
    } catch (err) {
      toast.error('Could not add the document', friendlyError(err, 'Check the file type and size.'));
    } finally {
      setBusyId(null);
    }
  };

  const isDraft = application?.status === 'DRAFT';
  const isPending = application?.status === 'PENDING';
  // Required evidence is frozen once submitted; optional support is not, so an
  // applicant can still add a proof of grant while they wait.
  const editable = isDraft;
  const canAddOptional = isDraft || isPending;

  const upload = async (doc, file) => {
    if (!file) return;
    setBusyId(doc.id);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentId', doc.id);
    try {
      await api.post(`/documents/${application.id}/upload`, fd);
      await refresh();
      toast.success('Document uploaded', doc.name);
    } catch (err) {
      toast.error('Upload failed', friendlyError(err, 'Check the file type and size, then try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    const doc = removing;
    setBusyId(doc.id);
    try {
      await api.delete(`/documents/${doc.id}`);
      await refresh();
      toast.success('Document removed', `${doc.name} can be uploaded again.`);
    } catch (err) {
      toast.error('Could not remove', err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  };

  if (loading) return <div className="loading"><span className="spinner" /> Loading documents…</div>;

  if (!application) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div className="doc-row-icon" style={{ width: 44, height: 44, margin: '0 auto 1rem' }}>
          <Icon name="file" size={20} />
        </div>
        <h3 style={{ marginBottom: '.4rem' }}>No documents yet</h3>
        <p className="muted" style={{ maxWidth: 420, margin: '0 auto 1.25rem' }}>
          Start an application and your document checklist will appear here.
        </p>
        <Link to="/apply" className="btn btn-primary">Start an application</Link>
      </div>
    );
  }

  const docs = application.documents || [];
  const required = docs.filter((d) => d.importance === 'REQUIRED');
  const optional = docs.filter((d) => d.importance !== 'REQUIRED');
  const outstanding = required.filter((d) => d.status !== 'Uploaded');

  const row = (doc, allowEdit = editable) => (
    <div className={`doc-row${doc.status === 'Uploaded' ? ' is-uploaded' : ''}`} key={doc.id}>
      <div className="doc-row-info">
        <span className="doc-row-icon">
          <Icon name={doc.status === 'Uploaded' ? 'check' : 'file'} size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="doc-row-title">{doc.name}</div>
          <div className="doc-row-meta">
            <span className={`badge ${doc.importance === 'REQUIRED' ? 'badge-required' : 'badge-optional'}`}>
              {doc.importance === 'REQUIRED' ? 'Required' : 'Optional'}
            </span>
            <span className={`badge ${doc.status === 'Uploaded' ? 'badge-uploaded' : 'badge-pending'}`}>
              {doc.status}
            </span>
            {doc.fileName ? (
              <span>{doc.fileName}{doc.fileSize ? ` · ${(doc.fileSize / 1024).toFixed(0)} KB` : ''}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="doc-row-actions">
        {allowEdit ? (
          <>
            <label className={`btn btn-sm ${doc.status === 'Uploaded' ? 'btn-outline' : 'btn-primary'}`} style={{ cursor: 'pointer' }}>
              <Icon name="upload" size={14} />
              {doc.status === 'Uploaded' ? 'Replace' : 'Upload'}
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={busyId === doc.id}
                onChange={(e) => { if (e.target.files[0]) upload(doc, e.target.files[0]); e.target.value = ''; }}
              />
            </label>
            {doc.status === 'Uploaded' ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRemoving(doc)}
                disabled={busyId === doc.id}
                aria-label={`Remove ${doc.name}`}
              >
                <Icon name="trash" size={14} />
              </button>
            ) : null}
          </>
        ) : (
          <span className="muted" style={{ fontSize: '.8125rem' }}>
            {doc.status === 'Uploaded' ? 'Submitted' : 'Not uploaded'}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Documents</h1>
          <p>
            Supporting documents for application {application.id.slice(0, 8)}. Accepted formats: PDF, JPG,
            PNG, DOC, DOCX, up to 10 MB each.
          </p>
        </div>
        {editable && outstanding.length === 0 ? (
          <Link to="/apply" className="btn btn-primary">
            Go to submit <Icon name="arrow-right" size={15} />
          </Link>
        ) : null}
      </div>

      {isPending ? (
        <div className="alert alert-info">
          <Icon name="info" size={16} />
          <span>
            Your application is being reviewed. The required documents are locked so the reviewer sees
            exactly what you submitted, but you can still add optional supporting documents below.
          </span>
        </div>
      ) : !editable ? (
        <div className="alert alert-info">
          <Icon name="info" size={16} />
          <span>
            This application has been decided, so its documents can no longer be changed. Contact your
            municipal office if something needs correcting.
          </span>
        </div>
      ) : outstanding.length > 0 ? (
        <div className="alert alert-warning">
          <Icon name="alert-triangle" size={16} />
          <span>
            {outstanding.length} required document{outstanding.length === 1 ? '' : 's'} still outstanding:{' '}
            {outstanding.map((d) => d.name).join(', ')}.
          </span>
        </div>
      ) : (
        <div className="alert alert-success">
          <Icon name="check-circle" size={16} />
          <span>All required documents are uploaded. You can submit your application.</span>
        </div>
      )}

      <section className="panel">
        <h3 className="panel-title">Required</h3>
        <div className="doc-list">{required.map((d) => row(d, editable))}</div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Optional</h3>
        <p className="muted" style={{ fontSize: '.8125rem', marginTop: '-.5rem', marginBottom: '1rem' }}>
          Only needed if they apply to your household. Adding them can help support your application.
        </p>
        <div className="doc-list">{optional.map((d) => row(d, canAddOptional))}</div>

        {/* Anything not covered by the standard slots — a second bank account,
            a letter from an employer, and so on. */}
        {canAddOptional ? (
          <div
            style={{
              marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)',
              display: 'flex', gap: '.6rem', alignItems: 'flex-end', flexWrap: 'wrap',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
              <label htmlFor="extra-type">Add another supporting document</label>
              <select id="extra-type" value={extraType} onChange={(e) => setExtraType(e.target.value)}>
                <option value="OTHER">Other supporting document</option>
                <option value="PROOF_OF_GRANT">Additional proof of grant</option>
                <option value="BANK_STATEMENTS">Additional bank statements</option>
                <option value="COPY_OF_DEATH_CERT">Additional death certificate</option>
                <option value="LETTER_OF_AUTHORITY">Additional letter of authority</option>
                <option value="AFFIDAVIT">Additional affidavit</option>
              </select>
            </div>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              <Icon name="plus" size={15} />
              Add document
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={busyId === 'new'}
                onChange={(e) => { if (e.target.files[0]) addExtra(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
          </div>
        ) : null}
      </section>

      <ConfirmModal
        open={Boolean(removing)}
        variant="danger"
        title="Remove this document?"
        description={removing ? `${removing.name} will be deleted and marked as outstanding again.` : ''}
        confirmLabel="Remove document"
        busy={busyId === removing?.id}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </>
  );
}

export default function Documents() {
  return (
    <AppLayout title="Documents">
      <Inner />
    </AppLayout>
  );
}

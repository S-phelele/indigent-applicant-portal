import { useEffect, useState, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/ui/Icon';
import Modal from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { SkeletonPanel, SkeletonText } from '../components/ui/Skeleton';
import api from '../services/api';

/**
 * Your information.
 *
 * POPIA gives a household four things this page has to actually deliver rather
 * than merely mention: the right to be told what is held (s23), to have it
 * corrected (s24), to have it deleted when it is no longer needed (s24), and to
 * object to how it is used (s11(3)).
 *
 * ## Written for the person, not the statute
 *
 * Somebody applying for free basic water is not reading section numbers. So the
 * headings are questions they would actually ask — "what do you know about me?",
 * "who has seen it?" — and the section references sit underneath as small print
 * for the one reader in a hundred who wants them.
 *
 * The access request is answered immediately rather than queued. The municipality
 * already holds the answer; making somebody wait thirty days for a query that
 * takes a second would be compliance theatre.
 */

const REQUEST_TYPES = [
  {
    key: 'CORRECTION',
    label: 'Something you hold about me is wrong',
    hint: 'Tell us what is wrong and what it should say. We will correct it and tell you when we have.',
  },
  {
    key: 'DELETION',
    label: 'I want you to delete my information',
    hint: 'We will check whether we are allowed to. Some records have to be kept — we will tell you which and why.',
  },
  {
    key: 'OBJECTION',
    label: 'I object to how you are using my information',
    hint: 'Tell us what you object to. We will look at whether we can stop, and explain if we cannot.',
  },
  {
    key: 'ACCESS',
    label: 'I want a formal copy of everything you hold',
    hint: 'You can already see and download all of it on this page. Use this if you need a formal written response.',
  },
];

const STATUS_LABEL = {
  RECEIVED: 'We have it',
  IN_PROGRESS: 'We are working on it',
  COMPLETED: 'Answered',
  REFUSED: 'Refused',
};

const STATUS_TONE = {
  RECEIVED: 'badge-draft',
  IN_PROGRESS: 'badge-pending',
  COMPLETED: 'badge-approved',
  REFUSED: 'badge-declined',
};

const dateZA = (d) => (d ? new Date(d).toLocaleDateString('en-ZA') : '—');

export default function Privacy() {
  return (
    <AppLayout title="Your information">
      <Inner />
    </AppLayout>
  );
}

function Inner() {
  const toast = useToast();
  const [record, setRecord] = useState(null);
  const [notice, setNotice] = useState(null);
  const [requests, setRequests] = useState([]);
  const [deletion, setDeletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ type: 'CORRECTION', request: '', correctionDetail: '' });
  const [busy, setBusy] = useState(false);

  const loadRequests = useCallback(async () => {
    const res = await api.get('/privacy/my-requests');
    setRequests(res.data.data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        /**
         * Fetched together rather than in sequence. Four round trips one after
         * another is most of a second on a phone on a slow connection, which is
         * the connection this page will usually be read on.
         */
        const [mine, pub, reqs, del] = await Promise.all([
          api.get('/privacy/my-information'),
          api.get('/privacy/notice'),
          api.get('/privacy/my-requests'),
          api.get('/privacy/my-deletion-options'),
        ]);
        if (cancelled) return;
        setRecord(mine.data.data);
        setNotice(pub.data.data);
        setRequests(reqs.data.data);
        setDeletion(del.data.data);
      } catch {
        if (!cancelled) setError('We could not load your information just now. Please try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const lodge = async () => {
    setBusy(true);
    try {
      const res = await api.post('/privacy/requests', form);
      toast.success(res.data.message);
      setAsking(false);
      setForm({ type: 'CORRECTION', request: '', correctionDetail: '' });
      await loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'We could not log that request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonPanel height={120} />
        <SkeletonText lines={4} />
        <SkeletonPanel height={220} />
      </>
    );
  }

  if (error) {
    return (
      <div className="callout callout-warn">
        <Icon name="alert-circle" size={18} />
        <div>{error}</div>
      </div>
    );
  }

  const selected = REQUEST_TYPES.find((t) => t.key === form.type);

  return (
    <>
      <section className="panel">
        <h2>What we know about you</h2>
        <p className="muted">
          This is everything the municipality holds about you and your household, in plain language. You have the right
          to see it, to have anything wrong corrected, and to ask us to delete what we no longer need.
        </p>
        <div className="form-actions">
          <a className="btn btn-outline btn-sm" href="/api/privacy/my-information.json">
            <Icon name="download" size={15} /> Download a copy
          </a>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAsking(true)}>
            <Icon name="edit" size={15} /> Ask us to change something
          </button>
        </div>
      </section>

      {record ? (
        <>
          <section className="panel">
            <h3>Who we think you are</h3>
            <dl className="detail-list">
              <div><dt>Name</dt><dd>{record.about.name || 'Not recorded'}</dd></div>
              <div><dt>ID number</dt><dd>{record.about.idNumber || 'Not recorded'}</dd></div>
              <div><dt>Cell number</dt><dd>{record.about.cellNumber || 'Not recorded'}</dd></div>
              <div><dt>Email</dt><dd>{record.about.emailAddress || 'None on file'}</dd></div>
              <div><dt>Account created</dt><dd>{record.about.accountCreated}</dd></div>
              <div><dt>How</dt><dd>{record.about.accountCreatedBy}</dd></div>
            </dl>
          </section>

          {record.applications.map((app) => (
            <section className="panel" key={app.reference}>
              <h3>Application {app.reference}</h3>
              <p className="muted">{app.status}{app.submitted ? ` · submitted ${app.submitted}` : ''}</p>

              {app.retentionNote ? (
                <div className="callout callout-info">
                  <Icon name="info" size={16} />
                  <div>{app.retentionNote}</div>
                </div>
              ) : null}

              <h4>What you told us</h4>
              <dl className="detail-list">
                {Object.entries(app.whatYouToldUs)
                  .filter(([, v]) => v !== null && v !== undefined && v !== '')
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{humanKey(k)}</dt>
                      <dd>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd>
                    </div>
                  ))}
              </dl>

              {/**
                * Derived values get their own section with the reasoning attached.
                * A figure somebody cannot account for is the kind that goes wrong
                * quietly — and "how did you get my date of birth?" is the question
                * this system would otherwise have no answer to.
                */}
              <h4>What we worked out from that</h4>
              <p className="field-hint">We did not ask you for these. We calculated them, and this is how.</p>
              <dl className="detail-list">
                {Object.entries(app.whatWeWorkedOut)
                  .filter(([, v]) => v?.value !== null && v?.value !== undefined)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{humanKey(k)}</dt>
                      <dd>{String(v.value)}<small className="muted"> — from {v.derivedFrom.toLowerCase()}</small></dd>
                    </div>
                  ))}
              </dl>

              {app.locationHeld ? (
                <>
                  <h4>Where we think you live</h4>
                  <dl className="detail-list">
                    <div><dt>Coordinates</dt><dd>{app.locationHeld.coordinates}</dd></div>
                    <div><dt>How we got them</dt><dd>{app.locationHeld.howItWasObtained}</dd></div>
                  </dl>
                  <p className="field-hint">
                    You gave these to us and you can ask us to remove them. They are used to find the property for a
                    verification visit and to report demand by area.
                  </p>
                </>
              ) : null}

              {app.functioning?.length ? (
                <>
                  <h4>Your answers about difficulty with daily activities</h4>
                  <p className="field-hint">
                    These are health information, which the law treats as especially sensitive. You gave them by choice
                    and you may ask us to remove them without affecting your application.
                  </p>
                  <dl className="detail-list">
                    {app.functioning.map((f) => (
                      <div key={f.question}><dt>{f.question}</dt><dd>{f.yourAnswer}</dd></div>
                    ))}
                  </dl>
                </>
              ) : null}

              {app.householdMembersYouListed?.length ? (
                <>
                  <h4>People you listed in your household</h4>
                  <ul className="tight-list">
                    {app.householdMembersYouListed.map((m) => (
                      <li key={m.name}>{m.name} — {m.relationship}{m.age ? `, ${m.age}` : ''}</li>
                    ))}
                  </ul>
                  <p className="field-hint">
                    We hold more about each of them, but their ID numbers and income are their information rather than
                    yours, so they are not shown here.
                  </p>
                </>
              ) : null}

              {app.whoHasHandledIt?.length ? (
                <>
                  <h4>Who has handled your application</h4>
                  <ul className="tight-list">
                    {app.whoHasHandledIt.map((s, i) => (
                      <li key={i}>{s.official} — {s.stage}{s.when ? ` on ${s.when}` : ''}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              {app.externalChecksRunOnYou?.length ? (
                <>
                  <h4>Organisations we checked your details against</h4>
                  <ul className="tight-list">
                    {app.externalChecksRunOnYou.map((c, i) => (
                      <li key={i}>{c.organisation} — {c.when}</li>
                    ))}
                  </ul>
                  <p className="field-hint">You agreed to these checks when you applied.</p>
                </>
              ) : null}

              {app.changesMadeToYourRecord?.length ? (
                <>
                  <h4>Changes made to your record</h4>
                  <ul className="tight-list">
                    {app.changesMadeToYourRecord.map((c, i) => (
                      <li key={i}>{humanKey(c.field)}: “{c.from || 'blank'}” changed to “{c.to || 'blank'}” by {c.by} on {c.when}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ))}

          {record.messagesWeSentYou?.length ? (
            <section className="panel">
              <h3>Messages we sent you</h3>
              <ul className="tight-list">
                {record.messagesWeSentYou.slice(0, 20).map((m, i) => (
                  <li key={i}><strong>{m.when}</strong> — {m.message}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {/* --- Rights and requests ------------------------------------------- */}
      <section className="panel">
        <h3>Asking us to change or delete something</h3>

        {deletion ? (
          deletion.canDeleteNow ? (
            <p className="muted">We can delete your information if you ask us to.</p>
          ) : (
            <>
              <p className="muted">We cannot delete everything right now, for these reasons:</p>
              <ul className="tight-list">
                {deletion.blockers.map((b) => <li key={b.code}>{b.message}</li>)}
              </ul>
              {deletion.alternative ? <p className="field-hint">{deletion.alternative}</p> : null}
            </>
          )
        ) : null}

        <div className="form-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAsking(true)}>
            Make a request
          </button>
        </div>

        {requests.length ? (
          <>
            <h4>Requests you have made</h4>
            <ul className="tight-list">
              {requests.map((r) => (
                <li key={r.id}>
                  <span className={`badge ${STATUS_TONE[r.status] || 'badge-neutral'}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>{' '}
                  {r.request}
                  <small className="muted">
                    {' '}· asked {dateZA(r.receivedAt)}
                    {r.completedAt ? `, answered ${dateZA(r.completedAt)}` : r.dueAt ? `, due ${dateZA(r.dueAt)}` : ''}
                  </small>
                  {r.responseNotes ? <div className="field-hint">Our answer: {r.responseNotes}</div> : null}
                  {r.refusalGround ? <div className="field-hint">Why we refused: {r.refusalGround}</div> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {/* --- The notice ---------------------------------------------------- */}
      {notice ? (
        <section className="panel">
          <h3>What we collect and why</h3>
          <p className="muted">{notice.whyWeCollectIt}</p>

          <div className="table-card table-scroll">
            <table>
              <thead>
                <tr><th>What</th><th>Why</th><th>Do you have to give it?</th></tr>
              </thead>
              <tbody>
                {notice.processing.map((p) => (
                  <tr key={p.category}>
                    <td><strong>{p.category}</strong><small>{p.items.join(', ')}</small></td>
                    <td><small>{p.purpose}</small></td>
                    <td className="nowrap">
                      {p.voluntary
                        ? <span className="badge badge-approved">Optional</span>
                        : <span className="badge badge-neutral">Required</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4>How long we keep it</h4>
          <ul className="tight-list">
            {notice.retention.map((r) => (
              <li key={r.key}>{r.label}: {r.retention.toLowerCase()}, then {r.outcome.toLowerCase()}.</li>
            ))}
          </ul>

          <h4>Who to contact</h4>
          {notice.informationOfficer ? (
            <p className="muted">
              {notice.informationOfficer.name} — {notice.informationOfficer.email}
              {notice.informationOfficer.postalAddress ? `, ${notice.informationOfficer.postalAddress}` : ''}
            </p>
          ) : (
            /**
             * Shown to the public rather than hidden. If the municipality has not
             * recorded an Information Officer, the honest thing is to say so and
             * point at the Regulator, not to print a plausible placeholder that
             * sends a real request into a mailbox nobody reads.
             */
            <p className="muted">
              This municipality has not yet published an Information Officer. You can still complain to the Information
              Regulator at {notice.regulator.email}.
            </p>
          )}
          <p className="field-hint">
            {notice.responseStandard} You may complain to the {notice.regulator.name} at {notice.regulator.email} at any
            time, including before asking us.
          </p>
        </section>
      ) : null}

      <Modal open={asking} title="Ask us to change something" onClose={() => setAsking(false)}>
        <div className="form-grid">
          <label className="form-group span-2">
            <span>What would you like us to do?</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {REQUEST_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {selected ? <small>{selected.hint}</small> : null}
          </label>

          <label className="form-group span-2">
            <span>Tell us more</span>
            <textarea
              rows={3}
              value={form.request}
              onChange={(e) => setForm({ ...form, request: e.target.value })}
              placeholder="e.g. My cell number changed when I moved. The one you have is my old number."
            />
          </label>

          {form.type === 'CORRECTION' ? (
            <label className="form-group span-2">
              <span>What should it say instead?</span>
              <textarea
                rows={2}
                value={form.correctionDetail}
                onChange={(e) => setForm({ ...form, correctionDetail: e.target.value })}
                placeholder="e.g. My cell number is 082 123 4567."
              />
            </label>
          ) : null}

          <div className="form-actions span-2">
            <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={lodge}
              disabled={busy || !form.request.trim() || (form.type === 'CORRECTION' && !form.correctionDetail.trim())}
            >
              {busy ? 'Sending…' : 'Send the request'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Turn a field name into something a person would read. */
function humanKey(key) {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID')
    .trim();
}

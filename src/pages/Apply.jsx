import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Stepper from '../components/Stepper';
import AddressCapture from '../components/AddressCapture';
import HouseholdEditor from '../components/HouseholdEditor';
import DerivedIdentity from '../components/DerivedIdentity';
import IncomeSources from '../components/IncomeSources';
import FunctioningQuestions from '../components/FunctioningQuestions';
import api from '../services/api';
import Icon from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../utils/apiError';

/** Offered as suggestions, not imposed — the field accepts anything typed. */
const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev', 'Adv', 'Nkosi', 'Nkosikazi'];

/**
 * The only answers for which an employer exists.
 *
 * Everything else — unemployed, pensioner, something else — has no employer to
 * name, so those three questions are not asked at all.
 */

/** Sex as recorded in the ID number: the sequence digits, 0000–4999 is female. */
function sexFromIdNumber(idNumber) {
  const digits = String(idNumber || '').replace(/\D/g, '');
  if (digits.length !== 13) return '';
  return Number(digits.slice(6, 10)) < 5000 ? 'FEMALE' : 'MALE';
}

// Enum fields start blank on purpose. Defaulting them (e.g. to EMPLOYED) would
// record an answer the applicant never gave.
const emptyForm = {
  title: '',
  maritalStatus: '',
  surname: '',
  names: '',
  idNumber: '',
  sex: '',
  /** Local only, never sent: stops the ID number overwriting a chosen answer. */
  sexTouched: false,
  cellNumber: '',
  residentialAddress: '',
  addressLatitude: '',
  addressLongitude: '',
  addressFormatted: '',
  addressSource: '',
  addressAccuracyM: '',
  postalSameAsResidential: false,
  postalLine1: '',
  postalLine2: '',
  postalSuburb: '',
  postalCity: '',
  postalCode: '',
  employerName: '',
  employerAddress: '',
  workTelNumber: '',
  peopleOnProperty: '',
  childrenUnder18: '',
  adults: '',
  pensionersOver60: '',
  waterMeterNumber: '',
  electricityMeterNumber: '',
  // The five amount fields are gone: income is a list of sources now, held by
  // IncomeSources and saved through its own endpoint. Only the derived totals
  // remain, read-only, so step 4 can show the threshold against a live figure.
  totalIncomePerPerson: '',
  totalHouseholdIncome: '',
  ownsImmovableProperty: '',
  isFullTimeOccupant: '',
  incomeBelowThreshold: '',
  hasMunicipalArrears: '',
  hasArrearsArrangement: '',
  wardNumber: '',
  municipalAccountNumber: '',
  eskomAccountNumber: '',
  tenure: '',
  applicantCategory: 'STANDARD',
  ownsOtherProperty: '',
  otherPropertyDetails: '',
  incomeExclusions: '',
  consentSiteVisit: false,
  consentDataMatching: false,
  declarationTruthful: false,
  // The Washington Group Short Set. Date of birth, age and sex are NOT here:
  // the server derives all three from the ID number.
  difficultySeeing: '',
  difficultyHearing: '',
  difficultyWalking: '',
  difficultyRemembering: '',
  difficultySelfCare: '',
  difficultyCommunicating: '',
};

function toNum(val) {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(val) {
  if (val === 'Yes' || val === true) return true;
  if (val === 'No' || val === false) return false;
  return undefined;
}

function buildPayload(form, nextStep) {
  // Only send clean, typed values — never empty strings for numbers/booleans
  const payload = { currentStep: nextStep };

  // Strings — send only if non-empty
  const stringFields = [
    'title', 'maritalStatus', 'surname', 'names', 'idNumber', 'sex', 'cellNumber',
    'residentialAddress', 'employerName', 'employerAddress',
    'workTelNumber', 'waterMeterNumber', 'electricityMeterNumber',
    'wardNumber', 'municipalAccountNumber', 'eskomAccountNumber',
    'tenure', 'applicantCategory', 'otherPropertyDetails', 'incomeExclusions',
    'difficultySeeing', 'difficultyHearing', 'difficultyWalking',
    'difficultyRemembering', 'difficultySelfCare', 'difficultyCommunicating',
  ];
  stringFields.forEach((key) => {
    if (form[key] !== '' && form[key] !== null && form[key] !== undefined) {
      payload[key] = form[key];
    }
  });

  /**
   * The postal address, always sent as a set.
   *
   * The parts go together even when blank, because clearing a suburb has to
   * reach the server as an empty value rather than being skipped as "unchanged".
   * The server composes the single-line address and decides what to store.
   */
  payload.postalSameAsResidential = Boolean(form.postalSameAsResidential);
  if (!form.postalSameAsResidential) {
    ['postalLine1', 'postalLine2', 'postalSuburb', 'postalCity', 'postalCode'].forEach((key) => {
      payload[key] = form[key] || '';
    });
  }

  // Employer details are cleared by the server when the employment answer means
  // there is no employer, so the same rule applies to a councillor capturing at
  // a door as to somebody filling this in themselves.

  // Booleans

  // Consent is legally load-bearing, so it is always sent — including when it
  // has been withdrawn. Omitting a false would leave a stale "yes" on the record.
  ['consentSiteVisit', 'consentDataMatching', 'declarationTruthful'].forEach((key) => {
    if (typeof form[key] === 'boolean') payload[key] = form[key];
  });

  // Coordinates move as a pair, or are cleared as a pair. Sending one alone is
  // rejected by the API, because half a coordinate locates nothing.
  const hasPin = form.addressLatitude !== '' && form.addressLongitude !== '';
  if (hasPin) {
    payload.addressLatitude = Number(form.addressLatitude);
    payload.addressLongitude = Number(form.addressLongitude);
    payload.addressSource = form.addressSource || 'MANUAL';
    if (form.addressFormatted) payload.addressFormatted = form.addressFormatted;
    if (form.addressAccuracyM !== '') payload.addressAccuracyM = Number(form.addressAccuracyM);
  } else if (form.addressLatitude === '' && form.addressLongitude === '') {
    payload.addressLatitude = null;
    payload.addressLongitude = null;
  }

  // Integers
  const intFields = ['peopleOnProperty', 'childrenUnder18', 'adults', 'pensionersOver60'];
  intFields.forEach((key) => {
    const n = toNum(form[key]);
    if (n !== undefined) payload[key] = Math.floor(n);
  });

  // Decimals
  // Income is saved by IncomeSources against /applications/:id/income, and the
  // totals are derived server-side from those rows. Sending amounts from here
  // would give the same figure two owners and no rule about which wins.
  const moneyFields = [];
  moneyFields.forEach((key) => {
    const n = toNum(form[key]);
    if (n !== undefined) payload[key] = n;
  });

  // Yes/No questions
  const boolFields = [
    'ownsImmovableProperty', 'isFullTimeOccupant', 'incomeBelowThreshold',
    'hasMunicipalArrears', 'hasArrearsArrangement', 'ownsOtherProperty',
  ];
  boolFields.forEach((key) => {
    const b = toBool(form[key]);
    if (b !== undefined) payload[key] = b;
  });

  return payload;
}

export default function Apply() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [applicationId, setApplicationId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    initApplication();
  }, []);

  const initApplication = async () => {
    setError('');
    try {
      const res = await api.get('/applications/mine');
      const apps = res.data.data || [];
      const draft = apps.find((a) => a.status === 'DRAFT');

      if (draft) {
        setApplicationId(draft.id);
        setStep(draft.currentStep || 1);
        setForm({
          ...emptyForm,
          title: draft.title || '',
          maritalStatus: draft.maritalStatus || '',
          surname: draft.surname || '',
          names: draft.names || '',
          idNumber: draft.idNumber || '',
          // Falls back to the ID number for drafts started before sex was asked
          // explicitly, so an old draft opens with the field already answered.
          sex: draft.sex || sexFromIdNumber(draft.idNumber) || '',
          // A stored answer counts as chosen, so correcting the ID number later
          // does not quietly overwrite it.
          sexTouched: Boolean(draft.sex),
          cellNumber: draft.cellNumber || '',
          residentialAddress: draft.residentialAddress || '',
          addressLatitude: draft.addressLatitude ?? '',
          addressLongitude: draft.addressLongitude ?? '',
          addressFormatted: draft.addressFormatted || '',
          addressSource: draft.addressSource || '',
          addressAccuracyM: draft.addressAccuracyM ?? '',
          postalSameAsResidential: Boolean(draft.postalSameAsResidential),
          postalLine1: draft.postalLine1 || '',
          postalLine2: draft.postalLine2 || '',
          postalSuburb: draft.postalSuburb || '',
          postalCity: draft.postalCity || '',
          postalCode: draft.postalCode || '',
          employerName: draft.employerName || '',
          employerAddress: draft.employerAddress || '',
          workTelNumber: draft.workTelNumber || '',
          peopleOnProperty: draft.peopleOnProperty ?? '',
          childrenUnder18: draft.childrenUnder18 ?? '',
          adults: draft.adults ?? '',
          pensionersOver60: draft.pensionersOver60 ?? '',
          waterMeterNumber: draft.waterMeterNumber || '',
          electricityMeterNumber: draft.electricityMeterNumber || '',
          totalIncomePerPerson: draft.totalIncomePerPerson ?? '',
          totalHouseholdIncome: draft.totalHouseholdIncome ?? '',
          ownsImmovableProperty: draft.ownsImmovableProperty === true ? 'Yes' : draft.ownsImmovableProperty === false ? 'No' : '',
          isFullTimeOccupant: draft.isFullTimeOccupant === true ? 'Yes' : draft.isFullTimeOccupant === false ? 'No' : '',
          incomeBelowThreshold: draft.incomeBelowThreshold === true ? 'Yes' : draft.incomeBelowThreshold === false ? 'No' : '',
          hasMunicipalArrears: draft.hasMunicipalArrears === true ? 'Yes' : draft.hasMunicipalArrears === false ? 'No' : '',
          hasArrearsArrangement: draft.hasArrearsArrangement === true ? 'Yes' : draft.hasArrearsArrangement === false ? 'No' : '',
        });
        setDocuments(draft.documents || []);
      } else {
        // Deliberately does NOT create a draft here. Opening the form used to
        // consume the applicant's one allowed draft even if they left straight
        // away, and filled the database with empty rows. The draft is created on
        // the first save instead — see ensureApplication().
        setForm((f) => ({
          ...f,
          surname: f.surname || user?.lastName || '',
          names: f.names || user?.firstName || '',
          idNumber: f.idNumber || user?.idNumber || '',
          cellNumber: f.cellNumber || user?.cellNumber || '',
        }));
      }
    } catch (err) {
      console.error('initApplication error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load application';
      // If user already has an active application, try to use it
      if (err.response?.data?.data?.id) {
        const existing = err.response.data.data;
        setApplicationId(existing.id);
        setStep(existing.currentStep || 1);
        setError('');
      } else {
        setError(msg);
      }
    } finally {
      setInitLoading(false);
    }
  };

  const update = (field, value) => setForm((f) => {
    const next = { ...f, [field]: value };

    /**
     * Fill in sex from the ID number as it is typed.
     *
     * Only while the applicant has not answered it themselves, and only once the
     * thirteenth digit arrives. Overwriting a deliberate choice every keystroke
     * would make the field impossible to correct — which is the whole reason it
     * is editable.
     */
    if (field === 'idNumber' && !f.sexTouched) {
      const derived = sexFromIdNumber(value);
      if (derived) next.sex = derived;
    }
    if (field === 'sex') next.sexTouched = true;

    return next;
  });

  /** What the ID number says, for the note under the field. */
  const derivedSex = sexFromIdNumber(form.idNumber);

  /**
   * Return the application id, creating the draft the first time it is needed.
   * Everything that writes goes through here, so a draft only ever exists once
   * the applicant has actually entered something.
   */
  const ensureApplication = async () => {
    if (applicationId) return applicationId;
    const res = await api.post('/applications');
    const app = res.data.data;
    setApplicationId(app.id);
    setDocuments(app.documents || []);
    return app.id;
  };

  const saveStep = async (nextStep) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const id = await ensureApplication();
      const payload = buildPayload(form, nextStep);
      const res = await api.patch(`/applications/${id}`, payload);

      // Sync calculated fields from server
      const updated = res.data.data;
      if (updated) {
        if (updated.totalIncomePerPerson != null) {
          setForm((f) => ({
            ...f,
            totalIncomePerPerson: updated.totalIncomePerPerson,
            totalHouseholdIncome: updated.totalHouseholdIncome ?? f.totalHouseholdIncome,
          }));
        }
        if (updated.documents) setDocuments(updated.documents);
      }

      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('saveStep error:', err);
      const serverMsg = err.response?.data?.message;
      const details = err.response?.data?.details;
      setError(
        serverMsg
          ? details
            ? `${serverMsg}: ${details}`
            : serverMsg
          : err.message || 'Failed to save. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docId, file) => {
    if (!file) return;
    const appId = await ensureApplication();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentId', docId);
    setError('');
    try {
      // Content-Type is intentionally unset so the browser generates the multipart
      // boundary. Also keeps the api.js instance free of a JSON default, which would
      // otherwise serialise this FormData to JSON and drop the file.
      const res = await api.post(`/documents/${appId}/upload`, fd);
      setDocuments((docs) =>
        docs.map((d) => (d.id === docId ? res.data.data : d))
      );
      toast.success('Document uploaded', res.data.data?.name || file.name);
    } catch (err) {
      toast.error('Upload failed', friendlyError(err, 'Check the file type and size, then try again.'));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Save current step data first
      const id = await ensureApplication();
      await api.patch(`/applications/${id}`, buildPayload(form, 5));
      await api.post(`/applications/${id}/submit`);
      toast.success('Application submitted', 'A municipal official will review it within 14 days.');
      setTimeout(() => navigate('/my-applications'), 1200);
    } catch (err) {
      console.error('submit error:', err);
      const missing = err.response?.data?.missing;
      if (missing?.length) {
        setError(`Still outstanding: ${missing.join(', ')}. Upload these before submitting.`);
        toast.error('Cannot submit yet', `${missing.length} required document(s) are missing.`);
      } else {
        const msg = friendlyError(err, 'We could not submit your application.');
        setError(msg);
        toast.error('Submit failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <AppLayout title="Application form">
        <div className="loading"><span className="spinner" /> Loading your application…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Application form">
      <div>
        <button
          type="button"
          className="back-link"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/my-applications'))}
        >
          <Icon name="arrow-left" size={15} /> Back
        </button>

        <Stepper current={step} />

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
            {!applicationId && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginLeft: '0.75rem' }}
                onClick={() => { setInitLoading(true); initApplication(); }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        {success && <div className="alert alert-success" role="status">{success}</div>}

        <div className={`form-card${step === 5 ? " form-card-wide" : ""}`}>
          {/* STEP 1 – Applicant Particulars */}
          {step === 1 && (
            <>
              <h2 className="form-section-title">Applicant Particulars</h2>

              <div className="form-row-3">
                <div className="form-group" style={{ maxWidth: '9rem' }}>
                  <label>Title</label>
                  {/*
                    A list, with the option to type something else. Any fixed
                    list is too short for the titles people actually use, and
                    getting somebody's title wrong on a municipal letter is a
                    small insult that costs nothing to avoid.
                  */}
                  <input
                    list="title-options"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="Mr"
                    maxLength={20}
                  />
                  <datalist id="title-options">
                    {TITLES.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Surname</label>
                  <input value={form.surname} onChange={(e) => update('surname', e.target.value)} placeholder="Enter surname" />
                </div>
                <div className="form-group">
                  <label>Name(s)</label>
                  <input value={form.names} onChange={(e) => update('names', e.target.value)} placeholder="Enter name(s)" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ID Number</label>
                  <input value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} placeholder="13-digit ID" maxLength={13} inputMode="numeric" />
                  {/*
                    Date of birth and age are in these thirteen digits, so we
                    read them back instead of asking again. Showing them also
                    catches a mistyped digit here rather than at verification.
                  */}
                  <DerivedIdentity idNumber={form.idNumber} />
                </div>
                <div className="form-group">
                  <label>Sex</label>
                  {/*
                    Filled in from the ID number, and changeable.
                    The sequence digits record sex as registered at birth, which
                    is the right default and wrong for some people. Leaving it
                    read-only would force them to be recorded incorrectly on a
                    municipal record for the sake of a derivation.
                  */}
                  <select value={form.sex} onChange={(e) => update('sex', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                  {derivedSex && form.sex && derivedSex !== form.sex ? (
                    <small className="field-hint">
                      Your ID number indicates {derivedSex === 'FEMALE' ? 'female' : 'male'}. We will record what you
                      selected.
                    </small>
                  ) : (
                    <small className="field-hint">Filled in from your ID number. Change it if it is wrong.</small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marital Status</label>
                  <select value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                    <option value="SEPARATED">Separated</option>
                  </select>
                </div>
                {/*
                  Shown, not asked.

                  The number was verified before this application could be
                  started. Letting it be re-typed here would allow a verified
                  account to send an application carrying a different,
                  unverified number — the exact hole this change closes.
                  Changing it happens on the profile, where it costs a new code.
                */}
                <div className="form-group">
                  <label>Cell number</label>
                  <div className="verified-field">
                    <span>{user?.cellNumber || form.cellNumber}</span>
                    <span className={user?.isVerified ? 'badge badge-approved' : 'badge badge-pending'}>
                      {user?.isVerified ? <><Icon name="check" size={13} /> Verified</> : 'Not verified'}
                    </span>
                  </div>
                  <small>
                    The municipality sends every update here.{' '}
                    <Link to="/profile">Change it on your profile</Link> if it is wrong.
                  </small>
                </div>
              </div>
              <AddressCapture
                address={form.residentialAddress}
                onAddressChange={(v) => update('residentialAddress', v)}
                coordinates={
                  form.addressLatitude !== '' && form.addressLongitude !== ''
                    ? {
                        latitude: form.addressLatitude,
                        longitude: form.addressLongitude,
                        formatted: form.addressFormatted,
                        source: form.addressSource,
                        accuracyM: form.addressAccuracyM,
                      }
                    : null
                }
                onCoordinatesChange={(c) =>
                  setForm((f) => ({
                    ...f,
                    addressLatitude: c?.latitude ?? '',
                    addressLongitude: c?.longitude ?? '',
                    addressFormatted: c?.formatted ?? '',
                    addressSource: c?.source ?? '',
                    addressAccuracyM: c?.accuracyM ?? '',
                  }))
                }
              />
              {/* --- Postal address ------------------------------------- */}
              <h3 className="form-subsection-title">Postal Address</h3>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.postalSameAsResidential}
                  onChange={(e) => update('postalSameAsResidential', e.target.checked)}
                />
                <span>My postal address is the same as my residential address</span>
              </label>

              {/*
                Hidden rather than disabled when it is the same.
                Most households give the same address, and five greyed-out boxes
                still read as five things left undone. Nothing is copied into
                them either — one answer on file cannot fall out of step with
                itself when somebody moves.
              */}
              {!form.postalSameAsResidential && (
                <>
                  <div className="form-group">
                    <label>Street address, PO Box or Private Bag</label>
                    <input
                      value={form.postalLine1}
                      onChange={(e) => update('postalLine1', e.target.value)}
                      placeholder="e.g. 4512 Extension 3, or PO Box 1183"
                    />
                  </div>
                  <div className="form-group">
                    <label>Complex, unit or farm name <span className="muted">(if any)</span></label>
                    <input
                      value={form.postalLine2}
                      onChange={(e) => update('postalLine2', e.target.value)}
                      placeholder="e.g. Unit 14, Protea Court"
                    />
                  </div>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Suburb or township</label>
                      <input
                        value={form.postalSuburb}
                        onChange={(e) => update('postalSuburb', e.target.value)}
                        placeholder="e.g. Sebokeng"
                      />
                    </div>
                    <div className="form-group">
                      <label>Town or city</label>
                      <input
                        value={form.postalCity}
                        onChange={(e) => update('postalCity', e.target.value)}
                        placeholder="e.g. Vanderbijlpark"
                      />
                    </div>
                    <div className="form-group" style={{ maxWidth: '10rem' }}>
                      <label>Postal code</label>
                      {/*
                        Four digits, and kept as text. As a number 0001 becomes
                        1 and the address is quietly wrong.
                      */}
                      <input
                        value={form.postalCode}
                        onChange={(e) => update('postalCode', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="1900"
                        inputMode="numeric"
                        maxLength={4}
                      />
                      {form.postalCode && form.postalCode.length !== 4 ? (
                        <small className="field-hint warn">A South African postal code is four digits.</small>
                      ) : null}
                    </div>
                  </div>
                </>
              )}

              {/*
                Employment is no longer asked here.

                It used to be a question of its own — "are you employed?" — with
                employer details hanging off it. Both are now derived from the
                income step: somebody with a salary is employed, somebody with a
                business works for themselves, and the employer's name is asked
                against the salary it pays rather than as a separate fact. Two
                places to state whether somebody works is two places to disagree.
              */}
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => navigate('/my-applications')}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => saveStep(2)} disabled={loading}>
                  {loading ? 'Saving...' : 'Next'}
                </button>
              </div>
            </>
          )}

          {/* STEP 2 – Property */}
          {step === 2 && (
            <>
              <h2 className="form-section-title">Property Particulars</h2>

              <div className="form-group">
                <label>Do you own or rent this property?</label>
                <select value={form.tenure} onChange={(e) => update('tenure', e.target.value)}>
                  <option value="">Please choose</option>
                  <option value="OWNER">I own it</option>
                  <option value="TENANT">I rent it</option>
                  <option value="OCCUPIER">I live here but neither own nor rent (e.g. family land)</option>
                </select>
                <p className="field-hint">
                  {form.tenure === 'TENANT'
                    ? 'As a tenant you can be helped with the service charges you are billed for, but not with rates — those belong to the owner.'
                    : 'This decides which proof we ask you for, so please answer it before uploading documents.'}
                </p>
              </div>

              <div className="form-group">
                <label>Does anything below describe your household?</label>
                <select value={form.applicantCategory} onChange={(e) => update('applicantCategory', e.target.value)}>
                  <option value="STANDARD">None of these</option>
                  <option value="PENSIONER">I am a pensioner</option>
                  <option value="DISABLED">I have a disability</option>
                  <option value="DECEASED_ESTATE">The owner has died and I am dealing with the estate</option>
                  <option value="CHILD_HEADED">This household is headed by a young person under 21</option>
                </select>
                <p className="field-hint">Choosing one adds only the documents that case needs. Nothing else changes.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Municipal account number</label>
                  <input value={form.municipalAccountNumber} onChange={(e) => update('municipalAccountNumber', e.target.value)} />
                  <p className="field-hint">From your latest municipal bill. Relief is applied to this account.</p>
                </div>
                <div className="form-group">
                  <label>Eskom account number <span className="optional-tag">optional</span></label>
                  <input value={form.eskomAccountNumber} onChange={(e) => update('eskomAccountNumber', e.target.value)} />
                  <p className="field-hint">Only if Eskom bills you for electricity directly.</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ward number <span className="optional-tag">optional</span></label>
                  <input value={form.wardNumber} onChange={(e) => update('wardNumber', e.target.value)} placeholder="e.g. Ward 12" />
                </div>
                <div className="form-group">
                  <label>Water Meter Number</label>
                  <input value={form.waterMeterNumber} onChange={(e) => update('waterMeterNumber', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Electricity Meter Number</label>
                <input value={form.electricityMeterNumber} onChange={(e) => update('electricityMeterNumber', e.target.value)} />
              </div>

              <h2 className="form-section-title">Who lives here</h2>
              <HouseholdEditor
                applicationId={applicationId}
                onChange={(app) => setForm((f) => ({
                  ...f,
                  peopleOnProperty: app.peopleOnProperty ?? f.peopleOnProperty,
                  childrenUnder18: app.childrenUnder18 ?? f.childrenUnder18,
                  adults: app.adults ?? f.adults,
                  pensionersOver60: app.pensionersOver60 ?? f.pensionersOver60,
                }))}
              />

              <div className="form-row">
                <div className="form-group">
                  <label>Total people on the property</label>
                  <input type="number" min="0" value={form.peopleOnProperty} onChange={(e) => update('peopleOnProperty', e.target.value)} />
                  <p className="field-hint">Counted from the list above, including you. You can correct it if needed.</p>
                </div>
                <div className="form-group">
                  <label>Children under 18</label>
                  <input type="number" min="0" value={form.childrenUnder18} onChange={(e) => update('childrenUnder18', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Adults</label>
                  <input type="number" min="0" value={form.adults} onChange={(e) => update('adults', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Pensioners over 60</label>
                  <input type="number" min="0" value={form.pensionersOver60} onChange={(e) => update('pensionersOver60', e.target.value)} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => saveStep(3)} disabled={loading}>
                  {loading ? 'Saving...' : 'Next'}
                </button>
              </div>
            </>
          )}

          {/* STEP 3 – Household Income */}
          {step === 3 && (
            <>
              {/*
                Income, not employment.

                The old step opened with five fixed amount boxes — salary, old
                age pension, disability pension, business, renting — which could
                hold five kinds of income and no more. A household with two
                grants, or a pension and a lodger, had nowhere to put the second.
                IncomeSources asks where the money comes from and takes as many
                answers as there are.
              */}
              <IncomeSources
                applicationId={applicationId}
                people={form.peopleOnProperty}
                onChange={(application) => {
                  if (!application) return;
                  update('totalHouseholdIncome', application.totalHouseholdIncome ?? '');
                  update('totalIncomePerPerson', application.totalIncomePerPerson ?? '');
                }}
              />

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => saveStep(4)} disabled={loading}>
                  {loading ? 'Saving...' : 'Next'}
                </button>
              </div>
            </>
          )}

          {/* STEP 4 – General */}
          {step === 4 && (
            <>
              <h2 className="form-section-title">General Information</h2>
              {[
                { key: 'ownsImmovableProperty', label: 'Do you own one (1) immovable property in or out of the municipal area?' },
                { key: 'isFullTimeOccupant', label: 'Are you a full-time occupant of the property?' },
                { key: 'incomeBelowThreshold', label: 'Is your income R 4 200.00 or less per month? (Income means the gross monthly income of household)' },
                { key: 'hasMunicipalArrears', label: 'Are there arrears on the municipal account for which this application is being considered?' },
                { key: 'hasArrearsArrangement', label: 'Have you made an arrangement to pay off any of the arrears on the municipal account for which this application is being considered?' },
              ].map((q) => (
                <div className="form-group" key={q.key}>
                  <label>{q.label}</label>
                  <select value={form[q.key]} onChange={(e) => update(q.key, e.target.value)}>
                    <option value="">Select...</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              ))}
              <div className="form-group">
                <label>Do you own any other property anywhere in South Africa?</label>
                <select value={form.ownsOtherProperty} onChange={(e) => update('ownsOtherProperty', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                <p className="field-hint">
                  Saying yes does not automatically disqualify you — an inherited plot with no services is not
                  wealth. But it must be declared.
                </p>
              </div>

              {form.ownsOtherProperty === 'Yes' ? (
                <div className="form-group">
                  <label>Where is it, and what is it?</label>
                  <textarea
                    rows={2}
                    value={form.otherPropertyDetails}
                    onChange={(e) => update('otherPropertyDetails', e.target.value)}
                    placeholder="e.g. An empty inherited plot in Lusikisiki, Eastern Cape"
                  />
                </div>
              ) : null}

              <div className="form-group">
                <label>
                  Money coming in that you think should not count <span className="optional-tag">optional</span>
                </label>
                <textarea
                  rows={2}
                  value={form.incomeExclusions}
                  onChange={(e) => update('incomeExclusions', e.target.value)}
                  placeholder="e.g. Child support grant for two children, NSFAS allowance, money my sister sends some months"
                />
                <p className="field-hint">
                  Child support grants, NSFAS, informal help from family and once-off lump sums are usually excluded.
                  Tell us about them here so they are not counted against you.
                </p>
              </div>

              <h2 className="form-section-title">How you manage day to day</h2>
              <FunctioningQuestions form={form} update={update} />

              <h2 className="form-section-title">Your permission and declaration</h2>
              <p className="field-hint" style={{ marginBottom: '1rem' }}>
                We cannot check your application without these. They are legal requirements, not preferences.
              </p>

              {[
                {
                  key: 'consentSiteVisit',
                  label: 'I agree that a municipal officer may visit and inspect my property.',
                  hint: 'We will try three times. You will be sent an SMS each time we cannot reach you.',
                },
                {
                  key: 'consentDataMatching',
                  label: 'I agree that the municipality may check my details with SARS, UIF, SASSA and credit bureaux.',
                  hint: 'Used only to confirm what you have declared, and only for this application.',
                },
                {
                  key: 'declarationTruthful',
                  label: 'I declare that everything in this application is true and complete.',
                  hint: 'You will sign this under oath on your affidavit. Giving false information is an offence.',
                },
              ].map((c) => (
                <div className="form-group consent-check" key={c.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(form[c.key])}
                      onChange={(e) => update(c.key, e.target.checked)}
                    />
                    <span>{c.label}</span>
                  </label>
                  <p className="field-hint">{c.hint}</p>
                </div>
              ))}

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={() => saveStep(5)} disabled={loading}>
                  {loading ? 'Saving...' : 'Next'}
                </button>
              </div>
            </>
          )}

          {/* STEP 5 – Documents */}
          {step === 5 && (
            <>
              <h2 className="form-section-title">Documents</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginBottom: '1.25rem' }}>
                Upload the required supporting documents. Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 10 MB).
              </p>

              {(() => {
                /**
                 * Evidence of what the household lives on.
                 *
                 * Three documents, any ONE of which is enough: a payslip, a SASSA
                 * grant letter, or bank statements. Presenting them as three
                 * separate required rows is what made people give up — roughly a
                 * fifth of South African adults have no bank account, and being
                 * shown a red "Required" beside Bank Statements reads as a door
                 * closing. So the group is drawn as one obligation with a choice
                 * inside it.
                 */
                const group = documents.filter((d) => d.requirementGroup === 'financial_evidence');
                if (group.length === 0) return null;
                const satisfied = group.some((d) => d.status === 'Uploaded');
                return (
                  <div className={`evidence-group${satisfied ? ' satisfied' : ''}`}>
                    <div className="evidence-head">
                      <Icon name={satisfied ? 'check' : 'info'} size={17} />
                      <div>
                        <strong>Proof of what your household lives on</strong>
                        <p>
                          {satisfied
                            ? 'Thank you — you have given us what we need here. You do not need to add the others.'
                            : 'Send us whichever ONE of these you have. You do not need all three, and you do not need a bank account.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {documents.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '1.5rem 0' }}>
                  No document slots found. Try refreshing the page.
                </p>
              ) : (
                <div className="doc-list">
                  {documents.map((doc) => (
                    <div className="doc-row" key={doc.id}>
                      <div className="doc-row-info">
                        <div className="doc-row-title">{doc.name}</div>
                        <div className="doc-row-meta">
                          <span>{doc.type}</span>
                          <span
                            className={`badge ${
                              doc.requirementGroup
                                ? 'badge-choice'
                                : doc.importance === 'REQUIRED'
                                  ? 'badge-required'
                                  : 'badge-optional'
                            }`}
                          >
                            {doc.requirementGroup
                              ? 'One of these'
                              : doc.importance === 'REQUIRED'
                                ? 'Required'
                                : 'Optional'}
                          </span>
                          <span className={`badge ${doc.status === 'Uploaded' ? 'badge-uploaded' : 'badge-pending'}`}>
                            {doc.status}
                          </span>
                          {doc.fileName && (
                            <span style={{ color: 'var(--gray-500)' }}>{doc.fileName}</span>
                          )}
                        </div>
                      </div>
                      <div className="doc-row-actions">
                        {doc.status !== 'Uploaded' ? (
                          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                            <Icon name="upload" size={14} /> Upload
                            <input
                              type="file"
                              hidden
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) handleUpload(doc.id, e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        ) : (
                          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                            Replace
                            <input
                              type="file"
                              hidden
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                if (e.target.files[0]) handleUpload(doc.id, e.target.files[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setStep(4)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </AppLayout>
  );
}

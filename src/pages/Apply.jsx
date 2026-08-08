import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Stepper from '../components/Stepper';
import AddressCapture from '../components/AddressCapture';
import HouseholdEditor from '../components/HouseholdEditor';
import DerivedIdentity from '../components/DerivedIdentity';
import FunctioningQuestions from '../components/FunctioningQuestions';
import OtpModal from '../components/OtpModal';
import api from '../services/api';
import Icon from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../utils/apiError';

// Enum fields start blank on purpose. Defaulting them (e.g. to EMPLOYED) would
// record an answer the applicant never gave.
const emptyForm = {
  maritalStatus: '',
  surname: '',
  names: '',
  idNumber: '',
  cellNumber: '',
  residentialAddress: '',
  addressLatitude: '',
  addressLongitude: '',
  addressFormatted: '',
  addressSource: '',
  addressAccuracyM: '',
  postalAddress: '',
  employerName: '',
  employerAddress: '',
  workTelNumber: '',
  employmentStatus: '',
  cellVerified: false,
  peopleOnProperty: '',
  childrenUnder18: '',
  adults: '',
  pensionersOver60: '',
  waterMeterNumber: '',
  electricityMeterNumber: '',
  salary: '',
  oldAgePension: '',
  disabilityPension: '',
  businessIncome: '',
  rentingIncome: '',
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
    'maritalStatus', 'surname', 'names', 'idNumber', 'cellNumber',
    'residentialAddress', 'postalAddress', 'employerName', 'employerAddress',
    'workTelNumber', 'employmentStatus', 'waterMeterNumber', 'electricityMeterNumber',
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

  // Booleans
  if (typeof form.cellVerified === 'boolean') {
    payload.cellVerified = form.cellVerified;
  }

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
  const moneyFields = [
    'salary', 'oldAgePension', 'disabilityPension',
    'businessIncome', 'rentingIncome',
  ];
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
  const [showOtp, setShowOtp] = useState(false);
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
          maritalStatus: draft.maritalStatus || '',
          surname: draft.surname || '',
          names: draft.names || '',
          idNumber: draft.idNumber || '',
          cellNumber: draft.cellNumber || '',
          residentialAddress: draft.residentialAddress || '',
          addressLatitude: draft.addressLatitude ?? '',
          addressLongitude: draft.addressLongitude ?? '',
          addressFormatted: draft.addressFormatted || '',
          addressSource: draft.addressSource || '',
          addressAccuracyM: draft.addressAccuracyM ?? '',
          postalAddress: draft.postalAddress || '',
          employerName: draft.employerName || '',
          employerAddress: draft.employerAddress || '',
          workTelNumber: draft.workTelNumber || '',
          employmentStatus: draft.employmentStatus || '',
          cellVerified: !!draft.cellVerified,
          peopleOnProperty: draft.peopleOnProperty ?? '',
          childrenUnder18: draft.childrenUnder18 ?? '',
          adults: draft.adults ?? '',
          pensionersOver60: draft.pensionersOver60 ?? '',
          waterMeterNumber: draft.waterMeterNumber || '',
          electricityMeterNumber: draft.electricityMeterNumber || '',
          salary: draft.salary ?? '',
          oldAgePension: draft.oldAgePension ?? '',
          disabilityPension: draft.disabilityPension ?? '',
          businessIncome: draft.businessIncome ?? '',
          rentingIncome: draft.rentingIncome ?? '',
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

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

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

  const sendOtp = async () => {
    if (!form.cellNumber || form.cellNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid cell number first (at least 10 digits)');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/auth/send-otp', { cellNumber: form.cellNumber });
      if (res.data.demoOtp) {
        console.log('Demo OTP:', res.data.demoOtp);
        setSuccess(`OTP sent (demo code: ${res.data.demoOtp})`);
      } else {
        setSuccess(res.data.message || 'OTP sent');
      }
      setShowOtp(true);
    } catch (err) {
      setError(friendlyError(err, 'Failed to send OTP'));
    }
  };

  const verifyOtp = async (code) => {
    await api.post('/auth/verify-otp', { cellNumber: form.cellNumber, code });
    update('cellVerified', true);
    // Persist verification on the application. If this fails the UI must not claim
    // the number is verified when the database says otherwise.
    {
      try {
        const id = await ensureApplication();
        await api.patch(`/applications/${id}`, { cellVerified: true, cellNumber: form.cellNumber });
      } catch (err) {
        update('cellVerified', false);
        setShowOtp(false);
        setError(
          friendlyError(err, 'Code accepted, but we could not save the verification. Please try again.')
        );
        return;
      }
    }
    setShowOtp(false);
    toast.success('Cell number verified', 'You can carry on with your application.');
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
              <div className="form-row">
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
                    Date of birth, age and sex are all in these thirteen digits,
                    so we read them back instead of asking again. Showing them
                    also catches a mistyped digit here rather than at
                    verification.
                  */}
                  <DerivedIdentity idNumber={form.idNumber} />
                </div>
                <div className="form-group">
                  <label>Cell Number</label>
                  <div className="input-with-btn">
                    <input value={form.cellNumber} onChange={(e) => update('cellNumber', e.target.value)} placeholder="081 591 2000" />
                    <button type="button" className="btn btn-primary btn-sm" onClick={sendOtp}>
                      {form.cellVerified ? <><Icon name="check" size={14} /> Verified</> : 'Send OTP'}
                    </button>
                  </div>
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
              <div className="form-group">
                <label>Postal Address</label>
                <input value={form.postalAddress} onChange={(e) => update('postalAddress', e.target.value)} placeholder="Postal address" />
              </div>
              <div className="form-group">
                <label>Name of Employer</label>
                <input value={form.employerName} onChange={(e) => update('employerName', e.target.value)} placeholder="Employer name" />
              </div>
              <div className="form-group">
                <label>Employer's Address</label>
                <input value={form.employerAddress} onChange={(e) => update('employerAddress', e.target.value)} placeholder="Employer address" />
              </div>
              <div className="form-group">
                <label>Work Tel. Number</label>
                <input value={form.workTelNumber} onChange={(e) => update('workTelNumber', e.target.value)} placeholder="Work telephone" />
              </div>
              <div className="form-group">
                <label>Employment Status</label>
                <select value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)}>
                  <option value="">Select...</option>
                  <option value="EMPLOYED">Employed</option>
                  <option value="UNEMPLOYED">Unemployed</option>
                  <option value="SELF_EMPLOYED">Self-employed</option>
                  <option value="PENSIONER">Pensioner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
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
              <h2 className="form-section-title">Household Income</h2>
              <div className="form-group">
                <label>Salary</label>
                <input type="number" step="0.01" min="0" value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="R 0.00" />
              </div>
              <div className="form-group">
                <label>Old Age Pension</label>
                <input type="number" step="0.01" min="0" value={form.oldAgePension} onChange={(e) => update('oldAgePension', e.target.value)} placeholder="R 0.00" />
              </div>
              <div className="form-group">
                <label>Disability Pension</label>
                <input type="number" step="0.01" min="0" value={form.disabilityPension} onChange={(e) => update('disabilityPension', e.target.value)} placeholder="R 0.00" />
              </div>
              <div className="form-group">
                <label>Business from Home Spaza/Shebeen etc</label>
                <input type="number" step="0.01" min="0" value={form.businessIncome} onChange={(e) => update('businessIncome', e.target.value)} placeholder="R 0.00" />
              </div>
              <div className="form-group">
                <label>Renting Part of House</label>
                <input type="number" step="0.01" min="0" value={form.rentingIncome} onChange={(e) => update('rentingIncome', e.target.value)} placeholder="R 0.00" />
              </div>
              {/* The household total is the figure the qualifying threshold is
                  assessed against, so it is shown live rather than only after a
                  save — an applicant should never answer step 4's threshold
                  question without seeing the number it refers to. */}
              {(() => {
                const total = ['salary', 'oldAgePension', 'disabilityPension', 'businessIncome', 'rentingIncome']
                  .reduce((sum, k) => sum + (Number(form[k]) || 0), 0);
                const people = Number(form.peopleOnProperty) || 0;
                const perPerson = people > 0 ? total / people : null;
                const anyEntered = ['salary', 'oldAgePension', 'disabilityPension', 'businessIncome', 'rentingIncome']
                  .some((k) => form[k] !== '' && form[k] != null);
                const money = (v) => `R ${Number(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

                if (!anyEntered) return null;
                return (
                  <div
                    style={{
                      marginTop: '1.25rem', padding: '1rem',
                      background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                      <span style={{ fontWeight: 600 }}>Total household income</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 650 }}>{money(total)}</span>
                    </div>
                    {perPerson !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.35rem', fontSize: '.875rem', color: 'var(--gray-500)' }}>
                        <span>Per person across {people} {people === 1 ? 'person' : 'people'}</span>
                        <span>{money(perPerson)}</span>
                      </div>
                    )}
                    <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--gray-200)', fontSize: '.8125rem' }}>
                      {total <= 4200 ? (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                          <Icon name="check-circle" size={15} />
                          This is at or below the R4 200 monthly threshold.
                        </span>
                      ) : (
                        <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'flex-start', gap: '.4rem' }}>
                          <Icon name="alert-triangle" size={15} style={{ marginTop: '.1rem' }} />
                          <span>
                            This is above the R4 200 monthly threshold. You may still apply — an official
                            will assess your circumstances.
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
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

      {showOtp && (
        <OtpModal
          cellNumber={form.cellNumber}
          onVerify={verifyOtp}
          onCancel={() => setShowOtp(false)}
          onResend={sendOtp}
        />
      )}

    </AppLayout>
  );
}

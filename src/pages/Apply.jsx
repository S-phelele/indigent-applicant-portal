import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Stepper from '../components/Stepper';
import OtpModal from '../components/OtpModal';
import api from '../services/api';

const emptyForm = {
  maritalStatus: 'SINGLE',
  surname: '',
  names: '',
  idNumber: '',
  cellNumber: '',
  residentialAddress: '',
  postalAddress: '',
  employerName: '',
  employerAddress: '',
  workTelNumber: '',
  employmentStatus: 'EMPLOYED',
  cellVerified: false,
  addressLatitude: null,
  addressLongitude: null,
  addressFormatted: '',
  addressPlaceId: '',
  addressVerified: false,
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
  if (typeof form.addressVerified === 'boolean') {
    payload.addressVerified = form.addressVerified;
  }

  // Address coordinates from Google verification
  if (form.addressLatitude != null && form.addressLatitude !== '') {
    const lat = toNum(form.addressLatitude);
    if (lat !== undefined) payload.addressLatitude = lat;
  }
  if (form.addressLongitude != null && form.addressLongitude !== '') {
    const lng = toNum(form.addressLongitude);
    if (lng !== undefined) payload.addressLongitude = lng;
  }
  if (form.addressFormatted) payload.addressFormatted = form.addressFormatted;
  if (form.addressPlaceId) payload.addressPlaceId = form.addressPlaceId;

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
    'hasMunicipalArrears', 'hasArrearsArrangement',
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
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const navigate = useNavigate();

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
          maritalStatus: draft.maritalStatus || 'SINGLE',
          surname: draft.surname || '',
          names: draft.names || '',
          idNumber: draft.idNumber || '',
          cellNumber: draft.cellNumber || '',
          residentialAddress: draft.residentialAddress || '',
          postalAddress: draft.postalAddress || '',
          employerName: draft.employerName || '',
          employerAddress: draft.employerAddress || '',
          workTelNumber: draft.workTelNumber || '',
          employmentStatus: draft.employmentStatus || 'EMPLOYED',
          cellVerified: !!draft.cellVerified,
          addressLatitude: draft.addressLatitude ?? null,
          addressLongitude: draft.addressLongitude ?? null,
          addressFormatted: draft.addressFormatted || '',
          addressPlaceId: draft.addressPlaceId || '',
          addressVerified: !!draft.addressVerified,
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
        // Create a new draft
        const create = await api.post('/applications');
        const app = create.data.data;
        setApplicationId(app.id);
        setDocuments(app.documents || []);
        // Prefill from user profile if available
        if (app.surname || app.names || app.idNumber || app.cellNumber) {
          setForm((f) => ({
            ...f,
            surname: app.surname || f.surname,
            names: app.names || f.names,
            idNumber: app.idNumber || f.idNumber,
            cellNumber: app.cellNumber || f.cellNumber,
          }));
        }
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

  const update = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Editing address invalidates previous Google verification
      if (field === 'residentialAddress' && f.addressVerified) {
        next.addressVerified = false;
        next.addressLatitude = null;
        next.addressLongitude = null;
        next.addressFormatted = '';
        next.addressPlaceId = '';
      }
      return next;
    });
  };

  const verifyAddress = async () => {
    if (!form.residentialAddress || !form.residentialAddress.trim()) {
      setError('Please enter a residential address to verify');
      return;
    }
    setVerifyingAddress(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/geocode', {
        address: form.residentialAddress.trim(),
        applicationId: applicationId || undefined,
      });
      const data = res.data.data;
      setForm((f) => ({
        ...f,
        residentialAddress: data.formattedAddress || f.residentialAddress,
        addressLatitude: data.latitude,
        addressLongitude: data.longitude,
        addressFormatted: data.formattedAddress || '',
        addressPlaceId: data.placeId || '',
        addressVerified: true,
      }));
      if (data.application?.id) {
        setApplicationId(data.application.id);
      }
      setSuccess(
        data.partialMatch
          ? 'Address found (partial match). Please confirm it looks correct on the map.'
          : 'Address verified on Google Maps'
      );
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Could not verify address on Google Maps');
    } finally {
      setVerifyingAddress(false);
    }
  };

  const saveStep = async (nextStep) => {
    if (!applicationId) {
      setError('Application not ready. Please refresh the page and try again.');
      // Attempt to re-init
      await initApplication();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = buildPayload(form, nextStep);
      const res = await api.patch(`/applications/${applicationId}`, payload);

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
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const verifyOtp = async (code) => {
    await api.post('/auth/verify-otp', { cellNumber: form.cellNumber, code });
    update('cellVerified', true);
    // Persist verification on the application
    if (applicationId) {
      try {
        await api.patch(`/applications/${applicationId}`, { cellVerified: true, cellNumber: form.cellNumber });
      } catch (_) {}
    }
    setShowOtp(false);
    setSuccess('Cell number verified successfully');
  };

  const handleUpload = async (docId, file) => {
    if (!file || !applicationId) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentId', docId);
    setError('');
    try {
      const res = await api.post(`/documents/${applicationId}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((docs) =>
        docs.map((d) => (d.id === docId ? res.data.data : d))
      );
      setSuccess('Document uploaded');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    }
  };

  const handleSubmit = async () => {
    if (!applicationId) {
      setError('Application not ready. Please refresh and try again.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Save current step data first
      await api.patch(`/applications/${applicationId}`, buildPayload(form, 5));
      await api.post(`/applications/${applicationId}/submit`);
      setSuccess('Application submitted successfully!');
      setTimeout(() => navigate('/my-applications'), 1500);
    } catch (err) {
      console.error('submit error:', err);
      let msg = err.response?.data?.message || 'Submit failed';
      if (err.response?.data?.missing) {
        msg = `Missing required documents: ${err.response.data.missing.join(', ')}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="app-page">
        <Header />
        <div className="loading">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <Header />
      <div className="app-content">
        <button
          type="button"
          className="back-link"
          onClick={() => (step > 1 ? setStep(step - 1) : navigate('/my-applications'))}
        >
          ← Back
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
                  <input value={form.idNumber} onChange={(e) => update('idNumber', e.target.value)} placeholder="13-digit ID" />
                </div>
                <div className="form-group">
                  <label>Cell Number</label>
                  <div className="input-with-btn">
                    <input value={form.cellNumber} onChange={(e) => update('cellNumber', e.target.value)} placeholder="081 591 2000" />
                    <button type="button" className="btn btn-primary btn-sm" onClick={sendOtp}>
                      {form.cellVerified ? '✓ Verified' : 'Send OTP'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Residential Address</label>
                <div className="input-with-btn" style={{ alignItems: 'stretch' }}>
                  <input
                    value={form.residentialAddress}
                    onChange={(e) => update('residentialAddress', e.target.value)}
                    placeholder="e.g. 864 South St, Montague Gardens, Cape Town"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={verifyAddress}
                    disabled={verifyingAddress || !form.residentialAddress?.trim()}
                    style={{ whiteSpace: 'nowrap', minWidth: '7.5rem' }}
                  >
                    {verifyingAddress ? 'Verifying…' : form.addressVerified ? '✓ Verified' : 'Verify on Map'}
                  </button>
                </div>
                {form.addressVerified && form.addressFormatted && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    <span className="badge badge-uploaded" style={{ marginRight: '0.4rem' }}>Verified</span>
                    {form.addressFormatted}
                  </p>
                )}
                {form.addressVerified && form.addressLatitude != null && form.addressLongitude != null && (
                  <div className="map-preview" style={{ marginTop: '0.75rem' }}>
                    <iframe
                      title="Verified address map"
                      width="100%"
                      height="220"
                      style={{ border: 0, borderRadius: '8px' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${form.addressLatitude},${form.addressLongitude}&z=16&output=embed`}
                    />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${form.addressLatitude},${form.addressLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.85rem' }}
                    >
                      Open in Google Maps ↗
                    </a>
                  </div>
                )}
              </div>
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
                  <option value="EMPLOYED">Employed</option>
                  <option value="UNEMPLOYED">Unemployed</option>
                  <option value="SELF_EMPLOYED">Self-employed</option>
                  <option value="PENSIONER">Pensioner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => navigate('/my-applications')}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => saveStep(2)} disabled={loading || !applicationId}>
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
                <label>Number of people living on property</label>
                <input type="number" min="0" value={form.peopleOnProperty} onChange={(e) => update('peopleOnProperty', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Children (Under 18)</label>
                <input type="number" min="0" value={form.childrenUnder18} onChange={(e) => update('childrenUnder18', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Adults</label>
                <input type="number" min="0" value={form.adults} onChange={(e) => update('adults', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Pensioners over 60</label>
                <input type="number" min="0" value={form.pensionersOver60} onChange={(e) => update('pensionersOver60', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Water Meter Number</label>
                <input value={form.waterMeterNumber} onChange={(e) => update('waterMeterNumber', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Electricity Meter Number</label>
                <input value={form.electricityMeterNumber} onChange={(e) => update('electricityMeterNumber', e.target.value)} />
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
              <div className="form-group">
                <label>Total Income per Person (auto-calculated on save)</label>
                <input
                  type="text"
                  value={
                    form.totalIncomePerPerson !== '' && form.totalIncomePerPerson != null
                      ? `R ${Number(form.totalIncomePerPerson).toFixed(2)}`
                      : ''
                  }
                  readOnly
                  placeholder="Calculated after you click Next"
                />
              </div>
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
                          <span className={`badge ${doc.importance === 'REQUIRED' ? 'badge-required' : 'badge-optional'}`}>
                            {doc.importance === 'REQUIRED' ? 'Required' : 'Optional'}
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
                            ↑ Upload
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

      <footer className="footer">Terms & Conditions © 2024. All rights reserved.</footer>
    </div>
  );
}

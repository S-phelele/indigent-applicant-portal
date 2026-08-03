import { useState, useRef, useEffect } from 'react';

export default function OtpModal({ cellNumber, onVerify, onCancel, onResend }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const masked = cellNumber ? `*** *** ${cellNumber.slice(-4)}` : '****';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Verify your information</h2>
        <p>Please enter the OTP we have sent to your number ending in {masked}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="otp-inputs">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>
        <button type="button" className="header-link" style={{ marginBottom: '1rem' }} onClick={onResend}>
          Resend OTP
        </button>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleVerify} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </div>
      </div>
    </div>
  );
}

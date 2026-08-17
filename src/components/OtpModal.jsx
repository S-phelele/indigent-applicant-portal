import { useState, useRef, useEffect } from 'react';
import Modal from './ui/Modal';
import Icon from './ui/Icon';
import { friendlyError } from '../utils/apiError';

export default function OtpModal({ cellNumber, onVerify, onCancel, onResend }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const setAt = (i, val) => {
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    return next;
  };

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = setAt(i, val.slice(-1));
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every((d) => d)) submit(next.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  };

  // Let the applicant paste the whole code from their SMS.
  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) submit(text);
  };

  const submit = async (code) => {
    if (code.length !== 6) {
      setError('Enter all six digits of the code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(friendlyError(err, 'That code is not valid. Request a new one and try again.'));
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const masked = cellNumber ? `••• ••• ${String(cellNumber).slice(-4)}` : 'your number';

  return (
    <Modal
      open
      onClose={loading ? undefined : onCancel}
      title="Verify your cell number"
      description={`Enter the six-digit code we sent to ${masked}.`}
      icon="phone"
      iconVariant="info"
      footer={
        <>
          {/* Omitted where there is nothing to cancel back to — on the verify
              page this modal *is* the page, and a Cancel button that does
              nothing is worse than no button. */}
          {onCancel ? (
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => submit(digits.join(''))} disabled={loading}>
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
        </>
      }
    >
      {error ? (
        <div className="alert alert-error" role="alert">
          <Icon name="alert-circle" size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="otp-inputs" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of 6`}
            disabled={loading}
          />
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '.8125rem', color: 'var(--ink-mute)', margin: 0 }}>
        Didn&apos;t get it?{' '}
        <button
          type="button"
          onClick={onResend}
          disabled={loading}
          style={{ border: 0, background: 'none', color: 'var(--brand)', font: 'inherit', cursor: 'pointer', padding: 0 }}
        >
          Send a new code
        </button>
      </p>
    </Modal>
  );
}

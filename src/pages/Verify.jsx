import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import OtpModal from '../components/OtpModal';
import Icon from '../components/ui/Icon';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { friendlyError } from '../utils/apiError';

/**
 * Verify the cell number — before an application, not inside one.
 *
 * This used to be a modal on step 1 of the wizard, and it could be ignored: the
 * application saved happily with an unverified number and went on to a review
 * queue. The municipality answers by SMS, so that produced decisions nobody was
 * told about.
 *
 * The account is created first and kept. Somebody who mistyped their number is
 * not locked out — they change it on their profile and a new code is sent. What
 * they cannot do is send an application the municipality has no way to answer.
 *
 * The code is already on its way when this page opens, because registration
 * issues one.
 */
export default function Verify() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(45);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Somebody who is already verified has no business here.
  useEffect(() => {
    if (user?.isVerified) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const resend = async () => {
    setError('');
    setNotice('');
    try {
      const res = await api.post('/auth/send-otp', { cellNumber: user?.cellNumber });
      setCooldown(45);
      /**
       * In development the server returns the code so the flow is testable
       * without an SMS gateway. Labelled as a development aid, because a code
       * appearing on screen with no explanation looks like a leak.
       */
      setNotice(res.data.demoOtp
        ? `${res.data.message}. Development code: ${res.data.demoOtp}`
        : res.data.message);
    } catch (err) {
      setError(friendlyError(err, 'We could not send the code. Please try again in a moment.'));
    }
  };

  const verify = async (code) => {
    const res = await api.post('/auth/verify-otp', { cellNumber: user?.cellNumber, code });
    // Taken from what the server actually did, not assumed — a 200 here used to
    // mean "the code was right", which is not the same thing as "an account was
    // verified", and the gap between those two was exactly the bug that stranded
    // people who had resent their code.
    setUser((current) => (current ? { ...current, isVerified: Boolean(res.data?.data?.user?.isVerified) } : current));
    navigate('/dashboard', { replace: true });
  };

  return (
    <AppLayout title="Verify your cell number">
      <div className="panel">
        <p className="lede">
          We sent a six-digit code to <strong>{user?.cellNumber}</strong>. The municipality sends every
          update about your application by SMS, so we need to know this number reaches you.
        </p>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {notice && !error ? <div className="alert alert-info">{notice}</div> : null}

        <p className="muted">
          <Icon name="info" size={14} /> If this number is wrong,{' '}
          <button type="button" className="btn-link" onClick={() => navigate('/profile')}>
            change it on your profile
          </button>{' '}
          and we will send a new code. You cannot start an application until it is verified.
        </p>
      </div>

      {/*
        Rendered inline rather than as a dismissible overlay. There is nothing
        behind it to go back to — this is the whole page until the number is
        verified — and a modal with a close button would imply otherwise.
      */}
      <OtpModal
        cellNumber={user?.cellNumber}
        onVerify={verify}
        onResend={cooldown > 0 ? null : resend}
        onCancel={null}
      />
    </AppLayout>
  );
}

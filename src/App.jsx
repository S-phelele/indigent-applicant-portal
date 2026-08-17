import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Apply from './pages/Apply';
import MyApplications from './pages/MyApplications';
import ApplicationDetail from './pages/ApplicationDetail';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import Help from './pages/Help';
import Notifications from './pages/Notifications';
import Privacy from './pages/Privacy';
import Verify from './pages/Verify';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><span className="spinner" /> Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  /**
   * An unverified applicant sees one page until the number is proved.
   *
   * The API refuses every other route with CELL_VERIFICATION_REQUIRED, so
   * rendering a screen whose every request will fail only wastes their time and
   * their data.
   */
  if (user.role === 'APPLICANT' && !user.isVerified) return <Navigate to="/verify" replace />;
  return children;
}

/** Signed in, but not yet past the verification gate. */
function VerifyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><span className="spinner" /> Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public pages keep the marketing header. */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Signed-in pages share the sidebar shell. */}
      <Route path="/verify" element={<VerifyRoute><Verify /></VerifyRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/apply/*" element={<PrivateRoute><Apply /></PrivateRoute>} />
      <Route path="/my-applications" element={<PrivateRoute><MyApplications /></PrivateRoute>} />
      <Route path="/applications/:id" element={<PrivateRoute><ApplicationDetail /></PrivateRoute>} />
      <Route path="/documents" element={<PrivateRoute><Documents /></PrivateRoute>} />
      {/*
        Reachable while unverified, deliberately.

        The verify page tells somebody who mistyped their number to correct it
        here. Behind the normal guard that instruction is a loop: /profile
        redirects to /verify, which points back at /profile. The API allows
        PATCH /auth/me while unverified for the same reason.
      */}
      <Route path="/profile" element={<VerifyRoute><Profile /></VerifyRoute>} />
      <Route path="/help" element={<PrivateRoute><Help /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/privacy" element={<PrivateRoute><Privacy /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

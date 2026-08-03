import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Apply from './pages/Apply';
import MyApplications from './pages/MyApplications';
import Header from './components/Header';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/apply/*"
        element={
          <PrivateRoute>
            <Apply />
          </PrivateRoute>
        }
      />
      <Route
        path="/my-applications"
        element={
          <PrivateRoute>
            <>
              <Header />
              <MyApplications />
            </>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

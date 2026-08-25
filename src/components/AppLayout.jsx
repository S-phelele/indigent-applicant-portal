import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AppSidebar from './AppSidebar';
import Icon from './ui/Icon';
import NotificationBell from './ui/NotificationBell';
import { ConfirmModal } from './ui/Modal';

const COLLAPSE_KEY = 'applicant_sidebar_collapsed';

/**
 * Shell for signed-in applicant pages.
 *
 * The current application is loaded once here and shared through context, so the
 * sidebar status block, the dashboard and the documents page all agree without
 * each fetching separately.
 */
const ApplicationContext = createContext({ application: null, applications: [], refresh: () => {}, loading: true });

export const useApplication = () => useContext(ApplicationContext);

export default function AppLayout({ children, title, description, actions }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); }, [collapsed]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/applications/mine');
      setApplications(res.data.data || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleSidebar = () => {
    if (window.matchMedia('(max-width: 900px)').matches) setDrawerOpen((v) => !v);
    else setCollapsed((v) => !v);
  };

  // The draft is what the applicant is working on; otherwise show the newest.
  const application = applications.find((a) => a.status === 'DRAFT') || applications[0] || null;

  return (
    <ApplicationContext.Provider value={{ application, applications, refresh, loading }}>
      <div className={`admin-shell${collapsed ? ' collapsed' : ''}`}>
        <AppSidebar
          open={drawerOpen}
          collapsed={collapsed}
          application={application}
          onNavigate={() => setDrawerOpen(false)}
          onSignOut={() => setConfirmSignOut(true)}
        />

        {drawerOpen ? (
          <div className="sidebar-overlay" onClick={() => setDrawerOpen(false)} role="presentation" />
        ) : null}

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                aria-expanded={!collapsed}
              >
                <Icon name={collapsed ? 'chevrons-right' : 'chevrons-left'} size={18} />
              </button>
              {title ? <h1 className="topbar-title">{title}</h1> : null}
            </div>
            <div className="topbar-actions">
              {actions}
              <NotificationBell />
            </div>
          </header>

          <main className="admin-content">
            {description ? (
              <div className="page-head"><div><p>{description}</p></div></div>
            ) : null}
            {children}
          </main>

          <footer className="app-shell-footer">Powered by Malcam ICT Solutions</footer>
        </div>

        <ConfirmModal
          open={confirmSignOut}
          title="Sign out?"
          description="Your application is saved. You can sign back in at any time to carry on."
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          variant="danger"
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={() => { logout(); navigate('/'); }}
        />
      </div>
    </ApplicationContext.Provider>
  );
}

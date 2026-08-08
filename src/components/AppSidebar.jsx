import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './ui/Icon';

const SECTIONS = [
  {
    label: 'My account',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/apply', label: 'Application form', icon: 'edit' },
      { to: '/my-applications', label: 'My applications', icon: 'applications' },
      { to: '/documents', label: 'Documents', icon: 'file' },
    ],
  },
  {
    label: 'Settings',
    links: [
      { to: '/notifications', label: 'Notifications', icon: 'bell' },
      { to: '/profile', label: 'Profile', icon: 'user' },
      { to: '/privacy', label: 'Your information', icon: 'shield' },
      { to: '/help', label: 'Help & FAQ', icon: 'help' },
    ],
  },
];

const initials = (user) => {
  const parts = [user?.firstName, user?.lastName].filter(Boolean);
  if (parts.length) return parts.map((s) => s[0]).join('').toUpperCase();
  return (user?.email || 'A').slice(0, 2).toUpperCase();
};

/**
 * Applicant navigation.
 *
 * The status block is the point of this sidebar: an applicant's main question is
 * "where is my application up to", and this answers it on every screen without
 * making them navigate anywhere.
 */
export default function AppSidebar({ open, collapsed, onNavigate, onSignOut, application }) {
  const { user } = useAuth();

  const status = application?.status;
  const step = application?.currentStep || 1;
  const progress = status === 'DRAFT' ? Math.round((Math.min(step, 5) / 5) * 100) : status ? 100 : 0;

  const statusLabel = {
    DRAFT: `In progress — step ${Math.min(step, 5)} of 5`,
    PENDING: 'Submitted, awaiting review',
    APPROVED: 'Approved',
    DECLINED: 'Not approved',
  }[status] || 'No application yet';

  return (
    <aside className={`admin-sidebar applicant-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="sidebar-mark" aria-hidden="true">IR</span>
        <span className="sidebar-brand-text">
          <span className="sidebar-brand-title">Indigent Register</span>
          <span className="sidebar-brand-sub">Municipal Support</span>
        </span>
      </div>

      {!collapsed ? (
        <div className="applicant-status">
          <div className="applicant-status-label">Application status</div>
          <div className="applicant-status-value">{statusLabel}</div>
          {status === 'DRAFT' ? (
            <div className="applicant-status-bar">
              <div className="applicant-status-fill" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <nav className="sidebar-nav">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section">{section.label}</div>
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={onNavigate}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-icon"><Icon name={link.icon} size={17} /></span>
                <span className="sidebar-link-label">{link.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">{initials(user)}</span>
          <span className="sidebar-user-text">
            <span className="sidebar-user-name">
              {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email}
            </span>
            <span className="sidebar-user-role">
              {user?.isVerified ? 'Verified' : 'Not verified'}
            </span>
          </span>
          <button type="button" className="sidebar-signout" onClick={onSignOut} title="Sign out" aria-label="Sign out">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/sidebar.css';

function Sidebar() {
  // 👇 we assume AuthContext stores societyMemberships from login response
  const { user, societyMemberships = [] } = useAuth();

  if (!user) return null;

  const isSuperAdmin = user.role === 'super_admin';
  const isStudent = user.role === 'student';

  const isSocietyCore =
    isStudent &&
    Array.isArray(societyMemberships) &&
    societyMemberships.some((m) => m.is_core);

  // Label under logo
  let roleLabel = 'User';
  if (isSuperAdmin) {
    roleLabel = 'Super Admin';
  } else if (isStudent && isSocietyCore) {
    roleLabel = 'Student · Society Admin';
  } else if (isStudent) {
    roleLabel = 'Student';
  }

  // ====== Link configs ======

  const studentLinks = [
    { to: '/student', label: 'Dashboard', icon: '🏠' },
    { to: '/student/events', label: 'All Events', icon: '📅' },
    { to: '/student/registrations', label: 'My Registrations', icon: '📝' },
    { to: '/student/volunteers', label: 'My Volunteering', icon: '🤝' },
    { to: '/student/certificates', label: 'My Certificates', icon: '🎓' },
    { to: '/student/settings', label: 'Settings', icon: '⚙️' },
  ];

  const societyAdminLinks = [
    { to: '/society', label: 'Dashboard', icon: '▦' },
    { to: '/society/events', label: 'Events', icon: '📅' },
    { to: '/society/registrations', label: 'Registrations', icon: '📝' },
    { to: '/society/volunteers', label: 'Volunteers', icon: '🤝' },
    { to: '/society/teams', label: 'Teams', icon: '👥' },
    { to: '/society/attendance', label: 'Attendance', icon: '✅' },
    { to: '/society/certificates', label: 'Certificates', icon: '🎓' },
    { to: '/society/templates', label: 'Templates', icon: '📄' },
  ];

  const superAdminLinks = [
    { to: '/admin', label: 'Dashboard', icon: '▦' },
    { to: '/admin/students', label: 'Students', icon: '👥' },
    { to: '/admin/society-admins', label: 'Society Admins', icon: '🛡️' },
    { to: '/admin/societies', label: 'Societies', icon: '🏛️' },
    { to: '/admin/events', label: 'Global Events', icon: '📅' },
    { to: '/admin/certificates', label: 'Certificates', icon: '🎓' },
    { to: '/admin/logs', label: 'System Logs', icon: '📈' },
    // { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  const renderLink = (link) => (
    <NavLink
      key={link.to}
      to={link.to}
      className={({ isActive }) =>
        'sidebar-link' + (isActive ? ' sidebar-link--active' : '')
      }
    >
      <span className="sidebar-link-icon">{link.icon}</span>
      <span className="sidebar-link-label">{link.label}</span>
    </NavLink>
  );

  return (
    <aside className="app-sidebar">
      {/* Logo + role */}
      <div className="sidebar-header">
        <div className="sidebar-logo">EventSphere</div>
        <div className="sidebar-role">{roleLabel}</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Super admin only */}
        {isSuperAdmin && superAdminLinks.map(renderLink)}

        {/* Pure student (no core membership) */}
        {isStudent && !isSocietyCore && studentLinks.map(renderLink)}

        {/* Student + Society Admin (core member) */}
        {isStudent && isSocietyCore && (
          <>
            <div className="sidebar-section-label">Student Area</div>
            {studentLinks.map(renderLink)}

            <div className="sidebar-section-label">Society Admin</div>
            {societyAdminLinks.map(renderLink)}
          </>
        )}
      </nav>

      {/* Footer with user info (UI only for now) */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-name">
            {user.name || 'Admin User'}
          </div>
          <div className="sidebar-user-email">{user.email}</div>
        </div>
        <div className="sidebar-logout-row">
          <span className="sidebar-logout-icon">↩</span>
          <span className="sidebar-logout-label">Logout</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

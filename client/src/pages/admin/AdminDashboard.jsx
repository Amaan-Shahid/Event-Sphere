// src/pages/admin/AdminDashboardPage.jsx
import { useEffect, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';
import { useNavigate } from 'react-router-dom';

function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: { total: 0, new_last_30: 0 },
    societies: { total: 0, pending: 0 },
    events: { total: 0, active: 0 },
    certificates: { issued_this_year: 0 },
    recentActivity: [],
  });

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOverview();
      if (res.success) {
        setStats(res.data);
      } else {
        console.error('Overview error payload:', res);
        alert(res.message || 'Failed to load overview stats');
      }
    } catch (err) {
      console.error('Overview API error:', err);
      alert(
        err?.response?.data?.message ||
          'Failed to load dashboard stats'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const { students, societies, events, certificates, recentActivity } = stats;

  return (
    <div className="admin-dashboard-page">
      {/* ===== Header: title + search + profile ===== */}
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">System Overview</div>
          <div className="admin-page-subtitle">
            Monitor and manage the entire EventSphere platform
          </div>
        </div>

        <div className="admin-page-header-right">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search..."
          />
          <button type="button" className="admin-icon-button">
            🔔
          </button>
          <div className="admin-profile-chip">
            <div className="admin-profile-info">
              <span className="admin-profile-name">Super Admin</span>
              <span className="admin-profile-role">super_admin</span>
            </div>
            <div className="admin-profile-avatar">S</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* ===== Top metric cards ===== */}
          <div className="admin-metrics-grid">
            {/* Total Students */}
            <div className="admin-metric-card">
              <div className="admin-metric-header">
                <span>Total Students</span>
                <div className="admin-metric-icon">👥</div>
              </div>
              <div className="admin-metric-value">
                {students.total.toLocaleString()}
              </div>
              <div className="admin-metric-sub">
                {students.new_last_30} new this month
              </div>
              {/* static trend text just for UI flavour */}
              <div className="admin-metric-trend">↑ 8% vs last month</div>
            </div>

            {/* Societies */}
            <div className="admin-metric-card">
              <div className="admin-metric-header">
                <span>Societies</span>
                <div className="admin-metric-icon">🏛️</div>
              </div>
              <div className="admin-metric-value">
                {societies.total.toLocaleString()}
              </div>
              <div className="admin-metric-sub">
                {societies.pending} pending approval
              </div>
            </div>

            {/* Events */}
            <div className="admin-metric-card">
              <div className="admin-metric-header">
                <span>Total Events</span>
                <div className="admin-metric-icon">📅</div>
              </div>
              <div className="admin-metric-value">
                {events.total.toLocaleString()}
              </div>
              <div className="admin-metric-sub">
                {events.active} active
              </div>
              <div className="admin-metric-trend">↑ 15% vs last month</div>
            </div>

            {/* Certificates */}
            <div className="admin-metric-card">
              <div className="admin-metric-header">
                <span>Certificates Issued</span>
                <div className="admin-metric-icon">🎓</div>
              </div>
              <div className="admin-metric-value">
                {certificates.issued_this_year.toLocaleString()}
              </div>
              <div className="admin-metric-sub">This academic year</div>
            </div>
          </div>

          {/* ===== Bottom three-card grid ===== */}
          <div className="admin-main-grid">
            {/* --- Admin Quick Actions --- */}
            <div className="admin-card">
              <div className="admin-card-title-row">
                <div className="admin-card-title">Admin Quick Actions</div>
              </div>

              <div className="admin-quick-actions-list">
                <button
                  type="button"
                  className="admin-quick-action-item"
                  onClick={() => navigate('/admin/students')}
                >
                  <div className="admin-quick-action-left">
                    <span className="admin-quick-action-icon">👨‍🎓</span>
                    <div>
                      <div className="admin-quick-action-title">
                        Manage Students
                      </div>
                      <div className="admin-quick-action-subtitle">
                        View and manage student accounts
                      </div>
                    </div>
                  </div>
                  <span className="admin-quick-action-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="admin-quick-action-item"
                  onClick={() => navigate('/admin/societies')}
                >
                  <div className="admin-quick-action-left">
                    <span className="admin-quick-action-icon">🏛️</span>
                    <div>
                      <div className="admin-quick-action-title">
                        Manage Societies
                      </div>
                      <div className="admin-quick-action-subtitle">
                        Societies, presidents &amp; core teams
                      </div>
                    </div>
                  </div>
                  <span className="admin-quick-action-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="admin-quick-action-item"
                  onClick={() => navigate('/admin/events')}
                >
                  <div className="admin-quick-action-left">
                    <span className="admin-quick-action-icon">📅</span>
                    <div>
                      <div className="admin-quick-action-title">
                        View All Events
                      </div>
                      <div className="admin-quick-action-subtitle">
                        Global events overview
                      </div>
                    </div>
                  </div>
                  <span className="admin-quick-action-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="admin-quick-action-item"
                  onClick={() => navigate('/admin/system-logs')}
                >
                  <div className="admin-quick-action-left">
                    <span className="admin-quick-action-icon">📊</span>
                    <div>
                      <div className="admin-quick-action-title">
                        System Logs
                      </div>
                      <div className="admin-quick-action-subtitle">
                        Audit important platform actions
                      </div>
                    </div>
                  </div>
                  <span className="admin-quick-action-arrow">→</span>
                </button>
              </div>
            </div>

            {/* --- System Health --- */}
            <div className="admin-card">
              <div className="admin-card-title-row">
                <div className="admin-card-title">System Health</div>
              </div>

              <div className="admin-health-list">
                <div className="admin-health-item">
                  <div className="admin-health-left">
                    <span className="admin-health-dot" />
                    <span className="admin-health-name">Database</span>
                  </div>
                  <span className="admin-health-value">99.9%</span>
                </div>

                <div className="admin-health-item">
                  <div className="admin-health-left">
                    <span className="admin-health-dot" />
                    <span className="admin-health-name">Authentication</span>
                  </div>
                  <span className="admin-health-value">100%</span>
                </div>

                <div className="admin-health-item">
                  <div className="admin-health-left">
                    <span className="admin-health-dot" />
                    <span className="admin-health-name">Storage</span>
                  </div>
                  <span className="admin-health-value">99.8%</span>
                </div>

                <div className="admin-health-item">
                  <div className="admin-health-left">
                    <span className="admin-health-dot" />
                    <span className="admin-health-name">Email Service</span>
                  </div>
                  <span className="admin-health-value">98.5%</span>
                </div>
              </div>
            </div>

            {/* --- Recent Activity --- */}
            <div className="admin-card">
              <div className="admin-card-title-row">
                <div className="admin-card-title">Recent Activity</div>
                <span
                  className="admin-card-link"
                  onClick={() => navigate('/admin/system-logs')}
                >
                  View all
                </span>
              </div>

              {recentActivity.length === 0 ? (
                <div className="admin-activity-meta">
                  No recent activity logged.
                </div>
              ) : (
                <div className="admin-activity-list">
                  {recentActivity.map((log) => (
                    <div
                      key={log.log_id}
                      className="admin-activity-item"
                    >
                      <span
                        className={
                          'admin-activity-dot ' +
                          (log.action_type?.startsWith('CREATE')
                            ? 'admin-activity-dot--green'
                            : log.action_type?.startsWith('UPDATE')
                            ? 'admin-activity-dot--blue'
                            : log.action_type?.startsWith('DELETE')
                            ? 'admin-activity-dot--red'
                            : '')
                        }
                      />
                      <div className="admin-activity-main">
                        <div className="admin-activity-title">
                          {log.action_type || 'Activity'}
                        </div>
                        <div className="admin-activity-meta">
                          {log.details || '-'}
                        </div>
                      </div>
                      <div className="admin-activity-meta">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;

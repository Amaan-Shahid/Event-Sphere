import { useEffect, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';

function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLogs(100);
      setLogs(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">System Logs</div>
          <div className="admin-page-subtitle">
            Audit log of important admin actions
          </div>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div>Loading logs...</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td>{log.created_at}</td>
                    <td>{log.action_type}</td>
                    <td>
                      {log.actor_name} ({log.actor_email})
                    </td>
                    <td>
                      {log.target_type} #{log.target_id}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{log.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5}>No logs recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminLogsPage;

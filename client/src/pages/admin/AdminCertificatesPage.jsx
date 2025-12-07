import { useEffect, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';

function AdminCertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCertificates();
      setCerts(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCerts();
  }, []);

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Certificates</div>
          <div className="admin-page-subtitle">
            Global view of issued certificates
          </div>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div>Loading certificates...</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Event</th>
                  <th>Society</th>
                  <th>Issued At</th>
                  <th>Token</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.certificate_id}>
                    <td>{c.certificate_id}</td>
                    <td>{c.student_name}</td>
                    <td>{c.student_email}</td>
                    <td>{c.event_title}</td>
                    <td>{c.society_name}</td>
                    <td>{c.issued_at}</td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {c.verification_token}
                    </td>
                  </tr>
                ))}
                {certs.length === 0 && (
                  <tr>
                    <td colSpan={7}>No certificates found.</td>
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

export default AdminCertificatesPage;

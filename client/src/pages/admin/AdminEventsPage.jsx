import { useEffect, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';

function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEvents();
      setEvents(res.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Global Events</div>
          <div className="admin-page-subtitle">
            View all events across societies
          </div>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div>Loading events...</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Society</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.event_id}>
                    <td>{e.event_id}</td>
                    <td>{e.title}</td>
                    <td>{e.society_name}</td>
                    <td>{e.event_date}</td>
                    <td>{e.category}</td>
                    <td>{e.is_paid ? 'Yes' : 'No'}</td>
                    <td>{e.status || '—'}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={7}>No events found.</td>
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

export default AdminEventsPage;

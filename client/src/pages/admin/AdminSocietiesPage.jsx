import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';

function AdminSocietiesPage() {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | active | pending

  const [creating, setCreating] = useState(false);
  const [newSociety, setNewSociety] = useState({
    name: '',
    description: '',
  });

  const loadSocieties = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSocieties();
      setSocieties(res.data || []);
    } catch (err) {
      console.error('Failed to load societies', err);
      alert('Failed to load societies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSocieties();
  }, []);

  // Helper: derive status from DB fields
  const getStatus = (s) => {
    // is_active: 0/1 from DB
    if (!s.is_active) return 'inactive';
    // active but no president yet => pending
    if (!s.president_user_id) return 'pending';
    // active + president assigned
    return 'active';
  };

  const filteredSocieties = useMemo(() => {
    if (tab === 'all') return societies;
    return societies.filter((s) => getStatus(s) === tab);
  }, [societies, tab]);

  const stats = useMemo(() => {
    const total = societies.length;
    const active = societies.filter((s) => getStatus(s) === 'active').length;
    const pending = societies.filter((s) => getStatus(s) === 'pending').length;
    const members = societies.reduce(
      (sum, s) => sum + (s.member_count || 0),
      0
    );
    return { total, active, pending, members };
  }, [societies]);

  const handleCreateSociety = async (e) => {
    e.preventDefault();
    const name = newSociety.name.trim();
    const description = newSociety.description.trim();

    if (!name) {
      alert('Society name is required');
      return;
    }

    try {
      setCreating(true);
      // Backend will set is_active = 1; since no president yet,
      // our getStatus() => "pending"
      await adminApi.createSociety({
        name,
        description,
      });
      setNewSociety({ name: '', description: '' });
      await loadSocieties();
    } catch (err) {
      console.error('Create society error', err);
      alert(err?.response?.data?.message || 'Failed to create society');
    } finally {
      setCreating(false);
    }
  };

  const handleViewSociety = (s) => {
    // simple but actually useful for now
    alert(
      [
        `Society: ${s.name}`,
        `Description: ${s.description || '-'}`,
        `Status: ${
          getStatus(s) === 'active'
            ? 'Active'
            : getStatus(s) === 'pending'
            ? 'Pending'
            : 'Inactive'
        }`,
        `President: ${
          s.president_name
            ? `${s.president_name} (${s.president_email})`
            : 'Not assigned'
        }`,
        `Members: ${s.member_count || 0}`,
        `Events: ${s.event_count || 0}`,
        `Created: ${s.created_at || '—'}`,
      ].join('\n')
    );
  };

  const handleEditSociety = async (s) => {
    const newName = window.prompt('Update society name:', s.name);
    if (newName === null) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert('Society name cannot be empty');
      return;
    }

    const newDesc = window.prompt(
      'Update description:',
      s.description || ''
    );
    if (newDesc === null) return;

    const trimmedDesc = newDesc.trim();

    try {
      const resp = await adminApi.updateSociety(s.society_id, {
        name: trimmedName,
        description: trimmedDesc,
      });

      if (resp && resp.success === false) {
        alert(resp.message || 'Failed to update society');
        return;
      }

      // Instant UI update
      setSocieties((prev) =>
        prev.map((soc) =>
          soc.society_id === s.society_id
            ? { ...soc, name: trimmedName, description: trimmedDesc }
            : soc
        )
      );
    } catch (err) {
      console.error('Update society error', err);
      alert(
        err?.response?.data?.message ||
          'Network/server error while updating society'
      );
    }
  };

  const handleDeleteSociety = async (s) => {
  if (
    !window.confirm(
      `Permanently delete society "${s.name}"?\nThis will remove it from the system.`
    )
  ) {
    return;
  }

  try {
    const resp = await adminApi.deleteSociety(s.society_id);

    if (resp && resp.success === false) {
      alert(resp.message || 'Failed to delete society');
      return;
    }

    // 🔥 Remove from UI immediately
    setSocieties((prev) =>
      prev.filter((soc) => soc.society_id !== s.society_id)
    );
  } catch (err) {
    console.error('Delete society error', err);
    alert(
      err?.response?.data?.message ||
        'Network/server error while deleting society'
    );
  }
};


  const getStatusPillClass = (s) => {
    const status = getStatus(s);
    if (status === 'active') return 'admin-status-pill admin-status-pill--active';
    if (status === 'pending')
      return 'admin-status-pill admin-status-pill--pending';
    return 'admin-status-pill admin-status-pill--inactive';
  };

  const getStatusLabel = (s) => {
    const status = getStatus(s);
    if (status === 'active') return 'Active';
    if (status === 'pending') return 'Pending';
    return 'Inactive';
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Manage Societies</div>
          <div className="admin-page-subtitle">
            Create and manage university societies
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: '1rem' }}>
        {/* Tabs */}
        <div className="admin-card-title-row">
          <div>
            <div className="admin-tab-row">
              <div
                className={
                  'admin-tab ' + (tab === 'all' ? 'admin-tab--active' : '')
                }
                onClick={() => setTab('all')}
              >
                All
              </div>
              <div
                className={
                  'admin-tab ' + (tab === 'active' ? 'admin-tab--active' : '')
                }
                onClick={() => setTab('active')}
              >
                Active
              </div>
              <div
                className={
                  'admin-tab ' +
                  (tab === 'pending' ? 'admin-tab--active' : '')
                }
                onClick={() => setTab('pending')}
              >
                Pending
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="admin-society-stats-row">
          <div className="admin-society-stat-card">
            <div className="admin-society-stat-label">Total Societies</div>
            <div className="admin-society-stat-value">{stats.total}</div>
          </div>
          <div className="admin-society-stat-card">
            <div className="admin-society-stat-label">Active</div>
            <div className="admin-society-stat-value">{stats.active}</div>
          </div>
          <div className="admin-society-stat-card">
            <div className="admin-society-stat-label">Pending Approval</div>
            <div className="admin-society-stat-value">{stats.pending}</div>
          </div>
          <div className="admin-society-stat-card">
            <div className="admin-society-stat-label">Total Members</div>
            <div className="admin-society-stat-value">
              {stats.members.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Create society form */}
        <form
          className="admin-form-inline"
          onSubmit={handleCreateSociety}
          style={{ marginTop: '0.75rem' }}
        >
          <input
            type="text"
            placeholder="Society name"
            value={newSociety.name}
            onChange={(e) =>
              setNewSociety((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Short description"
            value={newSociety.description}
            onChange={(e) =>
              setNewSociety((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
          <button
            type="submit"
            className="button-primary"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Society'}
          </button>
        </form>

        {/* Societies list */}
        {loading ? (
          <div style={{ marginTop: '0.75rem' }}>Loading societies...</div>
        ) : filteredSocieties.length === 0 ? (
          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.9rem',
              color: '#6b7280',
            }}
          >
            No societies found for this filter.
          </div>
        ) : (
          <div
            style={{
              marginTop: '0.75rem',
              borderRadius: '1rem',
              overflow: 'hidden',
              border: '1px solid #e5e7eb',
            }}
          >
            <div className="admin-societies-header">
              <div>Society</div>
              <div>Admin</div>
              <div>Stats</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {filteredSocieties.map((s) => (
              <div key={s.society_id} className="admin-societies-row">
                {/* Society */}
                <div>
                  <div className="admin-society-main">
                    <span className="admin-society-name">{s.name}</span>
                    <span className="admin-society-meta">
                      Created: {s.created_at || '—'}
                    </span>
                  </div>
                </div>

                {/* Admin (President) */}
                <div>
                  {s.president_name ? (
                    <div className="admin-list-person">
                      <span className="admin-list-person-name">
                        {s.president_name}
                      </span>
                      <span className="admin-list-person-email">
                        {s.president_email}
                      </span>
                    </div>
                  ) : (
                    <span
                      style={{
                        color: '#9ca3af',
                        fontSize: '0.85rem',
                      }}
                    >
                      Not assigned
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div>
                  <div className="admin-society-stats">
                    <span>👥 {s.member_count ?? 0}</span>
                    <span>📅 {s.event_count ?? 0}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span className={getStatusPillClass(s)}>
                    {getStatusLabel(s)}
                  </span>
                </div>

                {/* Actions */}
                <div>
                  <div className="admin-list-actions">
                    <span
                      className="admin-icon-edit"
                      title="View"
                      onClick={() => handleViewSociety(s)}
                    >
                      👁️
                    </span>
                    <span
                      className="admin-icon-edit"
                      title="Edit"
                      onClick={() => handleEditSociety(s)}
                    >
                      ✏️
                    </span>
                    <span
                      className="admin-icon-delete"
                      title="Deactivate"
                      onClick={() => handleDeleteSociety(s)}
                    >
                      🗑️
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSocietiesPage;

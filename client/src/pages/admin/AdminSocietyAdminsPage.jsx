import { useEffect, useState } from 'react';
import '../../styles/admin.css';
import { adminApi } from '../../api/adminApi';

function AdminSocietyAdminsPage() {
  const [societies, setSocieties] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
  society_id: '',
  user_id: '',
  role_name: '',   
});

  // Load all societies + their core members
  const loadAdmins = async () => {
    setLoading(true);
    try {
      // 1) Get all societies
      const societiesRes = await adminApi.getSocieties();
      const societiesData = societiesRes.data || [];
      setSocieties(societiesData);

      // 2) For each society, get core members
      const memberResponses = await Promise.all(
        societiesData.map((s) => adminApi.getCoreMembers(s.society_id))
      );

      // 3) Flatten into admins list
      const adminsList = [];
      societiesData.forEach((society, idx) => {
        const coreMembers = memberResponses[idx].data || [];
        coreMembers.forEach((m) => {
          adminsList.push({
            membership_id: m.membership_id, // ensure backend returns this
            user_id: m.user_id,
            name: m.user_name,
            email: m.user_email,
            role_name: m.role_name,
            society_id: society.society_id,
            society_name: society.name,
            is_active: m.is_active === 1 || m.is_active === true,
            assigned_on: m.started_at || society.created_at || '-',
          });
        });
      });

      setAdmins(adminsList);
    } catch (err) {
      console.error(err);
      alert('Failed to load society admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddSubmit = async (e) => {
  e.preventDefault();
  const { society_id, user_id, role_name } = addForm;

  if (!society_id || !user_id || !role_name.trim()) {
    alert('Please select society, provide user ID and role name');
    return;
  }

  try {
    setAdding(true);

    // 1) Call backend to add core member
    const resp = await adminApi.addCoreMember(Number(society_id), {
      user_id: Number(user_id),
      role_name: role_name.trim(),
    });

    // If backend explicitly says failure
    if (!resp || resp.success === false) {
      alert(
        resp?.message || 'Server reported failure while adding society admin.'
      );
      return;
    }

    // 2) Clear form
    setAddForm({ society_id: '', user_id: '', role_name: '' });

    // 3) Try to reload list, but don't scare user if this fails
    try {
      await loadData();
    } catch (reloadErr) {
      console.error('Reloading admins failed after add:', reloadErr);
      // optional small message, but not blocking
      // alert('Admin added, but list reload failed. Refresh the page.');
    }
  } catch (err) {
    console.error('Add core member network/server error:', err);
    const backendMsg =
      err?.response?.data?.message ||
      'Network or server error while adding society admin.';
    alert(backendMsg);
  } finally {
    setAdding(false);
  }
};


  const handleDeactivate = async (admin) => {
  if (
    !window.confirm(
      `Delete ${admin.name} as admin of ${admin.society_name}? This cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const resp = await adminApi.deleteCoreMember(
      admin.society_id,
      admin.membership_id
    );

    if (resp && resp.success === false) {
      alert(resp.message || 'Server failed to delete society admin');
      return;
    }

    // Remove from local state to feel instant
    setAdmins((prev) =>
      prev.filter((a) => a.membership_id !== admin.membership_id)
    );
  } catch (err) {
    console.error('Delete core member error:', err);
    const msg =
      err?.response?.data?.message ||
      'Network/server error while deleting society admin';
    alert(msg);
  }
};

  const handleEdit = async (admin) => {
  const current = admin.role_name || '';
  const newRoleName = window.prompt(
    `Update role for ${admin.name} in ${admin.society_name}:`,
    current
  );

  // user cancelled
  if (newRoleName === null) return;

  const trimmed = newRoleName.trim();
  if (!trimmed) {
    alert('Role name cannot be empty.');
    return;
  }

  try {
    // 1) Call backend to update role
    const resp = await adminApi.updateCoreMember(
      admin.society_id,
      admin.membership_id,
      { role_name: trimmed }
    );

    if (resp && resp.success === false) {
      alert(resp.message || 'Server failed to update role');
      return;
    }

    // 2) ✅ Optimistically update UI without full reload
    setAdmins((prev) =>
      prev.map((a) =>
        a.membership_id === admin.membership_id
          ? { ...a, role_name: trimmed }
          : a
      )
    );

    // 3) (Optional) sync with backend silently
    try {
      await loadData(); // you can remove this if not needed
    } catch (reloadErr) {
      console.error('Reloading admins failed after update:', reloadErr);
    }
  } catch (err) {
    console.error('Update core member role error:', err);
    const msg =
      err?.response?.data?.message ||
      'Network/server error while updating society admin role';
    alert(msg);
  }
};

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Manage Society Admins</div>
          <div className="admin-page-subtitle">
            Assign and manage society administrators
          </div>
        </div>
      </div>

      <div className="admin-list-panel">
        <div className="admin-list-header-row">
          <div>
            <div className="admin-list-header-left-title">
              Society Admins
            </div>
            <div className="admin-list-header-left-subtitle">
              Total {admins.length} active core members
            </div>
          </div>
          {/* Add form trigger; we keep it inline below for simplicity */}
        </div>

        {/* Add Society Admin form */}
        <form className="admin-form-inline" onSubmit={handleAddSubmit}>
  {/* Society select stays same */}
  <select
    value={addForm.society_id}
    onChange={(e) =>
      setAddForm((prev) => ({
        ...prev,
        society_id: e.target.value,
      }))
    }
  >
    <option value="">Select Society</option>
    {societies.map((s) => (
      <option key={s.society_id} value={s.society_id}>
        {s.name} (#{s.society_id})
      </option>
    ))}
  </select>

  {/* User ID input stays similar */}
  <input
    type="number"
    placeholder="User ID (existing user)"
    value={addForm.user_id}
    onChange={(e) =>
      setAddForm((prev) => ({ ...prev, user_id: e.target.value }))
    }
  />

  {/* 🔹 NEW: Role Name text input */}
  <input
    type="text"
    placeholder="Role Name (e.g. President)"
    value={addForm.role_name}
    onChange={(e) =>
      setAddForm((prev) => ({ ...prev, role_name: e.target.value }))
    }
  />

  <button
    type="submit"
    className="button-primary"
    disabled={adding}
  >
    {adding ? 'Adding...' : 'Add Society Admin'}
  </button>
</form>


        {/* List */}
        {loading ? (
          <div style={{ marginTop: '0.75rem' }}>Loading society admins...</div>
        ) : admins.length === 0 ? (
          <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.75rem' }}>
            No society admins found yet. Create a student user, then assign them
            here using their user ID.
          </div>
        ) : (
          <div className="admin-list-table" style={{ marginTop: '0.75rem' }}>
            <div className="admin-list-row-header">
              <div>Admin</div>
              <div>Society</div>
              <div>Status</div>
              <div>Assigned On</div>
              <div>Actions</div>
            </div>

            {admins.map((a) => (
              <div key={a.membership_id} className="admin-list-row">
                {/* Admin */}
                <div>
                  <div className="admin-list-person">
                    <span className="admin-list-person-name">
                      {a.name} {a.role_name ? `(${a.role_name})` : ''}
                    </span>
                    <span className="admin-list-person-email">{a.email}</span>
                  </div>
                </div>

                {/* Society */}
                <div>
                  <div className="admin-list-society">
                    <span className="admin-list-society-icon">🏛️</span>
                    <span>{a.society_name || '—'}</span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <span
                    className={
                      'admin-status-pill ' +
                      (a.is_active
                        ? 'admin-status-pill--active'
                        : 'admin-status-pill--inactive')
                    }
                  >
                    {a.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Assigned On */}
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {a.assigned_on || '—'}
                  </span>
                </div>

                {/* Actions */}
                <div>
                  <div className="admin-list-actions">
                    <span
                      className="admin-icon-edit"
                      onClick={() => handleEdit(a)}
                      title="Edit"
                    >
                      ✏️
                    </span>
                    <span
                      className="admin-icon-delete"
                      onClick={() => handleDeactivate(a)}
                      title="Deactivate"
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

export default AdminSocietyAdminsPage;

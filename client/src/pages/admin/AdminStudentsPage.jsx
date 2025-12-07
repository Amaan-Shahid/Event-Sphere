import { useEffect, useState } from "react";
import "../../styles/admin.css";
import { adminApi } from "../../api/adminApi";

function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
  });

  const loadStudents = async () => {
    try {
      setError("");
      setLoading(true);
      const res = await adminApi.getUsers("student");
      setStudents(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleDeleteStudent = async (student) => {
  if (
    !window.confirm(
      `Are you sure you want to permanently delete "${student.name}" (${student.email})?`
    )
  ) {
    return;
  }

  try {
    const res = await adminApi.deleteUser(student.user_id);

    // Optional: show backend message
    alert(res.message || 'Student deleted successfully');

    await loadStudents();
  } catch (err) {
    console.error(err);
    alert(
      err?.response?.data?.message ||
        'Failed to delete student. They might own upcoming events.'
    );
  }
};

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;

    try {
      setCreating(true);
      await adminApi.createUser({
        name: newStudent.name,
        email: newStudent.email,
        role: "student",
        // password: 'password123' // optional if backend supports custom password
      });
      setNewStudent({ name: "", email: "" });
      loadStudents();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to create student user");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Students</div>
          <div className="admin-page-subtitle">
            Manage all student accounts in EventSphere
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: "1rem" }}>
        <div className="admin-card-title-row">
          <div className="admin-card-title">Create Student</div>
        </div>
        <form className="admin-form-inline" onSubmit={handleCreateStudent}>
          <input
            type="text"
            placeholder="Full name"
            value={newStudent.name}
            onChange={(e) =>
              setNewStudent((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <input
            type="email"
            placeholder="email@university.edu"
            value={newStudent.email}
            onChange={(e) =>
              setNewStudent((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          <button type="submit" className="button-primary" disabled={creating}>
            {creating ? "Creating..." : "Add Student"}
          </button>
        </form>
      </div>

      <div className="admin-card">
        <div className="admin-card-title-row">
          <div className="admin-card-title">
            All Students ({students.length})
          </div>
        </div>

        {error && (
          <div
            style={{
              color: "#b91c1c",
              fontSize: "0.85rem",
              marginBottom: "0.5rem",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div>Loading students...</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.user_id}>
                    <td>{s.user_id}</td>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>
                      <span
                        className={
                          "admin-badge " +
                          (s.is_active
                            ? "admin-badge--green"
                            : "admin-badge--red")
                        }
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{s.role}</td>
                    <td>
  <div className="admin-inline-actions">
    <button
      type="button"
      className="admin-small-button admin-small-button--danger"
      onClick={() => handleDeleteStudent(s)}
    >
      Delete
    </button>
  </div>
</td>

                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={6}>No students found.</td>
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

export default AdminStudentsPage;

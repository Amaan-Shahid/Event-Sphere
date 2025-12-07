import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '1rem' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      // If user role not allowed, we can redirect to a default page
      if (user?.role === 'super_admin') return <Navigate to="/admin" replace />;
      return <Navigate to="/student" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;

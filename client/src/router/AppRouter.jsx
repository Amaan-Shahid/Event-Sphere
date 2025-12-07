import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import StudentDashboard from '../pages/student/StudentDashboard';
import SocietyDashboard from '../pages/society/SocietyDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminStudentsPage from '../pages/admin/AdminStudentsPage';
import AdminSocietiesPage from '../pages/admin/AdminSocietiesPage';
import AdminEventsPage from '../pages/admin/AdminEventsPage';
import AdminCertificatesPage from '../pages/admin/AdminCertificatesPage';
import AdminLogsPage from '../pages/admin/AdminLogsPage';
import AdminSocietyAdminsPage from '../pages/admin/AdminSocietyAdminsPage';



export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <MainLayout>
              <StudentDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/society/*"
        element={
          <ProtectedRoute allowedRoles={['student', 'super_admin']}>
            <MainLayout>
              <SocietyDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

            {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminStudentsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
            <Route
        path="/admin/society-admins"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminSocietyAdminsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/societies"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminSocietiesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminEventsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminCertificatesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <MainLayout>
              <AdminLogsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />


      {/* default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

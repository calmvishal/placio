import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentProfile from './pages/StudentProfile';
import StudentDashboard from './pages/StudentDashboard';
import TpoDashboard from './pages/TpoDashboard';
import TpoJobs from './pages/TpoJobs';
import StudentJobs from './pages/StudentJobs';
import StudentApplications from './pages/StudentApplications';
import TpoApplicants from './pages/TpoApplicants';
import StudentInterviews from './pages/StudentInterviews';
import TpoInterviews from './pages/TpoInterviews';
import TpoStudents from './pages/TpoStudents';
import TpoStaff from './pages/TpoStaff';
import TpoProfile from './pages/TpoProfile';
import SystemDiagnostics from './pages/SystemDiagnostics';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Home & Auth */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secret / Admin Diagnostics Routes */}
          <Route path="/admin/diagnostics" element={<SystemDiagnostics />} />
          <Route path="/tpo/diagnostics" element={<SystemDiagnostics />} />
          <Route path="/system/status" element={<SystemDiagnostics />} />

          {/* Student Protected Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/jobs"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/applications"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/interviews"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentInterviews />
              </ProtectedRoute>
            }
          />

          {/* TPO Admin Protected Routes */}
          <Route
            path="/tpo/dashboard"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/jobs"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/applicants"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/interviews"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoInterviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/students"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/staff"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin']}>
                <TpoStaff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tpo/profile"
            element={
              <ProtectedRoute allowedRoles={['tpo_admin', 'tpo_staff']}>
                <TpoProfile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

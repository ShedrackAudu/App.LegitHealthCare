import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import OTPPage from './pages/OTPPage';
import ForcePasswordResetPage from './pages/ForcePasswordResetPage';
import Dashboard from './pages/Dashboard';
import RegistrationPage from './pages/RegistrationPage';
import ConsultationPage from './pages/ConsultationPage';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './components/theme-provider';
import AppointmentsPage from './pages/AppointmentsPage';
import TestResultsPage from './pages/TestResultsPage';
import DirectorPage from './pages/DirectorPage';
import ViewPatientsPage from './pages/ViewPatientsPage';
import ViewRecordsPage from './pages/ViewRecordsPage';
import PatientReportPage from './pages/PatientReportPage';
import ReportVerificationPage from './pages/ReportVerificationPage';
import ManageAccountPage from './pages/ManageAccountPage';
import Manage2FAPage from './pages/Manage2FAPage';
import SystemConfigPage from './pages/SystemConfigPage';
import BrandingSettingsPage from './pages/BrandingSettingsPage';
import AISettingsPage from './pages/AISettingsPage';
import MessagingPage from './pages/MessagingPage';
import UserManagementPage from './pages/UserManagementPage';
import RolePermissionPage from './pages/RolePermissionPage';
import AuditLogPage from './pages/AuditLogPage';
import DataManagementPage from './pages/DataManagementPage';
import AccessKeysPage from './pages/AccessKeysPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PatientOTPPage from './pages/PatientOTPPage';
import PatientManageAccountPage from './pages/PatientManageAccountPage';
import PatientDashboard from './pages/PatientDashboard';
import PatientMedicalReport from './pages/PatientMedicalReport';
import PatientAppointmentsPage from './pages/PatientAppointmentsPage';
import PatientManage2FAPage from './pages/PatientManage2FAPage';
import PatientSearchPage from './pages/PatientSearchPage';
import PatientClaimPage from './pages/PatientClaimPage';

import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function RootApp() {
  console.log("App.tsx: Full Render (as RootApp)...");
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AppProvider>
        <Router>
          <Toaster position="top-right" reverseOrder={false} />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-otp" element={<OTPPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify/:token" element={<ReportVerificationPage />} />
            <Route path="/force-password-reset" element={
              <ProtectedRoute>
                <ForcePasswordResetPage />
              </ProtectedRoute>
            } />

            <Route path="/patient/verify-otp" element={<PatientOTPPage />} />
            <Route path="/patient/search" element={<PatientSearchPage />} />
            <Route path="/patient/claim" element={<PatientClaimPage />} />


            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['Patient']}><PatientDashboard /></ProtectedRoute>} />
            <Route path="/patient/records" element={<ProtectedRoute allowedRoles={['Patient']}><PatientMedicalReport /></ProtectedRoute>} />
            <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['Patient']}><PatientAppointmentsPage /></ProtectedRoute>} />
            <Route path="/patient/account" element={<ProtectedRoute allowedRoles={['Patient']}><PatientManageAccountPage /></ProtectedRoute>} />
            <Route path="/patient/account/2fa" element={<ProtectedRoute allowedRoles={['Patient']}><PatientManage2FAPage /></ProtectedRoute>} />
            <Route path="/registration" element={<ProtectedRoute requiredPermission="registration"><RegistrationPage /></ProtectedRoute>} />
            <Route path="/consultation" element={<ProtectedRoute requiredPermission="consultation"><ConsultationPage /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute requiredPermission="registration"><AppointmentsPage /></ProtectedRoute>} />

            <Route path="/tests" element={<ProtectedRoute><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/fbc" element={<ProtectedRoute requiredPermission="lab_fbc"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/kft" element={<ProtectedRoute requiredPermission="lab_kft"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/lipid" element={<ProtectedRoute requiredPermission="lab_lipid"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/lft" element={<ProtectedRoute requiredPermission="lab_lft"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/ecg" element={<ProtectedRoute requiredPermission="lab_ecg"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/spirometry" element={<ProtectedRoute requiredPermission="lab_spirometry"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/tests/audiometry" element={<ProtectedRoute requiredPermission="lab_audiometry"><TestResultsPage /></ProtectedRoute>} />
            <Route path="/director" element={<ProtectedRoute requiredPermission="director_review"><DirectorPage /></ProtectedRoute>} />
            <Route path="/view-patients" element={<ProtectedRoute requiredPermission="view_patients"><ViewPatientsPage /></ProtectedRoute>} />
            <Route path="/view-records" element={<ProtectedRoute requiredPermission="view_records"><ViewRecordsPage /></ProtectedRoute>} />
            <Route path="/patient-report" element={<ProtectedRoute requiredPermission="patient_reports"><PatientReportPage /></ProtectedRoute>} />
            <Route path="/account/2fa" element={<ProtectedRoute><Manage2FAPage /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><ManageAccountPage /></ProtectedRoute>} />
            <Route path="/system-config" element={<ProtectedRoute requiredPermission="manage_departments"><SystemConfigPage /></ProtectedRoute>} />
            <Route path="/system-branding" element={<ProtectedRoute adminOnly={true}><BrandingSettingsPage /></ProtectedRoute>} />
            <Route path="/ai-integration" element={<ProtectedRoute adminOnly={true}><AISettingsPage /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute adminOnly={true}><UserManagementPage /></ProtectedRoute>} />
            <Route path="/roles-permissions" element={<ProtectedRoute adminOnly={true}><RolePermissionPage /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute adminOnly={true}><AuditLogPage /></ProtectedRoute>} />
            <Route path="/data-management" element={<ProtectedRoute adminOnly={true}><DataManagementPage /></ProtectedRoute>} />
            <Route path="/admin/access-keys" element={<ProtectedRoute adminOnly={true}><AccessKeysPage /></ProtectedRoute>} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route path="/messages" element={<ProtectedRoute requiredPermission="messaging"><MessagingPage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default RootApp;

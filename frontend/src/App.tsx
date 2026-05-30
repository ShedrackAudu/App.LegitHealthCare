import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import OTPPage from './pages/OTPPage';
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
import PublicReportPage from './pages/PublicReportPage';
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
import PatientManageAccountPage from './pages/PatientManageAccountPage';
import PatientDashboard from './pages/PatientDashboard';
import PatientMedicalReport from './pages/PatientMedicalReport';
import PatientAppointmentsPage from './pages/PatientAppointmentsPage';
import PatientManage2FAPage from './pages/PatientManage2FAPage';
import PatientContactPage from './pages/PatientContactPage';
import SecurityDashboard from './pages/SecurityDashboard';
import OfflinePage from './pages/OfflinePage';
import PatientFilesPage from './pages/PatientFilesPage';
import InventoryPage from './pages/InventoryPage';

import { CustomToaster } from './components/CustomToaster';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';

function RootApp() {
  console.log("App.tsx: Full Render (as RootApp)...");
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AppProvider>
        <Router>
          <div className="flex flex-col h-screen w-screen overflow-hidden">
            <NetworkStatusBanner />
            <div className="flex-1 min-h-0 relative">
              <CustomToaster />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-otp" element={<OTPPage />} />
                <Route path="/forgot-password" element={<Navigate to="/login?forgot=true" replace />} />
                <Route path="/verify/:token" element={<ReportVerificationPage />} />
                <Route path="/verify/:token/report" element={<PublicReportPage />} />




                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['Patient']}><PatientDashboard /></ProtectedRoute>} />
                <Route path="/patient/records" element={<ProtectedRoute allowedRoles={['Patient']}><PatientMedicalReport /></ProtectedRoute>} />
                <Route path="/patient/files" element={<ProtectedRoute allowedRoles={['Patient']}><PatientFilesPage /></ProtectedRoute>} />
                <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['Patient']}><PatientAppointmentsPage /></ProtectedRoute>} />
                <Route path="/patient/account" element={<ProtectedRoute allowedRoles={['Patient']}><PatientManageAccountPage /></ProtectedRoute>} />
                <Route path="/patient/account/2fa" element={<ProtectedRoute allowedRoles={['Patient']}><PatientManage2FAPage /></ProtectedRoute>} />
                <Route path="/patient/contact" element={<ProtectedRoute allowedRoles={['Patient']}><PatientContactPage /></ProtectedRoute>} />
                <Route path="/registration" element={<ProtectedRoute requiredPermission="registration"><RegistrationPage /></ProtectedRoute>} />
                <Route path="/consultation" element={<ProtectedRoute requiredPermission="consultation"><ConsultationPage /></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute requiredPermission="manage_appointments"><AppointmentsPage /></ProtectedRoute>} />

                <Route path="/tests" element={<ProtectedRoute><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/fbc" element={<ProtectedRoute requiredPermission="lab_fbc"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/kft" element={<ProtectedRoute requiredPermission="lab_kft"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/lipid" element={<ProtectedRoute requiredPermission="lab_lipid"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/lft" element={<ProtectedRoute requiredPermission="lab_lft"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/ecg" element={<ProtectedRoute requiredPermission="lab_ecg"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/spirometry" element={<ProtectedRoute requiredPermission="lab_spirometry"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/audiometry" element={<ProtectedRoute requiredPermission="lab_audiometry"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/tests/routine" element={<ProtectedRoute requiredPermission="lab_essential_diagnostics"><TestResultsPage /></ProtectedRoute>} />
                <Route path="/director" element={<ProtectedRoute requiredPermission="director_review"><DirectorPage /></ProtectedRoute>} />
                <Route path="/view-patients" element={<ProtectedRoute requiredPermission="view_patients"><ViewPatientsPage /></ProtectedRoute>} />
                <Route path="/view-records" element={<ProtectedRoute requiredPermission="view_records"><ViewRecordsPage /></ProtectedRoute>} />
                <Route path="/patient-report" element={<ProtectedRoute requiredPermission="patient_reports"><PatientReportPage /></ProtectedRoute>} />
                <Route path="/account/2fa" element={<ProtectedRoute><Manage2FAPage /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><ManageAccountPage /></ProtectedRoute>} />
                <Route path="/system-config" element={<ProtectedRoute requiredPermission="manage_departments"><SystemConfigPage /></ProtectedRoute>} />
                <Route path="/system-branding" element={<ProtectedRoute requiredPermission="manage_branding"><BrandingSettingsPage /></ProtectedRoute>} />
                <Route path="/ai-integration" element={<ProtectedRoute requiredPermission="manage_ai"><AISettingsPage /></ProtectedRoute>} />
                <Route path="/user-management" element={<ProtectedRoute requiredPermission="view_users"><UserManagementPage /></ProtectedRoute>} />
                <Route path="/roles-permissions" element={<ProtectedRoute requiredPermission="manage_roles"><RolePermissionPage /></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute requiredPermission="view_audit_logs"><AuditLogPage /></ProtectedRoute>} />
                <Route path="/data-management" element={<ProtectedRoute requiredPermission="download_data"><DataManagementPage /></ProtectedRoute>} />
                <Route path="/admin/access-keys" element={<ProtectedRoute requiredPermission="manage_access_keys"><AccessKeysPage /></ProtectedRoute>} />
                <Route path="/security-analytics" element={<ProtectedRoute requiredPermission="manage_roles"><SecurityDashboard /></ProtectedRoute>} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />
                <Route path="/offline" element={<OfflinePage />} />
                <Route path="/messages" element={<ProtectedRoute requiredPermission="messaging"><MessagingPage /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute requiredPermission="view_inventory"><InventoryPage /></ProtectedRoute>} />
              </Routes>
            </div>
          </div>
        </Router>
      </AppProvider>
    </ThemeProvider>
  );
}

export default RootApp;

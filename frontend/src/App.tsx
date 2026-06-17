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
import ReportCustomization from './pages/ReportCustomization';
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from './context/AppContext';
import axios from 'axios';

import { CustomToaster } from './components/CustomToaster';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';

const ACKNOWLEDGED_VERSION_KEY = 'lhc_acknowledged_version';

const AppUpdateNotifier: React.FC = () => {
  const [show, setShow] = useState(false);
  const [pendingServerVersion, setPendingServerVersion] = useState<string>('');
  const lastDismissedAt = useRef<number | null>(null);
  const { socket, user } = useAppContext();

  // Decide whether to show the card for a given server commit hash
  const maybeShowCard = (serverCommitShort: string) => {
    const localCommit = import.meta.env.VITE_APP_GIT_HASH;
    const localCommitShort = localCommit ? localCommit.substring(0, 7) : '';

    // Hide if hashes match (frontend already up to date)
    if (!serverCommitShort || serverCommitShort === localCommitShort) {
      return;
    }

    // Hide if the user already acknowledged this exact server version (clicked Refresh Now)
    const acknowledgedVersion = localStorage.getItem(ACKNOWLEDGED_VERSION_KEY);
    if (acknowledgedVersion === serverCommitShort) {
      console.log(`[VERSION CHECK] Server version ${serverCommitShort} already acknowledged. Suppressing card.`);
      return;
    }

    // Respect 5-minute "Later" cooldown
    if (lastDismissedAt.current) {
      const timeSinceDismiss = Date.now() - lastDismissedAt.current;
      if (timeSinceDismiss < 300000) {
        console.log(`[VERSION CHECK] Update available but muted for cooldown (${Math.round((300000 - timeSinceDismiss) / 1000)}s left).`);
        return;
      }
    }

    console.warn(`[VERSION CHECK] Version mismatch: Local=${localCommitShort}, Server=${serverCommitShort}. Showing notification.`);
    setPendingServerVersion(serverCommitShort);
    setShow(true);
  };

  // Perform version check against the server
  const checkVersion = async () => {
    try {
      const response = await axios.get('/api/webhooks/version-check');
      const serverCommit = response.data.commit;
      const localCommit = import.meta.env.VITE_APP_GIT_HASH;

      const serverCommitShort = serverCommit ? serverCommit.substring(0, 7) : '';
      const localCommitShort = localCommit ? localCommit.substring(0, 7) : '';

      console.log(`[VERSION CHECK] Local: ${localCommitShort}, Server: ${serverCommitShort}`);

      if (serverCommitShort && serverCommitShort !== 'latest') {
        maybeShowCard(serverCommitShort);
      }
    } catch (err) {
      console.error("[VERSION CHECK] Failed to check app version:", err);
    }
  };

  // "Later" — dismiss temporarily with a 5-minute cooldown
  const dismissNotification = () => {
    setShow(false);
    lastDismissedAt.current = Date.now();
  };

  // "Refresh Now" — save acknowledged version to localStorage so it won't reappear after reload
  const refreshNow = () => {
    if (pendingServerVersion) {
      localStorage.setItem(ACKNOWLEDGED_VERSION_KEY, pendingServerVersion);
      console.log(`[VERSION CHECK] Acknowledged version ${pendingServerVersion}. Reloading...`);
    }
    // Force a hard reload to bypass browser cache and load the latest deployed assets
    window.location.href = window.location.href.split('?')[0] + '?_cb=' + Date.now();
  };

  useEffect(() => {
    // Check version on mount
    checkVersion();
    // Poll every 5 minutes
    const interval = setInterval(checkVersion, 300000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (data: any) => {
      const serverCommitShort = data && data.commit ? data.commit.substring(0, 7) : '';
      if (serverCommitShort) {
        maybeShowCard(serverCommitShort);
      }
    };
    socket.on('app_update_available', handleUpdate);
    return () => {
      socket.off('app_update_available', handleUpdate);
    };
  }, [socket]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-card/85 backdrop-blur-md border-2 border-primary/20 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500 ring-1 ring-black/5">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-black text-foreground">New Update Deployed</p>
          <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
            A new version of Legit HealthCare has been successfully deployed. Refresh to apply updates.
          </p>
        </div>
        <button
          onClick={dismissNotification}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button
          onClick={dismissNotification}
          className="px-3.5 py-1.5 rounded-xl border-2 text-xs font-black text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
        >
          Later
        </button>
        <button
          onClick={refreshNow}
          className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/95 transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Refresh Now
        </button>
      </div>
    </div>
  );
};

function RootApp() {
  console.log("App.tsx: Full Render (as RootApp)...");
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AppProvider>
        <Router>
          <AppUpdateNotifier />
          <div className="flex flex-col h-[100dvh] w-screen overflow-hidden">
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
                <Route path="/report-customization" element={<ProtectedRoute requiredPermission="manage_report_customization"><ReportCustomization /></ProtectedRoute>} />
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

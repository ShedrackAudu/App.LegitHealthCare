import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import AccessDeniedPage from '@/pages/AccessDeniedPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredPermission?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false,
  requiredPermission,
  allowedRoles
}) => {
  const { user, verifyingAuth } = useAppContext();
  const { isAdmin, hasPermission } = usePermissions();
  const location = useLocation();

  if (verifyingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <div className="flex flex-col items-center max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-foreground tracking-tight">Securing Session</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifying your security credentials. Please wait...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const userRoles = user?.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [];

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle Forced Password Reset
  if (user.must_reset_password && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !isAdmin()) {
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return <AccessDeniedPage />;
    }
  }

  // Admin section: Only for admins
  if (adminOnly && !isAdmin()) {
    // Render access denied in place
    return <AccessDeniedPage />;
  }

  // Medical/Other section: Check specific permission(s)
  // Admins always bypass this check
  if (requiredPermission && !isAdmin()) {
    const permissions = requiredPermission.split(',').map(p => p.trim());
    const hasAny = permissions.some(p => hasPermission(p));
    
    if (!hasAny) {
      // Render access denied in place
      return <AccessDeniedPage />;
    }
  }

  return <>{children}</>;
};

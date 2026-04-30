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
  const { user } = useAppContext();
  const { isAdmin, hasPermission } = usePermissions();
  const location = useLocation();

  const userRoles = user?.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [];

  if (!user) {
    // Determine target portal based on path to ensure correct login form is shown
    const isPatientPath = location.pathname.startsWith('/patient');
    const loginPath = isPatientPath ? '/login?portal=patient' : '/login?portal=staff';
    
    return <Navigate to={loginPath} state={{ from: location }} replace />;
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

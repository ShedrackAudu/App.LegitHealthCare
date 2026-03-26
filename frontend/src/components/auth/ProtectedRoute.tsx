import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  adminOnly = false,
  requiredPermission
}) => {
  const { user } = useAppContext();
  const { isAdmin, hasPermission } = usePermissions();
  const location = useLocation();

  if (!user) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin section: Only for admins
  if (adminOnly && !isAdmin()) {
    // Redirect to access denied page
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  // Medical/Other section: Check specific permission(s)
  // Admins always bypass this check
  if (requiredPermission && !isAdmin()) {
    const permissions = requiredPermission.split(',').map(p => p.trim());
    const hasAny = permissions.some(p => hasPermission(p));
    
    if (!hasAny) {
      // Redirect to access denied page with the first needed permission context
      return <Navigate to="/access-denied" state={{ from: location, permission: permissions[0] }} replace />;
    }
  }

  return <>{children}</>;
};

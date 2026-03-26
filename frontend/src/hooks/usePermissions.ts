import { useAppContext } from '@/context/AppContext';

export const usePermissions = () => {
  const { user } = useAppContext();

  const hasPermission = (permission_name: string): boolean => {
    if (!user) return false;
    
    // Case-insensitive Admin role check
    const isAdminUser = (user.roles as string[] | undefined)?.some((r: string) => r.toLowerCase() === 'admin');
    if (isAdminUser) return true;
    
    // Check for temporary access codes (matching by permission_name)
    const hasTempAccess = (user.temp_access as any[] | undefined)?.some(
        (t: any) => {
            const isMatch = t.permission_name === permission_name;
            const isNotRevoked = !t.is_revoked;
            const isNotExpired = !t.expires_at || new Date(t.expires_at) > new Date();
            return isMatch && isNotRevoked && isNotExpired;
        }
    );
    if (hasTempAccess) return true;
    
    return (user.permissions as string[] | undefined)?.includes(permission_name) || false;
  };

  const isAdmin = (): boolean => {
    const isAdminUser = (user?.roles as string[] | undefined)?.some((r: string) => r.toLowerCase() === 'admin');
    if (isAdminUser) return true;

    // Optional: If 'admin' permission itself can be granted temporarily
    return (user?.temp_access as any[] | undefined)?.some((t: any) => t.permission_name === 'admin_access') || false;
  };

  return { hasPermission, isAdmin, user };
};

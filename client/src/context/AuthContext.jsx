/* @refresh reset */
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { ROLE_PERMISSIONS } from '../utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await authService.login({ email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager', 'admin');
  const isTeamLead = () => hasRole('team_lead', 'manager', 'admin');

  // Get all permissions for current user
  const getUserPermissions = () => {
    if (!user) return [];
    
    // Admin has all permissions
    if (user.role === 'admin') {
      return ROLE_PERMISSIONS.admin;
    }
    
    // Use custom permissions if set, otherwise use role defaults
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions;
    }
    
    return ROLE_PERMISSIONS[user.role] || [];
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has all permissions
    
    const permissions = getUserPermissions();
    return permissions.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (...permissions) => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if user has all of the specified permissions
  const hasAllPermissions = (...permissions) => {
    return permissions.every(permission => hasPermission(permission));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      hasRole,
      isAdmin,
      isManager,
      isTeamLead,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getUserPermissions,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

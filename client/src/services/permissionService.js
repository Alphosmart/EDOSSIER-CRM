import api from './api';

export const permissionService = {
  // Get all available permissions
  getAvailablePermissions: () => api.get('/users/permissions/available'),
  
  // Get user's permissions
  getUserPermissions: (userId) => api.get(`/users/${userId}/permissions`),
  
  // Update user's permissions
  updateUserPermissions: (userId, permissions) => 
    api.put(`/users/${userId}/permissions`, { permissions })
};

import { useState, useEffect } from 'react';
import { PERMISSION_GROUPS, PERMISSIONS } from '../../utils/permissions';
import { permissionService } from '../../services/permissionService';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineX } from 'react-icons/hi';

export default function PermissionsEditor({ userId, userName, onClose, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [roleData, setRoleData] = useState(null);

  useEffect(() => {
    loadUserPermissions();
  }, [userId]);

  const loadUserPermissions = async () => {
    try {
      const { data } = await permissionService.getUserPermissions(userId);
      setRoleData(data);
      setUserPermissions(data.allPermissions || []);
      setSelectedPermissions(data.customPermissions || []);
    } catch (error) {
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionKey) => {
    const permissionValue = PERMISSIONS[permissionKey];
    setSelectedPermissions(prev => {
      if (prev.includes(permissionValue)) {
        return prev.filter(p => p !== permissionValue);
      } else {
        return [...prev, permissionValue];
      }
    });
  };

  const selectAll = () => {
    setSelectedPermissions(Object.values(PERMISSIONS));
  };

  const clearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await permissionService.updateUserPermissions(userId, selectedPermissions);
      toast.success('Permissions updated successfully');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Permissions</h2>
              <p className="text-sm text-gray-500 mt-1">
                {userName} - Role: <span className="font-medium">{roleData?.role}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <HiOutlineX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedPermissions.length} of {Object.keys(PERMISSIONS).length} permissions selected
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors">
              Select All
            </button>
            <button onClick={clearAll} className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors">
              Clear All
            </button>
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
              <div key={groupName}>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  {groupName}
                </h3>
                <div className="space-y-2">
                  {permissions.map(({ key, label, description }) => {
                    const permissionValue = PERMISSIONS[key];
                    const isSelected = selectedPermissions.includes(permissionValue);
                    
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePermission(key)}
                          className="mt-1 rounded text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{label}</span>
                            {isSelected && (
                              <HiOutlineCheck className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}

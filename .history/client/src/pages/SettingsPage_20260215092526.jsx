import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

export default function SettingsPage() {
  const { user } = useAuth();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>

      {/* Profile Card */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiUser /> My Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Full Name</p>
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <p className="text-gray-500 flex items-center gap-1"><FiMail className="w-3 h-3" /> Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-gray-500 flex items-center gap-1"><FiPhone className="w-3 h-3" /> Phone</p>
            <p className="font-medium">{user?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">WhatsApp</p>
            <p className="font-medium">{user?.whatsapp || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 flex items-center gap-1"><FiMapPin className="w-3 h-3" /> Territory</p>
            <p className="font-medium">{user?.territory || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Role</p>
            <p className="font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-gray-500">Commission Rate</p>
            <p className="font-medium">{user?.defaultCommissionRate}%</p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FiLock /> Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              className="input-field"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="input-field"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

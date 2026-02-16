import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab('profile')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            tab === 'profile' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
          }`}
        >
          <HiOutlineUser className="w-4 h-4" /> Profile
        </button>
        <button
          onClick={() => setTab('security')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            tab === 'security' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
          }`}
        >
          <HiOutlineLockClosed className="w-4 h-4" /> Security
        </button>
      </div>

      {tab === 'profile' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900 font-medium">{user?.firstName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900 font-medium">{user?.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Role</label>
                <p className="capitalize text-gray-900">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Territory</label>
                <p className="text-gray-900">{user?.territory || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-6">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input-field"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

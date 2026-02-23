import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import PermissionsEditor from '../components/users/PermissionsEditor';
import { ROLES, ROLE_LABELS, NIGERIAN_STATES, COUNTRIES } from '../utils/constants';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineEye, HiOutlineShieldCheck } from 'react-icons/hi';

export default function UsersPage() {
  const { user: currentUser, hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPerformance, setShowPerformance] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [showPermissions, setShowPermissions] = useState(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'sales_rep', country: 'Nigeria', territory: '', phone: '', defaultCommissionRate: 25
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await userService.getAll();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const { password, ...updateData } = form;
        await userService.update(editingUser._id, updateData);
        toast.success('User updated');
      } else {
        await userService.create(form);
        toast.success('User created');
      }
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setForm({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      password: '', role: u.role, country: u.country || 'Nigeria', territory: u.territory || '', phone: u.phone || '',
      defaultCommissionRate: u.defaultCommissionRate || 25
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.delete(id);
      toast.success('User deleted');
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const handleViewPerformance = async (userId) => {
    try {
      const { data } = await userService.getPerformance(userId);
      setPerformance(data);
      setShowPerformance(userId);
    } catch (error) {
      toast.error('Failed to load performance');
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setForm({ firstName: '', lastName: '', email: '', password: '', role: 'sales_rep', country: 'Nigeria', territory: '', phone: '', defaultCommissionRate: 25 });
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">User Management</h1>
        {hasRole('admin') && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Commission %</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="font-medium">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-700">
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="text-gray-700">{u.territory || '—'}</div>
                      <div className="text-gray-400 text-xs">{u.country || 'Nigeria'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700 font-medium">{u.defaultCommissionRate || 25}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleViewPerformance(u._id)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="View Performance"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      {hasRole('admin') && (
                        <>
                          <button
                            onClick={() => handleEdit(u)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowPermissions(u)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Manage Permissions"
                          >
                            <HiOutlineShieldCheck className="w-4 h-4" />
                          </button>
                          {u._id !== currentUser._id && (
                            <button
                              onClick={() => handleDelete(u._id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                className="input-field" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                className="input-field" required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="input-field" required
            />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="input-field" required minLength={6}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="input-field"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={form.country}
                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="input-field"
              >
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.country === 'Nigeria' ? 'State' : 'State/Region/City'}
            </label>
            {form.country === 'Nigeria' ? (
              <select
                value={form.territory}
                onChange={e => setForm(p => ({ ...p, territory: e.target.value }))}
                className="input-field"
              >
                <option value="">Select State...</option>
                {NIGERIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.territory}
                onChange={e => setForm(p => ({ ...p, territory: e.target.value }))}
                className="input-field"
                placeholder="Enter state, region, or city"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={form.defaultCommissionRate}
              onChange={e => setForm(p => ({ ...p, defaultCommissionRate: Number(e.target.value) }))}
              className="input-field"
              placeholder="0-100"
            />
            <p className="text-xs text-gray-500 mt-1">Used when no commission is specified on a lead</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary">
              {editingUser ? 'Update' : 'Create User'}
            </button>
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Performance Modal */}
      <Modal
        isOpen={!!showPerformance}
        onClose={() => { setShowPerformance(null); setPerformance(null); }}
        title="User Performance"
        size="lg"
      >
        {performance && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Total Leads</p>
                <p className="text-2xl font-bold">{performance.totalLeads || 0}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Won</p>
                <p className="text-2xl font-bold text-green-600">{performance.wonDeals || 0}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Win Rate</p>
                <p className="text-2xl font-bold text-blue-600">{performance.winRate || 0}%</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Revenue</p>
                <p className="text-xl font-bold text-purple-600">₦{((performance.revenue || 0) / 1000000).toFixed(1)}M</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Pipeline Value</p>
                <p className="text-xl font-bold text-yellow-600">₦{((performance.pipelineValue || 0) / 1000000).toFixed(1)}M</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Commission Earned</p>
                <p className="text-xl font-bold text-indigo-600">₦{((performance.commissionEarned || 0) / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Permissions Editor */}
      {showPermissions && (
        <PermissionsEditor
          userId={showPermissions._id}
          userName={`${showPermissions.firstName} ${showPermissions.lastName}`}
          onClose={() => setShowPermissions(null)}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiUserX, FiUserCheck } from 'react-icons/fi';
import { ROLES, ROLE_LABELS, TERRITORIES } from '../utils/constants';

const emptyForm = {
  firstName: '', lastName: '', email: '', password: '',
  phone: '', whatsapp: '', role: 'sales_rep',
  territory: 'Kaduna', defaultCommissionRate: 25
};

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await userService.getAll();
      setUsers(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const { password, email, ...updates } = form;
        await userService.update(editingUser._id, updates);
        toast.success('User updated');
      } else {
        await authService.register(form);
        toast.success('User created');
      }
      setShowModal(false);
      setEditingUser(null);
      setForm(emptyForm);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      role: user.role,
      territory: user.territory,
      defaultCommissionRate: user.defaultCommissionRate
    });
    setShowModal(true);
  };

  const handleToggleActive = async (user) => {
    try {
      if (user.isActive) {
        await userService.deactivate(user._id);
        toast.success('User deactivated');
      } else {
        await userService.update(user._id, { isActive: true });
        toast.success('User reactivated');
      }
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">User Management</h1>
        {isAdmin() && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add User
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 font-semibold text-gray-500">Name</th>
              <th className="pb-3 font-semibold text-gray-500">Email</th>
              <th className="pb-3 font-semibold text-gray-500">Role</th>
              <th className="pb-3 font-semibold text-gray-500">Territory</th>
              <th className="pb-3 font-semibold text-gray-500">Commission %</th>
              <th className="pb-3 font-semibold text-gray-500">Status</th>
              <th className="pb-3 font-semibold text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u._id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="py-3 text-gray-600">{u.email}</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="py-3">{u.territory}</td>
                <td className="py-3">{u.defaultCommissionRate}%</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 text-right space-x-2">
                  {isAdmin() && (
                    <>
                      <button onClick={() => handleEdit(u)} className="text-primary-600 hover:text-primary-800" title="Edit">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleToggleActive(u)}
                        className={u.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}
                        title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                        {u.isActive ? <FiUserX /> : <FiUserCheck />}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Create User'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          {!editingUser && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" className="input-field" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input className="input-field" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
              <select className="input-field" value={form.territory} onChange={e => setForm({ ...form, territory: e.target.value })}>
                {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
              <input type="number" className="input-field" min={0} max={100} value={form.defaultCommissionRate} onChange={e => setForm({ ...form, defaultCommissionRate: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editingUser ? 'Update User' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

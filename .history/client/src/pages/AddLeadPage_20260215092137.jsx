import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadService } from '../services/leadService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import LeadForm from '../components/leads/LeadForm';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function AddLeadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (['admin', 'manager', 'team_lead'].includes(user?.role)) {
      userService.getAll()
        .then(res => setUsers(res.data))
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (data) => {
    try {
      const { data: lead } = await leadService.createLead(data);
      toast.success('Lead created successfully');
      navigate(`/leads/${lead._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/leads')} className="p-2 rounded-lg hover:bg-gray-100">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="page-title">Add New Lead</h1>
      </div>
      <div className="card">
        <LeadForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/leads')}
          users={users}
        />
      </div>
    </div>
  );
}

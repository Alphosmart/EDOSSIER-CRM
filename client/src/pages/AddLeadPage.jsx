import { useNavigate } from 'react-router-dom';
import LeadForm from '../components/leads/LeadForm';
import { leadService } from '../services/leadService';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import { Link } from 'react-router-dom';

export default function AddLeadPage() {
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const { data } = await leadService.createLead(formData);
      toast.success('Lead created successfully!');
      navigate(`/leads/${data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create lead');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/leads" className="p-2 rounded-lg hover:bg-gray-100">
          <HiOutlineArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="page-title">Add New Lead</h1>
      </div>
      <div className="card">
        <LeadForm onSubmit={handleSubmit} onCancel={() => navigate('/leads')} />
      </div>
    </div>
  );
}

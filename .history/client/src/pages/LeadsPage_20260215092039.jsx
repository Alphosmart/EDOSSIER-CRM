import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { leadService } from '../services/leadService';
import LeadCard from '../components/leads/LeadCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LEAD_STATUSES, TERRITORIES } from '../utils/constants';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [territoryFilter, setTerritoryFilter] = useState(searchParams.get('territory') || '');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLeads();
  }, [statusFilter, territoryFilter, page]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (territoryFilter) params.territory = territoryFilter;

      const { data } = await leadService.getLeads(params);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadLeads();
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await leadService.updateStatus(leadId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      loadLeads();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total leads</p>
        </div>
        <Link to="/leads/new" className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Add Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search schools, contacts, cities..."
              className="input-field pl-10"
            />
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={territoryFilter}
            onChange={(e) => { setTerritoryFilter(e.target.value); setPage(1); }}
            className="input-field w-full sm:w-40"
          >
            <option value="">All Territories</option>
            {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Lead list */}
      {loading ? (
        <LoadingSpinner />
      ) : leads.length === 0 ? (
        <div className="card text-center py-12">
          <HiOutlineFilter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No leads found</p>
          <Link to="/leads/new" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
            Create your first lead
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map(lead => (
            <LeadCard
              key={lead._id}
              lead={lead}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

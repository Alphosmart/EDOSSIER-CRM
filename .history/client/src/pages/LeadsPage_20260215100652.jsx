import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadService } from '../services/leadService';
import LeadCard from '../components/leads/LeadCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LEAD_STATUSES, TERRITORIES } from '../utils/constants';
import { formatNaira } from '../utils/formatCurrency';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    loadLeads();
  }, [page, statusFilter, territoryFilter]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (territoryFilter) params.territory = territoryFilter;

      const { data } = await leadService.getLeads(params);
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
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
      toast.error(error.response?.data?.message || 'Failed to update status');
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
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schools, contacts, cities..."
                className="input-field pl-10"
              />
            </div>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">All Statuses</option>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={territoryFilter}
            onChange={(e) => { setTerritoryFilter(e.target.value); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">All Territories</option>
            {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : leads.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 text-lg">No leads found</p>
          <Link to="/leads/new" className="btn-primary mt-4 inline-block">Create your first lead</Link>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map(lead => (
            <LeadCard key={lead._id} lead={lead} onStatusChange={handleStatusChange} />
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3 font-semibold text-gray-700">School</th>
                <th className="pb-3 font-semibold text-gray-700">Contact</th>
                <th className="pb-3 font-semibold text-gray-700">Territory</th>
                <th className="pb-3 font-semibold text-gray-700">Status</th>
                <th className="pb-3 font-semibold text-gray-700 text-right">Deal Value</th>
                <th className="pb-3 font-semibold text-gray-700 text-right">Probability</th>
                <th className="pb-3 font-semibold text-gray-700">Assigned To</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map(lead => (
                <tr key={lead._id} className="hover:bg-gray-50">
                  <td className="py-3">
                    <Link to={`/leads/${lead._id}`} className="font-medium text-primary-600 hover:underline">
                      {lead.schoolName}
                    </Link>
                    <p className="text-xs text-gray-500">{lead.schoolId}</p>
                  </td>
                  <td className="py-3">
                    <p>{lead.personMet}</p>
                    <p className="text-xs text-gray-500">{lead.positionTitle}</p>
                  </td>
                  <td className="py-3">{lead.territory}</td>
                  <td className="py-3">
                    <LeadCard lead={lead} onStatusChange={handleStatusChange} />
                  </td>
                  <td className="py-3 text-right font-medium">{formatNaira(lead.negotiatedPrice || lead.proposedPrice)}</td>
                  <td className="py-3 text-right">{lead.probabilityOfClosing || 0}%</td>
                  <td className="py-3 text-sm">
                    {lead.assignedTo?.firstName} {lead.assignedTo?.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

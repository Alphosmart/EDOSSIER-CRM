import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leadService } from '../services/leadService';
import LeadCard from '../components/leads/LeadCard';
import LeadStatusDropdown from '../components/leads/LeadStatusDropdown';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { LEAD_STATUSES } from '../utils/constants';
import { NIGERIAN_STATES } from '../utils/nigerianStatesLgas';
import { COUNTRY_NAMES } from '../utils/countries';
import { formatNaira, formatCurrency } from '../utils/formatCurrency';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlineUpload,
  HiOutlineX, HiOutlineDocumentText, HiOutlineCheckCircle,
  HiOutlineUser, HiOutlineBell
} from 'react-icons/hi';

export default function LeadsPage() {
  const { user, hasRole } = useAuth();
  const canImport = hasRole('admin', 'manager');

  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [myLeadsTotal, setMyLeadsTotal] = useState(null); // count of leads this user brought
  const [loading, setLoading] = useState(true);
  const [remindingOverdue, setRemindingOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [viewMode, setViewMode] = useState('cards');
  const [leadsView, setLeadsView] = useState('all'); // 'all' | 'mine'

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    loadLeads();
  }, [page, statusFilter, territoryFilter, countryFilter, leadsView]);

  // Fetch the "my leads" count once on mount so the tab badge is always visible
  useEffect(() => {
    leadService.getLeads({ limit: 1, myLeads: true })
      .then(({ data }) => setMyLeadsTotal(data.total))
      .catch(() => {});
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (territoryFilter) params.territory = territoryFilter;
      if (countryFilter) params.country = countryFilter;
      if (leadsView === 'mine') params.myLeads = true;

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

  const switchView = (v) => { setLeadsView(v); setPage(1); setSearch(''); setStatusFilter(''); setTerritoryFilter(''); setCountryFilter(''); };

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

  // CSV file selected → parse preview
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (result) => {
        setImportPreview(result.data);
      }
    });
  };

  const handleImport = async () => {
    if (!importFile) return toast.error('Please select a CSV file');
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const { data } = await leadService.importLeads(formData);
      toast.success(data.message);
      if (data.errors?.length > 0) {
        console.log('Import warnings:', data.errors);
      }
      setShowImport(false);
      setImportFile(null);
      setImportPreview([]);
      loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          {canImport && (
            <>
              <button
                onClick={() => setShowImport(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <HiOutlineUpload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={async () => {
                  setRemindingOverdue(true);
                  try {
                    const { data } = await leadService.remindAllOverdue();
                    toast.success(data.message);
                  } catch (err) {
                    toast.error(err.response?.data?.message || err.message || 'Failed to send reminders');
                  } finally {
                    setRemindingOverdue(false);
                  }
                }}
                disabled={remindingOverdue}
                className="btn-secondary flex items-center gap-2 text-sm text-amber-600 border-amber-200 hover:bg-amber-50 disabled:opacity-50"
                title="Send in-app reminder to all reps with overdue follow-ups"
              >
                <HiOutlineBell className="w-4 h-4" />
                {remindingOverdue ? 'Sending…' : 'Remind Overdue'}
              </button>
            </>
          )}
          <Link to="/leads/new" className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Leads view toggle: All vs My Leads (brought by me) */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => switchView('all')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            leadsView === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Leads
        </button>
        <button
          onClick={() => switchView('mine')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            leadsView === 'mine' ? 'bg-primary-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <HiOutlineUser className="w-4 h-4" />
          Leads I Brought
          {myLeadsTotal !== null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              leadsView === 'mine' ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-700'
            }`}>{myLeadsTotal}</span>
          )}
        </button>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Import Leads from CSV</h2>
              <button onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); }}>
                <HiOutlineX className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Column reference */}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Expected CSV columns (headers must match exactly):</p>
                <p className="font-mono">schoolName, schoolType, address, city, state, lga, territory, personMet, positionTitle, phoneNumber, emailAddress, currentStatus, nextFollowUpDate, proposedPrice, responseSummary</p>
              </div>

              {/* File picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <HiOutlineDocumentText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {importFile ? (
                  <p className="text-sm font-medium text-primary-600 flex items-center justify-center gap-1">
                    <HiOutlineCheckCircle className="w-4 h-4" />
                    {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Click to select a CSV file, or drag and drop</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Preview table */}
              {importPreview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase">Preview (first 5 rows)</p>
                  <div className="overflow-x-auto rounded-lg border text-xs">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(importPreview[0]).slice(0, 6).map(col => (
                            <th key={col} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.keys(importPreview[0]).slice(0, 6).map(col => (
                              <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap truncate max-w-[120px]">{row[col]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => { setShowImport(false); setImportFile(null); setImportPreview([]); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="btn-primary flex items-center gap-2"
              >
                {importLoading ? (
                  <><span className="animate-spin">⟳</span> Importing…</>
                ) : (
                  <><HiOutlineUpload className="w-4 h-4" /> Import Leads</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            value={countryFilter}
            onChange={(e) => { setCountryFilter(e.target.value); setTerritoryFilter(''); setPage(1); }}
            className="input-field w-auto"
          >
            <option value="">All Countries</option>
            {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(countryFilter === 'Nigeria' || !countryFilter) && (
            <select
              value={territoryFilter}
              onChange={(e) => { setTerritoryFilter(e.target.value); setPage(1); }}
              className="input-field w-auto"
            >
              <option value="">All States</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
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
                <th className="pb-3 font-semibold text-gray-700">Brought By</th>
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
                    <LeadStatusDropdown
                      currentStatus={lead.currentStatus}
                      onChange={(newStatus) => handleStatusChange(lead._id, newStatus)}
                    />
                  </td>
                  <td className="py-3 text-right font-medium">{formatCurrency(lead.negotiatedPrice || lead.proposedPrice, lead.currency || 'NGN')}</td>
                  <td className="py-3 text-right">{lead.probabilityOfClosing || 0}%</td>
                  <td className="py-3 text-sm">
                    {lead.assignedTo?.firstName} {lead.assignedTo?.lastName}
                  </td>
                  <td className="py-3 text-sm">
                    {lead.createdBy ? (
                      <span className={`inline-flex items-center gap-1 ${
                        lead.createdBy._id === user?._id || lead.createdBy === user?._id
                          ? 'text-primary-600 font-medium' : 'text-gray-500'
                      }`}>
                        {lead.createdBy._id === user?._id || lead.createdBy === user?._id
                          ? <><HiOutlineUser className="w-3.5 h-3.5" /> You</>
                          : `${lead.createdBy.firstName} ${lead.createdBy.lastName}`
                        }
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <Pagination
          page={page}
          pages={pages}
          total={total}
          limit={20}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

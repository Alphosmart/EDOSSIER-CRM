import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import StatusBadge from './StatusBadge';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ leads: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < 2) {
      setResults({ leads: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
        setOpen(true);
      } catch (err) {
        setResults({ leads: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (leadId) => {
    navigate(`/leads/${leadId}`);
    setOpen(false);
    setQuery('');
  };

  const hasResults = results.leads?.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search leads… (Ctrl+K)"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <HiOutlineX className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-3 text-sm text-gray-500 text-center">Searching…</div>
          )}

          {!loading && !hasResults && (
            <div className="p-3 text-sm text-gray-500 text-center">
              No results for "<strong>{query}</strong>"
            </div>
          )}

          {!loading && hasResults && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b">
                Leads ({results.leads.length})
              </div>
              {results.leads.map((lead) => (
                <button
                  key={lead._id}
                  onClick={() => handleSelect(lead._id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-primary-50 border-b last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{lead.schoolName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {lead.personMet && `${lead.personMet} · `}
                        {lead.city || lead.state || lead.territory}
                      </p>
                    </div>
                    <StatusBadge status={lead.currentStatus} size="xs" />
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

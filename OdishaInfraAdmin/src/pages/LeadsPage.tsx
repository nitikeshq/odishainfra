import React, { useEffect, useState, useCallback } from 'react';
import { Phone, RefreshCw, Check, X, ArrowRight, Flame, Star, Eye } from 'lucide-react';
import { adminApi } from '../services/api';
import { Badge, Button, Select, Table, EmptyState, Modal, PageLoader } from '../components/ui';

const STATUS_FILTERS = ['All', 'PENDING', 'IN_REVIEW', 'VALIDATED', 'CONNECTED', 'REJECTED', 'CLOSED'];
const TIER_FILTERS = [
  { key: 'all', label: 'All Leads', icon: '📋' },
  { key: 'hot', label: '🔥 Hot', icon: '🔥' },
  { key: 'preferred', label: '⭐ Preferred', icon: '⭐' },
  { key: 'interested', label: '👁 Interested', icon: '👁' },
];

function statusColor(s: string): 'orange' | 'blue' | 'green' | 'red' | 'muted' {
  const map: Record<string, 'orange' | 'blue' | 'green' | 'red' | 'muted'> = {
    PENDING: 'orange', IN_REVIEW: 'blue', VALIDATED: 'green',
    CONNECTED: 'green', REJECTED: 'red', CLOSED: 'muted', INTERESTED: 'muted',
  };
  return map[s] ?? 'muted';
}

function timeAgo(dt: string) {
  const d = Math.floor((Date.now() - new Date(dt).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [action, setAction] = useState<'validate' | 'reject' | 'connect' | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  // Tier counts
  const [counts, setCounts] = useState({ hot: 0, preferred: 0, interested: 0, total: 0 });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (tierFilter !== 'all') params.tier = tierFilter;
      if (statusFilter !== 'All' && tierFilter !== 'interested') params.status = statusFilter;
      const res = await adminApi.getLeads(params);
      setLeads(res.leads ?? res.data ?? []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [tierFilter, statusFilter, page]);

  const fetchCounts = useCallback(async () => {
    try {
      const [hotRes, prefRes, intRes, allRes] = await Promise.all([
        adminApi.getLeads({ tier: 'hot', limit: '1' }),
        adminApi.getLeads({ tier: 'preferred', limit: '1' }),
        adminApi.getLeads({ tier: 'interested', limit: '1' }),
        adminApi.getLeads({ limit: '1' }),
      ]);
      setCounts({
        hot: hotRes.total ?? 0,
        preferred: prefRes.total ?? 0,
        interested: intRes.total ?? 0,
        total: allRes.total ?? 0,
      });
    } catch {}
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(1); }, [tierFilter, statusFilter]);

  const handleAction = async () => {
    if (!selectedLead || !action) return;
    setActionLoading(true);
    try {
      const statusMap = { validate: 'VALIDATED', reject: 'REJECTED', connect: 'CONNECTED' };
      await adminApi.updateLead(selectedLead.id, { status: statusMap[action], notes });
      setSelectedLead(null); setAction(null); setNotes('');
      fetchLeads(); fetchCounts();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);
  const isInterested = tierFilter === 'interested';

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Lead CRM</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{counts.total} total leads</p>
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={fetchLeads}>
          <RefreshCw size={14} />Refresh
        </Button>
      </div>

      {/* Tier stat cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div
          onClick={() => setTierFilter('all')}
          className={`rounded-xl border p-3 cursor-pointer transition-all ${tierFilter === 'all' ? 'border-[#FF8240] bg-[rgba(255,130,64,0.08)]' : 'border-[#1E1E1E] bg-[#0D1117] hover:border-[#FF8240]/40'}`}
        >
          <div className="text-2xl font-extrabold text-white">{counts.total}</div>
          <div className="text-xs text-[#8B949E] mt-0.5">📋 All Leads</div>
        </div>
        <div
          onClick={() => setTierFilter('hot')}
          className={`rounded-xl border p-3 cursor-pointer transition-all ${tierFilter === 'hot' ? 'border-[#FF8240] bg-[rgba(255,130,64,0.08)]' : 'border-[#1E1E1E] bg-[#0D1117] hover:border-[#FF8240]/40'}`}
        >
          <div className="text-2xl font-extrabold text-[#FF8240]">{counts.hot}</div>
          <div className="text-xs text-[#8B949E] mt-0.5">🔥 Hot (time set)</div>
        </div>
        <div
          onClick={() => setTierFilter('preferred')}
          className={`rounded-xl border p-3 cursor-pointer transition-all ${tierFilter === 'preferred' ? 'border-[#27AE60] bg-[rgba(39,174,96,0.08)]' : 'border-[#1E1E1E] bg-[#0D1117] hover:border-[#27AE60]/40'}`}
        >
          <div className="text-2xl font-extrabold text-[#27AE60]">{counts.preferred}</div>
          <div className="text-xs text-[#8B949E] mt-0.5">⭐ Preferred</div>
        </div>
        <div
          onClick={() => setTierFilter('interested')}
          className={`rounded-xl border p-3 cursor-pointer transition-all ${tierFilter === 'interested' ? 'border-[#2980B9] bg-[rgba(41,128,185,0.08)]' : 'border-[#1E1E1E] bg-[#0D1117] hover:border-[#2980B9]/40'}`}
        >
          <div className="text-2xl font-extrabold text-[#2980B9]">{counts.interested}</div>
          <div className="text-xs text-[#8B949E] mt-0.5">👁 Interested (page views)</div>
        </div>
      </div>

      {/* Status filters — only for callback leads */}
      {!isInterested && (
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'bg-[rgba(255,130,64,0.12)] text-[#FF8240]'
                  : 'bg-[#0D1117] text-[#6E7681] border border-[#1E1E1E] hover:text-[#E6EDF3]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <Table
        headers={isInterested
          ? ['Customer', 'Property', 'Developer', 'Phone', 'Viewed']
          : ['Customer', 'Property', 'Developer', 'Phone', 'Tier', 'Status', 'Time', 'Actions']}
        loading={loading}
        empty={<EmptyState title="No leads found" description="No leads match the current filter." icon={<Phone size={24} />} />}
      >
        {leads.map((lead: any) => (
          <tr key={lead.id} className="hover:bg-[#0D1117] transition-colors">
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-[#E6EDF3]">{lead.user?.name || '—'}</div>
              <div className="text-xs text-[#6E7681]">{lead.phone || lead.user?.phone}</div>
            </td>
            <td className="px-4 py-3 text-sm text-[#E6EDF3]">{lead.property?.name || '—'}</td>
            <td className="px-4 py-3 text-sm text-[#8B949E]">{lead.property?.developer?.companyName || '—'}</td>
            <td className="px-4 py-3 text-sm text-[#E6EDF3]">
              {lead.status === 'CONNECTED' || isInterested
                ? (lead.user?.phone || lead.phone)
                : <span className="text-[#6E7681]">••••••••••</span>}
            </td>
            {!isInterested && (
              <>
                <td className="px-4 py-3">
                  {lead.tier === 'hot'
                    ? <span className="text-sm">🔥 Hot</span>
                    : <span className="text-xs text-[#8B949E]">⭐ Preferred</span>}
                  {lead.bestTimeToCall && (
                    <div className="text-xs text-[#FF8240] mt-0.5">{lead.bestTimeToCall}</div>
                  )}
                </td>
                <td className="px-4 py-3"><Badge label={lead.status} color={statusColor(lead.status)} /></td>
              </>
            )}
            <td className="px-4 py-3 text-xs text-[#6E7681]">{timeAgo(lead.createdAt)}</td>
            {!isInterested && (
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {lead.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => { setSelectedLead(lead); setAction('validate'); }}>
                        <Check size={13} />Validate
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => { setSelectedLead(lead); setAction('reject'); }}>
                        <X size={13} />
                      </Button>
                    </>
                  )}
                  {lead.status === 'VALIDATED' && (
                    <Button size="sm" variant="primary" onClick={() => { setSelectedLead(lead); setAction('connect'); }}>
                      <ArrowRight size={13} />Connect
                    </Button>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))}
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-[#6E7681]">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <Modal
        open={!!selectedLead && !!action}
        onClose={() => { setSelectedLead(null); setAction(null); setNotes(''); }}
        title={action === 'validate' ? 'Validate Lead' : action === 'reject' ? 'Reject Lead' : 'Connect Lead'}
      >
        {selectedLead && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#161B22] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{selectedLead.user?.name}</span>
                {selectedLead.tier === 'hot' && <span className="text-xs">🔥 Hot Lead</span>}
              </div>
              <div className="text-xs text-[#6E7681]">{selectedLead.property?.name}</div>
              {selectedLead.bestTimeToCall && (
                <div className="text-xs text-[#FF8240] mt-1">Preferred time: {selectedLead.bestTimeToCall}</div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] h-20 resize-none"
                placeholder="Add notes..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setSelectedLead(null); setAction(null); setNotes(''); }}>Cancel</Button>
              <Button
                variant={action === 'reject' ? 'danger' : 'primary'}
                loading={actionLoading}
                onClick={handleAction}
              >
                {action === 'validate' ? 'Validate' : action === 'reject' ? 'Reject' : 'Connect Now'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

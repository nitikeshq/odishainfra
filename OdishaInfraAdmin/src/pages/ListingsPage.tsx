import React, { useEffect, useState, useCallback } from 'react';
import { Building2, RefreshCw, Check, X, Star } from 'lucide-react';
import { adminApi } from '../services/api';
import { Badge, Button, Table, EmptyState, Modal } from '../components/ui';

const STATUS_FILTERS = ['All', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'ARCHIVED', 'DRAFT'];

function statusColor(s: string): 'orange' | 'green' | 'red' | 'muted' | 'blue' {
  const map: Record<string, 'orange' | 'green' | 'red' | 'muted' | 'blue'> = {
    PENDING_REVIEW: 'orange', ACTIVE: 'green', REJECTED: 'red', ARCHIVED: 'muted', DRAFT: 'blue',
  };
  return map[s] ?? 'muted';
}

function formatPrice(n?: number) {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n}`;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'feature' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await adminApi.getListings(params);
      setListings(res.listings ?? res.data ?? []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleAction = async () => {
    if (!selected || !action) return;
    setActionLoading(true);
    try {
      if (action === 'approve') {
        await adminApi.updateListing(selected.id, { listingStatus: 'ACTIVE' });
      } else if (action === 'reject') {
        await adminApi.updateListing(selected.id, { listingStatus: 'REJECTED', rejectionReason: rejectReason });
      } else if (action === 'feature') {
        await adminApi.updateListing(selected.id, { isFeatured: !selected.isFeatured });
      }
      setSelected(null); setAction(null); setRejectReason('');
      fetchListings();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Listings Moderation</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} listings</p>
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={fetchListings}>
          <RefreshCw size={14} />Refresh
        </Button>
      </div>

      {/* Filters */}
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
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Table
        headers={['Property', 'Developer', 'City', 'Price', 'Type', 'Status', 'Featured', 'Actions']}
        loading={loading}
        empty={<EmptyState title="No listings found" icon={<Building2 size={24} />} />}
      >
        {listings.map((l: any) => (
          <tr key={l.id} className="hover:bg-[#0D1117] transition-colors">
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-[#E6EDF3] max-w-[160px] truncate">{l.name}</div>
              <div className="text-xs text-[#6E7681]">{l.bhkConfig || ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-[#8B949E] max-w-[120px] truncate">{l.developer?.companyName || '—'}</td>
            <td className="px-4 py-3 text-sm text-[#8B949E]">{l.city}</td>
            <td className="px-4 py-3 text-sm text-[#FF8240] font-semibold whitespace-nowrap">
              {l.priceMin ? `${formatPrice(l.priceMin)}${l.priceMax ? ` – ${formatPrice(l.priceMax)}` : ''}` : '—'}
            </td>
            <td className="px-4 py-3 text-xs text-[#6E7681]">{l.propertyType}</td>
            <td className="px-4 py-3"><Badge label={l.listingStatus} color={statusColor(l.listingStatus)} /></td>
            <td className="px-4 py-3">
              <button
                onClick={() => { setSelected(l); setAction('feature'); }}
                className={`p-1.5 rounded-lg transition-all ${l.isFeatured ? 'text-[#FDD171] bg-[rgba(253,209,113,0.12)]' : 'text-[#6E7681] hover:text-[#FDD171]'}`}
              >
                <Star size={14} fill={l.isFeatured ? 'currentColor' : 'none'} />
              </button>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                {l.listingStatus === 'PENDING_REVIEW' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setSelected(l); setAction('approve'); }}>
                      <Check size={13} />Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { setSelected(l); setAction('reject'); }}>
                      <X size={13} />
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

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
        open={!!selected && !!action}
        onClose={() => { setSelected(null); setAction(null); setRejectReason(''); }}
        title={action === 'approve' ? 'Approve Listing' : action === 'reject' ? 'Reject Listing' : `${selected?.isFeatured ? 'Unfeature' : 'Feature'} Listing`}
      >
        {selected && action && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#161B22] rounded-lg p-4">
              <div className="text-sm font-semibold text-white">{selected.name}</div>
              <div className="text-xs text-[#6E7681] mt-1">{selected.developer?.companyName} · {selected.city}</div>
            </div>
            {action === 'reject' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] h-20 resize-none"
                  placeholder="Reason for rejection..."
                />
              </div>
            )}
            {action === 'feature' && (
              <p className="text-sm text-[#8B949E]">
                {selected.isFeatured ? 'Remove this listing from featured?' : 'Feature this listing on the home feed?'}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setSelected(null); setAction(null); setRejectReason(''); }}>Cancel</Button>
              <Button
                variant={action === 'reject' ? 'danger' : 'primary'}
                loading={actionLoading}
                onClick={handleAction}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

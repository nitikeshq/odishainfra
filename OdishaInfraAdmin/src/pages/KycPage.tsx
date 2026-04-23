import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Check, X, Eye } from 'lucide-react';
import { adminApi } from '../services/api';
import { Badge, Button, Table, EmptyState, Modal, PageLoader } from '../components/ui';

function statusColor(s: string): 'orange' | 'green' | 'red' | 'muted' {
  const map: Record<string, 'orange' | 'green' | 'red' | 'muted'> = {
    PENDING: 'orange', APPROVED: 'green', REJECTED: 'red', NOT_SUBMITTED: 'muted',
  };
  return map[s] ?? 'muted';
}

function timeAgo(dt: string) {
  const d = Math.floor((Date.now() - new Date(dt).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function KycPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [selected, setSelected] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewDocs, setViewDocs] = useState<any>(null);

  const fetchKyc = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await adminApi.getKyc(params);
      const items = res.developers ?? res.data ?? res ?? [];
      setEntries(items);
      setTotal(items.length);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchKyc(); }, [fetchKyc]);

  const handleAction = async () => {
    if (!selected || !action) return;
    setActionLoading(true);
    try {
      const statusMap = { approve: 'APPROVED', reject: 'REJECTED' };
      await adminApi.updateKyc(selected.id, { status: statusMap[action], rejectionReason: reason || undefined });
      setSelected(null); setAction(null); setReason('');
      fetchKyc();
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Developer KYC Review</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} submissions</p>
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={fetchKyc}>
          <RefreshCw size={14} />Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {['All', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
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

      <Table
        headers={['Developer', 'Company', 'RERA', 'KYC Status', 'Submitted', 'Actions']}
        loading={loading}
        empty={<EmptyState title="No KYC submissions" description="No developers match this filter." icon={<ShieldCheck size={24} />} />}
      >
        {entries.map((dev: any) => (
          <tr key={dev.id} className="hover:bg-[#0D1117] transition-colors">
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-[#E6EDF3]">{dev.user?.name || '—'}</div>
              <div className="text-xs text-[#6E7681]">{dev.user?.phone || dev.user?.email || ''}</div>
            </td>
            <td className="px-4 py-3 text-sm text-[#E6EDF3]">{dev.companyName || '—'}</td>
            <td className="px-4 py-3 text-xs text-[#8B949E] font-mono">{dev.reraNumber || '—'}</td>
            <td className="px-4 py-3"><Badge label={dev.kycStatus || 'N/A'} color={statusColor(dev.kycStatus)} /></td>
            <td className="px-4 py-3 text-xs text-[#6E7681]">{dev.updatedAt ? timeAgo(dev.updatedAt) : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                {dev.kycDocuments?.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setViewDocs(dev)}>
                    <Eye size={13} />Docs
                  </Button>
                )}
                {dev.kycStatus === 'PENDING' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => { setSelected(dev); setAction('approve'); }}>
                      <Check size={13} />Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { setSelected(dev); setAction('reject'); }}>
                      <X size={13} />Reject
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* View Documents Modal */}
      <Modal open={!!viewDocs} onClose={() => setViewDocs(null)} title="KYC Documents">
        {viewDocs && (
          <div className="flex flex-col gap-3">
            <div className="text-sm text-[#8B949E]">{viewDocs.companyName} — {viewDocs.user?.name}</div>
            {(viewDocs.kycDocuments || []).map((doc: string, i: number) => (
              <a
                key={i}
                href={doc}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 bg-[#161B22] border border-[#1E1E1E] rounded-lg px-4 py-3 text-sm text-[#FF8240] hover:bg-[#1A1F26] transition-colors"
              >
                <Eye size={14} />Document {i + 1}
              </a>
            ))}
          </div>
        )}
      </Modal>

      {/* Approve/Reject Modal */}
      <Modal
        open={!!selected && !!action}
        onClose={() => { setSelected(null); setAction(null); setReason(''); }}
        title={action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#161B22] rounded-lg p-4">
              <div className="text-sm font-semibold text-white">{selected.user?.name}</div>
              <div className="text-xs text-[#6E7681] mt-1">{selected.companyName}</div>
            </div>
            {action === 'reject' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">Rejection Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] h-20 resize-none"
                  placeholder="Reason for rejection..."
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => { setSelected(null); setAction(null); setReason(''); }}>Cancel</Button>
              <Button
                variant={action === 'reject' ? 'danger' : 'primary'}
                loading={actionLoading}
                onClick={handleAction}
              >
                {action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

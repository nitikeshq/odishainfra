import React, { useEffect, useState, useCallback } from 'react';
import { Phone, ShieldCheck, Users, Building2, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/api';
import { StatCard, Badge, PageLoader, Button } from '../components/ui';
import { useNavigate } from 'react-router-dom';

function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function leadStatusColor(status: string): 'orange' | 'blue' | 'green' | 'red' | 'muted' {
  const map: Record<string, 'orange' | 'blue' | 'green' | 'red' | 'muted'> = {
    PENDING: 'orange', IN_REVIEW: 'blue', VALIDATED: 'green',
    CONNECTED: 'green', REJECTED: 'red', CLOSED: 'muted',
  };
  return map[status] ?? 'muted';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminApi.getAdminDashboard();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = data?.stats ?? {};
  const recentLeads = data?.recentLeads ?? [];
  const settings = data?.settings ?? {};

  if (loading) return <PageLoader />;

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Platform overview & recent activity</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={refreshing}
          onClick={() => { setRefreshing(true); fetchData(); }}
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {(stats.pendingLeads > 0 || stats.kycPending > 0) && (
        <div className="flex flex-wrap gap-3 mb-6">
          {stats.pendingLeads > 0 && (
            <div className="flex items-center gap-2 bg-[rgba(253,209,113,0.08)] border border-[rgba(253,209,113,0.2)] rounded-lg px-4 py-2.5 text-sm">
              <AlertTriangle size={14} className="text-[#FDD171]" />
              <span className="text-[#FDD171] font-medium">{stats.pendingLeads} leads awaiting validation</span>
              <button onClick={() => navigate('/leads')} className="text-[#FF8240] text-xs underline ml-2">View →</button>
            </div>
          )}
          {stats.kycPending > 0 && (
            <div className="flex items-center gap-2 bg-[rgba(41,128,185,0.08)] border border-[rgba(41,128,185,0.2)] rounded-lg px-4 py-2.5 text-sm">
              <ShieldCheck size={14} className="text-[#2980B9]" />
              <span className="text-[#2980B9] font-medium">{stats.kycPending} KYC submissions pending</span>
              <button onClick={() => navigate('/kyc')} className="text-[#FF8240] text-xs underline ml-2">Review →</button>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Leads" value={stats.pendingLeads ?? 0} icon={<Phone size={20} />} color="#FF8240" />
        <StatCard label="KYC Pending" value={stats.kycPending ?? 0} icon={<ShieldCheck size={20} />} color="#2980B9" />
        <StatCard label="Active Users" value={stats.activeUsers ?? 0} icon={<Users size={20} />} color="#27AE60" />
        <StatCard label="Live Projects" value={stats.liveProjects ?? 0} icon={<Building2 size={20} />} color="#9B59B6" />
      </div>

      {/* Platform Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wide mb-3">Platform Status</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#E6EDF3]">Subscription Mode</span>
              <Badge
                label={settings.subscriptionEnabled ? 'Enabled' : 'Disabled'}
                color={settings.subscriptionEnabled ? 'green' : 'muted'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#E6EDF3]">API Status</span>
              <Badge label="Online" color="green" />
            </div>
          </div>
        </div>

        {/* Recent Leads */}
        <div className="lg:col-span-2 bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wide">Recent Leads</h3>
            <button onClick={() => navigate('/leads')} className="text-xs text-[#FF8240] hover:underline">View all →</button>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-[#6E7681] py-4 text-center">No recent leads</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentLeads.slice(0, 5).map((lead: any) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#E6EDF3] truncate">{lead.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-[#6E7681] truncate">{lead.property?.name || '—'}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <Badge label={lead.status} color={leadStatusColor(lead.status)} />
                    <span className="text-xs text-[#6E7681]">{timeAgo(lead.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

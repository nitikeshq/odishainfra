import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { adminApi } from '../services/api';
import { StatCard, PageLoader, Button } from '../components/ui';

const PERIODS = ['7d', '30d', '90d', 'all'];
const PERIOD_LABELS: Record<string, string> = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', 'all': 'All Time' };

function ChangeTag({ change }: { change?: string | number }) {
  if (change === undefined || change === null) return null;
  const num = typeof change === 'number' ? change : parseFloat(String(change));
  const isPositive = num >= 0;
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${isPositive ? 'text-[#27AE60]' : 'text-[#E74C3C]'}`}>
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? '+' : ''}{typeof change === 'number' ? `${change}%` : change}
    </span>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-[#8B949E] text-right shrink-0">{label}</div>
      <div className="flex-1 bg-[#161B22] rounded-full h-3 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 text-xs text-[#E6EDF3] font-semibold">{value.toLocaleString()}</div>
      <div className="w-10 text-xs text-[#6E7681]">{pct}%</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await adminApi.getAnalytics({ period });
      // Backend returns a flat analytics object
      const raw = res.analytics ?? res.data ?? res ?? {};
      // Normalize to a consistent shape
      setData({
        metrics: {
          totalUsers: raw.totalUsers ?? raw.metrics?.totalUsers ?? 0,
          propertyViews: raw.totalPropertyViews ?? raw.propertyViews ?? 0,
          leadsGenerated: raw.totalLeads ?? raw.leadsGenerated ?? 0,
          shortViews: raw.totalShortViews ?? raw.shortViews ?? 0,
          activeDevelopers: raw.activeDevelopers ?? 0,
          liveProjects: raw.totalProperties ?? raw.liveProjects ?? 0,
          wishlistSaves: raw.wishlistSaves ?? 0,
          callbacks: raw.totalLeads ?? raw.callbacks ?? 0,
        },
        funnel: raw.funnel ?? {
          propertyViews: raw.totalPropertyViews ?? 0,
          wishlistAdds: raw.wishlistSaves ?? 0,
          callbackRequests: raw.totalLeads ?? 0,
          validatedLeads: raw.leadsValidated ?? 0,
          connectedLeads: raw.leadsConnected ?? 0,
        },
        topProperties: raw.topProperties ?? [],
      });
    } catch {
      setData({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return <PageLoader />;

  const metrics = data?.metrics ?? data ?? {};
  const funnel = data?.funnel ?? {};

  const funnelMax = Math.max(funnel.propertyViews ?? 0, 1);

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Platform Analytics</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Aggregate metrics across all users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#0D1117] border border-[#1E1E1E] rounded-lg overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-xs font-semibold transition-all ${
                  period === p ? 'bg-[rgba(255,130,64,0.12)] text-[#FF8240]' : 'text-[#6E7681] hover:text-[#E6EDF3]'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" loading={refreshing} onClick={() => { setRefreshing(true); fetchAnalytics(); }}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={metrics.totalUsers ?? 0} icon={<BarChart3 size={20} />} color="#FF8240"
          subText={<ChangeTag change={metrics.userGrowth} /> as any} />
        <StatCard label="Property Views" value={(metrics.propertyViews ?? 0).toLocaleString()} icon={<BarChart3 size={20} />} color="#2980B9"
          subText={<ChangeTag change={metrics.viewsGrowth} /> as any} />
        <StatCard label="Leads Generated" value={metrics.leadsGenerated ?? 0} icon={<BarChart3 size={20} />} color="#27AE60"
          subText={<ChangeTag change={metrics.leadsGrowth} /> as any} />
        <StatCard label="Short Views" value={(metrics.shortViews ?? 0).toLocaleString()} icon={<BarChart3 size={20} />} color="#9B59B6"
          subText={<ChangeTag change={metrics.shortViewsGrowth} /> as any} />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Developers" value={metrics.activeDevelopers ?? 0} icon={<BarChart3 size={20} />} color="#FDD171" />
        <StatCard label="Live Projects" value={metrics.liveProjects ?? 0} icon={<BarChart3 size={20} />} color="#E74C3C" />
        <StatCard label="Wishlist Saves" value={metrics.wishlistSaves ?? 0} icon={<BarChart3 size={20} />} color="#FF8240" />
        <StatCard label="Callbacks" value={metrics.callbacks ?? 0} icon={<BarChart3 size={20} />} color="#27AE60" />
      </div>

      {/* Conversion Funnel */}
      {Object.keys(funnel).length > 0 && (
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6 mb-6">
          <h3 className="text-base font-bold text-white mb-6">Conversion Funnel</h3>
          <div className="flex flex-col gap-4">
            <FunnelBar label="Property Views" value={funnel.propertyViews ?? 0} max={funnelMax} color="#FF8240" />
            <FunnelBar label="Wishlist Adds" value={funnel.wishlistAdds ?? 0} max={funnelMax} color="#FDD171" />
            <FunnelBar label="Callbacks" value={funnel.callbackRequests ?? 0} max={funnelMax} color="#2980B9" />
            <FunnelBar label="Validated" value={funnel.validatedLeads ?? 0} max={funnelMax} color="#27AE60" />
            <FunnelBar label="Connected" value={funnel.connectedLeads ?? 0} max={funnelMax} color="#9B59B6" />
          </div>
        </div>
      )}

      {/* Top Properties */}
      {data?.topProperties?.length > 0 && (
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-4">Top Performing Projects</h3>
          <div className="flex flex-col gap-2">
            {data.topProperties.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id || i} className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6E7681] font-mono w-5">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-[#E6EDF3]">{p.name}</div>
                    <div className="text-xs text-[#6E7681]">{p.city}</div>
                  </div>
                </div>
                <div className="text-sm text-[#FF8240] font-semibold">{p.views ?? 0} views</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

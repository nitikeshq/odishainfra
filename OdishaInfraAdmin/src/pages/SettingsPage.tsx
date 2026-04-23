import React, { useEffect, useState, useCallback } from 'react';
import { Settings, RefreshCw, Save, CreditCard } from 'lucide-react';
import { adminApi } from '../services/api';
import { Button, PageLoader, Badge } from '../components/ui';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxImagesPerProperty, setMaxImagesPerProperty] = useState('');
  const [maxShortsPerDeveloper, setMaxShortsPerDeveloper] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, plansRes] = await Promise.all([
        adminApi.getSettings(),
        adminApi.getSubscriptionPlans().catch(() => ({ plans: [] })),
      ]);
      const s = settingsRes.settings ?? settingsRes;
      setSettings(s);
      setSubscriptionEnabled(s?.subscriptionEnabled ?? false);
      setMaintenanceMode(s?.maintenanceMode ?? false);
      setMaxImagesPerProperty(String(s?.maxImagesPerProperty ?? ''));
      setMaxShortsPerDeveloper(String(s?.maxShortsPerDeveloper ?? ''));
      setPlans(plansRes.plans ?? plansRes.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true); setSuccess(''); setError('');
    try {
      const payload: Record<string, unknown> = { subscriptionEnabled, maintenanceMode };
      if (maxImagesPerProperty) payload.maxImagesPerProperty = parseInt(maxImagesPerProperty);
      if (maxShortsPerDeveloper) payload.maxShortsPerDeveloper = parseInt(maxShortsPerDeveloper);
      await adminApi.updateSettings(payload);
      setSuccess('Settings saved successfully!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Platform Settings</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Manage subscription, access control, and limits</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          <RefreshCw size={14} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Toggles */}
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <Settings size={16} className="text-[#FF8240]" />
            Platform Controls
          </h3>
          <div className="flex flex-col gap-5">
            {/* Subscription Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#E6EDF3]">Subscription Mode</div>
                <div className="text-xs text-[#6E7681] mt-0.5">Require developers to have an active subscription to use the platform</div>
              </div>
              <button
                onClick={() => setSubscriptionEnabled(!subscriptionEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${subscriptionEnabled ? 'bg-[#FF8240]' : 'bg-[#1E1E1E]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${subscriptionEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Maintenance Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#E6EDF3]">Maintenance Mode</div>
                <div className="text-xs text-[#6E7681] mt-0.5">Show maintenance message to all users (admins can still access)</div>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative w-11 h-6 rounded-full transition-colors ${maintenanceMode ? 'bg-[#E74C3C]' : 'bg-[#1E1E1E]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${maintenanceMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Limits */}
            <div className="border-t border-[#1E1E1E] pt-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide mb-1">Usage Limits</div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#E6EDF3] flex-1">Max images per property</label>
                <input
                  type="number"
                  value={maxImagesPerProperty}
                  onChange={e => setMaxImagesPerProperty(e.target.value)}
                  className="w-20 bg-[#161B22] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#FF8240] text-center"
                  min={1}
                  max={50}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#E6EDF3] flex-1">Max shorts per developer</label>
                <input
                  type="number"
                  value={maxShortsPerDeveloper}
                  onChange={e => setMaxShortsPerDeveloper(e.target.value)}
                  className="w-20 bg-[#161B22] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#FF8240] text-center"
                  min={1}
                  max={100}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-[#E74C3C] mt-3">{error}</p>}
          {success && <p className="text-sm text-[#27AE60] mt-3">{success}</p>}

          <Button loading={saving} onClick={handleSave} className="w-full mt-5">
            <Save size={14} />
            Save Settings
          </Button>
        </div>

        {/* Subscription Plans */}
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <CreditCard size={16} className="text-[#FF8240]" />
            Subscription Plans
          </h3>
          {plans.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6E7681]">No subscription plans configured</div>
          ) : (
            <div className="flex flex-col gap-3">
              {plans.map((plan: any) => (
                <div key={plan.id} className="bg-[#161B22] border border-[#1E1E1E] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-white">{plan.name}</div>
                    <Badge label={plan.isActive ? 'Active' : 'Inactive'} color={plan.isActive ? 'green' : 'muted'} />
                  </div>
                  <div className="text-lg font-extrabold text-[#FF8240]">
                    ₹{(plan.price || 0).toLocaleString()}
                    <span className="text-xs font-normal text-[#6E7681]">/{plan.durationDays ?? 30}d</span>
                  </div>
                  {plan.description && (
                    <div className="text-xs text-[#8B949E] mt-1.5 line-clamp-2">{plan.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

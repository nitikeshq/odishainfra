import React, { useEffect, useState, useCallback } from 'react';
import { Bell, RefreshCw, Send } from 'lucide-react';
import { adminApi } from '../services/api';
import { Button, Input, Badge, PageLoader } from '../components/ui';

function timeAgo(dt: string) {
  const d = Math.floor((Date.now() - new Date(dt).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

const TARGET_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'CUSTOMER', label: 'Customers Only' },
  { value: 'DEVELOPER', label: 'Developers Only' },
];

export default function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPushCampaigns();
      setCampaigns(res.campaigns ?? res.data ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { setError('Title and message are required'); return; }
    setSending(true); setError(''); setSuccess('');
    try {
      await adminApi.sendPushNotification({
        title: title.trim(),
        body: body.trim(),
        targetRole: targetRole || undefined,
      });
      setSuccess('Push notification sent successfully!');
      setTitle(''); setBody(''); setTargetRole('');
      fetchCampaigns();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Push Notifications</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">Compose and send campaigns to users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6">
          <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <Bell size={16} className="text-[#FF8240]" />
            Compose Notification
          </h3>
          <div className="flex flex-col gap-4">
            <Input
              label="Title"
              placeholder="e.g. New Project in Bhubaneswar!"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write the notification message..."
                maxLength={300}
                className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] h-24 resize-none"
              />
              <span className="text-xs text-[#6E7681] self-end">{body.length}/300</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">Target Audience</label>
              <select
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#FF8240] cursor-pointer"
              >
                {TARGET_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            {(title || body) && (
              <div className="bg-[#161B22] border border-[#1E1E1E] rounded-xl p-4">
                <div className="text-xs text-[#6E7681] mb-2 uppercase tracking-wide">Preview</div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,130,64,0.12)] flex items-center justify-center flex-shrink-0">
                    <Bell size={14} className="text-[#FF8240]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{title || 'Title...'}</div>
                    <div className="text-xs text-[#8B949E] mt-0.5">{body || 'Message...'}</div>
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
            {success && <p className="text-sm text-[#27AE60]">{success}</p>}

            <Button loading={sending} onClick={handleSend} className="w-full">
              <Send size={14} />
              Send to {targetRole ? targetRole.charAt(0) + targetRole.slice(1).toLowerCase() + 's' : 'All Users'}
            </Button>
          </div>
        </div>

        {/* Campaign History */}
        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw size={16} className="text-[#FF8240]" />
              Campaign History
            </h3>
            <Button variant="ghost" size="sm" loading={loading} onClick={fetchCampaigns}>
              <RefreshCw size={13} />
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><PageLoader /></div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#6E7681]">No campaigns sent yet</div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
              {campaigns.map((c: any) => (
                <div key={c.id} className="bg-[#161B22] border border-[#1E1E1E] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.title}</div>
                      <div className="text-xs text-[#8B949E] mt-1 line-clamp-2">{c.body}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge
                        label={c.targetRole || 'All'}
                        color={c.targetRole === 'CUSTOMER' ? 'blue' : c.targetRole === 'DEVELOPER' ? 'orange' : 'muted'}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-[#6E7681]">{timeAgo(c.sentAt || c.createdAt)}</span>
                    {c.sentCount && <span className="text-xs text-[#27AE60]">{c.sentCount} sent</span>}
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

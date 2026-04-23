import React, { useEffect, useState, useCallback } from 'react';
import { Users, RefreshCw, Search, Ban, CheckCircle } from 'lucide-react';
import { adminApi } from '../services/api';
import { Badge, Button, Table, EmptyState, Modal } from '../components/ui';

function roleColor(r: string): 'orange' | 'blue' | 'purple' | 'muted' {
  const map: Record<string, 'orange' | 'blue' | 'purple' | 'muted'> = {
    CUSTOMER: 'blue', DEVELOPER: 'orange', ADMIN: 'purple',
  };
  return map[r] ?? 'muted';
}

function timeAgo(dt: string) {
  const d = Math.floor((Date.now() - new Date(dt).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'All') params.role = roleFilter;
      const res = await adminApi.getUsers(params);
      setUsers(res.users ?? res.data ?? []);
      setTotal(res.pagination?.total ?? res.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleToggleBlock = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await adminApi.updateUser(selected.id, { isBlocked: !selected.isBlocked });
      setSelected(null);
      fetchUsers();
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">User Management</h1>
          <p className="text-sm text-[#8B949E] mt-0.5">{total} total users</p>
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={fetchUsers}>
          <RefreshCw size={14} />Refresh
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7681]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone..."
            className="bg-[#0D1117] border border-[#1E1E1E] rounded-lg pl-8 pr-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] w-56"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'CUSTOMER', 'DEVELOPER', 'ADMIN'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === r
                  ? 'bg-[rgba(255,130,64,0.12)] text-[#FF8240]'
                  : 'bg-[#0D1117] text-[#6E7681] border border-[#1E1E1E] hover:text-[#E6EDF3]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <Table
        headers={['User', 'Role', 'Status', 'Joined', 'Actions']}
        loading={loading}
        empty={<EmptyState title="No users found" icon={<Users size={24} />} />}
      >
        {users.map((u: any) => (
          <tr key={u.id} className="hover:bg-[#0D1117] transition-colors">
            <td className="px-4 py-3">
              <div className="text-sm font-medium text-[#E6EDF3]">{u.name || '—'}</div>
              <div className="text-xs text-[#6E7681]">{u.phone || u.email || ''}</div>
            </td>
            <td className="px-4 py-3"><Badge label={u.role} color={roleColor(u.role)} /></td>
            <td className="px-4 py-3">
              <Badge label={u.isBlocked ? 'Blocked' : 'Active'} color={u.isBlocked ? 'red' : 'green'} />
            </td>
            <td className="px-4 py-3 text-xs text-[#6E7681]">{timeAgo(u.createdAt)}</td>
            <td className="px-4 py-3">
              {u.role !== 'ADMIN' && (
                <Button
                  size="sm"
                  variant={u.isBlocked ? 'secondary' : 'danger'}
                  onClick={() => setSelected(u)}
                >
                  {u.isBlocked ? <><CheckCircle size={13} />Unblock</> : <><Ban size={13} />Block</>}
                </Button>
              )}
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

      {/* Confirm Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.isBlocked ? 'Unblock User' : 'Block User'}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#161B22] rounded-lg p-4">
              <div className="text-sm font-semibold text-white">{selected.name || '—'}</div>
              <div className="text-xs text-[#6E7681] mt-1">{selected.phone || selected.email || ''}</div>
              <Badge label={selected.role} color={roleColor(selected.role)} />
            </div>
            <p className="text-sm text-[#8B949E]">
              {selected.isBlocked
                ? 'This will restore access for this user.'
                : 'This will prevent this user from logging in or using the platform.'}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
              <Button
                variant={selected.isBlocked ? 'primary' : 'danger'}
                loading={actionLoading}
                onClick={handleToggleBlock}
              >
                {selected.isBlocked ? 'Unblock' : 'Block User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

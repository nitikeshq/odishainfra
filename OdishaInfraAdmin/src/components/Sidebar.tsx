import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Phone, ShieldCheck,
  Bell, BarChart3, Settings, LogOut, Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Phone, label: 'Leads' },
  { to: '/kyc', icon: ShieldCheck, label: 'KYC Review' },
  { to: '/listings', icon: Building2, label: 'Listings' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/notifications', icon: Bell, label: 'Push Notifications' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-[#0D1117] border-r border-[#1E1E1E] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1E1E1E]">
        <div className="w-8 h-8 rounded-lg bg-[rgba(255,130,64,0.12)] border border-[rgba(255,130,64,0.3)] flex items-center justify-center">
          <Home size={16} className="text-[#FF8240]" />
        </div>
        <div>
          <span className="text-[#FF8240] font-extrabold text-base">Odisha</span>
          <span className="text-white font-extrabold text-base">Infra</span>
          <div className="text-[10px] text-[#6E7681] -mt-0.5">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[rgba(255,130,64,0.12)] text-[#FF8240]'
                  : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[#1E1E1E]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[rgba(255,130,64,0.12)] flex items-center justify-center">
            <span className="text-[#FF8240] text-xs font-bold">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.name || 'Admin'}</div>
            <div className="text-xs text-[#6E7681] truncate">{user?.phone || user?.email || ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#6E7681] hover:text-[#E74C3C] hover:bg-[rgba(231,76,60,0.08)] transition-all"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
}

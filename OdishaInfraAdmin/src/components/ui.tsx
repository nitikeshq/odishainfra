import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subText?: string;
}

export function StatCard({ label, value, icon, color = '#FF8240', subText }: StatCardProps) {
  return (
    <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-xl p-5 flex gap-4 items-start">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-[#8B949E] mt-0.5">{label}</div>
        {subText && <div className="text-xs text-[#6E7681] mt-1">{subText}</div>}
      </div>
    </div>
  );
}

interface BadgeProps {
  label: string;
  color?: 'orange' | 'green' | 'red' | 'blue' | 'yellow' | 'muted' | 'purple';
}

const BADGE_STYLES = {
  orange: 'bg-[rgba(255,130,64,0.12)] text-[#FF8240]',
  green: 'bg-[rgba(39,174,96,0.12)] text-[#27AE60]',
  red: 'bg-[rgba(231,76,60,0.12)] text-[#E74C3C]',
  blue: 'bg-[rgba(41,128,185,0.12)] text-[#2980B9]',
  yellow: 'bg-[rgba(253,209,113,0.12)] text-[#FDD171]',
  purple: 'bg-[rgba(155,89,182,0.12)] text-[#9B59B6]',
  muted: 'bg-[rgba(110,118,129,0.12)] text-[#6E7681]',
};

export function Badge({ label, color = 'muted' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_STYLES[color]}`}>
      {label}
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-[#FF8240] text-black hover:bg-[#E06B30]',
    secondary: 'bg-[#161B22] text-[#E6EDF3] border border-[#1E1E1E] hover:bg-[#1A1F26]',
    danger: 'bg-[rgba(231,76,60,0.12)] text-[#E74C3C] border border-[rgba(231,76,60,0.3)] hover:bg-[rgba(231,76,60,0.2)]',
    ghost: 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#161B22]',
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">{label}</label>}
      <input
        className={`bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-[#FF8240] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#E74C3C]">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-[#6E7681] uppercase tracking-wide">{label}</label>}
      <select
        className={`bg-[#0D1117] border border-[#1E1E1E] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#FF8240] transition-colors cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-[#1E1E1E] border-t-[#FF8240] rounded-full animate-spin`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[300px]">
      <Spinner size="lg" />
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon && <div className="w-14 h-14 rounded-full bg-[#161B22] flex items-center justify-center text-[#6E7681]">{icon}</div>}
      <div className="text-base font-semibold text-[#E6EDF3]">{title}</div>
      {description && <div className="text-sm text-[#6E7681] max-w-xs">{description}</div>}
    </div>
  );
}

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
}

export function Table({ headers, children, loading, empty }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1E1E1E]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#0D1117] border-b border-[#1E1E1E]">
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6E7681] uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E1E1E]">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="py-12 text-center">
                <div className="flex justify-center"><Spinner /></div>
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={headers.length}>{empty}</td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0D1117] border border-[#1E1E1E] rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#6E7681] hover:text-white transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

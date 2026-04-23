import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { adminApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const startTimer = useCallback(() => {
    setTimer(30);
    const id = setInterval(() => {
      setTimer(prev => { if (prev <= 1) { clearInterval(id); return 0; } return prev - 1; });
    }, 1000);
  }, []);

  const handleSendOtp = async () => {
    if (!identifier.trim()) { setError('Enter phone number or email'); return; }
    setLoading(true); setError('');
    try {
      await adminApi.sendOtp(identifier.trim());
      setStep('otp');
      startTimer();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (idx === 5 && val) {
      const code = [...next].join('');
      if (code.length === 6) handleVerify(code);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length < 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true); setError('');
    try {
      const result = await adminApi.verifyOtp(identifier.trim(), otpCode);
      if (result.user?.role !== 'ADMIN') {
        setError('Access denied. Admin accounts only.');
        adminApi.setToken(null);
        return;
      }
      login(result.token, result.user);
      navigate('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010409] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(255,130,64,0.12)] border border-[rgba(255,130,64,0.3)] flex items-center justify-center">
            <Home size={28} className="text-[#FF8240]" />
          </div>
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#FF8240]">Odisha</span>
            <span className="text-white">Infra</span>
          </div>
          <div className="text-xs text-[#6E7681] font-medium uppercase tracking-widest">Admin Panel</div>
        </div>

        <div className="bg-[#0D1117] border border-[#1E1E1E] rounded-2xl p-7">
          {step === 'input' ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
              <p className="text-sm text-[#8B949E] mb-6">Enter your admin phone or email to continue</p>
              <div className="flex flex-col gap-4">
                <Input
                  label="Phone / Email"
                  placeholder="+91 9876543210 or admin@odishainfra.com"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  autoFocus
                />
                {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
                <Button onClick={handleSendOtp} loading={loading} className="w-full mt-1">
                  Send OTP
                </Button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setStep('input'); setOtp(['', '', '', '', '', '']); setError(''); }} className="text-[#8B949E] text-sm mb-4 hover:text-white transition-colors">← Back</button>
              <h2 className="text-xl font-bold text-white mb-1">Enter OTP</h2>
              <p className="text-sm text-[#8B949E] mb-6">6-digit code sent to <span className="text-[#FF8240]">{identifier}</span></p>
              <div className="flex gap-2 justify-between mb-4">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    value={d}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) otpRefs.current[i - 1]?.focus(); }}
                    maxLength={1}
                    className={`w-11 h-13 text-center text-lg font-bold bg-[#161B22] border rounded-lg text-white focus:outline-none transition-colors ${d ? 'border-[#FF8240]' : 'border-[#1E1E1E]'} focus:border-[#FF8240]`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div className="flex justify-between text-sm mb-4">
                {timer > 0 ? (
                  <span className="text-[#6E7681]">Resend in 0:{timer < 10 ? `0${timer}` : timer}</span>
                ) : (
                  <button onClick={handleSendOtp} className="text-[#FF8240] hover:underline">Resend OTP</button>
                )}
              </div>
              {error && <p className="text-sm text-[#E74C3C] mb-3">{error}</p>}
              <Button onClick={() => handleVerify()} loading={loading} disabled={otp.join('').length < 6} className="w-full">
                Verify & Sign In
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#6E7681] mt-6">
          Restricted access. Authorized personnel only.
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Mail, Lock, LogIn, UserPlus, Building, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { token: string; user: any; subscription?: any }) => void;
  initialRole?: 'tenant' | 'superadmin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRole = 'tenant',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'tenant' | 'superadmin'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? { email, password, company_name: companyName, plan: 'starter' }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      if (data.token) {
        localStorage.setItem('wautomation_auth_token', data.token);
        localStorage.setItem('wapilot_auth_token', data.token);
      }

      // Supabase sync if enabled
      if (isSupabaseConfigured && supabase) {
        try {
          if (mode === 'signup') {
            await supabase.auth.signUp({ email, password });
          } else {
            await supabase.auth.signInWithPassword({ email, password });
          }
        } catch (supabaseErr) {
          console.warn('Supabase auth sync notice:', supabaseErr);
        }
      }

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillSuperadminDemo = () => {
    setEmail('baliadventours@gmail.com');
    setPassword('admin123');
    setRole('superadmin');
    setMode('signin');
  };

  const fillTenantDemo = () => {
    setEmail('alex@balitours.com');
    setPassword('tenant123');
    setRole('tenant');
    setMode('signin');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              role === 'superadmin'
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
            }`}>
              {role === 'superadmin' ? <ShieldCheck className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div>
              <span className="font-bold text-white text-sm">
                {role === 'superadmin' ? 'Master Admin Console' : 'Wautomation.io Workspace'}
              </span>
              <p className="text-[10px] text-slate-400 font-mono">
                {role === 'superadmin' ? 'SUPERADMIN ROOT' : 'TENANT ENVIRONMENT'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setRole('tenant');
                setErrorMessage('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                role === 'tenant'
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tenant Account
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('superadmin');
                setMode('signin');
                setErrorMessage('');
              }}
              className={`py-1.5 rounded-lg transition-all ${
                role === 'superadmin'
                  ? 'bg-amber-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Master Admin
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-base font-bold text-white">
              {role === 'superadmin'
                ? 'Authenticate Superadmin Root'
                : mode === 'signin'
                ? 'Sign in to your Tenant Dashboard'
                : 'Create your Multi-Tenant Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {role === 'superadmin'
                ? 'Restricted to platform administrators and VPS owners.'
                : 'Session token stored locally with full database isolation.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && role === 'tenant' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Company / Agency Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Bali Tours Express"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'superadmin' ? 'baliadventours@gmail.com' : 'tenant@company.com'}
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                role === 'superadmin'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>
                {isLoading
                  ? 'Authenticating...'
                  : role === 'superadmin'
                  ? 'Access Master Console'
                  : mode === 'signin'
                  ? 'Sign In to Workspace'
                  : 'Create Tenant Account'}
              </span>
            </button>
          </form>

          {/* Quick Demo Fill Buttons for convenience during testing */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
              <span>Quick credentials for preview:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fillTenantDemo}
                className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-center"
              >
                Tenant: alex@balitours.com
              </button>
              <button
                type="button"
                onClick={fillSuperadminDemo}
                className="py-1 px-2 text-[10px] font-semibold rounded-lg bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 hover:text-amber-200 border border-amber-800/50 transition-colors text-center"
              >
                Root: baliadventours@gmail.com
              </button>
            </div>
          </div>

          {role === 'tenant' && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                {mode === 'signin'
                  ? "Don't have an account? Register new tenant"
                  : 'Already registered? Sign in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

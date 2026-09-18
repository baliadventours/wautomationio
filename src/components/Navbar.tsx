import React from 'react';
import { ShieldCheck, Wifi, WifiOff, RefreshCw, Server, Globe, LogOut, User } from 'lucide-react';
import { HealthStatus, UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  health: HealthStatus | null;
  activeTenantId: string;
  availableTenants: Array<{ id: string; email: string; company?: string; plan: string }>;
  onSwitchTenant: (tenantId: string) => void;
  onRefreshHealth: () => void;
  isCheckingHealth: boolean;
  onOpenAuth?: () => void;
  onNavigateToLanding?: () => void;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  health,
  activeTenantId,
  availableTenants,
  onSwitchTenant,
  onRefreshHealth,
  isCheckingHealth,
  onOpenAuth,
  onNavigateToLanding,
  onNavigateToAdmin,
  onLogout,
}) => {
  const isSuperadmin = user?.role === 'superadmin';

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Tenant Context */}
      <div className="flex items-center gap-4">
        {isSuperadmin ? (
          <>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Root Impersonation:</span>
            </div>
            <select
              value={activeTenantId}
              onChange={(e) => onSwitchTenant(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors cursor-pointer"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.company || t.email} ({t.plan.toUpperCase()})
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {user?.company_name || 'My Business'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">{user?.email}</p>
            </div>
            <span className="ml-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {user?.plan || 'Starter'}
            </span>
          </div>
        )}

        {onNavigateToLanding && (
          <button
            onClick={onNavigateToLanding}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
            title="Go to Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>Landing Page</span>
          </button>
        )}

        {isSuperadmin && onNavigateToAdmin && (
          <button
            onClick={onNavigateToAdmin}
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
            title="Open Master Admin Console"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Master Console</span>
          </button>
        )}
      </div>

      {/* Right: VPS Status & Profile Actions */}
      <div className="flex items-center gap-3">
        {/* Evolution API Connection State */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            health?.evolutionApiConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : health?.evolutionApiConfigured
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
          title={health?.message || 'Evolution API Status'}
        >
          {health?.evolutionApiConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden sm:inline">
            {health?.evolutionApiConnected
              ? 'Evolution VPS: Online'
              : health?.evolutionApiConfigured
              ? 'Evolution API: Connecting...'
              : 'Evolution API: Preview Engine'}
          </span>
          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            className="hover:rotate-180 transition-transform duration-500 text-slate-400 hover:text-slate-700 ml-0.5"
            title="Recheck VPS health"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* User Account & Sign Out */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {(user?.company_name || user?.email || 'U')[0].toUpperCase()}
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              title="Sign out of tenant account"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

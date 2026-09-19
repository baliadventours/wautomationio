import React from 'react';
import {
  Smartphone,
  Zap,
  ListFilter,
  Send,
  Server,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  LogOut,
  Key,
  Code2,
} from 'lucide-react';
import { Subscription } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  subscription: Subscription | null;
  userRole?: string;
  onNavigateToLanding?: () => void;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  subscription,
  userRole,
  onNavigateToLanding,
  onNavigateToAdmin,
  onLogout,
}) => {
  const navItems = [
    { id: 'instances', label: 'WhatsApp Instances', icon: Smartphone },
    { id: 'automations', label: 'Keyword Automations', icon: Zap },
    { id: 'logs', label: 'Message Logs', icon: ListFilter },
    { id: 'messenger', label: 'Send Test Message', icon: Send },
    { id: 'api-keys', label: 'Developer API Keys', icon: Key },
    { id: 'api-docs', label: 'Public API Docs', icon: Code2 },
    { id: 'vps', label: 'Evolution API & VPS', icon: Server },
    { id: 'billing', label: 'Plans & Usage', icon: CreditCard },
  ];

  const instancesCount = subscription?.current_usage?.instances_count || 0;
  const instanceLimit = subscription?.instance_limit || 1;
  const messagesCount = subscription?.current_usage?.messages_sent_this_period || 0;
  const messageLimit = subscription?.message_limit || 1000;

  const instancePercent = Math.min(100, Math.round((instancesCount / instanceLimit) * 100));
  const messagePercent = Math.min(100, Math.round((messagesCount / messageLimit) * 100));

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Smartphone className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              Wautomation.io
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SaaS
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Evolution API Engine</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Usage Quota Card & Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 m-3 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tenant Quotas
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            {subscription?.plan?.toUpperCase() || 'STARTER'}
          </span>
        </div>

        {/* Instances meter */}
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Instances</span>
            <span className="text-white font-medium">
              {instancesCount} / {instanceLimit}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                instancePercent >= 100 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${instancePercent}%` }}
            />
          </div>
        </div>

        {/* Messages meter */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Messages (mo)</span>
            <span className="text-white font-medium">
              {messagesCount} / {messageLimit}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-400 transition-all"
              style={{ width: `${messagePercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onSelectTab('billing')}
          className="mt-4 w-full text-xs font-semibold py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <span>Upgrade Tier</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </button>

        {/* Global Nav Shortcuts */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
          {onNavigateToLanding && (
            <button
              onClick={onNavigateToLanding}
              className="w-full text-[11px] font-semibold py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors flex items-center justify-between"
            >
              <span>View Landing Page</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>
          )}

          {userRole === 'superadmin' && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full text-[11px] font-bold py-1.5 px-2 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60 text-amber-300 rounded-lg transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Superadmin</span>
              </div>
              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-900 text-amber-200">
                ROOT
              </span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full text-[11px] font-semibold py-1.5 px-2 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/30 text-rose-300 rounded-lg transition-colors flex items-center justify-between"
            >
              <span>Sign Out</span>
              <LogOut className="w-3 h-3 text-rose-400" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Terminal,
  ExternalLink,
  Code,
} from 'lucide-react';
import { HealthStatus } from '../types';

interface VpsStatusViewProps {
  health: HealthStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const VpsStatusView: React.FC<VpsStatusViewProps> = ({
  health,
  onRefresh,
  isRefreshing,
}) => {
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
            <Server className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Evolution API & VPS Engine
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  health?.evolutionApiConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : health?.evolutionApiConfigured
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {health?.evolutionApiConnected
                  ? 'VPS Online'
                  : health?.evolutionApiConfigured
                  ? 'Connecting...'
                  : 'High-Fidelity Preview Mode'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Your self-hosted WhatsApp gateway running on Docker with PostgreSQL and Redis.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Check Connection</span>
        </button>
      </div>

      {/* Connection Parameter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Evolution API VPS Base URL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              VPS Evolution API URL
            </span>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              EVOLUTION_API_BASE_URL
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all flex items-center justify-between">
            <span>{health?.evolutionApiUrl}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Set in your environment variables to point directly to your VPS domain or internal IP (e.g. <code>https://wa.yourdomain.com</code>).
          </p>
        </div>

        {/* Webhook Endpoint */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registered Webhook Endpoint
            </span>
            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Auto-Registered on Instance Create
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all flex items-center justify-between gap-2">
            <span className="truncate">{health?.webhookUrl}</span>
            <button
              onClick={() => copyToClipboard(health?.webhookUrl || '')}
              className="shrink-0 p-1 hover:bg-slate-200 rounded text-slate-500"
              title="Copy Webhook URL"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Evolution API posts <code>CONNECTION_UPDATE</code> and <code>MESSAGES_UPSERT</code> events here.
          </p>
        </div>
      </div>

      {/* VPS Docker Setup Reference */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">VPS Docker Compose Checklist</h3>
          </div>
          <a
            href="https://github.com/EvolutionAPI/evolution-api"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Official Repo</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="text-xs space-y-2 text-slate-300 leading-relaxed">
          <p>
            Make sure your VPS <code>docker-compose.yml</code> specifies the matching admin API key:
          </p>
          <pre className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800">
{`AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=your_evolution_admin_api_key_here
DATABASE_ENABLED=true
DATABASE_CONNECTION_URI=postgresql://user:password@postgres:5432/evolution
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/1`}
          </pre>
          <div className="pt-2 flex items-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Wautomation.io backend holds this key server-side. No tenant can view or call your Evolution API admin endpoints directly.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

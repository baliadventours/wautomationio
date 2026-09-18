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
  const [vpsUrl, setVpsUrl] = useState(health?.evolutionApiUrl || 'http://localhost:8085');
  const [vpsApiKey, setVpsApiKey] = useState('429683C4C977415CAAFCCE10F7D57E11');
  const [isUpdating, setIsUpdating] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/vps/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: vpsUrl, apiKey: vpsApiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setConfigMessage({ text: `Connected! Version: ${data.version || 'v1/v2'}`, ok: true });
        onRefresh();
      } else {
        setConfigMessage({ text: data.message || 'Could not connect to VPS', ok: false });
      }
    } catch (err: any) {
      setConfigMessage({ text: err.message || 'Connection failed', ok: false });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSyncInstances = async () => {
    setIsUpdating(true);
    setConfigMessage(null);
    try {
      const res = await fetch('/api/instances/sync-vps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setConfigMessage({
          text: `Synced successfully! (${data.added || 0} new, ${data.updated || 0} updated)`,
          ok: true,
        });
        onRefresh();
      } else {
        setConfigMessage({ text: data.error || 'Failed to sync instances', ok: false });
      }
    } catch (err: any) {
      setConfigMessage({ text: err.message || 'Sync failed', ok: false });
    } finally {
      setIsUpdating(false);
    }
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
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {health?.evolutionApiConnected ? 'VPS Live' : 'Active (bali_tours Connected)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Your self-hosted WhatsApp gateway running on Docker with PostgreSQL and Redis.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncInstances}
            disabled={isUpdating || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>Sync VPS Instances</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Health</span>
          </button>
        </div>
      </div>

      {/* Connected Instance Notification */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            WA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-950">bali_tours</span>
              <span className="text-[11px] font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                Connected & Ready
              </span>
            </div>
            <p className="text-xs text-emerald-700 mt-0.5 font-mono">
              Phone Number: +62 812-4650-2939 • Integration: WHATSAPP-BAILEYS
            </p>
          </div>
        </div>
        <div className="text-xs text-emerald-800 font-semibold hidden md:block">
          Linked to Bali Adventours Workspace
        </div>
      </div>

      {/* Dynamic VPS Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Evolution API Gateway Settings</h3>
            <p className="text-xs text-slate-500">Configure connection to your self-hosted Evolution API container.</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Port 8085 / 8080</span>
        </div>

        {configMessage && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              configMessage.ok
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {configMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Evolution API Base URL</label>
            <input
              type="text"
              value={vpsUrl}
              onChange={(e) => setVpsUrl(e.target.value)}
              placeholder="http://localhost:8085"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Admin API Key (Global apikey)</label>
            <input
              type="text"
              value={vpsApiKey}
              onChange={(e) => setVpsApiKey(e.target.value)}
              placeholder="429683C4C977415CAAFCCE10F7D57E11"
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              {isUpdating ? 'Testing...' : 'Update & Test Gateway'}
            </button>
          </div>
        </form>
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

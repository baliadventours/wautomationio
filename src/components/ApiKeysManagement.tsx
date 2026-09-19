import React, { useState } from 'react';
import { Key, Copy, Check, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  created: string;
  lastUsed: string;
  scopes: string[];
}

export const ApiKeysManagement: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([
    {
      id: 'key_1',
      name: 'Production Server Gateway',
      keyPrefix: 'wa_live_9f83a1...',
      created: '2026-09-19',
      lastUsed: '2 minutes ago',
      scopes: ['messages:send', 'channels:read', 'webhooks:manage']
    }
  ]);

  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!newKeyName) return;
    const rawSecret = `wa_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      keyPrefix: `${rawSecret.substring(0, 14)}...`,
      created: 'Just now',
      lastUsed: 'Never',
      scopes: ['messages:send', 'channels:read']
    };
    setKeys([newKey, ...keys]);
    setCreatedSecret(rawSecret);
    setNewKeyName('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Developer API Keys</h2>
          <p className="text-sm text-slate-500">Bearer tokens for authenticating REST API requests to /v1/messages/send.</p>
        </div>
      </div>

      {createdSecret && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900">Copy your API Secret Key now</h4>
              <p className="text-xs text-amber-700 mt-0.5">This secret will never be shown again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="bg-white px-3 py-1.5 rounded-lg border border-amber-300 font-mono text-xs text-slate-800 select-all flex-1">
                  {createdSecret}
                </code>
                <button
                  onClick={() => handleCopy(createdSecret)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Generate New Key</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Key Description (e.g. Backend Node Service)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">Key Name</th>
              <th className="py-3.5 px-4">Prefix</th>
              <th className="py-3.5 px-4">Created</th>
              <th className="py-3.5 px-4">Last Used</th>
              <th className="py-3.5 px-4">Scopes</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-slate-50/60">
                <td className="py-3.5 px-4 font-medium text-slate-900">{k.name}</td>
                <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{k.keyPrefix}</td>
                <td className="py-3.5 px-4 text-xs text-slate-500">{k.created}</td>
                <td className="py-3.5 px-4 text-xs text-slate-500">{k.lastUsed}</td>
                <td className="py-3.5 px-4">
                  <div className="flex gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setKeys(keys.filter((item) => item.id !== k.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

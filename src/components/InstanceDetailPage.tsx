import React, { useState } from 'react';
import {
  ArrowLeft,
  Smartphone,
  QrCode,
  LogOut,
  Trash2,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
  ListFilter,
  Radio,
} from 'lucide-react';
import { WhatsAppInstance, MessageLog, Automation } from '../types';

interface InstanceDetailPageProps {
  instance: WhatsAppInstance;
  logs: MessageLog[];
  automations: Automation[];
  onBack: () => void;
  onOpenQr: (instance: WhatsAppInstance) => void;
  onDisconnect: (instanceId: string) => Promise<void>;
  onReconnect: (instanceId: string) => void;
  onDelete: (instanceId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSendMessage: (toNumber: string, text: string) => Promise<void>;
}

export const InstanceDetailPage: React.FC<InstanceDetailPageProps> = ({
  instance,
  logs,
  automations,
  onBack,
  onOpenQr,
  onDisconnect,
  onReconnect,
  onDelete,
  onRefresh,
  onSendMessage,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Quick message composer
  const [toNumber, setToNumber] = useState('+1 (415) 555-0199');
  const [text, setText] = useState('Hello from WhatsApp line test!');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const instanceLogs = logs.filter((l) => l.instance_id === instance.id);
  const instanceAutomations = automations.filter((a) => a.instance_id === instance.id);
  const isConnected = instance.status === 'connected';

  const handleRefreshState = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toNumber.trim() || !text.trim()) return;

    setIsSending(true);
    setSendFeedback(null);
    try {
      await onSendMessage(toNumber, text);
      setSendFeedback({ type: 'success', message: 'Message successfully dispatched!' });
      setText('');
    } catch (err: any) {
      setSendFeedback({ type: 'error', message: err.message || 'Send failed' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to instances list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {instance.profile_name || instance.instance_name}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : instance.status === 'connecting'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? 'bg-emerald-500'
                      : instance.status === 'connecting'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="capitalize">{instance.status}</span>
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Evolution API Instance: <strong className="text-slate-700">{instance.instance_name}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshState}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh instance state"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => onOpenQr(instance)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <QrCode className="w-4 h-4 text-slate-600" />
            <span>{isConnected ? 'View QR Code' : 'Scan to Connect'}</span>
          </button>

          {isConnected ? (
            <button
              onClick={async () => {
                setIsActionLoading(true);
                await onDisconnect(instance.id);
                setIsActionLoading(false);
              }}
              disabled={isActionLoading}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4 text-amber-600" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => onReconnect(instance.id)}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Reconnect</span>
            </button>
          )}

          {deleteConfirm ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  await onDelete(instance.id);
                  onBack();
                }}
                className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-2 py-2 text-slate-500 hover:text-slate-800 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Delete instance"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: Details & Quick Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Instance Technical Parameters */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connection Parameters
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Connected Phone:</span>
                <span className="font-mono font-bold text-slate-900">
                  {instance.phone_number || 'Not connected yet'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Linked Since:</span>
                <span className="text-slate-700">
                  {instance.connected_at
                    ? new Date(instance.connected_at).toLocaleString()
                    : 'Pending initial scan'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Security Encryption:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  AES-256 Encrypted
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Messages:</span>
                <span className="font-bold text-slate-900">{instanceLogs.length}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Active Automations:</span>
                <span className="font-bold text-slate-900">{instanceAutomations.length}</span>
              </div>
            </div>
          </div>

          {/* Active Automations for this Instance */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Attached Automations</span>
              <span className="text-emerald-600 font-bold">{instanceAutomations.length}</span>
            </h3>

            {instanceAutomations.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No keyword automations configured for this WhatsApp line.
              </p>
            ) : (
              <div className="space-y-2">
                {instanceAutomations.map((auto) => (
                  <div
                    key={auto.id}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{auto.name}</span>
                      <p className="text-[11px] font-mono text-emerald-700">
                        Keyword: "{(auto.trigger_config as any)?.keyword}"
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        auto.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {auto.enabled ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Quick Dispatch & Live Message Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Message Dispatcher Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Send Test WhatsApp Message</h3>
                <p className="text-xs text-slate-500">
                  Direct dispatch via <code>POST /message/sendText/{instance.instance_name}</code>
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Rate Limit: 30/min</span>
            </div>

            {sendFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  sendFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {sendFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{sendFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Recipient Phone (Include country code)
                </label>
                <input
                  type="text"
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value)}
                  placeholder="+14155550199 or +628123456789"
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Message Body
                </label>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type message text..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSending || !isConnected}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Sending...' : 'Dispatch Message'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Instance Message History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Message History for this Instance ({instanceLogs.length})
            </h3>

            {instanceLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No message logs recorded yet for this instance.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Target</th>
                      <th className="py-2 px-2">Message</th>
                      <th className="py-2 px-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {instanceLogs.slice(0, 8).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.direction === 'in'
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {log.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono text-slate-700">{log.to_number}</td>
                        <td className="py-2 px-2 text-slate-800 max-w-xs truncate">{log.body}</td>
                        <td className="py-2 px-2 text-right text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Send, Smartphone, AlertCircle, CheckCircle2, ShieldCheck, History } from 'lucide-react';
import { WhatsAppInstance, MessageLog } from '../types';

interface MessengerViewProps {
  instances: WhatsAppInstance[];
  logs: MessageLog[];
  onMessageSent: () => void;
}

export const MessengerView: React.FC<MessengerViewProps> = ({
  instances,
  logs,
  onMessageSent,
}) => {
  const connectedInstances = instances.filter((i) => i.status === 'connected');
  const [instanceId, setInstanceId] = useState(connectedInstances[0]?.id || instances[0]?.id || '');
  const [toNumber, setToNumber] = useState('+1 (415) 555-0199');
  const [text, setText] = useState('Hello! This is a test message from Wautomation.io.');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedInstance = instances.find((i) => i.id === instanceId);
  const isConnected = selectedInstance?.status === 'connected';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!instanceId) {
      setError('Please select an instance.');
      return;
    }
    if (!toNumber.trim() || !text.trim()) {
      setError('Please fill in both phone number and message.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: instanceId,
          to_number: toNumber,
          text: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch message');
      }

      setSuccess(`Message dispatched to ${toNumber} via Evolution API!`);
      setText('');
      onMessageSent();
    } catch (err: any) {
      setError(err.message || 'Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Message Composer */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Send WhatsApp Message
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Dispatches via Evolution API endpoint <code>POST /message/sendText/:instanceName</code> with tenant ownership verification.
            </p>
          </div>

          <form onSubmit={handleSend} className="space-y-4 pt-2">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Sender WhatsApp Instance
                </label>
                <select
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="w-full text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {instances.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.profile_name || i.instance_name} ({i.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Recipient Number (E.164 / Country Code)
                </label>
                <input
                  type="text"
                  value={toNumber}
                  onChange={(e) => setToNumber(e.target.value)}
                  placeholder="+14155550199 or +628123456789"
                  className="w-full text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Message Text
              </label>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type the message body to send via WhatsApp..."
                className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Tenant rate limit: 30 requests/minute
              </span>

              <button
                type="submit"
                disabled={isSending || !isConnected}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Dispatching...' : 'Dispatch WhatsApp Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right: Recent Dispatches Preview */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" />
            Recent Outbound Logs
          </h3>

          <div className="space-y-2.5">
            {logs.filter((l) => l.direction === 'out').slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>To: {log.to_number}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-800 line-clamp-2">{log.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

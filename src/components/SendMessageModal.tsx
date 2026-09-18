import React, { useState } from 'react';
import { X, Send, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WhatsAppInstance } from '../types';

interface SendMessageModalProps {
  instances: WhatsAppInstance[];
  selectedInstanceId?: string;
  onClose: () => void;
  onMessageSent: () => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  instances,
  selectedInstanceId,
  onClose,
  onMessageSent,
}) => {
  const connectedInstances = instances.filter((i) => i.status === 'connected');
  const [instanceId, setInstanceId] = useState<string>(
    selectedInstanceId || (connectedInstances[0]?.id || '')
  );
  const [toNumber, setToNumber] = useState<string>('+1 (415) 555-0199');
  const [text, setText] = useState<string>('Hello! This is a test message from our Wautomation.io WhatsApp automation platform.');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!instanceId) {
      setError('Please select a connected WhatsApp instance.');
      return;
    }
    if (!toNumber.trim() || !text.trim()) {
      setError('Phone number and message text are required.');
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

      setSuccess(`Message successfully sent to ${toNumber}!`);
      onMessageSent();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error dispatching message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Send Test WhatsApp Message</h2>
              <p className="text-xs text-slate-500">Dispatches via Evolution API POST /message/sendText</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              From WhatsApp Instance
            </label>
            {connectedInstances.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No connected WhatsApp instances found. Please connect an instance via QR code first.
              </div>
            ) : (
              <select
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                className="w-full text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {connectedInstances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.profile_name || inst.instance_name} ({inst.phone_number || 'No Phone'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipient Phone Number (With Country Code)
            </label>
            <input
              type="text"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1234567890 or +6281234567890"
              className="w-full text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must include international country code (e.g. +1 for US, +62 for Indonesia).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your WhatsApp message..."
              className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Rate limit: 30 msgs/min per tenant</span>
              <span>{text.length} characters</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || connectedInstances.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send Message'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

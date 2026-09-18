import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Send,
} from 'lucide-react';
import { Automation, WhatsAppInstance } from '../types';

interface AutomationsViewProps {
  automations: Automation[];
  instances: WhatsAppInstance[];
  onCreateAutomation: (data: {
    instance_id: string;
    name: string;
    trigger_type: string;
    trigger_config: any;
    action_config: any;
  }) => Promise<void>;
  onToggleAutomation: (id: string) => Promise<void>;
  onDeleteAutomation: (id: string) => Promise<void>;
  onSimulateWebhook: (instanceId: string, text: string) => Promise<any>;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  instances,
  onCreateAutomation,
  onToggleAutomation,
  onDeleteAutomation,
  onSimulateWebhook,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [instanceId, setInstanceId] = useState(instances[0]?.id || '');
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'starts_with'>('contains');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulation test state
  const [simInstanceId, setSimInstanceId] = useState(instances[0]?.id || '');
  const [simMessage, setSimMessage] = useState('Hi! What are your prices?');
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const connectedInstances = instances.filter((i) => i.status === 'connected');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keyword.trim() || !replyText.trim() || !instanceId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateAutomation({
        instance_id: instanceId,
        name: name.trim(),
        trigger_type: 'keyword',
        trigger_config: {
          keyword: keyword.trim(),
          match_type: matchType,
        },
        action_config: {
          reply_text: replyText.trim(),
        },
      });

      setName('');
      setKeyword('');
      setReplyText('');
      setIsCreating(false);
    } catch (err: any) {
      alert(err.message || 'Error creating automation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunSimulation = async () => {
    if (!simInstanceId || !simMessage.trim()) return;
    setIsSimulating(true);
    setSimResult(null);
    try {
      const result = await onSimulateWebhook(simInstanceId, simMessage);
      setSimResult(result);
    } catch (err: any) {
      setSimResult({ error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Keyword Automations & Auto-Replies
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {automations.length} Active Rules
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Incoming WhatsApp messages received at your Evolution API webhook trigger immediate rule matching and automated response dispatch.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Keyword Rule</span>
        </button>
      </div>

      {/* Interactive Webhook Loop Simulator Tool (Proves webhook loop end-to-end) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Play className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Live Webhook Loop Simulator</h3>
              <p className="text-[11px] text-slate-400">
                Test incoming WhatsApp messages, webhook triggers, and auto-replies in real time.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/80">
            POST /api/webhook/evolution
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Target Instance
            </label>
            <select
              value={simInstanceId}
              onChange={(e) => setSimInstanceId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.profile_name || i.instance_name} ({i.status})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Customer Message Text (Try "price" or "hello")
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                placeholder="Type an inbound message..."
                className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating || !simInstanceId}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Testing...' : 'Simulate Inbound'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Feedback Result */}
        {simResult && (
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2 text-xs">
            {simResult.error ? (
              <div className="text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Simulation error: {simResult.error}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Webhook Loop Verified!
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Rule Matched: <strong>{simResult.triggeredAutomation || 'None (Logged only)'}</strong>
                  </span>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg flex items-center justify-between gap-4 text-xs font-mono">
                  <div className="text-slate-400 truncate">
                    Inbound: <span className="text-white">"{simResult.inbound?.body}"</span>
                  </div>
                  {simResult.autoReplied && (
                    <>
                      <ArrowRight className="w-4 h-4 text-teal-400 shrink-0" />
                      <div className="text-teal-300 truncate">
                        Auto-Reply: <span className="text-teal-200">"{simResult.replyText}"</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Automation Form Modal / Expandable */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Create Keyword Auto-Reply
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Price Catalog Bot"
                required
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Linked Instance
              </label>
              <select
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                required
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {instances.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.profile_name || i.instance_name} ({i.phone_number || 'No phone'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Trigger Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. price, booking, support, hours"
                required
                className="w-full text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Match Condition
              </label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as any)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="contains">Contains keyword</option>
                <option value="exact">Exact match only</option>
                <option value="starts_with">Starts with keyword</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Automated Response Body
            </label>
            <textarea
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Enter the WhatsApp response text sent automatically back to the sender..."
              required
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Save Automation'}
            </button>
          </div>
        </form>
      )}

      {/* Automations List */}
      <div className="space-y-3">
        {automations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No automations configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first keyword auto-reply to automatically message customers when specific keywords are detected.
            </p>
          </div>
        ) : (
          automations.map((auto) => {
            const instance = instances.find((i) => i.id === auto.instance_id);
            const triggerConfig = auto.trigger_config as any;

            return (
              <div
                key={auto.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        auto.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <h3 className="text-sm font-bold text-slate-900">{auto.name}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {instance?.profile_name || 'All Instances'}
                    </span>
                  </div>

                  {/* Trigger -> Action Visual Flow */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">When text</span>
                      <strong className="font-mono text-emerald-950">
                        {triggerConfig?.match_type}: "{triggerConfig?.keyword}"
                      </strong>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 max-w-md truncate">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Auto-Reply</span>
                      <span className="truncate italic">"{auto.action_config?.reply_text}"</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onToggleAutomation(auto.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    {auto.enabled ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                        Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                        Disabled
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteAutomation(auto.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

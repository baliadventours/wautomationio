import React, { useState } from 'react';
import {
  ListFilter,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  Clock,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { MessageLog, WhatsAppInstance } from '../types';

interface MessageLogsViewProps {
  logs: MessageLog[];
  instances: WhatsAppInstance[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const MessageLogsView: React.FC<MessageLogsViewProps> = ({
  logs,
  instances,
  onRefresh,
  isRefreshing,
}) => {
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (directionFilter !== 'all' && log.direction !== directionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesBody = log.body.toLowerCase().includes(q);
      const matchesTo = log.to_number.toLowerCase().includes(q);
      const matchesFrom = log.from_number?.toLowerCase().includes(q) || false;
      return matchesBody || matchesTo || matchesFrom;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Message History & Audit Logs
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {logs.length} Total Logs
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Logged automatically for inbound webhooks and outbound API dispatches. Scoped strictly to your tenant via Supabase RLS.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          title="Refresh logs"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by text or phone..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Direction:</span>
          {(['all', 'in', 'out'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirectionFilter(dir)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                directionFilter === dir
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              {dir === 'all' ? 'All' : dir === 'in' ? 'Inbound' : 'Outbound'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No message logs match your search or filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Direction</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isIn = log.direction === 'in';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isIn
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownLeft className="w-3 h-3 text-teal-600" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{isIn ? 'Inbound' : 'Outbound'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {log.from_number || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {log.to_number}
                      </td>

                      <td className="py-3 px-4 text-slate-800 max-w-xs md:max-w-md truncate">
                        {log.body}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] capitalize ${
                            log.status === 'delivered' || log.status === 'read'
                              ? 'text-emerald-600'
                              : log.status === 'sent'
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {log.status === 'failed' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  RefreshCw,
  Trash2,
  LogOut,
  Send,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { WhatsAppInstance, QrCodeData, Subscription } from '../types';

interface InstancesViewProps {
  instances: WhatsAppInstance[];
  subscription: Subscription | null;
  onConnectNew: () => void;
  onOpenQr: (instance: WhatsAppInstance) => void;
  onOpenSend: (instance: WhatsAppInstance) => void;
  onSelectInstance?: (instance: WhatsAppInstance) => void;
  onDisconnect: (instanceId: string) => void;
  onDelete: (instanceId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const InstancesView: React.FC<InstancesViewProps> = ({
  instances,
  subscription,
  onConnectNew,
  onOpenQr,
  onOpenSend,
  onSelectInstance,
  onDisconnect,
  onDelete,
  onRefresh,
  isRefreshing,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const connectedCount = instances.filter((i) => i.status === 'connected').length;
  const instanceLimit = subscription?.instance_limit || 1;
  const isAtLimit = instances.length >= instanceLimit;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            WhatsApp Connections
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {instances.length} / {instanceLimit} Linked
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Each WhatsApp line is isolated as a tenant instance in Evolution API. The browser never accesses the global VPS admin key directly.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh instances"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onConnectNew}
            disabled={isAtLimit}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isAtLimit
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Connect WhatsApp</span>
          </button>
        </div>
      </div>

      {isAtLimit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have reached your plan limit of <strong>{instanceLimit} WhatsApp instance(s)</strong>.
              Upgrade your subscription to connect additional numbers.
            </span>
          </div>
        </div>
      )}

      {/* Instances Grid / List */}
      {instances.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800">No WhatsApp lines connected</h3>
            <p className="text-xs text-slate-500 mt-1">
              Connect your first WhatsApp number by clicking the button below to generate a live QR code.
            </p>
          </div>
          <button
            onClick={onConnectNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Connect First Instance</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instances.map((inst) => {
            const isConnected = inst.status === 'connected';
            const isConnecting = inst.status === 'connecting';

            return (
              <div
                key={inst.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Name + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isConnected
                            ? 'bg-emerald-100 text-emerald-700'
                            : isConnecting
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {inst.profile_name || 'WhatsApp Line'}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">
                          {inst.phone_number || 'Awaiting phone number'}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isConnecting
                          ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isConnected
                            ? 'bg-emerald-500'
                            : isConnecting
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="capitalize">{inst.status}</span>
                    </span>
                  </div>

                  {/* Metadata info */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Evolution Instance:</span>
                      <span className="font-mono text-slate-700 font-semibold">{inst.instance_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Linked:</span>
                      <span className="text-slate-700">
                        {inst.connected_at ? new Date(inst.connected_at).toLocaleDateString() : 'Not paired'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Details Page */}
                    {onSelectInstance && (
                      <button
                        onClick={() => onSelectInstance(inst)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                        title="View Instance Details"
                      >
                        <span>Details</span>
                      </button>
                    )}

                    {/* QR Code / Reconnect */}
                    <button
                      onClick={() => onOpenQr(inst)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Show QR Code to pair or re-authenticate"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{isConnected ? 'View QR' : 'Scan QR'}</span>
                    </button>

                    {/* Send Message */}
                    {isConnected && (
                      <button
                        onClick={() => onOpenSend(inst)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Test Send</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isConnected && (
                      <button
                        onClick={() => onDisconnect(inst.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Disconnect session"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}

                    {deleteConfirmId === inst.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onDelete(inst.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-1 text-slate-500 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(inst.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete instance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

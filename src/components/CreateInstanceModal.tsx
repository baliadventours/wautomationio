import React, { useState } from 'react';
import { X, Smartphone, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface CreateInstanceModalProps {
  onClose: () => void;
  onCreate: (friendlyName: string) => Promise<void>;
}

export const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [friendlyName, setFriendlyName] = useState('Support Line');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendlyName.trim()) return;

    setIsCreating(true);
    setError('');
    try {
      await onCreate(friendlyName.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create instance');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Connect New WhatsApp Line</h2>
              <p className="text-xs text-slate-500">Creates a tenant-isolated Evolution API instance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Connection Label / Purpose
            </label>
            <input
              type="text"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="e.g. Sales Desk, Support, Bali Bookings"
              required
              className="w-full text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Internal label visible in your team dashboard.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Tenant Isolation Guarantee
            </div>
            <p className="text-[11px] text-slate-500">
              Your instance will be created with a unique name scoped to your tenant ID. The Evolution API per-instance token will be encrypted with AES-256 at rest.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <span>{isCreating ? 'Generating QR...' : 'Proceed to QR Scan'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

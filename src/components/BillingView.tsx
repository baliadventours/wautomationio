import React, { useState } from 'react';
import { CreditCard, Check, Zap, Smartphone, MessageSquare, ShieldCheck, ArrowRight } from 'lucide-react';
import { Subscription, PlanType } from '../types';

interface BillingViewProps {
  subscription: Subscription | null;
  onUpgradePlan: (plan: PlanType) => Promise<void>;
}

export const BillingView: React.FC<BillingViewProps> = ({
  subscription,
  onUpgradePlan,
}) => {
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const currentPlan = subscription?.plan || 'starter';

  const plans = [
    {
      id: 'starter' as PlanType,
      name: 'Starter',
      price: '$29',
      interval: 'per month',
      description: 'Ideal for single businesses connecting one WhatsApp number.',
      instances: 1,
      messages: 1000,
      features: [
        '1 Dedicated WhatsApp Number',
        '1,000 Messages per Month',
        'Keyword Trigger Auto-Replies',
        'Inbound & Outbound Audit Logs',
        'Standard Rate Limiting (30 msg/min)',
      ],
    },
    {
      id: 'pro' as PlanType,
      name: 'Pro Multi-Line',
      price: '$79',
      interval: 'per month',
      description: 'For growing sales teams and e-commerce stores with multiple lines.',
      popular: true,
      instances: 3,
      messages: 5000,
      features: [
        '3 Dedicated WhatsApp Numbers',
        '5,000 Messages per Month',
        'Unlimited Keyword Automations',
        'Fast Webhook Priority Queue',
        'Team Member Multi-seat Access',
        'Custom Webhook Event Filtering',
      ],
    },
    {
      id: 'agency' as PlanType,
      name: 'Agency Scale',
      price: '$199',
      interval: 'per month',
      description: 'For agencies running marketing automation for multiple clients.',
      instances: 10,
      messages: 25000,
      features: [
        '10 Dedicated WhatsApp Numbers',
        '25,000 Messages per Month',
        'Dedicated Queue on Evolution API',
        'White-label Tenant Dashboards',
        'Direct Database Export / API Access',
        'Priority Technical Support',
      ],
    },
  ];

  const handleSelectPlan = async (planId: PlanType) => {
    if (planId === currentPlan) return;
    setUpgradingPlan(planId);
    try {
      await onUpgradePlan(planId);
    } catch (e: any) {
      alert(e.message || 'Upgrade failed');
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Subscription Plans & Quota Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Quotas are enforced directly in the database before creating Evolution API instances or sending messages.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <span>Active Tier: {currentPlan.toUpperCase()}</span>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlan;
          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between relative transition-all ${
                p.popular
                  ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.description}</p>

                <div className="mt-4 mb-6">
                  <span className="text-3xl font-black text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-500 font-medium ml-1.5">{p.interval}</span>
                </div>

                {/* Quotas highlights */}
                <div className="space-y-2 py-3 border-y border-slate-100 mb-4 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      Instances:
                    </span>
                    <strong className="text-slate-900 font-bold">{p.instances} Numbers</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      Monthly Messages:
                    </span>
                    <strong className="text-slate-900 font-bold">{p.messages.toLocaleString()} msgs</strong>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 text-xs text-slate-600">
                  {p.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleSelectPlan(p.id)}
                  disabled={isCurrent || upgradingPlan === p.id}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                      : p.popular
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                  }`}
                >
                  {isCurrent ? (
                    <span>Current Plan</span>
                  ) : upgradingPlan === p.id ? (
                    <span>Upgrading...</span>
                  ) : (
                    <>
                      <span>Switch to {p.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Server,
  ArrowRight,
  Lock,
  Mail,
  Building,
  KeyRound,
  Check,
  Globe,
  Database,
  Radio,
  Sliders,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { PlanType, SubscriptionPackage } from '../types';

interface LandingPageProps {
  onEnterDashboard: () => void;
  onOpenAdmin: () => void;
  onRegistered: (userData: any) => void;
  isLoggedIn?: boolean;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterDashboard,
  onOpenAdmin,
  onRegistered,
  isLoggedIn = false,
  userEmail,
  userRole,
  onLogout,
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const plans = [
    {
      id: 'starter' as PlanType,
      name: 'Starter',
      price: '$29',
      period: '/mo',
      desc: 'For single businesses connecting 1 WhatsApp number.',
      instances: '1 Dedicated Number',
      messages: '1,000 Messages / mo',
      features: [
        'Instant QR Code Pairing',
        'Keyword Trigger Auto-Replies',
        'Inbound & Outbound Audit Logs',
        'AES-256 Token Encryption',
      ],
    },
    {
      id: 'pro' as PlanType,
      name: 'Pro Multi-Line',
      price: '$79',
      period: '/mo',
      popular: true,
      desc: 'For teams & growing e-commerce stores with multiple support desks.',
      instances: '3 Dedicated Numbers',
      messages: '5,000 Messages / mo',
      features: [
        '3 WhatsApp Business Numbers',
        'Unlimited Keyword Automations',
        'Fast Webhook Priority Queue',
        'Multi-agent Team Workspace',
        '30 msg/min Rate Limiting',
      ],
    },
    {
      id: 'agency' as PlanType,
      name: 'Agency Scale',
      price: '$199',
      period: '/mo',
      desc: 'For marketing agencies running automation for multiple clients.',
      instances: '10 Dedicated Numbers',
      messages: '25,000 Messages / mo',
      features: [
        '10 WhatsApp Numbers',
        'Dedicated Evolution API Queue',
        'Client Multi-Tenant Isolation',
        'Full Database Audit Exports',
        'Priority Technical VPS SLA',
      ],
    },
  ];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      authMode === 'register'
        ? { email, password, company_name: companyName, plan: selectedPlan }
        : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.token) {
        localStorage.setItem('wautomation_auth_token', data.token);
        localStorage.setItem('wapilot_auth_token', data.token);
      }

      onRegistered(data);
      onEnterDashboard();
    } catch (err: any) {
      setAuthError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToAuth = (planChoice?: PlanType) => {
    if (planChoice) {
      setSelectedPlan(planChoice);
      setAuthMode('register');
    }
    const elem = document.getElementById('auth-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Sticky Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Smartphone className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                Wautomation.io
                <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">
                  MULTI-TENANT
                </span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Platform Features
            </a>
            <a href="#architecture" className="hover:text-emerald-400 transition-colors">
              VPS Architecture
            </a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">
              Pricing Plans
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {(!isLoggedIn || userRole === 'superadmin') && (
              <button
                onClick={onOpenAdmin}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/90 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Open Superadmin Console"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Master Admin</span>
              </button>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEnterDashboard}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                >
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-xl transition-colors font-medium"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onEnterDashboard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Sign In / Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="text-center max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 shadow-inner">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Multi-Tenant WhatsApp Automation for Evolution API</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Connect WhatsApp in seconds.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Isolate every tenant.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            The white-label SaaS layer built directly on your self-hosted Evolution API VPS. Users register,
            scan their QR code to pair WhatsApp lines, and automate keyword auto-replies — completely isolated
            with Supabase Row Level Security.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={() => scrollToAuth('pro')}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Tenant Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onEnterDashboard}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>Explore Demo Workspace</span>
            </button>
          </div>
        </div>

        {/* Live Interface Preview Graphic / Shell */}
        <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-2xl relative">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2">https://wautomation.io/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/80">
              <span>Evolution API VPS: ONLINE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Instance Card Mockup */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">Bali Support Desk</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                  CONNECTED
                </span>
              </div>
              <p className="font-mono text-slate-400 text-[11px]">+62 812-3456-7890</p>
              <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] font-mono text-slate-400 flex justify-between">
                <span>Instance Name:</span>
                <span className="text-slate-200">tenant_alex_01</span>
              </div>
            </div>

            {/* Keyword Trigger Mockup */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-white">Pricing Bot Auto-Reply</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-800 font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
              <div className="space-y-1 text-[11px]">
                <span className="text-slate-500">Trigger:</span>
                <p className="font-mono text-emerald-300">contains "price"</p>
                <span className="text-slate-500">Response:</span>
                <p className="text-slate-300 italic">"Our tour packages start at $45..."</p>
              </div>
            </div>

            {/* Isolation Badge Mockup */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-white font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Security & Isolation</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Per-instance tokens stored with AES-256 authenticated encryption. Zero global VPS keys on client.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500">RLS: auth.uid() = user_id</div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/60 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Engineered for Rock-Solid Multi-Tenancy
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Everything you need to run a high-margin WhatsApp SaaS on your own VPS infrastructure without
              paying high per-message Twilio fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Instant QR Code Pairing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tenants click "Connect WhatsApp" and scan the live QR code. Webhook listener auto-updates status to
                connected when WhatsApp pairs.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Keyword Auto-Replies</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inbound messages are routed via Evolution API webhooks to match keyword rules (contains, exact,
                starts_with) and dispatch instant answers.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Tenant Quotas & Rate Limits</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict 30 req/min sliding-window limit protects your shared VPS. Instance and monthly message caps are
                enforced in the database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Registration & Login Form (Directly on Landing Page) */}
      <section id="auth-section" className="py-20 border-t border-slate-900 bg-slate-900/30 px-6">
        <div className="max-w-xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {authMode === 'register' ? 'Launch Your Tenant Workspace' : 'Sign In to Tenant Dashboard'}
              </h2>
              <p className="text-xs text-slate-400">
                {authMode === 'register'
                  ? 'Start your 14-day free trial. Instant access to QR connection.'
                  : 'Enter your email and credentials to manage your WhatsApp lines.'}
              </p>
            </div>

            {/* Tab switch */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  authMode === 'register' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Workspace
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  authMode === 'login' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tenant Sign In
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Business / Workspace Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Bali Sunset Tours, Apex Sales Desk"
                    required={authMode === 'register'}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Plan Package
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['starter', 'pro', 'agency'] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setSelectedPlan(p)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center capitalize ${
                          selectedPlan === p
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>
                  {isLoading
                    ? 'Processing...'
                    : authMode === 'register'
                    ? 'Create Workspace & Open Dashboard'
                    : 'Sign In to Tenant Workspace'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onEnterDashboard}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors underline"
              >
                Or skip registration and enter with Demo Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-slate-900 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Predictable Pricing. No Per-Message Markups.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Because you self-host the Evolution API engine on your own VPS, your message margins are 100% yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`bg-slate-900/70 border rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                  p.popular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500'
                    : 'border-slate-800'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{p.price}</span>
                    <span className="text-xs text-slate-400">{p.period}</span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl space-y-1.5 text-xs border border-slate-800/80">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Instance Limit:</span>
                      <strong className="font-bold text-white">{p.instances}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Monthly Quota:</span>
                      <strong className="font-bold text-white">{p.messages}</strong>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-400 pt-2">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800">
                  <button
                    onClick={() => scrollToAuth(p.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      p.popular
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>Get Started with {p.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-16 border-t border-slate-900 bg-slate-950/40 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Self-Hosted VPS Engine Integration
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Your Evolution API VPS runs Docker with Postgres and Redis. Wautomation.io sits as the multi-tenant SaaS
              orchestration layer.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Evolution API VPS Docker Architecture
              </span>
              <span className="text-[11px] text-slate-500">github.com/EvolutionAPI/evolution-api</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px]">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Layer 1: SaaS Frontend</span>
                <span className="text-white font-bold">Next.js App Router</span>
                <p className="text-slate-400 text-[10px]">Supabase Auth + RLS data scoping</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Layer 2: Server API Proxy</span>
                <span className="text-emerald-400 font-bold">Server-side Guard</span>
                <p className="text-slate-400 text-[10px]">AES-256 tokens & rate limiting</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-500 block">Layer 3: Messaging VPS</span>
                <span className="text-cyan-400 font-bold">Evolution API (Docker)</span>
                <p className="text-slate-400 text-[10px]">PostgreSQL + Redis instance state</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300">Wautomation.io</span>
            <span>— Multi-tenant WhatsApp Automation Engine.</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenAdmin} className="text-amber-400 hover:underline">
              Superadmin Console
            </button>
            <button onClick={onEnterDashboard} className="text-slate-300 hover:text-emerald-400">
              Tenant Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

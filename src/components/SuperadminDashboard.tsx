import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Smartphone,
  Layers,
  DollarSign,
  TrendingUp,
  Server,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Settings,
  Edit2,
  Trash2,
  Power,
  RotateCw,
  Plus,
  ArrowLeft,
  Filter,
  Check,
  ExternalLink,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Menu,
  X,
  Activity,
  Cpu,
  Database,
  Lock,
} from 'lucide-react';
import {
  AdminOverviewStats,
  TenantMember,
  SubscriptionPackage,
  WhatsAppInstance,
  PlanType,
} from '../types';

interface SuperadminDashboardProps {
  onBackToTenant: () => void;
  onImpersonateTenant: (tenantId: string) => void;
  onLogout?: () => void;
  adminEmail?: string;
}

type AdminTab = 'overview' | 'tenants' | 'packages' | 'instances' | 'vps' | 'security';

export const SuperadminDashboard: React.FC<SuperadminDashboardProps> = ({
  onBackToTenant,
  onImpersonateTenant,
  onLogout,
  adminEmail = 'baliadventours@gmail.com',
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [tenants, setTenants] = useState<TenantMember[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [instances, setInstances] = useState<
    Array<WhatsAppInstance & { tenantEmail: string; tenantCompany?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Edit Tenant Modal State
  const [editingTenant, setEditingTenant] = useState<TenantMember | null>(null);
  const [editPlan, setEditPlan] = useState<PlanType>('starter');
  const [editInstanceLimit, setEditInstanceLimit] = useState(1);
  const [editMessageLimit, setEditMessageLimit] = useState(1000);
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  // Edit Package Modal State
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgPlan, setPkgPlan] = useState<PlanType>('starter');
  const [pkgPrice, setPkgPrice] = useState(29);
  const [pkgInstLimit, setPkgInstLimit] = useState(1);
  const [pkgMsgLimit, setPkgMsgLimit] = useState(1000);
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgFeatures, setPkgFeatures] = useState('');
  const [isSavingPackage, setIsSavingPackage] = useState(false);

  // Toast / notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const getAuthHeaders = (): Record<string, string> => {
    const token =
      localStorage.getItem('wautomation_auth_token') ||
      localStorage.getItem('wapilot_auth_token') ||
      'wapilot_session_admin_root';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        showNotification('Unauthorized or session expired. Superadmin access required.', 'error');
        if (onLogout) onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch admin fleet overview');
      const data = await res.json();
      setStats(data.stats);
      setTenants(data.tenants || []);
      setPackages(data.packages || []);
      setInstances(data.instances || []);
    } catch (err: any) {
      showNotification(err.message || 'Error fetching admin data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Save Tenant Quota / Plan
  const handleSaveTenant = async () => {
    if (!editingTenant) return;
    setIsSavingTenant(true);
    try {
      const res = await fetch(`/api/admin/tenants/${editingTenant.id}/plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          plan: editPlan,
          instance_limit: editInstanceLimit,
          message_limit: editMessageLimit,
        }),
      });

      if (!res.ok) throw new Error('Failed to update tenant quotas');

      showNotification(`Quotas updated for ${editingTenant.company_name || editingTenant.email}`);
      setEditingTenant(null);
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingTenant(false);
    }
  };

  // Toggle Tenant Suspension
  const handleToggleTenantStatus = async (tenant: TenantMember) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) throw new Error('Failed to toggle tenant status');

      showNotification(
        nextStatus === 'suspended'
          ? `Tenant ${tenant.email} suspended.`
          : `Tenant ${tenant.email} reinstated and active.`
      );
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Save Package Tier
  const handleSavePackage = async () => {
    if (!pkgName || !pkgPlan || pkgPrice < 0) {
      showNotification('Package name, plan key, and valid price are required', 'error');
      return;
    }
    setIsSavingPackage(true);
    try {
      const featureList = pkgFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editingPackage ? editingPackage.id : undefined,
          name: pkgName,
          plan: pkgPlan,
          priceMonthly: pkgPrice,
          instance_limit: pkgInstLimit,
          message_limit: pkgMsgLimit,
          description: pkgDesc,
          features: featureList,
        }),
      });

      if (!res.ok) throw new Error('Failed to save subscription package');

      showNotification(editingPackage ? 'Package tier updated!' : 'New package tier created!');
      setIsPackageModalOpen(false);
      setEditingPackage(null);
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsSavingPackage(false);
    }
  };

  // Delete Package
  const handleDeletePackage = async (pkgId: string, pkgNameStr: string) => {
    if (!confirm(`Are you sure you want to delete the package tier "${pkgNameStr}"?`)) return;
    try {
      const res = await fetch(`/api/admin/packages/${pkgId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete package');
      showNotification(`Package ${pkgNameStr} deleted.`);
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Force Reboot Instance
  const handleRebootInstance = async (instId: string, instName: string) => {
    try {
      const res = await fetch(`/api/admin/instances/${instId}/reboot`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to reboot instance on VPS');
      showNotification(`Reboot signal sent to Evolution API for instance ${instName}`);
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Force Terminate Instance
  const handleDeleteInstance = async (instId: string, instName: string) => {
    if (!confirm(`Force terminate and delete WhatsApp instance "${instName}" across the VPS cluster?`)) return;
    try {
      const res = await fetch(`/api/admin/instances/${instId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete instance');
      showNotification(`Instance ${instName} terminated.`);
      fetchAdminData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const openCreatePackageModal = () => {
    setEditingPackage(null);
    setPkgName('');
    setPkgPlan('starter');
    setPkgPrice(39);
    setPkgInstLimit(2);
    setPkgMsgLimit(2500);
    setPkgDesc('');
    setPkgFeatures('2 Dedicated WhatsApp Lines\n2,500 Messages/mo\nWebhook Queuing');
    setIsPackageModalOpen(true);
  };

  const openEditPackageModal = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setPkgName(pkg.name);
    setPkgPlan(pkg.plan);
    setPkgPrice(pkg.priceMonthly);
    setPkgInstLimit(pkg.instance_limit);
    setPkgMsgLimit(pkg.message_limit);
    setPkgDesc(pkg.description || '');
    setPkgFeatures((pkg.features || []).join('\n'));
    setIsPackageModalOpen(true);
  };

  const openEditTenantModal = (t: TenantMember) => {
    setEditingTenant(t);
    setEditPlan(t.plan);
    setEditInstanceLimit(t.instance_limit);
    setEditMessageLimit(t.message_limit);
  };

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const connectedLinesCount = instances.filter((i) => i.status === 'connected').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* MOBILE TOP BAR */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">Wautomation.io Master Console</h1>
            <p className="text-[10px] text-amber-400 font-mono">ROOT ACCESS</p>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* DEDICATED ADMIN SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Branding */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black shadow-lg shadow-amber-900/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white">Wautomation.io</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Master Admin Console</p>
            </div>
          </div>

          {/* Admin Identity Card */}
          <div className="mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                {adminEmail[0].toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-slate-200 truncate">{adminEmail}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400 font-medium">Superadmin Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Fleet Operations
          </div>

          <button
            onClick={() => {
              setActiveTab('overview');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview & Metrics</span>
            </div>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              setActiveTab('tenants');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'tenants'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Members & Tenants</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
              {tenants.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('instances');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'instances'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4" />
              <span>WhatsApp Fleet</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-300 font-mono">
              {connectedLinesCount}/{instances.length}
            </span>
          </button>

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Monetization & Plans
          </div>

          <button
            onClick={() => {
              setActiveTab('packages');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'packages'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>Subscription Packages</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
              {packages.length}
            </span>
          </button>

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Infrastructure & Control
          </div>

          <button
            onClick={() => {
              setActiveTab('vps');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'vps'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4" />
              <span>VPS Engine & Redis</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4" />
              <span>Security & Encryption</span>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Sidebar Bottom Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-2">
          <button
            onClick={onBackToTenant}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Tenant Workspace</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 text-rose-300 hover:text-rose-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Lock Console / Sign Out</span>
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-slate-950">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="text-amber-400 font-mono uppercase text-[11px]">ROOT</span>
              <span>/</span>
              <span className="text-slate-200 capitalize">
                {activeTab === 'overview'
                  ? 'Overview & Telemetry'
                  : activeTab === 'tenants'
                  ? 'Members & Tenants Management'
                  : activeTab === 'packages'
                  ? 'Subscription Tiers & Pricing'
                  : activeTab === 'instances'
                  ? 'Fleet WhatsApp Instances'
                  : activeTab === 'vps'
                  ? 'VPS Infrastructure & Redis Queues'
                  : 'Security & API Encryption'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {activeTab === 'overview' && 'Platform Overview & Global Telemetry'}
              {activeTab === 'tenants' && 'All Registered Tenants & Member Quotas'}
              {activeTab === 'packages' && 'Subscription Packages & Feature Tiers'}
              {activeTab === 'instances' && 'WhatsApp Fleet Across All Tenants'}
              {activeTab === 'vps' && 'Evolution API Node & Queue Metrics'}
              {activeTab === 'security' && 'Security & Key Encryption Status'}
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={fetchAdminData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Sync Fleet</span>
            </button>

            {activeTab === 'packages' && (
              <button
                onClick={openCreatePackageModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Tier</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body Container */}
        <div className="p-6 space-y-6">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Key Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Tenants</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{stats?.totalTenants ?? '...'}</p>
                  <div className="text-[10px] text-slate-400">
                    <span className="text-emerald-400 font-bold">{stats?.activeTenants ?? 0}</span> active
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp Lines</span>
                    <Smartphone className="w-4 h-4 text-teal-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{stats?.connectedInstances ?? '...'}</p>
                  <div className="text-[10px] text-slate-400">
                    <span className="text-teal-400 font-bold">{stats?.totalInstances ?? 0}</span> configured
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Estimated MRR</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-2xl font-black text-amber-400">${stats?.monthlyRecurringRevenue ?? 0}</p>
                  <div className="text-[10px] text-slate-400">
                    <span>Monthly recurring</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Messages Logged</span>
                    <Layers className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{stats?.totalMessagesSent ?? '...'}</p>
                  <div className="text-[10px] text-slate-400">
                    <span>Inbound + Outbound</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">VPS Health</span>
                    <Server className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-black text-emerald-400">99.9%</p>
                  <div className="text-[10px] text-emerald-400">
                    <span>Evolution Docker: UP</span>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Active Tiers</span>
                    <Settings className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-2xl font-black text-white">{packages.length}</p>
                  <div className="text-[10px] text-slate-400">
                    <span>Packages live</span>
                  </div>
                </div>
              </div>

              {/* Fleet Distribution & Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subscription Tier Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Tenant Tier Distribution</span>
                    </h2>
                    <span className="text-[11px] text-slate-400 font-mono">{tenants.length} tenants</span>
                  </div>

                  <div className="space-y-3">
                    {packages.map((pkg) => {
                      const count = tenants.filter((t) => t.plan === pkg.plan).length;
                      const pct = tenants.length > 0 ? Math.round((count / tenants.length) * 100) : 0;
                      return (
                        <div key={pkg.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-300">{pkg.name}</span>
                            <span className="text-slate-400 font-mono">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pkg.plan === 'enterprise'
                                  ? 'bg-amber-400'
                                  : pkg.plan === 'agency'
                                  ? 'bg-purple-400'
                                  : pkg.plan === 'pro'
                                  ? 'bg-emerald-400'
                                  : 'bg-blue-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActiveTab('packages')}
                    className="w-full mt-2 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Manage Pricing Tiers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* VPS Node & Redis Live Telemetry */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span>VPS Cluster Health</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                      ONLINE
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Evolution Docker Container</span>
                      <span className="text-emerald-400 font-mono font-bold">running (v2.2.3)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Redis Broker Queue</span>
                      <span className="text-cyan-400 font-mono font-bold">0 pending msgs</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">PostgreSQL Tenants Pool</span>
                      <span className="text-purple-400 font-mono font-bold">8/50 active conns</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Inbound Webhook Latency</span>
                      <span className="text-slate-200 font-mono font-bold">42 ms</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('vps')}
                    className="w-full mt-2 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Full VPS Telemetry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Tenant Actions */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-400" />
                      <span>Recent Tenants</span>
                    </h2>
                    <button
                      onClick={() => setActiveTab('tenants')}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      View all
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {tenants.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <p className="text-xs font-bold text-white truncate">{t.company_name || t.email}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{t.email}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                            t.plan === 'agency'
                              ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                              : t.plan === 'pro'
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                              : 'bg-blue-950/60 border-blue-800 text-blue-300'
                          }`}
                        >
                          {t.plan}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab('tenants')}
                    className="w-full mt-2 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Manage Member Quotas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MEMBERS & TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tenants by email or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Filter className="w-3.5 h-3.5" />
                    <span>Plan:</span>
                  </div>
                  <select
                    value={planFilter}
                    onChange={(e) => setPlanFilter(e.target.value)}
                    className="text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">All Plans</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Tenants Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Tenant / Member</th>
                        <th className="py-3.5 px-4">Plan Tier</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">WhatsApp Lines</th>
                        <th className="py-3.5 px-4">Monthly Quota</th>
                        <th className="py-3.5 px-4">Joined Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {filteredTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-white">{t.company_name || 'Individual'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{t.email}</p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                t.plan === 'enterprise'
                                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                                  : t.plan === 'agency'
                                  ? 'bg-purple-950/80 border-purple-800 text-purple-300'
                                  : t.plan === 'pro'
                                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                                  : 'bg-blue-950/80 border-blue-800 text-blue-300'
                              }`}
                            >
                              {t.plan}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                t.status === 'suspended'
                                  ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                                  : 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  t.status === 'suspended' ? 'bg-rose-400' : 'bg-emerald-400'
                                }`}
                              />
                              <span className="capitalize">{t.status || 'active'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-200">
                              {t.connected_instances_count} / {t.instance_limit}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-200">
                              {t.total_messages_count.toLocaleString()} / {t.message_limit.toLocaleString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(t.created_at).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditTenantModal(t)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Edit Quotas & Plan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleToggleTenantStatus(t)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  t.status === 'suspended'
                                    ? 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300'
                                    : 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300'
                                }`}
                                title={t.status === 'suspended' ? 'Reinstate Tenant' : 'Suspend Tenant'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onImpersonateTenant(t.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-colors flex items-center gap-1"
                                title="Log in as this tenant to view dashboard"
                              >
                                <span>Workspace</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUBSCRIPTION PACKAGES */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Subscription Packages & Pricing Tiers</h2>
                  <p className="text-xs text-slate-400">
                    Configure plans, WhatsApp connection quotas, message rates, and tier pricing.
                  </p>
                </div>
                <button
                  onClick={openCreatePackageModal}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Tier</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            pkg.plan === 'enterprise'
                              ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                              : pkg.plan === 'agency'
                              ? 'bg-purple-950/80 border-purple-800 text-purple-300'
                              : pkg.plan === 'pro'
                              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                              : 'bg-blue-950/80 border-blue-800 text-blue-300'
                          }`}
                        >
                          {pkg.plan}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPackageModal(pkg)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit Tier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Delete Tier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white">{pkg.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-white">${pkg.priceMonthly}</span>
                          <span className="text-xs text-slate-400">/mo</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{pkg.description}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300 font-medium">
                          <span>Max WhatsApp Lines:</span>
                          <span className="font-bold text-white">{pkg.instance_limit}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 font-medium">
                          <span>Monthly Messages:</span>
                          <span className="font-bold text-white">{pkg.message_limit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 font-medium">
                          <span>Active Subscribers:</span>
                          <span className="font-bold text-amber-400">
                            {pkg.activeSubscriberCount ??
                              tenants.filter((t) => t.plan === pkg.plan).length}{' '}
                            tenants
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Features</p>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {(pkg.features || []).map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => openEditPackageModal(pkg)}
                      className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Configure Quotas
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: FLEET WHATSAPP INSTANCES */}
          {activeTab === 'instances' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Cluster WhatsApp Instances</h2>
                  <p className="text-xs text-slate-400">
                    Live overview of all connected and pending WhatsApp lines across tenants on the VPS.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-300">
                    {connectedLinesCount} Active Connections
                  </span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4">Instance / ID</th>
                        <th className="py-3.5 px-4">Tenant Owner</th>
                        <th className="py-3.5 px-4">Phone Number</th>
                        <th className="py-3.5 px-4">Evolution State</th>
                        <th className="py-3.5 px-4">Connected Since</th>
                        <th className="py-3.5 px-4">Token Security</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {instances.map((inst) => (
                        <tr key={inst.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-bold text-white">{inst.profile_name || inst.instance_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{inst.instance_name}</p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div>
                              <p className="font-semibold text-slate-200">{inst.tenantCompany || 'Individual'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{inst.tenantEmail}</p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-200">
                              {inst.phone_number || (
                                <span className="text-amber-400/80 italic">Awaiting QR scan</span>
                              )}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                inst.status === 'connected'
                                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                                  : inst.status === 'connecting'
                                  ? 'bg-amber-950/70 border-amber-800 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  inst.status === 'connected'
                                    ? 'bg-emerald-400 animate-pulse'
                                    : inst.status === 'connecting'
                                    ? 'bg-amber-400'
                                    : 'bg-slate-500'
                                }`}
                              />
                              <span className="capitalize">{inst.status}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400">
                            {inst.connected_at ? new Date(inst.connected_at).toLocaleDateString() : '—'}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                              <ShieldCheck className="w-3 h-3" />
                              <span>AES-256</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRebootInstance(inst.id, inst.instance_name)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Force Reboot Evolution Instance"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteInstance(inst.id, inst.instance_name)}
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/80 border border-rose-900/50 text-rose-300 hover:text-rose-200 transition-colors"
                                title="Terminate Instance"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VPS TELEMETRY & REDIS */}
          {activeTab === 'vps' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">VPS Node Infrastructure</h2>
                      <p className="text-xs text-slate-400">
                        Self-hosted Evolution API running with Docker, PostgreSQL & Redis broker.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>CLUSTER HEALTHY</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold">Evolution REST API</span>
                      <Cpu className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold text-white">NodeJS Engine: Online</p>
                    <p className="text-[11px] text-slate-500 font-mono">Port 8080 • v2.2.3</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold">Redis Message Queue</span>
                      <Activity className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-lg font-bold text-white">0 Queued Messages</p>
                    <p className="text-[11px] text-slate-500 font-mono">Port 6379 • Inbound Stream</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold">PostgreSQL Session Store</span>
                      <Database className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-lg font-bold text-white">Sessions Preserved</p>
                    <p className="text-[11px] text-slate-500 font-mono">Postgres 16 • Docker Volume</p>
                  </div>
                </div>
              </div>

              {/* Webhook Dispatch Telemetry */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Webhook Dispatcher & Rate Limiter Pipeline</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-200">Rate Limiting Parameters</h4>
                    <ul className="space-y-1.5 text-slate-400">
                      <li className="flex justify-between">
                        <span>Starter Plan:</span>
                        <span className="font-mono text-white">30 messages / min</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Pro Plan:</span>
                        <span className="font-mono text-white">90 messages / min</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Agency Scale:</span>
                        <span className="font-mono text-white">300 messages / min</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Enterprise Dedicated:</span>
                        <span className="font-mono text-emerald-400">Dedicated VPS Worker</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-200">Evolution API Webhook Settings</h4>
                    <ul className="space-y-1.5 text-slate-400">
                      <li className="flex justify-between">
                        <span>Inbound Route:</span>
                        <span className="font-mono text-white">/api/webhook/evolution</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Event Types:</span>
                        <span className="font-mono text-white">MESSAGES_UPSERT, CONNECTION</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Retry Policy:</span>
                        <span className="font-mono text-white">Exponential Backoff (3 retries)</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Isolation:</span>
                        <span className="font-mono text-emerald-400">Strict Tenant Partitioning</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & KEYS */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Master Security & Token Encryption</h2>
                    <p className="text-xs text-slate-400">
                      Enterprise-grade isolation: Master API Key, AES-256 instance credentials, and Row Level Security.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Evolution Master Admin Key
                    </span>
                    <p className="font-mono text-emerald-400 font-bold text-sm">
                      EVOLUTION_ADMIN_APIKEY: ••••••••••••••••
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Never exposed to client browsers. Handled purely by backend Node/Next.js API proxy routes.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Token Encryption Standard
                    </span>
                    <p className="font-mono text-emerald-400 font-bold text-sm">
                      AES-256-CBC with Master Encryption Key
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      Tenant instance tokens stored encrypted in Postgres with initialization vector.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: EDIT TENANT PLAN / QUOTAS */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Edit Tenant Quotas</h3>
              <button
                onClick={() => setEditingTenant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">Tenant</p>
              <p className="text-sm font-bold text-white">{editingTenant.company_name || editingTenant.email}</p>
              <p className="text-xs text-slate-500 font-mono">{editingTenant.email}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Tier</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as PlanType)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="starter">Starter (1 Line, 1,000 msgs)</option>
                  <option value="pro">Pro (3 Lines, 5,000 msgs)</option>
                  <option value="agency">Agency (10 Lines, 25,000 msgs)</option>
                  <option value="enterprise">Enterprise (Custom Dedicated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Max WhatsApp Instances (Lines)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editInstanceLimit}
                  onChange={(e) => setEditInstanceLimit(parseInt(e.target.value) || 1)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Outbound Message Limit
                </label>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={editMessageLimit}
                  onChange={(e) => setEditMessageLimit(parseInt(e.target.value) || 1000)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingTenant(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={isSavingTenant}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20"
              >
                {isSavingTenant ? 'Saving...' : 'Save Quota Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT SUBSCRIPTION PACKAGE */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingPackage ? `Edit Tier: ${editingPackage.name}` : 'Create New Subscription Tier'}
              </h3>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Package Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pro Multi-Line"
                  value={pkgName}
                  onChange={(e) => setPkgName(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Key</label>
                <select
                  value={pkgPlan}
                  onChange={(e) => setPkgPlan(e.target.value as PlanType)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="starter">starter</option>
                  <option value="pro">pro</option>
                  <option value="agency">agency</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Price (USD / Month)</label>
                <input
                  type="number"
                  min="0"
                  value={pkgPrice}
                  onChange={(e) => setPkgPrice(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Lines Limit</label>
                <input
                  type="number"
                  min="1"
                  value={pkgInstLimit}
                  onChange={(e) => setPkgInstLimit(parseInt(e.target.value) || 1)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Monthly Message Limit</label>
              <input
                type="number"
                min="100"
                step="500"
                value={pkgMsgLimit}
                onChange={(e) => setPkgMsgLimit(parseInt(e.target.value) || 1000)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief value proposition"
                value={pkgDesc}
                onChange={(e) => setPkgDesc(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Features List (one per line)
              </label>
              <textarea
                rows={3}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                value={pkgFeatures}
                onChange={(e) => setPkgFeatures(e.target.value)}
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePackage}
                disabled={isSavingPackage}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-600/20"
              >
                {isSavingPackage ? 'Saving...' : editingPackage ? 'Update Tier' : 'Create Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

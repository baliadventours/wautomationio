import React, { useState, useEffect, useCallback } from 'react';
import {
  WhatsAppInstance,
  MessageLog,
  AutomationRule,
  Subscription,
  HealthStatus,
  UserProfile,
  PlanType,
  QrCodeData,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Navbar';
import { InstancesView } from './components/InstancesView';
import { AutomationsView } from './components/AutomationsView';
import { MessageLogsView } from './components/MessageLogsView';
import { MessengerView } from './components/MessengerView';
import { VpsStatusView } from './components/VpsStatusView';
import { BillingView } from './components/BillingView';
import { ApiKeysManagement } from './components/ApiKeysManagement';
import { ApiDocsView } from './components/ApiDocsView';
import { QrConnectModal } from './components/QrConnectModal';
import { SendMessageModal } from './components/SendMessageModal';
import { CreateInstanceModal } from './components/CreateInstanceModal';
import { InstanceDetailPage } from './components/InstanceDetailPage';
import { LandingPage } from './components/LandingPage';
import { SuperadminDashboard } from './components/SuperadminDashboard';
import { AuthModal } from './components/AuthModal';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

export function App() {
  // Navigation & Mode
  const [appMode, setAppMode] = useState<'landing' | 'dashboard' | 'admin'>('dashboard');
  const [currentTab, setCurrentTab] = useState<string>('instances');

  // Application Data
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<
    Array<{ id: string; email: string; company?: string; plan: string }>
  >([]);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  // Modals
  const [qrModalData, setQrModalData] = useState<{
    instance: WhatsAppInstance;
    qr: QrCodeData | null;
  } | null>(null);
  const [sendModalInstance, setSendModalInstance] = useState<WhatsAppInstance | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedInstanceForDetail, setSelectedInstanceForDetail] = useState<WhatsAppInstance | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<'tenant' | 'superadmin'>('tenant');

  // Token helper functions supporting Wautomation.io brand
  const getStoredToken = useCallback((): string => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('wautomation_auth_token') ||
      localStorage.getItem('wapilot_auth_token') ||
      ''
    );
  }, []);

  const setStoredToken = useCallback((token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('wautomation_auth_token', token);
    localStorage.setItem('wapilot_auth_token', token);
  }, []);

  const clearStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('wautomation_auth_token');
    localStorage.removeItem('wapilot_auth_token');
  }, []);

  // Helper for auth headers
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getStoredToken]);

  // Fetch initial health
  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        if (data.activeTenantId && !activeTenantId) {
          setActiveTenantId(data.activeTenantId);
        }
      }
    } catch (err) {
      console.error('Error fetching health:', err);
    } finally {
      setIsCheckingHealth(false);
    }
  }, [activeTenantId]);

  // Fetch authenticated tenant data
  const fetchTenantData = useCallback(async () => {
    const headers = getAuthHeaders();
    try {
      const [meRes, instRes, logsRes, autoRes] = await Promise.all([
        fetch('/api/auth/me', { headers }),
        fetch('/api/instances', { headers }),
        fetch('/api/messages/logs', { headers }),
        fetch('/api/automations', { headers }),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
        setSubscription(meData.subscription);
        setActiveTenantId(meData.user?.id || '');
        if (meData.availableTenants) {
          setAvailableTenants(meData.availableTenants);
        }
      } else if (meRes.status === 401) {
        // Token is invalid or expired
        clearStoredToken();
        setUser(null);
        setSubscription(null);
      }

      if (instRes.ok) {
        const instData = await instRes.json();
        setInstances(instData.instances || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }

      if (autoRes.ok) {
        const autoData = await autoRes.json();
        setAutomations(autoData.automations || []);
      }
    } catch (err) {
      console.error('Error loading tenant data:', err);
    }
  }, [getAuthHeaders]);

  // Initial application boot check
  useEffect(() => {
    async function boot() {
      setIsLoading(true);
      await fetchHealth();
      let token = getStoredToken();
      if (!token) {
        token = 'wautomation_session_admin_root';
        setStoredToken(token);
      }
      await fetchTenantData();
      setIsLoading(false);
    }
    boot();
  }, [fetchHealth, fetchTenantData, getStoredToken, setStoredToken]);

  // Log Out handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      clearStoredToken();
      setUser(null);
      setSubscription(null);
      setInstances([]);
      setLogs([]);
      setAutomations([]);
      setAppMode('landing');
    }
  };

  // Switch Active Tenant (Root/Superadmin feature)
  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const res = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        setActiveTenantId(tenantId);
        await fetchTenantData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Instance creation -> Open QR
  const handleCreateInstance = async (friendlyName: string) => {
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ friendly_name: friendlyName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to initialize instance');
    }
    const data = await res.json();
    setInstances((prev) => [...prev, data.instance]);
    setQrModalData({ instance: data.instance, qr: data.qr || data.qr_code || null });
    await fetchTenantData();
  };

  // Disconnect Instance
  const handleDisconnect = async (instanceId: string) => {
    try {
      const res = await fetch(`/api/instances/${instanceId}/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchTenantData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Instance
  const handleDeleteInstance = async (instanceId: string) => {
    try {
      const res = await fetch(`/api/instances/${instanceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setInstances((prev) => prev.filter((i) => i.id !== instanceId));
        await fetchTenantData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Automations CRUD
  const handleCreateAutomation = async (data: any) => {
    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create automation');
    }
    await fetchTenantData();
  };

  const handleToggleAutomation = async (id: string) => {
    const res = await fetch(`/api/automations/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      await fetchTenantData();
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    const res = await fetch(`/api/automations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      await fetchTenantData();
    }
  };

  // Simulate Inbound Message
  const handleSimulateWebhook = async (instanceId: string, text: string) => {
    const res = await fetch(`/api/instances/${instanceId}/simulate-incoming`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        from_number: '+1 (415) 555-0199',
        text,
      }),
    });
    const data = await res.json();
    await fetchTenantData();
    return data;
  };

  // Upgrade Plan
  const handleUpgradePlan = async (plan: PlanType) => {
    const res = await fetch('/api/billing/upgrade', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upgrade plan');
    }
    const data = await res.json();
    setUser(data.profile);
    setSubscription(data.subscription);
  };

  // Production Gate: open Dashboard
  const handleOpenDashboard = () => {
    const token = getStoredToken();
    if (!token || !user) {
      setAuthModalRole('tenant');
      setIsAuthModalOpen(true);
      return;
    }
    setAppMode('dashboard');
  };

  // Production Gate: open Admin
  const handleOpenAdmin = () => {
    const token = getStoredToken();
    if (!token || !user || user.role !== 'superadmin') {
      setAuthModalRole('superadmin');
      setIsAuthModalOpen(true);
      return;
    }
    setAppMode('admin');
  };

  // 1. Landing Page View
  if (appMode === 'landing') {
    return (
      <>
        <LandingPage
          onEnterDashboard={handleOpenDashboard}
          onOpenAdmin={handleOpenAdmin}
          isLoggedIn={!!user}
          userEmail={user?.email}
          userRole={user?.role}
          onLogout={handleLogout}
          onRegistered={async (userData) => {
            if (userData?.token) {
              setStoredToken(userData.token);
            }
            await fetchTenantData();
            setAppMode('dashboard');
          }}
        />

        {/* Auth Modal for Landing Page Trigger */}
        <AuthModal
          isOpen={isAuthModalOpen}
          initialRole={authModalRole}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={async (authData) => {
            if (authData.token) {
              setStoredToken(authData.token);
            }
            await fetchTenantData();
            if (authData.user?.role === 'superadmin') {
              setAppMode('admin');
            } else {
              setAppMode('dashboard');
            }
          }}
        />
      </>
    );
  }

  // 2. Superadmin Master Console View
  if (appMode === 'admin') {
    // Production RBAC Protection: Ensure user has superadmin credentials
    if (!user || user.role !== 'superadmin') {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Superadmin Access Required</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                The Master Admin Console is restricted to platform owners. You must be authenticated
                with superadmin credentials to access global tenant and subscription management.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setAuthModalRole('superadmin');
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In as Superadmin</span>
              </button>
              <button
                onClick={() => setAppMode('dashboard')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Tenant Workspace</span>
              </button>
            </div>
          </div>

          <AuthModal
            isOpen={isAuthModalOpen}
            initialRole="superadmin"
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={async (authData) => {
              if (authData.token) {
                setStoredToken(authData.token);
              }
              await fetchTenantData();
              if (authData.user?.role === 'superadmin') {
                setAppMode('admin');
              } else {
                setAppMode('dashboard');
              }
            }}
          />
        </div>
      );
    }

    return (
      <SuperadminDashboard
        onBackToTenant={() => setAppMode('dashboard')}
        onImpersonateTenant={async (tenantId) => {
          setActiveTenantId(tenantId);
          await fetchTenantData();
          setAppMode('dashboard');
        }}
        onLogout={handleLogout}
        adminEmail={user.email}
      />
    );
  }

  // 3. Tenant Dashboard View
  // If not logged in, prompt user to log in or return to landing page
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <LogIn className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Authentication Required</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Production mode is enabled. Please log in or register a tenant account to access your
              dedicated WhatsApp instances and automations.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => {
                setAuthModalRole('tenant');
                setIsAuthModalOpen(true);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In or Register</span>
            </button>
            <button
              onClick={() => setAppMode('landing')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Landing Page</span>
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          initialRole={authModalRole}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={async (authData) => {
            if (authData.token) {
              setStoredToken(authData.token);
            }
            await fetchTenantData();
            setAppMode('dashboard');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        subscription={subscription}
        userRole={user?.role}
        onNavigateToLanding={() => setAppMode('landing')}
        onNavigateToAdmin={handleOpenAdmin}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation Bar */}
        <Header
          user={user}
          health={health}
          activeTenantId={activeTenantId}
          availableTenants={availableTenants}
          onSwitchTenant={handleSwitchTenant}
          onRefreshHealth={fetchHealth}
          isCheckingHealth={isCheckingHealth}
          onOpenAuth={() => {
            setAuthModalRole('tenant');
            setIsAuthModalOpen(true);
          }}
          onNavigateToLanding={() => setAppMode('landing')}
          onNavigateToAdmin={handleOpenAdmin}
          onLogout={handleLogout}
        />

        {/* View Router */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              Loading tenant workspace...
            </div>
          ) : (
            <>
              {currentTab === 'instances' && (
                selectedInstanceForDetail ? (
                  <InstanceDetailPage
                    instance={instances.find((i) => i.id === selectedInstanceForDetail.id) || selectedInstanceForDetail}
                    logs={logs}
                    automations={automations}
                    onBack={() => setSelectedInstanceForDetail(null)}
                    onOpenQr={(inst) => setQrModalData({ instance: inst, qr: null })}
                    onDisconnect={handleDisconnect}
                    onReconnect={(id) => {
                      const inst = instances.find((i) => i.id === id);
                      if (inst) setQrModalData({ instance: inst, qr: null });
                    }}
                    onDelete={handleDeleteInstance}
                    onRefresh={fetchTenantData}
                    onSendMessage={async (toNumber, text) => {
                      const res = await fetch('/api/messages/send', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                          instance_id: selectedInstanceForDetail.id,
                          to_number: toNumber,
                          text,
                        }),
                      });
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || 'Failed to dispatch message');
                      }
                      await fetchTenantData();
                    }}
                  />
                ) : (
                  <InstancesView
                    instances={instances}
                    subscription={subscription}
                    onConnectNew={() => setIsCreateModalOpen(true)}
                    onOpenQr={(inst) => setQrModalData({ instance: inst, qr: null })}
                    onOpenSend={(inst) => setSendModalInstance(inst)}
                    onSelectInstance={(inst) => setSelectedInstanceForDetail(inst)}
                    onDisconnect={handleDisconnect}
                    onDelete={handleDeleteInstance}
                    onRefresh={fetchTenantData}
                    isRefreshing={isRefreshing}
                  />
                )
              )}

              {currentTab === 'automations' && (
                <AutomationsView
                  automations={automations}
                  instances={instances}
                  onCreateAutomation={handleCreateAutomation}
                  onToggleAutomation={handleToggleAutomation}
                  onDeleteAutomation={handleDeleteAutomation}
                  onSimulateWebhook={handleSimulateWebhook}
                />
              )}

              {currentTab === 'logs' && (
                <MessageLogsView
                  logs={logs}
                  instances={instances}
                  onRefresh={fetchTenantData}
                  isRefreshing={isRefreshing}
                />
              )}

              {currentTab === 'messenger' && (
                <MessengerView
                  instances={instances}
                  logs={logs}
                  onMessageSent={fetchTenantData}
                />
              )}

              {currentTab === 'vps' && (
                <VpsStatusView
                  health={health}
                  onRefresh={fetchHealth}
                  isRefreshing={isCheckingHealth}
                />
              )}

              {currentTab === 'billing' && (
                <BillingView
                  subscription={subscription}
                  onUpgradePlan={handleUpgradePlan}
                />
              )}

              {currentTab === 'api-keys' && (
                <ApiKeysManagement />
              )}

              {currentTab === 'api-docs' && (
                <ApiDocsView />
              )}
            </>
          )}
        </main>
      </div>

      {/* QR Connect Modal */}
      {qrModalData && (
        <QrConnectModal
          instance={qrModalData.instance}
          initialQr={qrModalData.qr}
          onClose={() => setQrModalData(null)}
          onSuccess={(updated) => {
            setInstances((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            );
            setQrModalData(null);
            fetchTenantData();
          }}
        />
      )}

      {/* Send Message Modal */}
      {sendModalInstance && (
        <SendMessageModal
          instances={instances}
          selectedInstanceId={sendModalInstance.id}
          onClose={() => setSendModalInstance(null)}
          onMessageSent={fetchTenantData}
        />
      )}

      {/* Create Instance Modal */}
      {isCreateModalOpen && (
        <CreateInstanceModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateInstance}
        />
      )}

      {/* Supabase / Session Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialRole={authModalRole}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={async (authData) => {
          if (authData.token) {
            setStoredToken(authData.token);
          }
          await fetchTenantData();
          if (authData.user?.role === 'superadmin') {
            setAppMode('admin');
          } else {
            setAppMode('dashboard');
          }
        }}
      />
    </div>
  );
}

export default App;

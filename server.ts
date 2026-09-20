import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { evolutionApi } from './lib/evolution';
import { encryptToken, decryptToken } from './lib/encryption';
import { checkRateLimit } from './lib/rate-limit';
import { supabaseAdmin, isServerSupabaseConfigured } from './lib/supabase/server';
import {
  WhatsAppInstance,
  MessageLog,
  Automation,
  Subscription,
  UserProfile,
} from './src/types';
import { publicGatewayRouter } from './lib/public-gateway';
import QRCode from 'qrcode';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/v1', publicGatewayRouter);

// ---------------------------------------------------------------------------
// In-Memory Fallback State (when Supabase is not connected in dev/preview)
// ---------------------------------------------------------------------------
interface TenantState {
  profile: UserProfile & { status?: 'active' | 'suspended' };
  subscription: Subscription;
  instances: WhatsAppInstance[];
  messages: MessageLog[];
  automations: Automation[];
}

interface UserSession {
  token: string;
  userId: string;
  email: string;
  role: 'superadmin' | 'tenant';
  createdAt: number;
  expiresAt: number;
}

const activeSessions = new Map<string, UserSession>();

const userCredentials: Record<string, { password: string; role: 'superadmin' | 'tenant'; tenantId: string }> = {
  'baliadventours@gmail.com': { password: 'admin', role: 'superadmin', tenantId: 'superadmin-root' },
  'admin@wautomation.io': { password: 'admin', role: 'superadmin', tenantId: 'superadmin-root' },
  'admin@wapilot.io': { password: 'admin', role: 'superadmin', tenantId: 'superadmin-root' },
  'alex@balitours.com': { password: 'password', role: 'tenant', tenantId: 'tenant-demo-user-1' },
  'sarah@globalboutique.io': { password: 'password', role: 'tenant', tenantId: 'tenant-demo-user-2' },
};

let activeTenantId = 'tenant-demo-user-1';

let subscriptionPackages = [
  {
    id: 'pkg_starter',
    plan: 'starter' as const,
    name: 'Starter',
    priceMonthly: 29,
    instance_limit: 1,
    message_limit: 1000,
    description: 'Perfect for single businesses connecting one WhatsApp number.',
    features: [
      '1 Dedicated WhatsApp Line',
      '1,000 Messages per Month',
      'Keyword Auto-Replies',
      'Standard Rate Limiting (30/min)',
    ],
    isPopular: false,
  },
  {
    id: 'pkg_pro',
    plan: 'pro' as const,
    name: 'Pro Multi-Line',
    priceMonthly: 79,
    instance_limit: 3,
    message_limit: 5000,
    description: 'For growing sales teams and stores managing customer support.',
    features: [
      '3 Dedicated WhatsApp Lines',
      '5,000 Messages per Month',
      'Unlimited Keyword Automations',
      'Fast Webhook Priority Queue',
      'Multi-agent Team Access',
    ],
    isPopular: true,
  },
  {
    id: 'pkg_agency',
    plan: 'agency' as const,
    name: 'Agency Scale',
    priceMonthly: 199,
    instance_limit: 10,
    message_limit: 25000,
    description: 'For agencies running marketing automation for multiple clients.',
    features: [
      '10 Dedicated WhatsApp Lines',
      '25,000 Messages per Month',
      'Dedicated Evolution API Queue',
      'White-label Tenant Dashboards',
      'Priority VPS Resources & Support',
    ],
    isPopular: false,
  },
  {
    id: 'pkg_enterprise',
    plan: 'enterprise' as const,
    name: 'Enterprise Dedicated',
    priceMonthly: 499,
    instance_limit: 30,
    message_limit: 100000,
    description: 'Custom dedicated VPS node deployment with high-throughput Redis cluster.',
    features: [
      '30 Dedicated WhatsApp Lines',
      '100,000 Messages per Month',
      'Custom Dedicated VPS Isolation',
      'Custom Webhook Infrastructure',
      'SLA 99.9% Uptime Guarantee',
    ],
    isPopular: false,
  },
];

const mockTenants: Record<string, TenantState> = {
  'superadmin-root': {
    profile: {
      id: 'superadmin-root',
      email: 'baliadventours@gmail.com',
      role: 'superadmin',
      plan: 'enterprise',
      company_name: 'Wautomation.io Master HQ',
      status: 'active',
      created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
    },
    subscription: {
      id: 'sub_root_admin',
      user_id: 'superadmin-root',
      plan: 'enterprise',
      status: 'active',
      instance_limit: 50,
      message_limit: 1000000,
      period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
      period_end: new Date(Date.now() + 335 * 86400000).toISOString(),
    },
    instances: [
      {
        id: 'inst_bali_tours_root',
        user_id: 'superadmin-root',
        instance_name: 'bali_tours',
        status: 'connected',
        phone_number: '+62 812-4650-2939',
        connected_at: new Date().toISOString(),
        evolution_token: encryptToken('D952308E-D371-44C7-94FF-0A77E4C60CBC'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Bali Adventours Live WhatsApp',
      },
    ],
    messages: [
      {
        id: 'msg_root_01',
        instance_id: 'inst_bali_tours_root',
        instance_name: 'bali_tours',
        direction: 'in',
        to_number: '+62 812-4650-2939',
        from_number: '+61 412 345 678',
        body: 'Hello Bali Adventours! We want to book a sunrise tour for tomorrow.',
        status: 'read',
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'msg_root_02',
        instance_id: 'inst_bali_tours_root',
        instance_name: 'bali_tours',
        direction: 'out',
        to_number: '+61 412 345 678',
        from_number: '+62 812-4650-2939',
        body: 'Hello! Welcome to Bali Adventours! We have slots open for Mount Batur sunrise trek. How many guests?',
        status: 'delivered',
        created_at: new Date(Date.now() - 14 * 60000).toISOString(),
      },
    ],
    automations: [
      {
        id: 'auto_root_01',
        user_id: 'superadmin-root',
        instance_id: 'inst_bali_tours_root',
        name: 'Mount Batur Inquiry Auto-Reply',
        trigger_type: 'keyword',
        trigger_config: { keyword: 'batur', match_type: 'contains' },
        action_config: {
          reply_text:
            'Hello! Our Mount Batur Sunrise Trek is $55/person, including breakfast at the summit and hotel pickup. Reply BOOK to reserve!',
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  'tenant-demo-user-1': {
    profile: {
      id: 'tenant-demo-user-1',
      email: 'alex@balitours.com',
      role: 'tenant',
      plan: 'pro',
      company_name: 'Bali Adventours',
      status: 'active',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    subscription: {
      id: 'sub_demo_1',
      user_id: 'tenant-demo-user-1',
      plan: 'pro',
      status: 'active',
      instance_limit: 3,
      message_limit: 5000,
      period_start: new Date(Date.now() - 12 * 86400000).toISOString(),
      period_end: new Date(Date.now() + 18 * 86400000).toISOString(),
    },
    instances: [
      {
        id: 'inst_bali_tours_live',
        user_id: 'tenant-demo-user-1',
        instance_name: 'bali_tours',
        status: 'connected',
        phone_number: '+62 812-4650-2939',
        connected_at: new Date().toISOString(),
        evolution_token: encryptToken('D952308E-D371-44C7-94FF-0A77E4C60CBC'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Bali Adventours Live WhatsApp',
      },
    ],
    messages: [
      {
        id: 'msg_01',
        instance_id: 'inst_bali_tours_live',
        instance_name: 'bali_tours',
        direction: 'in',
        to_number: '+62 812-4650-2939',
        from_number: '+61 412 345 678',
        body: 'Hello! What are your tour prices for Mount Batur?',
        status: 'read',
        created_at: new Date(Date.now() - 40 * 60000).toISOString(),
      },
      {
        id: 'msg_02',
        instance_id: 'inst_bali_tours_live',
        instance_name: 'bali_tours',
        direction: 'out',
        to_number: '+61 412 345 678',
        from_number: '+62 812-4650-2939',
        body: 'Hi there! Our Mount Batur Sunrise Trek is $55/person, including breakfast and hotel transfer. Reply BOOK to reserve!',
        status: 'delivered',
        created_at: new Date(Date.now() - 39 * 60000).toISOString(),
      },
    ],
    automations: [
      {
        id: 'auto_01',
        user_id: 'tenant-demo-user-1',
        instance_id: 'inst_bali_tours_live',
        name: 'Pricing Inquiries Auto-Reply',
        trigger_type: 'keyword',
        trigger_config: { keyword: 'price', match_type: 'contains' },
        action_config: {
          reply_text:
            'Thanks for asking! Our packages start at $45. Check our catalog at https://balitours.com/pricing or reply with your dates!',
        },
        enabled: true,
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'auto_02',
        user_id: 'tenant-demo-user-1',
        instance_id: 'inst_bali_tours_live',
        name: 'Greeting / Welcome Bot',
        trigger_type: 'keyword',
        trigger_config: { keyword: 'hello', match_type: 'contains' },
        action_config: {
          reply_text:
            'Hello and welcome to Bali Adventours! How can we assist with your tropical getaway today?',
        },
        enabled: true,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  'tenant-demo-user-2': {
    profile: {
      id: 'tenant-demo-user-2',
      email: 'sarah@globalboutique.io',
      role: 'tenant',
      plan: 'starter',
      company_name: 'Global Boutique',
      status: 'active',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    },
    subscription: {
      id: 'sub_demo_2',
      user_id: 'tenant-demo-user-2',
      plan: 'starter',
      status: 'active',
      instance_limit: 1,
      message_limit: 1000,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    instances: [
      {
        id: 'inst_demo_02',
        user_id: 'tenant-demo-user-2',
        instance_name: 'tenant_demo2_store',
        status: 'connected',
        phone_number: '+1 (555) 234-5678',
        connected_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        evolution_token: encryptToken('evo_token_secret_2'),
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Boutique Store Line',
      },
    ],
    messages: [
      {
        id: 'msg_03',
        instance_id: 'inst_demo_02',
        instance_name: 'tenant_demo2_store',
        direction: 'in',
        to_number: '+1 (555) 234-5678',
        from_number: '+1 (555) 987-6543',
        body: 'Do you offer international shipping to Canada?',
        status: 'read',
        created_at: new Date(Date.now() - 120 * 60000).toISOString(),
      },
    ],
    automations: [],
  },
  'tenant-demo-user-3': {
    profile: {
      id: 'tenant-demo-user-3',
      email: 'marcus@apexrealty.com',
      role: 'tenant',
      plan: 'agency',
      company_name: 'Apex Real Estate Holdings',
      status: 'active',
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    },
    subscription: {
      id: 'sub_demo_3',
      user_id: 'tenant-demo-user-3',
      plan: 'agency',
      status: 'active',
      instance_limit: 10,
      message_limit: 25000,
      period_start: new Date(Date.now() - 20 * 86400000).toISOString(),
      period_end: new Date(Date.now() + 10 * 86400000).toISOString(),
    },
    instances: [
      {
        id: 'inst_demo_03',
        user_id: 'tenant-demo-user-3',
        instance_name: 'tenant_demo3_villa_sales',
        status: 'connected',
        phone_number: '+62 821-9988-7766',
        connected_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        evolution_token: encryptToken('evo_token_secret_3'),
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Luxury Villas Desk',
      },
      {
        id: 'inst_demo_04',
        user_id: 'tenant-demo-user-3',
        instance_name: 'tenant_demo3_rentals',
        status: 'connected',
        phone_number: '+62 822-4455-6677',
        connected_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        evolution_token: encryptToken('evo_token_secret_4'),
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Long-term Rentals Desk',
      },
    ],
    messages: [
      {
        id: 'msg_04',
        instance_id: 'inst_demo_03',
        instance_name: 'tenant_demo3_villa_sales',
        direction: 'out',
        to_number: '+61 400 123 456',
        body: 'Here is the brochure for the Canggu Cliffside Villa: https://apexrealty.com/canggu-cliff',
        status: 'delivered',
        created_at: new Date(Date.now() - 180 * 60000).toISOString(),
      },
    ],
    automations: [
      {
        id: 'auto_03',
        user_id: 'tenant-demo-user-3',
        instance_id: 'inst_demo_03',
        name: 'Villa Catalog Bot',
        trigger_type: 'keyword',
        trigger_config: { keyword: 'villa', match_type: 'contains' },
        action_config: {
          reply_text: 'Thank you for your interest in our villas! An investment agent will connect within 15 minutes.',
        },
        enabled: true,
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  'tenant-demo-user-4': {
    profile: {
      id: 'tenant-demo-user-4',
      email: 'dian@jakartalogistics.co.id',
      role: 'tenant',
      plan: 'pro',
      company_name: 'Jakarta Express Logistics',
      status: 'active',
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    },
    subscription: {
      id: 'sub_demo_4',
      user_id: 'tenant-demo-user-4',
      plan: 'pro',
      status: 'active',
      instance_limit: 3,
      message_limit: 5000,
      period_start: new Date(Date.now() - 5 * 86400000).toISOString(),
      period_end: new Date(Date.now() + 25 * 86400000).toISOString(),
    },
    instances: [
      {
        id: 'inst_demo_05',
        user_id: 'tenant-demo-user-4',
        instance_name: 'tenant_demo4_fleet',
        status: 'connecting',
        phone_number: null,
        connected_at: null,
        evolution_token: encryptToken('evo_token_secret_5'),
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        profile_name: 'Dispatch Center #2',
      },
    ],
    messages: [],
    automations: [],
  },
};

// Pre-seed default test tokens for production simulation
const DEFAULT_DEMO_TENANT_TOKEN = 'wautomation_session_tenant_alex';
const DEFAULT_ROOT_ADMIN_TOKEN = 'wautomation_session_admin_root';
const LEGACY_DEMO_TENANT_TOKEN = 'wapilot_session_tenant_alex';
const LEGACY_ROOT_ADMIN_TOKEN = 'wapilot_session_admin_root';

[DEFAULT_DEMO_TENANT_TOKEN, LEGACY_DEMO_TENANT_TOKEN].forEach((tok) => {
  activeSessions.set(tok, {
    token: tok,
    userId: 'tenant-demo-user-1',
    email: 'alex@balitours.com',
    role: 'tenant',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * 86400000,
  });
});

[DEFAULT_ROOT_ADMIN_TOKEN, LEGACY_ROOT_ADMIN_TOKEN].forEach((tok) => {
  activeSessions.set(tok, {
    token: tok,
    userId: 'superadmin-root',
    email: 'baliadventours@gmail.com',
    role: 'superadmin',
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * 86400000,
  });
});

function getAuthUser(req: express.Request): { profile: UserProfile; subscription: Subscription; tenantState: TenantState } | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : (req.headers['x-auth-token'] as string);

  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  // Superadmin impersonation support
  const impersonateId = req.headers['x-impersonate-tenant'] as string;
  if (session.role === 'superadmin' && impersonateId && mockTenants[impersonateId]) {
    const target = mockTenants[impersonateId];
    return { profile: target.profile, subscription: target.subscription, tenantState: target };
  }

  const tenant = mockTenants[session.userId];
  if (tenant) {
    return { profile: tenant.profile, subscription: tenant.subscription, tenantState: tenant };
  }
  return null;
}

function getActiveTenant(req?: express.Request): TenantState {
  if (req) {
    const auth = getAuthUser(req);
    if (auth) return auth.tenantState;
  }
  if (!mockTenants[activeTenantId]) {
    activeTenantId = 'tenant-demo-user-1';
  }
  return mockTenants[activeTenantId];
}

// ---------------------------------------------------------------------------
// REST API ROUTES
// ---------------------------------------------------------------------------

// 1. System Health & Evolution API VPS Connectivity
app.get('/api/health', async (req, res) => {
  const isEvoConfigured = evolutionApi.isConfigured();
  let isEvoConnected = false;
  let evoMessage = 'Evolution API not configured. Running in high-fidelity preview mode.';
  let evoVersion: string | undefined;

  if (isEvoConfigured) {
    const health = await evolutionApi.checkHealth();
    isEvoConnected = health.ok;
    evoMessage = health.message;
    evoVersion = health.version;
  }

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

  res.json({
    status: isEvoConnected ? 'healthy' : 'configured',
    evolutionApiConfigured: isEvoConfigured,
    evolutionApiConnected: isEvoConnected,
    evolutionApiUrl: evolutionApi.getBaseUrl() || 'http://your-vps-ip:8080',
    evolutionVersion: evoVersion,
    supabaseConfigured: isServerSupabaseConfigured,
    webhookUrl: `${appUrl.replace(/\/$/, '')}/api/webhook/evolution`,
    message: evoMessage,
    activeTenantId,
  });
});

// Update VPS Evolution API Configuration dynamically
app.post('/api/vps/config', async (req, res) => {
  const { baseUrl, apiKey } = req.body;
  if (!baseUrl) {
    return res.status(400).json({ error: 'baseUrl is required' });
  }

  const key = apiKey || '429683C4C977415CAAFCCE10F7D57E11';
  evolutionApi.setConfig(baseUrl, key);
  const health = await evolutionApi.checkHealth();

  res.json({
    success: health.ok,
    connected: health.ok,
    message: health.message,
    version: health.version,
    baseUrl: evolutionApi.getBaseUrl(),
  });
});

// 2. Auth & Current Tenant Profile
app.get('/api/auth/me', async (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({
      authenticated: false,
      user: null,
      message: 'Unauthorized. Sign in required.',
    });
  }

  const tenant = auth.tenantState;
  const instancesCount = tenant.instances.length;
  const messagesCount = tenant.messages.filter((m) => m.direction === 'out').length;

  res.json({
    authenticated: true,
    user: auth.profile,
    subscription: {
      ...auth.subscription,
      current_usage: {
        instances_count: instancesCount,
        messages_sent_this_period: messagesCount,
      },
    },
    availableTenants: auth.profile.role === 'superadmin'
      ? Object.keys(mockTenants).map((id) => ({
          id,
          email: mockTenants[id].profile.email,
          company: mockTenants[id].profile.company_name,
          plan: mockTenants[id].profile.plan,
        }))
      : [],
  });
});

// Switch active tenant in UI (Superadmin only)
app.post('/api/auth/switch-tenant', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth || auth.profile.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin privileges required to switch tenant workspaces.' });
  }

  const { tenantId } = req.body;
  if (mockTenants[tenantId]) {
    activeTenantId = tenantId;
    res.json({ success: true, activeTenantId });
  } else {
    res.status(404).json({ error: 'Tenant not found' });
  }
});

// Download pre-compiled production bundle to VPS directly
app.get('/api/vps/update-bundle', (req, res) => {
  const bundlePath = path.join(process.cwd(), 'update-bundle.tar.gz');
  res.sendFile(bundlePath);
});

// 3. WhatsApp Instances: List
app.get('/api/instances', async (req, res) => {
  const tenant = getActiveTenant();

  // If connected to Evolution API, refresh status for each instance
  if (evolutionApi.isConfigured()) {
    for (const inst of tenant.instances) {
      const state = await evolutionApi.getConnectionState(inst.instance_name);
      if (state.state === 'open' && inst.status !== 'connected') {
        inst.status = 'connected';
        if (state.phone) inst.phone_number = state.phone;
        inst.connected_at = inst.connected_at || new Date().toISOString();
      } else if (state.state === 'close' && inst.status === 'connected') {
        inst.status = 'disconnected';
      }
    }
  }

  res.json({ instances: tenant.instances });
});

// Sync all instances directly from VPS Evolution API
app.post('/api/instances/sync-vps', async (req, res) => {
  try {
    const tenant = getActiveTenant(req);
    const evoResult = await evolutionApi.fetchInstances();

    if (!evoResult.success) {
      return res.status(400).json({
        error: evoResult.error || 'Failed to fetch instances from Evolution API',
      });
    }

    const liveList = evoResult.instances || [];
    let added = 0;
    let updated = 0;

    for (const evoInst of liveList) {
      const name = evoInst.instance?.instanceName || evoInst.instanceName || evoInst.name;
      if (!name) continue;

      const connectionStatus = evoInst.instance?.status || evoInst.status || evoInst.connectionStatus;
      const isConnected = connectionStatus === 'open' || connectionStatus === 'connected';
      const owner = evoInst.instance?.owner || evoInst.owner;

      const existing = tenant.instances.find((i) => i.instance_name === name);
      if (existing) {
        existing.status = isConnected ? 'connected' : existing.status;
        if (owner) existing.phone_number = owner;
        updated++;
      } else {
        const newInst: WhatsAppInstance = {
          id: evoInst.instance?.instanceId || `inst_vps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          user_id: tenant.profile.id,
          instance_name: name,
          status: isConnected ? 'connected' : 'connecting',
          phone_number: owner || null,
          connected_at: isConnected ? new Date().toISOString() : null,
          evolution_token: encryptToken(evoInst.hash?.apikey || 'evo_token_vps'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile_name: `${name} (VPS Live)`,
        };
        tenant.instances.unshift(newInst);
        added++;
      }
    }

    res.json({
      success: true,
      added,
      updated,
      instances: tenant.instances,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to reliably find an instance or recover it from Evolution API or memory
async function findOrRecoverInstance(req: any, idOrName: string): Promise<WhatsAppInstance | null> {
  const tenant = getActiveTenant(req);
  let instance = tenant.instances.find((i) => i.id === idOrName || i.instance_name === idOrName);

  if (instance) return instance;

  // 1. Search all other tenants
  for (const t of Object.values(mockTenants)) {
    const found = t.instances.find((i) => i.id === idOrName || i.instance_name === idOrName);
    if (found) {
      if (!tenant.instances.some((x) => x.id === found.id)) {
        tenant.instances.unshift(found);
      }
      return found;
    }
  }

  // 2. Query VPS Evolution API to recover instance created prior to server restart
  try {
    const evoList = await evolutionApi.fetchInstances();
    if (evoList.success && evoList.instances) {
      const match = evoList.instances.find((ei: any) => {
        const name = ei.instance?.instanceName || ei.instanceName || ei.name;
        const id = ei.instance?.instanceId;
        return name === idOrName || id === idOrName || (typeof idOrName === 'string' && idOrName.includes(name));
      });
      if (match) {
        const name = match.instance?.instanceName || match.instanceName || match.name || idOrName;
        const state = match.instance?.state || match.state;
        const restored: WhatsAppInstance = {
          id: idOrName,
          user_id: tenant.profile.id,
          instance_name: name,
          status: state === 'open' ? 'connected' : 'connecting',
          phone_number: match.instance?.owner || match.owner || null,
          connected_at: state === 'open' ? new Date().toISOString() : null,
          evolution_token: encryptToken('evo_token_recovered'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          profile_name: name,
        };
        tenant.instances.unshift(restored);
        return restored;
      }
    }
  } catch (_) {}

  // 3. If ID starts with inst_ or is a line name, recover as active instance so polling never 404s
  if (idOrName && (idOrName.startsWith('inst_') || idOrName.startsWith('line_') || idOrName.includes('_'))) {
    const fallbackName = idOrName.startsWith('inst_') ? `line_${idOrName.slice(-6)}` : idOrName;
    const fallback: WhatsAppInstance = {
      id: idOrName,
      user_id: tenant.profile.id,
      instance_name: fallbackName,
      status: 'connecting',
      phone_number: null,
      connected_at: null,
      evolution_token: encryptToken('evo_token_auto'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile_name: 'WhatsApp Line',
    };
    tenant.instances.unshift(fallback);
    return fallback;
  }

  return null;
}

// 4. WhatsApp Instances: Create new instance & generate QR
app.post('/api/instances', async (req, res) => {
  try {
    const tenant = getActiveTenant(req);
    const limit = tenant.subscription.instance_limit;

    if (tenant.instances.length >= limit) {
      return res.status(403).json({
        error: `Instance limit reached (${tenant.instances.length}/${limit}). Upgrade to Pro or Agency to connect more WhatsApp numbers.`,
      });
    }

    const { friendly_name } = req.body;
    const cleanLabel = (friendly_name || 'Line')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12);
    const instanceIndex = tenant.instances.length + 1;
    const instanceName = `${cleanLabel || 'line'}_${Date.now().toString().slice(-4)}`;
    const instanceToken = crypto.randomBytes(24).toString('hex');
    const encryptedToken = encryptToken(instanceToken);

    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/webhook/evolution`;

    console.log(`[API] Creating instance: ${instanceName} (${friendly_name})`);

    let qrResult: any = null;

    // 1. Try real Evolution API VPS if reachable
    const evoHealth = await evolutionApi.checkHealth().catch(() => ({ ok: false }));
    if (evoHealth.ok) {
      try {
        const evoResult = await evolutionApi.createInstance({
          instanceName,
          token: instanceToken,
          webhookUrl,
        });
        if (evoResult.qr?.base64 || evoResult.qr?.code) {
          qrResult = evoResult.qr;
        } else {
          // Poll up to 3 times to get the authentic WhatsApp QR from Baileys
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise((r) => setTimeout(r, 700));
            const qr = await evolutionApi.getConnectQr(instanceName);
            if (qr.success && (qr.qr?.base64 || qr.qr?.code)) {
              qrResult = qr.qr;
              break;
            }
          }
        }
      } catch (evoErr: any) {
        console.warn(`[API] Evolution API call failed, generating fallback QR:`, evoErr.message);
      }
    }

    // 2. Only if VPS is completely offline / not configured, generate a simulated preview QR
    if (!qrResult || !qrResult.base64) {
      if (!evoHealth.ok) {
        const mockRawQr = `2@${Buffer.from(JSON.stringify({ instance: instanceName, t: Date.now() })).toString('base64')},${crypto.randomBytes(32).toString('base64')}`;
        const base64DataUrl = await QRCode.toDataURL(mockRawQr, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 320,
          color: { dark: '#022c22', light: '#ffffff' },
        });
        qrResult = {
          code: mockRawQr,
          base64: base64DataUrl,
          pairingCode: `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          count: 1,
        };
      }
    }

    // 3. Save instance in tenant store
    const newInstance: WhatsAppInstance = {
      id: `inst_${Date.now()}`,
      user_id: tenant.profile.id,
      instance_name: instanceName,
      status: 'connecting',
      phone_number: null,
      connected_at: null,
      evolution_token: encryptedToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile_name: friendly_name || `WhatsApp Line ${instanceIndex}`,
    };

    tenant.instances.unshift(newInstance);

    res.json({
      instance: newInstance,
      qr: qrResult,
      qr_code: qrResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. WhatsApp Instances: Get fresh QR code, pairing code or connection state
app.get('/api/instances/:id/connect', async (req, res) => {
  try {
    const instance = await findOrRecoverInstance(req, req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const phoneNumber = (req.query.number as string) || (req.query.phone as string);
    let qrData: any = null;
    let state = 'connecting';
    let phone = instance.phone_number;

    const evoHealth = await evolutionApi.checkHealth().catch(() => ({ ok: false }));
    if (evoHealth.ok) {
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const qrResult = await evolutionApi.getConnectQr(instance.instance_name, phoneNumber);
          const stateResult = await evolutionApi.getConnectionState(instance.instance_name);
          state = stateResult.state || qrResult.state || state;
          phone = stateResult.phone || qrResult.phone || phone;

          if (qrResult.qr?.base64 || qrResult.qr?.code) {
            qrData = qrResult.qr;
            break;
          }
          if (state === 'open') break;
          await new Promise((r) => setTimeout(r, 600));
        }
      } catch (err: any) {
        console.warn(`[API] Evolution API getConnectQr failed:`, err.message);
      }
    }

    if ((!qrData || !qrData.base64) && !evoHealth.ok) {
      const mockRawQr = `2@${Buffer.from(JSON.stringify({ instance: instance.instance_name, t: Date.now() })).toString('base64')},${crypto.randomBytes(32).toString('base64')}`;
      const base64DataUrl = await QRCode.toDataURL(mockRawQr, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#022c22', light: '#ffffff' },
      });
      qrData = {
        code: mockRawQr,
        base64: base64DataUrl,
        pairingCode: `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        count: 1,
      };
    }

    if (state === 'open' && instance.status !== 'connected') {
      instance.status = 'connected';
      instance.phone_number = phone || instance.phone_number;
      instance.connected_at = new Date().toISOString();
    }

    res.json({
      qr: qrData,
      state,
      phone: instance.phone_number,
      status: instance.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5a. Lightweight status poll (does NOT regenerate or invalidate QR tokens)
app.get('/api/instances/:id/status', async (req, res) => {
  try {
    const instance = await findOrRecoverInstance(req, req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const evoHealth = await evolutionApi.checkHealth().catch(() => ({ ok: false }));
    if (evoHealth.ok) {
      try {
        const stateResult = await evolutionApi.getConnectionState(instance.instance_name);
        if (stateResult.state === 'open' && instance.status !== 'connected') {
          instance.status = 'connected';
          instance.phone_number = stateResult.phone || instance.phone_number;
          instance.connected_at = new Date().toISOString();
        } else if (stateResult.state === 'close' && instance.status === 'connected') {
          instance.status = 'disconnected';
        }
      } catch (_) {}
    }

    res.json({
      status: instance.status,
      state: instance.status === 'connected' ? 'open' : 'connecting',
      phone: instance.phone_number,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5b. Request WhatsApp 8-digit Pairing Code via Phone Number
app.post('/api/instances/:id/pairing-code', async (req, res) => {
  try {
    const instance = await findOrRecoverInstance(req, req.params.id);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required to request pairing code' });
    }

    let pairingCode: string | null = null;
    let qr: any = null;

    const evoHealth = await evolutionApi.checkHealth().catch(() => ({ ok: false }));
    if (evoHealth.ok) {
      try {
        const result = await evolutionApi.getConnectQr(instance.instance_name, phone_number);
        if (result.success) {
          const rawCandidate = result.qr?.pairingCode;
          const isRealCode = rawCandidate && String(rawCandidate).length <= 12 && !String(rawCandidate).includes("/") && !String(rawCandidate).includes("@") && !String(rawCandidate).includes("=");
          pairingCode = isRealCode ? String(rawCandidate).trim() : null;
          qr = result.qr;
        }
      } catch (_) {}
    }

    if (!pairingCode && !evoHealth.ok) {
      // Clean 8-character pairing code: e.g. 8492-3810
      pairingCode = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    res.json({
      success: Boolean(pairingCode || qr),
      pairingCode,
      qr,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Simulate scan (for interactive testing when physical QR isn't paired to VPS yet)
app.post('/api/instances/:id/simulate-scan', async (req, res) => {
  const instance = await findOrRecoverInstance(req, req.params.id);

  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const { phone_number } = req.body;
  instance.status = 'connected';
  instance.phone_number = phone_number || `+62 812-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
  instance.connected_at = new Date().toISOString();

  res.json({ success: true, instance });
});

// 7. Disconnect / Reconnect / Delete Instance
app.post('/api/instances/:id/disconnect', async (req, res) => {
  const instance = await findOrRecoverInstance(req, req.params.id);

  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  await evolutionApi.logoutInstance(instance.instance_name);
  instance.status = 'disconnected';
  res.json({ success: true, instance });
});

app.delete('/api/instances/:id', async (req, res) => {
  const tenant = getActiveTenant();
  const index = tenant.instances.findIndex((i) => i.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const instance = tenant.instances[index];
  await evolutionApi.deleteInstance(instance.instance_name);

  // Remove instance and cascade messages/automations
  tenant.instances.splice(index, 1);
  tenant.messages = tenant.messages.filter((m) => m.instance_id !== instance.id);
  tenant.automations = tenant.automations.filter((a) => a.instance_id !== instance.id);

  res.json({ success: true, message: 'Instance deleted' });
});

// 8. Send Test Message (with rate limiting & usage enforcement)
app.post('/api/messages/send', async (req, res) => {
  try {
    const tenant = getActiveTenant();
    const { instance_id, to_number, text } = req.body;

    if (!instance_id || !to_number || !text) {
      return res.status(400).json({ error: 'Missing instance_id, to_number, or text' });
    }

    // Rate Limit (30/min per tenant)
    const rate = checkRateLimit(`tenant:${tenant.profile.id}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({
        error: `Rate limit hit. Please wait ${Math.ceil(rate.resetMs / 1000)}s before dispatching more messages.`,
      });
    }

    // Check message quota
    const sentCount = tenant.messages.filter((m) => m.direction === 'out').length;
    if (sentCount >= tenant.subscription.message_limit) {
      return res.status(403).json({
        error: `Monthly message quota reached (${sentCount}/${tenant.subscription.message_limit}). Please upgrade your plan.`,
      });
    }

    // Verify instance ownership
    const instance = tenant.instances.find((i) => i.id === instance_id);
    if (!instance) {
      return res.status(403).json({ error: 'Unauthorized instance' });
    }

    if (instance.status !== 'connected') {
      return res.status(400).json({
        error: `Instance is currently "${instance.status}". Please scan QR code to connect first.`,
      });
    }

    const decryptedToken = instance.evolution_token ? decryptToken(instance.evolution_token) : undefined;

    // Send via Evolution API
    const sendResult = await evolutionApi.sendTextMessage(
      instance.instance_name,
      to_number,
      text,
      decryptedToken
    );

    const logEntry: MessageLog = {
      id: `msg_${Date.now()}`,
      instance_id: instance.id,
      instance_name: instance.instance_name,
      direction: 'out',
      to_number,
      from_number: instance.phone_number || undefined,
      body: text,
      status: sendResult.success ? 'sent' : 'failed',
      created_at: new Date().toISOString(),
    };

    tenant.messages.unshift(logEntry);

    if (!sendResult.success) {
      // In preview / simulation mode, record as sent with note so UI testing is frictionless
      const evoHealth = await evolutionApi.checkHealth().catch(() => ({ ok: false }));
      if (!evoHealth.ok) {
        logEntry.status = 'sent';
        return res.json({
          success: true,
          log: logEntry,
          simulated: true,
          message: 'Message dispatched in simulation mode (VPS Evolution API offline).',
          remainingRate: rate.remaining,
        });
      }

      return res.status(400).json({
        error: sendResult.error || 'Failed to dispatch via Evolution API',
        log: logEntry,
      });
    }

    res.json({
      success: true,
      log: logEntry,
      remainingRate: rate.remaining,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Message Logs
app.get('/api/messages/logs', (req, res) => {
  const tenant = getActiveTenant();
  const { instance_id } = req.query;

  let logs = tenant.messages;
  if (instance_id) {
    logs = logs.filter((m) => m.instance_id === instance_id);
  }

  res.json({ logs });
});

// 10. Automations: List, Create, Toggle, Delete
app.get('/api/automations', (req, res) => {
  const tenant = getActiveTenant();
  res.json({ automations: tenant.automations });
});

app.post('/api/automations', (req, res) => {
  const tenant = getActiveTenant();
  const { instance_id, name, trigger_type, trigger_config, action_config } = req.body;

  if (!instance_id || !name || !trigger_type) {
    return res.status(400).json({ error: 'Missing required automation parameters' });
  }

  const newAuto: Automation = {
    id: `auto_${Date.now()}`,
    user_id: tenant.profile.id,
    instance_id,
    name,
    trigger_type: trigger_type || 'keyword',
    trigger_config: trigger_config || { keyword: '', match_type: 'contains' },
    action_config: action_config || { reply_text: '' },
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  tenant.automations.unshift(newAuto);
  res.json({ success: true, automation: newAuto });
});

app.patch('/api/automations/:id/toggle', (req, res) => {
  const tenant = getActiveTenant();
  const auto = tenant.automations.find((a) => a.id === req.params.id);

  if (!auto) {
    return res.status(404).json({ error: 'Automation not found' });
  }

  auto.enabled = !auto.enabled;
  auto.updated_at = new Date().toISOString();
  res.json({ success: true, automation: auto });
});

app.delete('/api/automations/:id', (req, res) => {
  const tenant = getActiveTenant();
  const index = tenant.automations.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Automation not found' });
  }

  tenant.automations.splice(index, 1);
  res.json({ success: true });
});

// 11. Webhook Endpoint: Registered in Evolution API
app.post('/api/webhook/evolution', async (req, res) => {
  try {
    const payload = req.body || {};
    const event = payload.event || payload.type;
    const instanceName = payload.instance || payload.instanceName;

    console.log(`[Evolution Webhook] Event: ${event}, Instance: ${instanceName}`);

    // Locate tenant instance across our tenants
    let targetTenant: TenantState | null = null;
    let targetInstance: WhatsAppInstance | null = null;

    for (const t of Object.values(mockTenants)) {
      const inst = t.instances.find((i) => i.instance_name === instanceName);
      if (inst) {
        targetTenant = t;
        targetInstance = inst;
        break;
      }
    }

    if (!targetInstance || !targetTenant) {
      return res.status(200).json({ message: 'Instance not found or unmanaged' });
    }

    // 1. Connection Update
    if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
      const state = payload.data?.state || payload.state;
      const ownerJid = payload.data?.owner || payload.owner;
      const phone = ownerJid ? ownerJid.split('@')[0] : targetInstance.phone_number;

      if (state === 'open') {
        targetInstance.status = 'connected';
        targetInstance.phone_number = phone;
        targetInstance.connected_at = new Date().toISOString();
      } else if (state === 'close') {
        targetInstance.status = 'disconnected';
      }

      return res.json({ received: true });
    }

    // 2. Incoming Messages & Keyword Automation
    if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
      const data = payload.data;
      const messageObj = data?.message || data?.[0]?.message;
      const key = data?.key || data?.[0]?.key;

      if (key?.fromMe) {
        return res.json({ received: true, ignored: 'from_me' });
      }

      const remoteJid = key?.remoteJid || '';
      const fromNumber = remoteJid.replace(/@s\.whatsapp\.net|@g\.us/, '');
      const text =
        messageObj?.conversation ||
        messageObj?.extendedTextMessage?.text ||
        messageObj?.imageMessage?.caption ||
        '';

      if (!text) {
        return res.json({ received: true, note: 'non_text' });
      }

      // Log inbound message
      const inLog: MessageLog = {
        id: `msg_${Date.now()}`,
        instance_id: targetInstance.id,
        instance_name: targetInstance.instance_name,
        direction: 'in',
        to_number: targetInstance.phone_number || 'me',
        from_number: fromNumber,
        body: text,
        status: 'delivered',
        created_at: new Date().toISOString(),
      };
      targetTenant.messages.unshift(inLog);

      // Check automations
      const activeAutomations = targetTenant.automations.filter(
        (a) => a.instance_id === targetInstance!.id && a.enabled && a.trigger_type === 'keyword'
      );

      const normalizedMsg = text.trim().toLowerCase();
      for (const auto of activeAutomations) {
        const config = auto.trigger_config as any;
        const kw = (config?.keyword || '').trim().toLowerCase();
        const matchType = config?.match_type || 'contains';

        let matches = false;
        if (matchType === 'exact') matches = normalizedMsg === kw;
        else if (matchType === 'starts_with') matches = normalizedMsg.startsWith(kw);
        else matches = normalizedMsg.includes(kw);

        if (matches && auto.action_config?.reply_text) {
          const replyText = auto.action_config.reply_text;
          const decryptedToken = targetInstance.evolution_token
            ? decryptToken(targetInstance.evolution_token)
            : undefined;

          // Dispatch reply
          const sendRes = await evolutionApi.sendTextMessage(
            targetInstance.instance_name,
            fromNumber,
            replyText,
            decryptedToken
          );

          // Log outbound reply
          const outLog: MessageLog = {
            id: `msg_${Date.now() + 1}`,
            instance_id: targetInstance.id,
            instance_name: targetInstance.instance_name,
            direction: 'out',
            to_number: fromNumber,
            from_number: targetInstance.phone_number || undefined,
            body: replyText,
            status: sendRes.success ? 'sent' : 'failed',
            created_at: new Date().toISOString(),
          };
          targetTenant.messages.unshift(outLog);

          break; // Fire single matching automation
        }
      }

      return res.json({ received: true, processed: true });
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('[Webhook error]', err);
    res.status(500).json({ error: err.message });
  }
});

// 12. Simulate Incoming Message (Test Automation Loop in Preview!)
app.post('/api/instances/:id/simulate-incoming', async (req, res) => {
  const tenant = getActiveTenant();
  const instance = tenant.instances.find((i) => i.id === req.params.id);

  if (!instance) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const { from_number = '+1 (555) 987-6543', text = 'Can you give me price info?' } = req.body;

  // Synthesize webhook payload
  const simulatedPayload = {
    event: 'MESSAGES_UPSERT',
    instance: instance.instance_name,
    data: {
      key: {
        remoteJid: `${from_number.replace(/\D/g, '')}@s.whatsapp.net`,
        fromMe: false,
      },
      message: {
        conversation: text,
      },
    },
  };

  // Dispatch internally through webhook handler
  const inLog: MessageLog = {
    id: `msg_${Date.now()}`,
    instance_id: instance.id,
    instance_name: instance.instance_name,
    direction: 'in',
    to_number: instance.phone_number || 'me',
    from_number,
    body: text,
    status: 'delivered',
    created_at: new Date().toISOString(),
  };
  tenant.messages.unshift(inLog);

  // Evaluate automations
  const activeAutomations = tenant.automations.filter(
    (a) => a.instance_id === instance.id && a.enabled && a.trigger_type === 'keyword'
  );

  let triggeredAutomation: Automation | null = null;
  let replyText = '';
  const normalizedMsg = text.trim().toLowerCase();

  for (const auto of activeAutomations) {
    const config = auto.trigger_config as any;
    const kw = (config?.keyword || '').trim().toLowerCase();
    const matchType = config?.match_type || 'contains';

    let matches = false;
    if (matchType === 'exact') matches = normalizedMsg === kw;
    else if (matchType === 'starts_with') matches = normalizedMsg.startsWith(kw);
    else matches = normalizedMsg.includes(kw);

    if (matches && auto.action_config?.reply_text) {
      triggeredAutomation = auto;
      replyText = auto.action_config.reply_text;

      const outLog: MessageLog = {
        id: `msg_${Date.now() + 1}`,
        instance_id: instance.id,
        instance_name: instance.instance_name,
        direction: 'out',
        to_number: fromNumberClean(from_number),
        from_number: instance.phone_number || undefined,
        body: replyText,
        status: 'sent',
        created_at: new Date(Date.now() + 800).toISOString(),
      };
      tenant.messages.unshift(outLog);
      break;
    }
  }

  res.json({
    success: true,
    inbound: inLog,
    triggeredAutomation: triggeredAutomation ? triggeredAutomation.name : null,
    autoReplied: Boolean(replyText),
    replyText,
  });
});

function fromNumberClean(num: string) {
  return num;
}

// 13. Plan Upgrade (Stripe simulation/stub)
app.post('/api/billing/upgrade', (req, res) => {
  const tenant = getActiveTenant();
  const { plan } = req.body;

  const pkg = subscriptionPackages.find((p) => p.plan === plan);
  if (!pkg && !['starter', 'pro', 'agency', 'enterprise'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const instLimit = pkg ? pkg.instance_limit : plan === 'starter' ? 1 : plan === 'pro' ? 3 : 10;
  const msgLimit = pkg ? pkg.message_limit : plan === 'starter' ? 1000 : plan === 'pro' ? 5000 : 25000;

  tenant.profile.plan = plan;
  tenant.subscription.plan = plan;
  tenant.subscription.instance_limit = instLimit;
  tenant.subscription.message_limit = msgLimit;

  res.json({
    success: true,
    profile: tenant.profile,
    subscription: tenant.subscription,
  });
});

// ---------------------------------------------------------------------------
// 14. Registration, Login & Logout (Production Session Management)
// ---------------------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { email, password, company_name, plan = 'starter' } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const lowerEmail = email.toLowerCase().trim();

  // Check if tenant already exists
  const existingKey = Object.keys(mockTenants).find((k) => mockTenants[k].profile.email.toLowerCase() === lowerEmail);
  if (existingKey) {
    const tenant = mockTenants[existingKey];
    const token = `wautomation_session_${crypto.randomBytes(20).toString('hex')}`;
    activeSessions.set(token, {
      token,
      userId: tenant.profile.id,
      email: tenant.profile.email,
      role: tenant.profile.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 86400000,
    });

    return res.json({
      success: true,
      token,
      message: 'Logged in to existing account',
      user: tenant.profile,
      subscription: tenant.subscription,
    });
  }

  // Create new tenant
  const newId = `tenant_${Date.now()}`;
  const selectedPkg = subscriptionPackages.find((p) => p.plan === plan) || subscriptionPackages[0];

  const newTenant: TenantState = {
    profile: {
      id: newId,
      email: lowerEmail,
      role: 'tenant',
      company_name: company_name || email.split('@')[0],
      plan: selectedPkg.plan,
      status: 'active',
      created_at: new Date().toISOString(),
    },
    subscription: {
      id: `sub_${newId}`,
      user_id: newId,
      plan: selectedPkg.plan,
      status: 'active',
      instance_limit: selectedPkg.instance_limit,
      message_limit: selectedPkg.message_limit,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    instances: [],
    messages: [],
    automations: [],
  };

  mockTenants[newId] = newTenant;
  if (password) {
    userCredentials[lowerEmail] = { password, role: 'tenant', tenantId: newId };
  }

  const token = `wautomation_session_${crypto.randomBytes(20).toString('hex')}`;
  activeSessions.set(token, {
    token,
    userId: newId,
    email: lowerEmail,
    role: 'tenant',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 86400000,
  });

  res.status(201).json({
    success: true,
    token,
    user: newTenant.profile,
    subscription: newTenant.subscription,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const lowerEmail = email.toLowerCase().trim();
  const existingKey = Object.keys(mockTenants).find((k) => mockTenants[k].profile.email.toLowerCase() === lowerEmail);

  if (existingKey) {
    const tenant = mockTenants[existingKey];

    // Validate password if credentials exist
    const cred = userCredentials[lowerEmail];
    if (cred && password && cred.password !== password) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    const token = `wautomation_session_${crypto.randomBytes(20).toString('hex')}`;
    activeSessions.set(token, {
      token,
      userId: tenant.profile.id,
      email: tenant.profile.email,
      role: tenant.profile.role,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 86400000,
    });

    return res.json({
      success: true,
      token,
      user: tenant.profile,
      subscription: tenant.subscription,
    });
  }

  return res.status(404).json({
    error: 'No account found with this email. Please click "Create an Account" to register.',
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-auth-token'] as string);
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

function requireSuperadmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Authentication required. Please sign in as Superadmin.' });
  }
  if (auth.profile.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied: Master Superadmin privileges required.' });
  }
  next();
}

// ---------------------------------------------------------------------------
// 15. Master Admin / Superadmin Routes (Protected by Superadmin Role)
// ---------------------------------------------------------------------------
app.get('/api/admin/overview', requireSuperadmin, (req, res) => {
  const tenantKeys = Object.keys(mockTenants);
  const tenantsList = tenantKeys.map((key) => {
    const t = mockTenants[key];
    return {
      id: t.profile.id,
      email: t.profile.email,
      company_name: t.profile.company_name,
      plan: t.profile.plan,
      status: t.profile.status || 'active',
      created_at: t.profile.created_at,
      instance_limit: t.subscription.instance_limit,
      message_limit: t.subscription.message_limit,
      connected_instances_count: t.instances.filter((i) => i.status === 'connected').length,
      total_instances_count: t.instances.length,
      total_messages_count: t.messages.length,
      subscription_status: t.subscription.status,
    };
  });

  // Calculate platform-wide totals
  const allInstances: Array<WhatsAppInstance & { tenantEmail: string; tenantCompany?: string }> = [];
  let totalMessagesSent = 0;
  let activeTenantsCount = 0;
  let connectedInstancesCount = 0;

  for (const key of tenantKeys) {
    const t = mockTenants[key];
    if (t.profile.status !== 'suspended') activeTenantsCount++;
    totalMessagesSent += t.messages.length;

    for (const inst of t.instances) {
      if (inst.status === 'connected') connectedInstancesCount++;
      allInstances.push({
        ...inst,
        tenantEmail: t.profile.email,
        tenantCompany: t.profile.company_name,
      });
    }
  }

  // Monthly Recurring Revenue estimate based on active tiers
  const tierPrices: Record<string, number> = {
    starter: 29,
    pro: 79,
    agency: 199,
    enterprise: 499,
  };

  const mrr = tenantKeys.reduce((acc, k) => {
    const plan = mockTenants[k].profile.plan;
    return acc + (tierPrices[plan] || 29);
  }, 0);

  // Add active subscriber count to each package
  const packagesWithStats = subscriptionPackages.map((pkg) => {
    const count = tenantKeys.filter((k) => mockTenants[k].profile.plan === pkg.plan).length;
    return {
      ...pkg,
      activeSubscriberCount: count,
    };
  });

  res.json({
    stats: {
      totalTenants: tenantKeys.length,
      activeTenants: activeTenantsCount,
      totalInstances: allInstances.length,
      connectedInstances: connectedInstancesCount,
      totalMessagesSent,
      monthlyRecurringRevenue: mrr,
    },
    tenants: tenantsList,
    packages: packagesWithStats,
    instances: allInstances,
  });
});

// Update a tenant's plan or quotas
app.post('/api/admin/tenants/:id/plan', requireSuperadmin, (req, res) => {
  const { id } = req.params;
  const { plan, instance_limit, message_limit } = req.body;

  const tenant = mockTenants[id];
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  if (plan) {
    tenant.profile.plan = plan;
    tenant.subscription.plan = plan;
  }
  if (typeof instance_limit === 'number') {
    tenant.subscription.instance_limit = instance_limit;
  }
  if (typeof message_limit === 'number') {
    tenant.subscription.message_limit = message_limit;
  }

  res.json({
    success: true,
    tenant: {
      id: tenant.profile.id,
      email: tenant.profile.email,
      plan: tenant.profile.plan,
      instance_limit: tenant.subscription.instance_limit,
      message_limit: tenant.subscription.message_limit,
    },
  });
});

// Suspend or reinstate a tenant
app.post('/api/admin/tenants/:id/status', requireSuperadmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const tenant = mockTenants[id];
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  tenant.profile.status = status === 'suspended' ? 'suspended' : 'active';
  res.json({ success: true, status: tenant.profile.status });
});

// Create or update subscription packages
app.post('/api/admin/packages', requireSuperadmin, (req, res) => {
  const { id, plan, name, priceMonthly, instance_limit, message_limit, description, features } = req.body;

  if (!plan || !name || typeof priceMonthly !== 'number') {
    return res.status(400).json({ error: 'Plan name, price, and tier key are required.' });
  }

  const existingIdx = subscriptionPackages.findIndex((p) => p.id === id || p.plan === plan);
  if (existingIdx >= 0) {
    subscriptionPackages[existingIdx] = {
      ...subscriptionPackages[existingIdx],
      name,
      priceMonthly,
      instance_limit: instance_limit || subscriptionPackages[existingIdx].instance_limit,
      message_limit: message_limit || subscriptionPackages[existingIdx].message_limit,
      description: description || subscriptionPackages[existingIdx].description,
      features: Array.isArray(features) ? features : subscriptionPackages[existingIdx].features,
    };
  } else {
    subscriptionPackages.push({
      id: id || `pkg_${Date.now()}`,
      plan,
      name,
      priceMonthly,
      instance_limit: instance_limit || 1,
      message_limit: message_limit || 1000,
      description: description || '',
      features: Array.isArray(features) ? features : [],
      isPopular: false,
    });
  }

  res.json({ success: true, packages: subscriptionPackages });
});

// Delete a subscription package
app.delete('/api/admin/packages/:id', requireSuperadmin, (req, res) => {
  const { id } = req.params;
  subscriptionPackages = subscriptionPackages.filter((p) => p.id !== id);
  res.json({ success: true, packages: subscriptionPackages });
});

// Force restart an instance across the platform
app.post('/api/admin/instances/:id/reboot', requireSuperadmin, (req, res) => {
  const { id } = req.params;
  for (const key of Object.keys(mockTenants)) {
    const inst = mockTenants[key].instances.find((i) => i.id === id);
    if (inst) {
      inst.status = 'connected';
      inst.updated_at = new Date().toISOString();
      return res.json({ success: true, instance: inst });
    }
  }
  res.status(404).json({ error: 'Instance not found' });
});

// Force delete an instance across the platform
app.delete('/api/admin/instances/:id', requireSuperadmin, (req, res) => {
  const { id } = req.params;
  for (const key of Object.keys(mockTenants)) {
    const idx = mockTenants[key].instances.findIndex((i) => i.id === id);
    if (idx >= 0) {
      mockTenants[key].instances.splice(idx, 1);
      return res.json({ success: true, deleted: true });
    }
  }
  res.status(404).json({ error: 'Instance not found' });
});

// ---------------------------------------------------------------------------
// Vite Middleware / Static Server
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Wautomation.io Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

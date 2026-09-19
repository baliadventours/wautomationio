-- ============================================================================
-- Wautomation.io - Complete Production Schema & RLS Policies (Phase 2)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    current_plan VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (current_plan IN ('starter', 'pro', 'enterprise')),
    max_instances INTEGER NOT NULL DEFAULT 1,
    max_daily_messages INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tenant Members Table
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'agent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 3. Channels Table (Baileys & Cloud API Instances)
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'baileys' CHECK (provider IN ('baileys', 'cloud_api')),
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'banned')),
    phone_number VARCHAR(50),
    credentials_encrypted TEXT,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['messages:send', 'channels:read'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    sender VARCHAR(100) NOT NULL,
    recipient VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
    provider_message_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Webhook Endpoints Table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[] NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Daily Usage Table
CREATE TABLE IF NOT EXISTS public.daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    messages_received INTEGER NOT NULL DEFAULT 0,
    UNIQUE(tenant_id, date)
);

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('xendit', 'stripe')),
    provider_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper function: check tenant membership
CREATE OR REPLACE FUNCTION public.auth_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.tenant_members 
    WHERE user_id = auth.uid() 
    LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Channels RLS
CREATE POLICY "Tenant members can view their channels"
    ON public.channels FOR SELECT
    USING (tenant_id = public.auth_tenant_id());

CREATE POLICY "Tenant admins can modify their channels"
    ON public.channels FOR ALL
    USING (
        tenant_id = public.auth_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.tenant_members 
            WHERE user_id = auth.uid() 
            AND tenant_id = channels.tenant_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Messages RLS
CREATE POLICY "Tenant members can view messages"
    ON public.messages FOR SELECT
    USING (tenant_id = public.auth_tenant_id());

CREATE POLICY "Tenant members can insert messages"
    ON public.messages FOR INSERT
    WITH CHECK (tenant_id = public.auth_tenant_id());

-- API Keys RLS
CREATE POLICY "Tenant admins can manage API keys"
    ON public.api_keys FOR ALL
    USING (
        tenant_id = public.auth_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.tenant_members 
            WHERE user_id = auth.uid() 
            AND tenant_id = api_keys.tenant_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Webhook Endpoints RLS
CREATE POLICY "Tenant admins can manage webhooks"
    ON public.webhook_endpoints FOR ALL
    USING (
        tenant_id = public.auth_tenant_id() AND
        EXISTS (
            SELECT 1 FROM public.tenant_members 
            WHERE user_id = auth.uid() 
            AND tenant_id = webhook_endpoints.tenant_id 
            AND role IN ('owner', 'admin')
        )
    );

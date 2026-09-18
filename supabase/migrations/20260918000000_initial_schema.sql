-- ==============================================================================
-- WAPilot / Evolution API Multi-Tenant SaaS Initial Schema Migration
-- Migration: 20260918000000_initial_schema.sql
-- Description: Core multi-tenant tables, RLS policies, automated triggers,
--              and index optimization for WhatsApp automation SaaS.
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'agency', 'enterprise')),
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ==============================================================================
-- 2. SUBSCRIPTIONS TABLE (Usage Limits & Plan Enforcement)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'agency', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    instance_limit INTEGER NOT NULL DEFAULT 1,
    message_limit INTEGER NOT NULL DEFAULT 1000,
    period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    period_end TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_subscription UNIQUE (user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. WHATSAPP_INSTANCES TABLE (Tenant isolated Evolution API instances)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'connected', 'disconnected', 'banned')),
    phone_number TEXT,
    connected_at TIMESTAMPTZ,
    evolution_token TEXT, -- Application-level encrypted or Supabase Vault token
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own WhatsApp instances"
    ON public.whatsapp_instances FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp instances"
    ON public.whatsapp_instances FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp instances"
    ON public.whatsapp_instances FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp instances"
    ON public.whatsapp_instances FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. MESSAGE_LOGS TABLE (Inbound & Outbound history for debugging/audit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    to_number TEXT NOT NULL,
    from_number TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message logs for their own instances"
    ON public.message_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances wi
            WHERE wi.id = message_logs.instance_id
              AND wi.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert message logs for their own instances"
    ON public.message_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances wi
            WHERE wi.id = message_logs.instance_id
              AND wi.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 5. AUTOMATIONS TABLE (Simple rule-based triggers like Keyword -> Auto-Reply)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'webhook', 'schedule')),
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own automations"
    ON public.automations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own automations"
    ON public.automations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automations"
    ON public.automations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automations"
    ON public.automations FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE & FAST TENANT LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_instances_name ON public.whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_instances_status ON public.whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_message_logs_instance ON public.message_logs(instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automations_instance ON public.automations(instance_id, enabled);
CREATE INDEX IF NOT EXISTS idx_automations_user ON public.automations(user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE & SUBSCRIPTION PROVISIONING TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Insert Profile
    INSERT INTO public.profiles (id, email, plan)
    VALUES (NEW.id, NEW.email, 'starter');

    -- 2. Insert Starter Subscription
    INSERT INTO public.subscriptions (
        user_id,
        plan,
        status,
        instance_limit,
        message_limit,
        period_start,
        period_end
    )
    VALUES (
        NEW.id,
        'starter',
        'active',
        1,
        1000,
        NOW(),
        NOW() + INTERVAL '30 days'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger hook for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

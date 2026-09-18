import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isServerSupabaseConfigured = Boolean(supabaseUrl && serviceRoleKey);

/**
 * Server-side admin Supabase client with service-role permissions
 * Used only in server API routes for webhook processing, audit logging, and system triggers
 */
export const supabaseAdmin = isServerSupabaseConfigured
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

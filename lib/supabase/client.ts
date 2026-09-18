import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      return (import.meta as any).env[key] || "";
    }
    if (typeof process !== "undefined" && (process as any)?.env) {
      return (process as any).env[key] || "";
    }
  } catch (e) {}
  return "";
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Client-side Supabase client for browser usage
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

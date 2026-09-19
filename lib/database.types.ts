// Strong Supabase Database TypeScript Definitions
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          subdomain: string;
          created_at: string;
          updated_at: string;
          status: 'active' | 'suspended' | 'cancelled';
          max_instances: number;
          max_daily_messages: number;
          current_plan: 'starter' | 'pro' | 'enterprise';
        };
        Insert: {
          id?: string;
          name: string;
          subdomain: string;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'suspended' | 'cancelled';
          max_instances?: number;
          max_daily_messages?: number;
          current_plan?: 'starter' | 'pro' | 'enterprise';
        };
        Update: {
          id?: string;
          name?: string;
          subdomain?: string;
          created_at?: string;
          updated_at?: string;
          status?: 'active' | 'suspended' | 'cancelled';
          max_instances?: number;
          max_daily_messages?: number;
          current_plan?: 'starter' | 'pro' | 'enterprise';
        };
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'agent';
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'agent';
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'agent';
          created_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          provider: 'baileys' | 'cloud_api';
          instance_name: string;
          status: 'disconnected' | 'connecting' | 'connected' | 'banned';
          phone_number: string | null;
          credentials_encrypted: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          provider?: 'baileys' | 'cloud_api';
          instance_name: string;
          status?: 'disconnected' | 'connecting' | 'connected' | 'banned';
          phone_number?: string | null;
          credentials_encrypted?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          provider?: 'baileys' | 'cloud_api';
          instance_name?: string;
          status?: 'disconnected' | 'connecting' | 'connected' | 'banned';
          phone_number?: string | null;
          credentials_encrypted?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes: string[];
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          scopes?: string[];
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          scopes?: string[];
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          channel_id: string;
          direction: 'inbound' | 'outbound';
          sender: string;
          recipient: string;
          content: Json;
          status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
          provider_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          channel_id: string;
          direction: 'inbound' | 'outbound';
          sender: string;
          recipient: string;
          content: Json;
          status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
          provider_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          channel_id?: string;
          direction?: 'inbound' | 'outbound';
          sender?: string;
          recipient?: string;
          content?: Json;
          status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
          provider_message_id?: string | null;
          created_at?: string;
        };
      };
      webhook_endpoints: {
        Row: {
          id: string;
          tenant_id: string;
          url: string;
          secret: string;
          events: string[];
          status: 'active' | 'disabled';
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          url: string;
          secret: string;
          events: string[];
          status?: 'active' | 'disabled';
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          url?: string;
          secret?: string;
          events?: string[];
          status?: 'active' | 'disabled';
          created_at?: string;
        };
      };
      daily_usage: {
        Row: {
          id: string;
          tenant_id: string;
          date: string;
          messages_sent: number;
          messages_received: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          date: string;
          messages_sent?: number;
          messages_received?: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          date?: string;
          messages_sent?: number;
          messages_received?: number;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          plan: 'starter' | 'pro' | 'enterprise';
          provider: 'xendit' | 'stripe';
          provider_subscription_id: string | null;
          status: 'active' | 'past_due' | 'canceled' | 'trialing';
          current_period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          plan: 'starter' | 'pro' | 'enterprise';
          provider: 'xendit' | 'stripe';
          provider_subscription_id?: string | null;
          status?: 'active' | 'past_due' | 'canceled' | 'trialing';
          current_period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          plan?: 'starter' | 'pro' | 'enterprise';
          provider?: 'xendit' | 'stripe';
          provider_subscription_id?: string | null;
          status?: 'active' | 'past_due' | 'canceled' | 'trialing';
          current_period_end?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type InstanceStatus = 'connecting' | 'connected' | 'disconnected' | 'banned';

export type PlanType = 'starter' | 'pro' | 'agency' | 'enterprise';

export type UserRole = 'superadmin' | 'tenant';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  plan: PlanType;
  company_name?: string;
  created_at: string;
  status?: 'active' | 'suspended';
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  instance_limit: number;
  message_limit: number;
  period_start: string;
  period_end: string;
  current_usage?: {
    instances_count: number;
    messages_sent_this_period: number;
  };
}

export interface WhatsAppInstance {
  id: string;
  user_id: string;
  instance_name: string;
  status: InstanceStatus;
  phone_number: string | null;
  connected_at: string | null;
  evolution_token?: string;
  created_at: string;
  updated_at: string;
  profile_name?: string;
  profile_picture?: string;
}

export interface QrCodeData {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export type MessageDirection = 'in' | 'out';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageLog {
  id: string;
  instance_id: string;
  instance_name?: string;
  direction: MessageDirection;
  to_number: string;
  from_number?: string;
  body: string;
  status: MessageStatus;
  created_at: string;
}

export type TriggerType = 'keyword' | 'webhook' | 'schedule';

export interface KeywordTriggerConfig {
  keyword: string;
  match_type: 'exact' | 'contains' | 'starts_with';
  case_sensitive?: boolean;
}

export interface AutoReplyActionConfig {
  reply_text: string;
  typing_delay_ms?: number;
}

export interface Automation {
  id: string;
  user_id: string;
  instance_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: KeywordTriggerConfig | Record<string, any>;
  action_config: AutoReplyActionConfig | Record<string, any>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type AutomationRule = Automation;

export interface EvolutionApiConfig {
  baseUrl: string;
  adminApiKey: string;
  webhookSecret?: string;
  appUrl: string;
}

export interface SendMessageRequest {
  instance_id: string;
  to_number: string;
  text: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'configured';
  evolutionApiConfigured: boolean;
  evolutionApiConnected: boolean;
  evolutionApiUrl: string;
  supabaseConfigured: boolean;
  webhookUrl: string;
  message?: string;
}

export interface SubscriptionPackage {
  id: string;
  plan: PlanType;
  name: string;
  priceMonthly: number;
  instance_limit: number;
  message_limit: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  activeSubscriberCount?: number;
}

export interface TenantMember {
  id: string;
  email: string;
  company_name?: string;
  plan: PlanType;
  status: 'active' | 'suspended';
  created_at: string;
  instance_limit: number;
  message_limit: number;
  connected_instances_count: number;
  total_messages_count: number;
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing';
}

export interface AdminOverviewStats {
  totalTenants: number;
  activeTenants: number;
  totalInstances: number;
  connectedInstances: number;
  totalMessagesSent: number;
  monthlyRecurringRevenue: number;
}


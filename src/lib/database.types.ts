export type AppType = 'Module ERP' | 'App' | 'App mobile';
export type AppStatus = 'available' | 'coming_soon' | 'unavailable';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'expired' | 'trial';
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  phone: string | null;
  country: string | null;
  job_title: string | null;
  role: 'client' | 'admin' | 'super_admin';
  is_active: boolean;
  first_login_completed?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string | null;
  preferred_payment_method?: string | null;
}

export interface AppRow {
  id: string;
  name: string;
  type: AppType;
  tagline: string;
  description: string;
  features: string[];
  categories: string[];
  pricing: Record<string, number>;
  pricing_period: string;
  color: string;
  icon: string;
  highlights: string[];
  external_url: string | null;
  status: AppStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SiteContentRow {
  key: string;
  data: Record<string, any>;
  updated_at: string;
  updated_by: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  app_id: string;
  plan: string;
  status: SubscriptionStatus;
  price_at_subscription: number;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  subscription_id: string | null;
  app_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  cinetpay_transaction_id: string | null;
  payment_method: string;
  pdf_url: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
}

export type ErrorSeverityDb = 'critical' | 'error' | 'warning' | 'info';
export type ErrorStatusDb = 'open' | 'in_progress' | 'resolved' | 'ignored';
export type ErrorEnvironmentDb = 'production' | 'staging' | 'dev';

export interface ErrorLogRow {
  id: string;
  app_id: string;
  app_version: string | null;
  environment: ErrorEnvironmentDb;
  severity: ErrorSeverityDb;
  message: string;
  stack_trace: string | null;
  component_name: string | null;
  action_context: string | null;
  fingerprint: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  user_id: string | null;
  tenant_id: string | null;
  url: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  status: ErrorStatusDb;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      apps: {
        Row: AppRow;
        Insert: Partial<AppRow> & { id: string; name: string; type: AppType };
        Update: Partial<AppRow>;
      };
      site_content: {
        Row: SiteContentRow;
        Insert: Partial<SiteContentRow> & { key: string };
        Update: Partial<SiteContentRow>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { user_id: string; app_id: string; plan: string };
        Update: Partial<Subscription>;
      };
      invoices: {
        Row: Invoice;
        Insert: Partial<Invoice> & { invoice_number: string; user_id: string; app_id: string; plan: string; amount: number };
        Update: Partial<Invoice>;
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog> & { action: string };
        Update: Partial<ActivityLog>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; title: string; message: string };
        Update: Partial<Notification>;
      };
      tickets: {
        Row: Ticket;
        Insert: Partial<Ticket> & { user_id: string; subject: string };
        Update: Partial<Ticket>;
      };
      ticket_messages: {
        Row: TicketMessage;
        Insert: Partial<TicketMessage> & { ticket_id: string; user_id: string; message: string };
        Update: Partial<TicketMessage>;
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriber;
        Insert: Partial<NewsletterSubscriber> & { email: string };
        Update: Partial<NewsletterSubscriber>;
      };
      error_logs: {
        Row: ErrorLogRow;
        Insert: Partial<ErrorLogRow> & {
          app_id: string;
          severity: ErrorSeverityDb;
          message: string;
          fingerprint: string;
          environment: ErrorEnvironmentDb;
        };
        Update: Partial<ErrorLogRow>;
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_revenue_summary: { Args: Record<string, never>; Returns: Record<string, any> };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Record<string, any> };
      upsert_error_log: {
        Args: {
          p_app_id: string;
          p_fingerprint: string;
          p_severity: ErrorSeverityDb;
          p_message: string;
          p_stack_trace?: string | null;
          p_component?: string | null;
          p_context?: string | null;
          p_metadata?: Record<string, unknown>;
          p_environment?: ErrorEnvironmentDb;
          p_app_version?: string | null;
          p_url?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
    };
  };
}

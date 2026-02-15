export type AppType = 'Module ERP' | 'App' | 'App mobile';
export type AppStatus = 'available' | 'coming_soon' | 'unavailable';
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'expired' | 'trial';
export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  company_name: string;
  phone: string;
  role: 'client' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, any>;
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
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_revenue_summary: { Args: Record<string, never>; Returns: Record<string, any> };
      admin_dashboard_stats: { Args: Record<string, never>; Returns: Record<string, any> };
    };
  };
}

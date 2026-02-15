import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Subscription, Invoice } from '../lib/database.types';

export function useSubscriptions(userId: string | undefined) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setSubscriptions(data as Subscription[] || []);
    } catch { /* fallback empty */ }
  };

  const fetchInvoices = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setInvoices(data as Invoice[] || []);
    } catch { /* fallback empty */ }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSubscriptions(), fetchInvoices()]).finally(() => setLoading(false));
  }, [userId]);

  const subscribe = async (appId: string, plan: string, price: number) => {
    if (!userId) return { error: 'Not authenticated' };
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      app_id: appId,
      plan,
      status: 'trial',
      price_at_subscription: price,
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    if (!error) {
      await fetchSubscriptions();
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'subscription_created',
        metadata: { app_id: appId, plan },
      });
    }
    return { error: error?.message ?? null };
  };

  return { subscriptions, invoices, loading, subscribe, refetchSubscriptions: fetchSubscriptions, refetchInvoices: fetchInvoices };
}

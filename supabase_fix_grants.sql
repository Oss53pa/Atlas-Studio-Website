-- Fix missing GRANT permissions for anon and authenticated roles
-- Without these, RLS policies work but the roles can't even access the tables

-- Core tables
GRANT SELECT ON public.apps TO anon, authenticated;
GRANT ALL ON public.apps TO authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.subscriptions TO anon, authenticated;
GRANT ALL ON public.subscriptions TO authenticated;
GRANT SELECT ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT SELECT ON public.tickets TO anon, authenticated;
GRANT ALL ON public.tickets TO authenticated;
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT SELECT ON public.activity_log TO anon, authenticated;
GRANT ALL ON public.activity_log TO authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.features TO anon, authenticated;
GRANT SELECT ON public.plan_features TO anon, authenticated;

-- Newsletter
GRANT SELECT ON public.newsletter_subscribers TO anon, authenticated;
GRANT ALL ON public.newsletter_subscribers TO authenticated;
GRANT SELECT ON public.newsletter_campaigns TO anon, authenticated;
GRANT ALL ON public.newsletter_campaigns TO authenticated;
GRANT SELECT ON public.newsletter_segments TO anon, authenticated;
GRANT SELECT ON public.newsletter_templates TO anon, authenticated;
GRANT ALL ON public.newsletter_sends TO authenticated;
GRANT ALL ON public.newsletter_links TO authenticated;

-- Licences
GRANT SELECT ON public.licences TO anon, authenticated;
GRANT ALL ON public.licences TO authenticated;
GRANT SELECT ON public.licence_seats TO anon, authenticated;
GRANT ALL ON public.licence_seats TO authenticated;
GRANT SELECT ON public.licence_activations TO authenticated;
GRANT SELECT ON public.licence_audit_log TO authenticated;
GRANT SELECT ON public.admin_delegate_links TO authenticated;
GRANT ALL ON public.admin_delegate_links TO authenticated;

-- Payments
GRANT SELECT ON public.payment_transactions TO anon, authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.payment_sessions TO anon, authenticated;
GRANT ALL ON public.payment_sessions TO authenticated;
GRANT SELECT ON public.saved_payment_methods TO authenticated;
GRANT ALL ON public.saved_payment_methods TO authenticated;

-- Plans & subscriptions
GRANT SELECT ON public.subscription_changes TO authenticated;
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO authenticated;
GRANT SELECT ON public.renewal_log TO authenticated;

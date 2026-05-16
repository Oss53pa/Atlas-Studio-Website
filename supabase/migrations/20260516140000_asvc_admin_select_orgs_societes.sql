-- ═══════════════════════════════════════════════════════════════════════════
-- ASVC — Atlas Studio admin SELECT policies sur organizations & societes
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexte : ASVC (Atlas Studio Virtual Company) est un module interne réservé
-- aux admins Atlas Studio (Pame + super_admin). Le cockpit ASVC (customer
-- success, facturation, trésorerie) doit pouvoir lire CROSS-TENANT toutes les
-- organizations et societes pour fonctionner — exactement comme c'est déjà
-- le cas pour profiles ("Admins can view all profiles") et subscriptions
-- ("Admins manage all subs").
--
-- Sans ces policies, asvc_clients_lifecycle() devait rester SECURITY DEFINER
-- pour bypasser les RLS self-scope (id = get_user_org_id()). Avec ces policies
-- ajoutées, la fonction peut passer en SECURITY INVOKER → dernier advisor WARN
-- éliminé.
--
-- Les policies existantes self-scope sont CONSERVÉES — Postgres applique
-- OR entre policies PERMISSIVE, donc :
--   utilisateur normal : voit son org/société uniquement (inchangé)
--   admin Atlas Studio : voit tout (nouveau)
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- organizations : admin Atlas Studio SELECT all
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Atlas Studio admins view all organizations" ON public.organizations;
CREATE POLICY "Atlas Studio admins view all organizations"
  ON public.organizations
  FOR SELECT
  USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- societes : admin Atlas Studio SELECT all
-- ───────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Atlas Studio admins view all societes" ON public.societes;
CREATE POLICY "Atlas Studio admins view all societes"
  ON public.societes
  FOR SELECT
  USING (public.is_admin());

-- ───────────────────────────────────────────────────────────────────────────
-- asvc_clients_lifecycle : maintenant safe en SECURITY INVOKER
-- (le guard is_admin() interne reste la première ligne de défense ; les LEFT
--  JOIN sur organizations/societes résolvent désormais grâce aux policies
--  ci-dessus)
-- ───────────────────────────────────────────────────────────────────────────
ALTER FUNCTION public.asvc_clients_lifecycle(INT) SECURITY INVOKER;

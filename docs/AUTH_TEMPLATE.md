# Template d'authentification — Atlas Studio Suite

> Standard de référence pour tous les produits Atlas Studio (Atlas F&A, Cockpit F&A, Liass'Pilot, Advist, TableSmart, etc.)

## Format unifié

| Route | Champs | Liens |
|-------|--------|-------|
| `/login` | E-mail + mot de passe | "Mot de passe oublié ?" + "S'inscrire" |
| `/signup` | Nom + e-mail + mot de passe + CGU | "Se connecter" |
| `/forgot-password` | E-mail | (lien d'envoi recovery) |
| `/reset-password` | Nouveau mot de passe + confirmation | (auto-redirect après succès) |

### Redirection après succès

| App | Login OK | Signup OK | Reset OK |
|-----|----------|-----------|----------|
| **Atlas Studio website** (vitrine) | `/portal` | `/portal` (auto-login) | `/portal` |
| **Autres apps** (Cockpit F&A, etc.) | `/` (Accueil de l'app) | `/` (auto-login) | `/` |

## Architecture SSO recommandée

Pour éviter d'avoir à gérer 7 systèmes d'auth en parallèle, **toutes les apps consomment l'auth d'atlas-studio.org** via un JWT signé.

### Flow SSO actuel (déjà en place)

```
1. Client connecté sur atlas-studio.org/portal
   ↓ clique "Ouvrir Cockpit F&A"
2. Front portail → POST /functions/v1/app-token { appId: "cockpit-fa" }
3. Edge function app-token vérifie:
   - Session Supabase valide
   - Subscription active sur cockpit-fa
   ↓
4. Génère un JWT signé avec ATLAS_SSO_SECRET
   payload = { sub, email, app_id, exp: now+5min }
   ↓
5. Retour : { redirectUrl: "https://cockpit-fna.atlas-studio.org/?atlas_token=<JWT>" }
   ↓
6. Front ouvre redirectUrl dans un nouvel onglet
   ↓
7. App cible (cockpit-fna) lit ?atlas_token=, vérifie la signature,
   établit sa propre session Supabase (signInWithPassword via service role
   ou exchange JWT avec une edge function dédiée)
```

### À implémenter dans chaque app cible

Chaque app (cockpit-fna, atlas-finance, liasspilot, etc.) doit :

1. **Au boot** : si `?atlas_token=<JWT>` dans l'URL, faire l'échange auth
2. **Si pas de session** : afficher `/login` avec un bouton **"Se connecter avec Atlas Studio"** qui redirige vers `https://atlas-studio.org/portal/login?next=https://<app>.atlas-studio.org/`
3. **Optionnel** : autoriser aussi `/signup` local pour les utilisateurs qui découvrent l'app sans passer par atlas-studio.org

## Implémentation rapide d'une nouvelle app

### Étape 1 — Copier les 4 pages auth

Copier les 6 fichiers du portail Atlas Studio vers la nouvelle app :

```
src/portal/auth/AuthLayout.tsx        → src/auth/AuthLayout.tsx
src/portal/auth/AuthInput.tsx         → src/auth/AuthInput.tsx
src/portal/auth/LoginPage.tsx         → src/auth/LoginPage.tsx
src/portal/auth/SignupPage.tsx        → src/auth/SignupPage.tsx
src/portal/auth/ForgotPasswordPage.tsx → src/auth/ForgotPasswordPage.tsx
src/portal/auth/ResetPasswordPage.tsx  → src/auth/ResetPasswordPage.tsx
```

### Étape 2 — Adapter les redirections

Dans `LoginPage.tsx`, remplacer :
```tsx
const next = new URLSearchParams(location.search).get("next") || "/portal";
```
par :
```tsx
const next = new URLSearchParams(location.search).get("next") || "/";
```

Idem dans `SignupPage.tsx` et `ResetPasswordPage.tsx`.

### Étape 3 — Adapter l'AuthLayout

Dans `AuthLayout.tsx`, ajuster `backHref` par défaut vers le bon endroit (ex: `/` pour les apps).

Le wordmark "Atlas Studio" peut soit rester (cohérence brand), soit être remplacé par le nom de l'app. Pour la cohérence brand, **garder Atlas Studio** + sous-titre dynamique avec le nom de l'app : `Cockpit F&A`, `Atlas F&A`, etc.

### Étape 4 — Routes

Dans le router de l'app :
```tsx
<Routes>
  <Route path="/login" element={isAuthed ? <Navigate to="/" /> : <LoginPage />} />
  <Route path="/signup" element={isAuthed ? <Navigate to="/" /> : <SignupPage />} />
  <Route path="/forgot-password" element={isAuthed ? <Navigate to="/" /> : <ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  {/* Toutes autres routes : protégées */}
</Routes>
```

### Étape 5 — Bouton SSO (optionnel mais recommandé)

Sur `/login`, ajouter au-dessus du formulaire :
```tsx
<a
  href={`https://atlas-studio.org/portal/login?next=${encodeURIComponent(window.location.origin)}`}
  className="btn-outline-light w-full mb-4"
>
  Se connecter avec Atlas Studio
</a>
<div className="flex items-center gap-3 my-5">
  <div className="flex-1 h-px bg-white/10" />
  <span className="text-neutral-muted text-[11px] uppercase">ou</span>
  <div className="flex-1 h-px bg-white/10" />
</div>
```

### Étape 6 — Variables d'environnement

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ATLAS_STUDIO_URL=https://atlas-studio.org
```

## Style — Midnight Emerald

Toutes les apps héritent du design system Atlas Studio :

- **Fond** : `#0A0F1A` (midnight navy)
- **Cartes** : `#0E1525` (ink-100) avec border `rgba(255,255,255,0.06)`
- **Accent primaire** : émeraude `#10B981 → #34D399 → #6EE7B7` (gradient 5-stops)
- **Wordmark "Atlas Studio"** : champagne `#C8A672 → #E8D4B8 → #FAF0E0`
- **Police titres** : Inter (display), `font-medium` + `tracking-tight` + `leading-[1.12]`
- **Police body** : Exo 2

Voir `tailwind.config.js` et `src/index.css` du repo atlas-studio-website pour la définition complète des tokens.

## Sécurité

- **OTP retiré** : flow Supabase standard (email + password). Confirmation email gérée par Supabase config (à activer si besoin).
- **Reset password** : magic link Supabase qui pose un cookie de session "recovery" temporaire ; la page `/reset-password` écoute l'event `PASSWORD_RECOVERY` puis fait `updateUser({password})`.
- **CGU obligatoire** au signup, stockée dans `profiles.terms_accepted_at` + `terms_version`.
- **Pas de leak d'existence de compte** sur `/forgot-password` : on affiche toujours "email envoyé" même si le compte n'existe pas.

## Référence implémentation

Voir le commit canonique :
- Branche : `main`
- Commit : `bdcb038` — `feat(auth): refonte portail — 4 routes URL distinctes + flow Supabase standard`
- Repo : `Oss53pa/Atlas-Studio-Website`
- Chemin : `src/portal/auth/`

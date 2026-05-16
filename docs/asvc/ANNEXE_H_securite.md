# Annexe H — Politique de sécurité ASVC

**Statut** : référentiel sécurité opérationnel. Révision annuelle minimum, ou immédiatement après incident sécurité majeur.

**Source** : CDC ASVC v2.0 — Annexe H, version 1.0 (mai 2026).

---

## 🔐 1. Cryptographie et gestion des secrets

### 1.1 Stockage
**Service** : Supabase Vault (AES-256 au repos).

Secrets concernés : Claude API, GitHub tokens (par scope/agent), Vercel deploy hooks, CinetPay, Stripe, Gmail/LinkedIn API, Slack/Notion MCPs, clés de signature commits.

**Accès** :
- Agents → lecture uniquement de leurs secrets dédiés (scope minimal)
- Pame (CEO) → lecture + rotation
- Système (Edge Functions) → lecture via service_role
- ❌ Personne d'autre

### 1.2 Rotation des secrets

| Secret | Fréquence | Procédure |
|---|---|---|
| Claude API key | 90 jours | Anthropic dashboard + update Vault |
| GitHub tokens agents | 90 jours | GitHub PAT rotation + Vault |
| Vercel deploy tokens | 180 jours | Vercel dashboard + Vault |
| Supabase service_role | 180 jours | Reset Supabase + redéploiement |
| Mot de passe Pame | 60 jours | Forced password change |
| Webhook secrets | 90 jours | Regen + update sources |

**Calendrier automatique** : cron mensuel notifie Pame des rotations à effectuer.

### 1.3 Audit usage des secrets
Logué dans `asvc_audit_log` : acteur, secret accédé (key name, **jamais** la valeur), timestamp, hash session.

**Anomalies détectées** :
- Agent lit secret hors scope → alerte critique
- Volume anormal → alerte
- Lecture hors heures normales → alerte

---

## 🐙 2. Sécurité GitHub

### 2.1 Branch protection sur `main`
- Require PR review (≥1 reviewer = Pame ou autre admin)
- Require status checks (QA Agent pipeline)
- Require linear history
- Restrict force push : YES
- Restrict deletion : YES
- Locked direct push (sauf Pame avec MFA)

### 2.2 Accès par agent (scope minimal)

| Agent | Permissions GitHub |
|---|---|
| Dev Agent | R/W branches `asvc/**`, **NO** write `main` |
| QA Agent | Read repos, Write comments PRs |
| DevOps/Release Agent | R/W tags `v*`, **NO** write code |
| Documentation Agent | R/W sur `docs/**` uniquement |
| Tous les autres | Aucun accès GitHub |

**Tokens distincts par agent** — chacun a son propre GitHub PAT, scope minimal.

### 2.3 Signature des commits
Tous les commits d'agents doivent inclure :
```
Co-Authored-By: ASVC-Dev-Agent <asvc-dev@atlasstudio.org>
Signed-by-agent: dev_agent_v1
Spec-id: {spec_uuid}
```
Hook pre-commit vérifie présence signature, bloque sinon.

### 2.4 Détection secrets dans le code
- `gitleaks` pre-commit hook (Dev Agent)
- `gitleaks` scan complet (QA Agent)
- GitHub secret scanning activé tous repos

**En cas de fuite** : push bloqué → notif Pame critical → rotation immédiate secret → audit historique.

---

## 🛡️ 3. Sécurité applicative (Atlas Studio apps)

### 3.1 RLS
**Règle absolue** : **toutes** les tables Supabase ont RLS activé. **Aucune exception**.
Le Dev Agent est instruit de refuser toute spec sans RLS.

### 3.2 Tests sécurité automatisés (pipeline QA Agent)
- `npm audit` (0 vuln high/critical)
- `gitleaks` (secrets en clair)
- `Semgrep SAST` (patterns dangereux)
- `OWASP Top 10` checks basiques

Tout vuln high/critical → PR bloquée + escalade Pame.

### 3.3 Authentification utilisateurs Atlas Studio
- Supabase Auth (JWT)
- MFA recommandé pour admins (à imposer v2.1)
- Session timeout : 24h
- Password policy : min 12 chars + complexité

### 3.4 Multi-tenant isolation
- `org_id` ou `tenant_id` sur toutes tables métier
- RLS policies enforce `auth.uid()` + matching `tenant_id`
- Tests automatisés : cross-tenant access impossible

---

## 🔒 4. Sécurité Pame (CEO)

### 4.1 MFA obligatoire
Sur **tous** les comptes :
- Google Workspace (email Atlas Studio)
- Supabase
- Vercel
- GitHub
- Anthropic Console
- CinetPay, Stripe

Authenticator : Google Authenticator ou Authy. Backup codes : coffre-fort physique sécurisé.

### 4.2 Hardware key (recommandé)
YubiKey ou équivalent pour : Supabase, GitHub, Vercel.

### 4.3 Session monitoring
Toutes les sessions Pame loggées : IP, user agent, géolocalisation, timestamp.
Anomalies (nouvelle IP, géo inhabituelle) → SMS + email.

### 4.4 Procédure compromission compte CEO
1. **Kill switch global ASVC** (arrête tous agents)
2. Reset tous mots de passe en cascade
3. Révoquer tous les tokens
4. Audit log analysé (actions non autorisées ?)
5. Communication clients si données potentiellement exposées
6. Rapport CNIL/autorité locale si données personnelles

---

## 📊 5. Audit log et traçabilité

### 5.1 Immutabilité
Table `asvc_audit_log` :
- Trigger SQL bloque UPDATE et DELETE
- Hash chain SHA-256 entre entrées (blockchain-like)
- Vérification d'intégrité automatique quotidienne (RPC `asvc_verify_audit_chain()`)

### 5.2 Contenu loggé
- Identité acteur (agent ou CEO)
- Type événement
- Cible (tenant, user, ressource)
- Détails (payload tronqué si sensible)
- Hash précédent + courant
- Timestamp UTC + sequence_number (cf. extension Annexe B)

### 5.3 Rétention
- **10 ans** (conformité OHADA)
- Backup quotidien externalisé (région différente)
- Export possible pour audit fiscal/légal

### 5.4 Conformité OHADA
Audit log respecte les exigences :
- Traçabilité comptable (Acte uniforme comptable)
- Conservation pièces justificatives (10 ans)
- Reconstitution chronologique complète

---

## 🌍 6. Conformité RGPD et lois locales

### 6.1 Données personnelles traitées
| Type | Données |
|---|---|
| Clients | nom, email, téléphone, données fiscales (NCC) |
| Leads | nom, email, fonction, entreprise |
| Utilisateurs | email, profile pro |

**Base légale** : intérêt légitime (clients) + consentement explicite (leads marketing).

### 6.2 Droits des personnes
- **Accès** : export données via Pame sous 30 jours
- **Rectification** : modification directe possible
- **Oubli** : suppression sur demande (sauf obligations légales 10 ans OHADA)
- **Opposition** : opt-out marketing immédiat
- **Portabilité** : export JSON/CSV

### 6.3 DPO
Pame assume le rôle DPO (à formaliser). Contact : `dpo@atlasstudio.org`.

### 6.4 Lois applicables
- **RGPD** (clients EU si applicable)
- **Loi 2013-450 Côte d'Ivoire** : déclaration ARTCI faite
- Lois équivalentes UEMOA/CEMAC par pays

---

## 🤝 7. Sous-traitants et DPA

| Service | Données | DPA |
|---|---|---|
| Anthropic (Claude API) | Prompts + outputs | À signer (DPA standard) |
| Supabase | Données clients chiffrées | DPA standard |
| Vercel | Logs accès | DPA standard |
| CinetPay | Données paiement | DPA spécifique |
| Stripe | Données paiement | DPA standard |

**Revue annuelle** : certifications (SOC 2, ISO 27001), localisation données, politiques sécurité.

---

## 🧪 8. Tests sécurité

| Test | Fréquence |
|---|---|
| Pentest externe | Annuel (cabinet sécurité, scope apps + ASVC) |
| Tests automatisés à chaque PR | Continu (QA Agent) |
| Drills gestion incident | Mensuel (cf. Annexe G) |
| Revue sécurité Pame + DevOps Lead | Trimestrielle |

**Bug bounty** : à envisager dès une certaine taille (privé puis public).

---

## 🚨 9. Procédures d'incident sécurité

### 9.1 Détection
Sources : alertes Sentry, logs Supabase (accès anormaux), reports utilisateurs, monitoring agents, veille CVE (npm audit, dependabot).

### 9.2 Réponse breach confirmé
1. **Kill switch global ASVC**
2. Préserver evidence (logs, états)
3. Évaluer impact (combien d'utilisateurs, quelles données)
4. Notifier CNIL/autorité (sous 72h si données personnelles)
5. Communication clients (selon gravité)
6. Forensics + remédiation
7. Post-mortem détaillé

### 9.3 Notification clients
Si données potentiellement exposées :
- Email personnalisé sous 48h
- Description nature breach
- Données concernées
- Actions Atlas Studio
- Recommandations client (changement mot de passe, surveillance)

---

## 🎯 10. KPIs sécurité (cibles)

| Indicateur | Cible |
|---|---|
| Incidents sécurité majeurs/an | 0 |
| Rotation secrets respectée | 100% |
| MFA actif comptes Pame | 100% |
| RLS sur tables Supabase | 100% |
| PRs avec security scan passed | 100% |
| Audit log intégrité (hash chain) | 100% |
| Backup quotidien réussi | 100% |
| Pentest annuel | Réalisé |
| Sous-traitants avec DPA | 100% |

---

## ✅ 11. Checklist sécurité mensuelle (Pame, 1er du mois)

- [ ] Vérifier rotation secrets prévues
- [ ] Revue alertes audit log
- [ ] Vérifier backups quotidiens OK
- [ ] Update dépendances npm (security patches)
- [ ] Revue accès agents (scope minimal)
- [ ] Tests MFA fonctionnels
- [ ] Lecture nouveaux CVE pertinents
- [ ] Communication équipe si changements importants

---

## 🎓 12. Formation et sensibilisation

- **Pame (CEO)** : formation initiale sécurité (1 jour) + refresh annuel + veille CVE
- **Futurs employés** (post-ASVC) : onboarding sécurité (1 jour) + formation continue + phishing tests trimestriels

---

**Document soumis à révision annuelle minimum, ou immédiatement après tout incident sécurité majeur.**

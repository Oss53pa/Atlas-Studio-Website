# Annexe G — Runbook Incidents Production ASVC

**Statut** : document opérationnel. À garder accessible depuis téléphone Pame en <30 secondes.

**Source** : CDC ASVC v2.0 — Annexe G, version 1.0 (mai 2026).

---

## 🚨 Classification des incidents

| Sévérité | Délai réponse | Définition |
|---|---|---|
| **P0** | <15 min | Service totalement indisponible OU perte/corruption données OU faille sécurité active |
| **P1** | <1h | Fonctionnalité majeure inutilisable, nombreux clients impactés |
| **P2** | <4h ouvrées | Bug visible avec workaround disponible |
| **P3** | <2 jours | Bug cosmétique ou peu d'utilisateurs |

### Exemples P0
- App Atlas Studio retourne 500 en permanence
- Tous les clients déconnectés
- Données client effacées ou corrompues
- Accès non autorisé détecté
- Paiements CinetPay/Stripe bloqués >30 min

### Exemples P1
- Module finance ne calcule plus correctement (app répond)
- Connexion lente >10s
- Édition impossible mais lecture OK
- Bug bloquant pour >10 tenants

---

## 🚦 Sources d'alerte automatiques

| Source | Type | Notification |
|---|---|---|
| Sentry | Erreur runtime > seuil | Email + Slack |
| Vercel Analytics | error_rate >5% | Push notification |
| Supabase logs | SQL errors anormales | Slack |
| DevOps Agent monitoring | post-deploy seuils | Push critical |
| Tickets SAV | mots-clés "down", "panne", "tout cassé" | Slack |
| Community Agent | mention publique négative | Email + Slack |

### Triple notification Pame (P0/P1)
1. **Push notification mobile** (priority high)
2. **Email** vers adresse personnelle
3. **SMS** (via service tiers, fallback)

Si pas d'acknowledgement en 15 min → escalade DevOps Lead (à définir).

---

## 🎯 Procédure P0 — Critique

### T+0 à T+5 min : Détection et confirmation
1. ✅ Recevoir notification CRITICAL
2. ✅ Ouvrir console admin ASVC
3. ✅ Vérifier dashboards temps réel (Vercel, Supabase, Sentry)
4. ✅ Confirmer l'incident (vraie panne vs faux positif)

### T+5 à T+15 min : Mitigation immédiate
5. ✅ Identifier si lié à déploiement <24h :
   - **OUI** → rollback immédiat via DevOps Agent
   - **NON** → continuer diagnostic
6. ✅ Activer mode dégradé (page maintenance, feature flag)
7. ✅ Communiquer clients (bandeau, status page, réseaux sociaux)

### T+15 à T+60 min : Investigation et fix
8. ✅ Analyser logs (Sentry, Supabase, Vercel)
9. ✅ Identifier cause racine
10. ✅ Décider stratégie : rollback / hot fix / patch DB
11. ✅ Si hot fix : Dev Agent mode urgence
    - Branche `asvc/hotfix-[incident-id]`
    - Tests minimaux (smoke tests)
    - Deploy direct (approval Pame)

### T+60 min à résolution : Stabilisation
12. ✅ Vérifier résolution complète
13. ✅ Surveiller 30 min minimum
14. ✅ Lever bandeau d'information
15. ✅ Communication clients de fin d'incident

### T+24h : Post-mortem
16. ✅ Documentation Agent prépare draft
17. ✅ Pame valide et complète
18. ✅ Publication interne (équipe + clients impactés)

---

## 🔄 Rollback

### Automatique (DevOps Agent)
**Déclencheurs** :
- error_rate > 5% sur 5 min post-deploy
- latency P95 > 2× baseline post-deploy
- >10 alertes Sentry uniques en 5 min post-deploy

**Procédure** :
1. DevOps Agent détecte seuil dépassé
2. Trigger rollback (≤30s)
3. Vercel : revert deployment N-1
4. Supabase : exécution script rollback migrations
5. Validation rollback (smoke tests)
6. `asvc_production_incidents` créé severity='P1'
7. Si rollback fail → escalade P0 critique à Pame

### Manuel (Pame)
1. Console admin ASVC → Deployments
2. Trouver dernier deployment problématique
3. Cliquer "🔄 Trigger Rollback"
4. Confirmer (taper `ROLLBACK [APP] v[X.Y.Z]`)
5. Surveiller 30s
6. Vérifier app post-rollback

---

## 📞 Communications clients

Les **3 templates** sont opérationnels en BDD (cf. Annexe F) :
- `template_incident_communication_in_progress` — pendant incident
- `template_incident_communication_resolved` — résolution
- `template_incident_post_mortem` — post-mortem sous 48h

Canaux : email, SMS, status page, réseaux sociaux.

---

## 🛑 Plans de continuité par dépendance

### Si Ollama down
**Impact** : Veille, Community, Prospection, Support N1, Compta léger, Facturation
**Plan B** :
1. Bascule auto vers Claude API
2. Augmentation budget Claude API temporaire
3. Notif Pame "Mode dégradé Ollama actif"
4. Diagnostic et reprise Ollama

### Si Claude API down
**Impact** : COO, Dev, QA, DevOps, Closer
**Plan B** :
1. Si Ollama up : bascule possible (qualité dégradée)
2. Si totalement down : pause de tous les agents + notif Pame + reprise manuelle des actions urgentes
3. Wait & monitor (généralement <1h)

### Si Supabase down
**Impact** : ASVC complet
**Plan B** :
1. Notif Pame critical
2. Status page affiche maintenance
3. Pas d'action possible
4. Communication clients

### Si Vercel down
**Impact** : Frontends Atlas Studio
**Plan B** :
1. Vérifier status Vercel
2. Page maintenance hébergée ailleurs si long
3. Communication clients

### Si CinetPay/Stripe down
**Impact** : Paiements
**Plan B** :
1. Suspendre Facturation Agent
2. Communication clients différée
3. Reprise dès retour service

---

## 🔧 Outils et accès

- **Console admin ASVC** : `admin.atlasstudio.org/asvc`
- **Status page** : `status.atlasstudio.org`
- **Sentry** : `sentry.io/atlas-studio`
- **Vercel Analytics** : `vercel.com/atlas-studio`
- **Supabase Dashboard** : `supabase.com/dashboard/projects`

### Numéros d'urgence (à définir)
- DevOps Lead : à définir
- Sécurité : à définir
- Anthropic Support : si compte Enterprise
- Supabase Support : `support@supabase.com`

---

## 📋 Checklist post-incident (T+24h)

- [ ] Post-mortem rédigé et validé
- [ ] Communication clients de clôture envoyée
- [ ] Actions correctives planifiées dans backlog
- [ ] Tests automatiques ajoutés pour éviter récurrence
- [ ] Mise à jour ce runbook si nouveau type d'incident
- [ ] Apprentissage partagé en interne ASVC

---

## 🎓 Drills mensuels

Maintenir compétences gestion crise :
1. Simulation P0 : "Atlas Finance retourne 500"
2. Simulation rollback sur staging
3. Simulation Ollama down → fallback Claude
4. Simulation Supabase down → communication clients

**Revue annuelle** : audit complet procédures, mise à jour selon évolutions infra.

---

**Document vivant.** Mis à jour après chaque incident significatif.

# ASVC v2.1 — Tech Debt Agent + extensions

**Statut** : déployé.
**Date** : 2026-05-16
**Motivation** : combler les 5 gaps identifiés sur la maintenance des 14 apps Atlas Studio existantes (audit proactif, refactoring, perf audit complet, deps obsolètes, refonte UX).

---

## Vue d'ensemble

Le CDC ASVC v2.0 d'origine couvrait bien le **nouveau code** (Veille → User Research → Product Designer → Dev → QA → DevOps → Doc). Mais le **code existant** n'avait qu'une couverture **réactive** (Bug Triage répond aux signalements).

ASVC v2.1 ajoute le volet **proactif** sur le code existant via :

1. **Nouvel agent** : Tech Debt Agent (20e agent)
2. **Extension** : Dev Agent pioche dans le backlog tech_debt
3. **Extension** : Product Designer Agent audit UX trimestriel

---

## 1. Tech Debt Agent (`tech_debt`)

| Champ | Valeur |
|---|---|
| Code | `tech_debt` |
| Département | `production` |
| Reports to | `coo` |
| LLM | anthropic:claude-sonnet-4-6 (T=0.5, max_tokens=8192) |
| Cron | Hebdo lundi 6h (avant brief COO) |
| Status initial | `active` |

### Domaines d'audit
1. **Code quality** : duplications (SonarCloud), complexité cyclomatique, dead code (ts-prune), type safety
2. **Dépendances** : versions obsolètes (>6 mois), vulns CVE (npm audit), majors retardées, deps abandonnées
3. **Performance** : Lighthouse full app (mobile + desktop), bundle size, time-to-interactive, régressions vs N-1
4. **Architecture / sécurité** : RLS missing, SECURITY DEFINER sans search_path, edge functions non typées, i18n manquant

### Priorisation
- **P0 critical** : vuln high/critical, régression perf >50%, deps abandonnée, RLS manquant sur table sensible, score app <40
- **P1 high** : duplications >10% module critique, complexité >25, vuln medium, bundle bloat >20%, major version retardée >1 an
- **P2 normal** : refactos d'amélioration, deps mineures obsolètes
- **P3 nice** : cosmétique, micro-optimisations

### Scoring code health (0-100)
| Score | Interprétation |
|---|---|
| 100 | Aucun item détecté, perf optimale |
| 75-99 | Items P2/P3 mineurs |
| 50-74 | Items P1, refactos significatifs nécessaires |
| 25-49 | Items P0, app à risque |
| <25 | Refonte majeure recommandée |

### KPIs
- Score code health moyen 14 apps **>75**
- 0 vuln high/critical >7 jours
- Items P0 résolus **<72h**
- 80% items P1 résolus dans le sprint courant
- Trend "improving" sur 60%+ des apps après 6 mois
- Bundle size +5% max sur baseline 12 semaines

---

## 2. Tables BDD

### `asvc_code_health_audits` (1 ligne / app / run hebdo)
```
id, agent_id, app_concerned, audit_date (UNIQUE par app/date),
score (0-100), metrics JSONB, items_detected_count, items_critical_count,
trend (improving/stable/degrading), previous_score,
scan_tools_used JSONB, scan_duration_seconds, related_action_id
```

### `asvc_tech_debt_items` (1 ligne / item détecté)
```
id, detected_by_agent_id, audit_id,
app_concerned, category (11 enums : duplication, complexity, unused_code,
  outdated_dep, vulnerability, perf_regression, arch_smell, bundle_bloat,
  rls_missing, security_definer_search_path, i18n_missing),
title, description, severity (low/medium/high/critical),
priority (P0/P1/P2/P3), file_paths TEXT[], detected_metric JSONB,
effort_estimate (XS/S/M/L/XL),
status (detected/qualified/in_backlog/in_progress/fixed/wont_fix/duplicate),
related_pr_id, fix_branch, resolved_at, resolution_notes
```

RLS : pattern `is_admin()` cohérent. Indexes : `(app_concerned, priority, status)` + `(priority, created_at DESC) WHERE status IN (...)`.

### Vue `v_asvc_tech_debt_priority`
Backlog priorisé pour Dev Agent + cockpit. `security_invoker=true`.

---

## 3. Extension Dev Agent

Le system_prompt du Dev Agent intègre désormais une section **"SOURCES DE TRAVAIL"** :

1. Bugs P0/P1 (Bug Triage) → `asvc/fix-{bug_id}`
2. Specs approuvées → `asvc/{feature_slug}`
3. Tech Debt P0/P1 (qualified) → `asvc/refactor-{tech_debt_id}`
4. Tech Debt P2/P3 → en parallèle des features, slot ~20% du sprint

**Convention sprint type** : 60% specs + 20% bugs + 20% tech_debt.

Lifecycle d'un item :
- Tech Debt détecte → status='detected', priority=P0/P1/P2/P3
- Pame valide → status='qualified'
- Dev pioche → UPDATE status='in_progress', fix_branch='asvc/refactor-{id}'
- PR mergée → UPDATE status='fixed', resolved_at, related_pr_id

---

## 4. Extension Product Designer Agent

Le system_prompt du Product Designer intègre désormais une **MISSION 2 : AUDIT UX TRIMESTRIEL**.

### Rotation des apps (4 trimestres × 3-4 apps)

| Trimestre | Apps auditées |
|---|---|
| T1 (jan-mars) | atlas-finance, liasspilot, cashpilot, wisehr |
| T2 (avr-juin) | wisefm, atlasbanx, advist, docjourney |
| T3 (juil-sep) | duedeck, atlastrade, tablesmart, atlas-lease |
| T4 (oct-déc) | cockpitjourney, cockpit-fna + 2 revues approfondies |

### Cron trimestriel (1er jour du trimestre, 6h)
Pour chaque app : reconnaissance (code + screenshots + tickets) → audit 5 axes (design system, accessibilité, cohérence flows, mobile-first, i18n) → rapport UX avec score 0-100 → propositions roadmap refonte (effort XS-XL).

---

## 5. Couverture des 5 gaps (récap)

| Gap | Couvert par |
|---|---|
| Audit proactif code existant | Tech Debt Agent (cron hebdo, 4 domaines) |
| Refactoring planifié | Tech Debt Agent (backlog priorisé) + Dev Agent (exécution via slot 20%) |
| Performance audit complet | Tech Debt Agent (Lighthouse full app, pas juste PR diff) |
| Mise à jour des dépendances | Tech Debt Agent (npm-check-updates, npm audit, propositions upgrades) |
| Refonte UX | Product Designer Agent (audit UX trimestriel, rotation 14 apps) |

---

## 6. Migrations sources

| Timestamp | Migration | Contenu |
|---|---|---|
| `20260516200000` | `asvc_tech_debt_agent` | 2 tables + view + RLS + seed agent |
| `20260516210000` | `asvc_v2_1_system_prompts` | Tech Debt prompt + extensions Dev + Product Designer |

---

## 7. Prochaines étapes

- **Cockpit** : ajouter page admin `AsvcTechDebtPage` (lit `v_asvc_tech_debt_priority`) — pendant avec `AsvcTestsReadinessPage`
- **Edge functions** : implémenter `asvc-tech-debt-scan` (Edge Function qui orchestre SonarCloud + npm + Lighthouse, alimente les tables)
- **Cron** : Vercel Cron lundi 6h → invoke `asvc-tech-debt-scan`
- **Test cases Annexe C** : ajouter ~6-8 tests pour le Tech Debt Agent (TD-N1..N3, TD-E1..E2, TD-S1..S2)

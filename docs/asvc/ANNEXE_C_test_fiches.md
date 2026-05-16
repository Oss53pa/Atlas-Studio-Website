# Annexe C — Fiches de tests par agent ASVC

**Statut** : opérationnalisée en BDD via `asvc_agent_test_cases` (table) + `v_asvc_agent_readiness` (vue) + `asvc_record_test_result()` (RPC).

**Source** : CDC ASVC v2.0 — Annexe C, version 1.0 (mai 2026).

---

## Vue d'ensemble

154 cas de tests catalogués sur 4 axes :

| Catégorie BDD | Description | Compteur |
|---|---|---|
| `nominal` | Cas nominal (happy path) | 59 |
| `edge` | Edge cases, limites, valeurs extrêmes | 40 |
| `security` | Prompt injection, jailbreaks, exfiltration, bypass | 32 |
| `compliance` | RGPD, OHADA, refus engagement non-validé | 7 |
| `syscohada` | Conformité SYSCOHADA stricte (⭐ critique) | 10 |
| `resilience` | Fallback LLM, retry backoff, file d'attente | 3 |
| `performance` | Latence brief, propagation ordre, pipeline QA | 3 |
| **Total** | | **154** |

**Tests `is_critical = TRUE` (22)** :
- `D-S1..S4` — Dev Agent sécurité (commit main, secrets, malware, workflows)
- `Q-SC1..SC6` — QA SYSCOHADA (Bilan, TVA UEMOA/CEMAC, TFT, TAFIRE, Liasse)
- `DO-S1..S4` — DevOps sécurité (deploy sans approval, skip dry-run, migration irréversible, rollback auto)
- `COMP-SC1..SC4` — Compta SYSCOHADA (plan comptes, vente B2B, Mobile Money, extournes)
- `BT-E2` — Bug SYSCOHADA escalade critical immédiate
- `T-S1`, `T-S3`, `T-S4` — Kill switch global, audit immutability, hash chain

---

## Schéma BDD

```sql
asvc_agent_test_cases (
  id              UUID PK,
  agent_code      TEXT (NULL pour tests transverses, sinon FK asvc_agents.code),
  test_id         TEXT NOT NULL,        -- 'C-N1', 'Q-SC1', 'T-R1'
  scope           TEXT CHECK ('agent' | 'transverse'),
  category        TEXT CHECK (...),
  is_critical     BOOLEAN,
  scenario        TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,
  last_run_at     TIMESTAMPTZ,
  last_status     TEXT CHECK ('pending' | 'passed' | 'failed' | 'skipped' | 'flaky'),
  last_run_notes  TEXT,
  created_at, updated_at,
  UNIQUE (COALESCE(agent_code, '_transverse'), test_id)
)
```

RLS : `is_admin()` lecture + écriture (cohérent ASVC).

---

## Usage opérationnel

### Lire l'état de préparation d'un agent

```sql
SELECT * FROM v_asvc_agent_readiness WHERE agent_code = 'dev';
-- → agent_code, name, department, agent_status,
--   total_tests, passed, failed, pending, critical_pending,
--   readiness_pct, stage_recommended
```

### Enregistrer un résultat de test

```sql
SELECT public.asvc_record_test_result(
  p_agent_code => 'dev',
  p_test_id    => 'D-S3',
  p_status     => 'passed',
  p_notes      => 'Gitleaks pre-commit hook installé et testé manuellement'
);
-- → UUID du test case mis à jour
```

Statuts valides : `pending` | `passed` | `failed` | `skipped` | `flaky`.

Pour un test transverse (sans agent) : passer `NULL` à `p_agent_code`.

### Logique de recommandation (`stage_recommended`)

| Condition | `stage_recommended` |
|---|---|
| Aucun test défini pour l'agent | `no_tests_defined` |
| Au moins 1 test ⭐ critique non passé | `needs_work` |
| 100% des tests passent | `ready_for_production` |
| ≥90% des tests passent ET 0 critique restant | `ready_for_shadow` |
| Sinon | `needs_work` |

Procédure pré-production (cf. Annexe C §"Procédure de validation") :
1. Tous les tests `pending` → exécutés et enregistrés
2. `critical_pending = 0` confirmé
3. `readiness_pct ≥ 90` → activation mode **shadow** 7 jours
4. Si shadow OK → bascule production supervisée

---

## Hors-scope (à traiter ultérieurement)

- **Génération des test stubs exécutables** : 154 fichiers `*.test.ts` (Vitest), `*.spec.ts` (Playwright E2E), `*.sql` (SYSCOHADA assertions). Chaque stub appellera `asvc_record_test_result()` à la fin pour persister le résultat.
- **CI/CD** : pipeline GitHub Actions qui exécute la suite après chaque PR et met à jour la BDD via le RPC.
- **Cockpit UI** : page admin qui consomme `v_asvc_agent_readiness` (badges `ready_for_shadow` / `needs_work` par agent, drill-down sur les tests pending).

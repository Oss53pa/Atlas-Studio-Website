# Annexe F — Templates ASVC

**Statut** : opérationnalisée. Templates seedés dans `asvc_agent_memory_shared`.

**Source** : CDC ASVC v2.0 — Annexe F, version 1.0 (mai 2026).

---

## Catalogue des 21 templates

Convention de clés : `template_<agent>_<purpose>`. Toutes les valeurs sont en JSONB avec structure :
```json
{
  "subject": "...",       // optionnel (présent pour emails)
  "body": "...",          // contenu principal
  "variables": [...],     // placeholders à remplacer
  "version": 1,
  "source_annexe": "F" | "G"
}
```

### Customer Success Agent (5 emails)

| Clé | Description |
|---|---|
| `template_cs_email_t1_welcome` | T1 — Email bienvenue J0 |
| `template_cs_email_t2_setup` | T2 — Setup onboarding J+1 |
| `template_cs_email_t3_check_j7` | T3 — Check adoption J+7 |
| `template_cs_email_t4_review_j30` | T4 — Bilan J+30 + NPS |
| `template_cs_email_t8_churn_rescue` | T8 — Sauvetage churn |

### SDR Agent (3 emails séquence cabinets)

| Clé | Description |
|---|---|
| `template_sdr_email_cabinets_j0` | Touche J0 — premier contact |
| `template_sdr_email_cabinets_j7` | Touche J+7 — value proposition |
| `template_sdr_email_breakup_j21` | Touche J+21 — break-up |

### Content Agent (3 posts réseaux sociaux)

| Clé | Description |
|---|---|
| `template_content_linkedin_educational_tva` | LinkedIn — Post éducatif TVA UEMOA |
| `template_content_linkedin_case_study` | LinkedIn — Cas client cabinet Dakar |
| `template_content_instagram_carousel_syscohada` | Instagram — Carousel 5 erreurs SYSCOHADA (7 slides) |

### Facturation Agent (1)

| Clé | Description |
|---|---|
| `template_facturation_invoice_ohada_saas` | Modèle facture OHADA SaaS B2B (mentions légales complètes) |

### Support N1 Agent (3 réponses tickets)

| Clé | Description |
|---|---|
| `template_support_n1_faq_standard` | T-SAV-001 — FAQ standard |
| `template_support_n1_bug_in_progress` | T-SAV-002 — Bug confirmé en cours de correction |
| `template_support_n1_clarification` | T-SAV-003 — Demande clarification |

### Dev Agent (1)

| Clé | Description |
|---|---|
| `template_dev_pr_description_feature` | Template PR GitHub nouvelle feature |

### QA Agent (1)

| Clé | Description |
|---|---|
| `template_qa_report_pr_comment` | Template rapport QA en commentaire PR |

### Closer Agent (1)

| Clé | Description |
|---|---|
| `template_closer_proposal_commercial` | Template proposition commerciale complète |

### Annexe G — Communications incident (3)

| Clé | Description |
|---|---|
| `template_incident_communication_in_progress` | SMS/Email "incident en cours" |
| `template_incident_communication_resolved` | SMS/Email "incident résolu" |
| `template_incident_post_mortem` | Post-mortem (publié sous 48h) |

---

## Usage opérationnel

### Lire un template depuis un agent

```sql
SELECT value->>'subject' AS subject,
       value->>'body'    AS body,
       value->'variables' AS variables
FROM public.asvc_agent_memory_shared
WHERE key = 'template_cs_email_t1_welcome';
```

### Mettre à jour un template (Pame admin uniquement, RLS)

```sql
UPDATE public.asvc_agent_memory_shared
SET value = jsonb_set(value, '{body}', to_jsonb('Nouveau texte...'::text)),
    updated_at = now()
WHERE key = 'template_cs_email_t1_welcome';
```

### Convention de versioning

Modification non-breaking → `version++`. Modification breaking (suppression de variables, changement de structure) → nouvelle clé `template_..._v2`. L'ancienne version reste en BDD pour audit/rollback.

---

## Migration source

[supabase/migrations/20260516190000_asvc_annexe_f_g_templates_seed.sql](../../supabase/migrations/20260516190000_asvc_annexe_f_g_templates_seed.sql)

Idempotent via `ON CONFLICT (key) DO NOTHING` — préserve toute modification manuelle effectuée après le seed initial.

---

## Validation

Les modifications de templates passent par le workflow normal :
1. Agent (ou admin) propose modification → `asvc_agent_actions` avec criticality `normal` ou `high`
2. Validation Pame
3. UPDATE appliqué + version incrémentée
4. Audit log `asvc_audit_log` enregistre l'événement (acteur, ancien hash, nouveau hash)

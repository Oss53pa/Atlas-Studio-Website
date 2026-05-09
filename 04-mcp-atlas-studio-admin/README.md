# @atlas-studio/admin-mcp

MCP server **réservé à l'owner d'Atlas Studio** (Pamela). Permet de piloter toute la plateforme via Claude :

- Gérer les clients (créer, voir, supprimer)
- Gérer les abonnements (prolonger trial, annuler, offrir gratuit)
- Gérer le catalogue d'apps (statut, visibilité, pricing)
- Voir les statistiques (MRR, conversion, trials)
- Re-envoyer des emails d'invitation

⚠️ **Ce serveur utilise le `service_role` key et bypasse TOUTES les RLS.** Ne JAMAIS le distribuer publiquement.

## 🛠️ 17 outils disponibles

### Clients (4)
- `list_clients` — tous les clients avec filtres
- `get_client` — détails complets
- `create_client_with_trial` — créer + activer trial + email
- `delete_client` — suppression définitive

### Subscriptions (4)
- `list_subscriptions` — filtres status/app/email
- `extend_trial` — prolonger de N jours
- `cancel_subscription` — immédiat ou fin de période
- `grant_free_subscription` — offrir un accès gratuit

### Apps (4)
- `list_apps` — catalogue complet
- `update_app_status` — available/unavailable/coming_soon
- `toggle_app_visibility` — afficher/cacher sur le site
- `update_app_pricing` — modifier les prix

### Stats (3)
- `get_dashboard` — MRR, clients, conversion
- `get_revenue_breakdown` — répartition par app
- `list_expiring_trials` — trials qui expirent bientôt

### Ops (2)
- `send_invitation_email` — re-envoyer un email
- `execute_sql_query` — query SELECT adhoc (sécurisé)

## 🔧 Configuration Claude Cowork

```json
{
  "mcpServers": {
    "atlas-studio-admin": {
      "command": "node",
      "args": ["/chemin/04-mcp-atlas-studio-admin/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://vgtmljfayiysuvrcmunt.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<votre_service_role_key>",
        "RESEND_API_KEY": "<optionnel>"
      }
    }
  }
}
```

## 💬 Exemples de prompts

> *"Combien j'ai de MRR ce mois ?"*
> *"Liste les clients en trial qui expirent dans 3 jours"*
> *"Mets Cockpit Journey en mode coming_soon"*
> *"Augmente le plan Group de Cockpit F&A à 120 000 FCFA"*
> *"Prolonge le trial de Aniella de 30 jours supplémentaires"*
> *"Crée un client test@exemple.com avec un trial Advist 14 jours"*
> *"Quels sont mes 3 apps les plus rentables ?"*

## 📦 Installation

```bash
cd 04-mcp-atlas-studio-admin
cp .env.example .env  # puis éditer avec votre service_role_key
npm install
npm run build
```

## ⚠️ Sécurité

- **Stockez le service_role key dans un gestionnaire de mots de passe** (1Password, Bitwarden)
- **Ne committez jamais .env** dans Git
- **Révoquez le service_role key immédiatement** si vous suspectez une fuite (regénérer dans Supabase dashboard)
- **N'utilisez ce MCP que sur votre propre machine**
- L'outil `execute_sql_query` n'autorise QUE les `SELECT` (rejette tout `INSERT/UPDATE/DELETE/DROP/ALTER`)

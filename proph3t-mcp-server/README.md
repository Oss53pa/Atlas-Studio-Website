# Proph3t MCP Server

Expose les **197 tools Proph3t** (Atlas Studio) à tout client MCP : Claude Desktop, Cursor, Windsurf, Cline, etc.

## Installation

```bash
cd proph3t-mcp-server
npm install
npm run build
```

## Configuration Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) ou `%APPDATA%\Claude\claude_desktop_config.json` (Windows) :

```json
{
  "mcpServers": {
    "proph3t": {
      "command": "node",
      "args": ["/absolute/path/to/proph3t-mcp-server/dist/index.js"],
      "env": {
        "PROPH3T_SUPABASE_URL": "https://vgtmljfayiysuvrcmunt.supabase.co",
        "PROPH3T_API_KEY": "<your-supabase-anon-key-or-service-role>",
        "PROPH3T_USER_TOKEN": "<optional-jwt-user-token>"
      }
    }
  }
}
```

Redémarre Claude Desktop. Tu devrais voir 197 tools disponibles dans le menu attachments.

## Configuration Cursor

Edit `~/.cursor/mcp.json` :

```json
{
  "mcpServers": {
    "proph3t": {
      "command": "node",
      "args": ["/absolute/path/to/proph3t-mcp-server/dist/index.js"],
      "env": {
        "PROPH3T_SUPABASE_URL": "https://vgtmljfayiysuvrcmunt.supabase.co",
        "PROPH3T_API_KEY": "..."
      }
    }
  }
}
```

## Outils exposés

- **34 L1 Core** : memory, RAG, calculs SYSCOHADA, vision, security, meta
- **83 L2 Métier** : finance, RH, immobilier, retail, audit, fiscal, juridique, marketing, etc.
- **80 L3 App-specific** : Cockpit-FA, WiseHR, DueDeck, AtlasBanx, AtlasTrade, CashPilot, et 9 autres
- **8 Workflows orchestrés** : audit complet, closing mensuel/annuel, due diligence, paie mensuelle, etc.

## Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `PROPH3T_SUPABASE_URL` | URL projet Supabase Atlas Studio | Oui |
| `PROPH3T_API_KEY` | Clé Supabase (anon ou service_role) | Oui |
| `PROPH3T_USER_TOKEN` | JWT utilisateur (si non fourni : service_role) | Non |

## Architecture

```
Claude Desktop / Cursor
    ↓ stdio (JSON-RPC)
[proph3t-mcp-server]
    ↓ HTTPS
Supabase Edge Function (proph3t-tool-direct)
    ↓
runTool() — switch sur 197 tools
```

## Sécurité

- Le service role key permet l'accès full ; ne jamais committer
- Préférer un JWT user à durée limitée si plusieurs utilisateurs
- L'edge function `proph3t-tool-direct` audit chaque appel (proph3t_audit_log)

## Licence

MIT — Atlas Studio

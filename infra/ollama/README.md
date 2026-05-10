# Ollama public pour Atlas Studio Proph3t

Setup pour héberger Ollama sur un VPS, accessible publiquement via Cloudflare Tunnel (HTTPS gratuit, pas besoin d'ouvrir des ports), pour que les Edge Functions Supabase de Proph3t puissent l'appeler.

## Architecture

```
[Supabase Edge Function proph3t-ask]
            │
            │ HTTPS POST
            ▼
[ollama.atlas-studio.org] (Cloudflare Tunnel)
            │
            ▼
[VPS Hetzner — Docker]
   ├─ Ollama (llama3.1:8b + nomic-embed-text)
   └─ cloudflared (tunnel agent)
```

**Avantages Cloudflare Tunnel** :
- Pas d'ouverture de port firewall (le VPS reste invisible publiquement)
- HTTPS automatique gratuit
- Optionnel : ajout de Cloudflare Access pour limiter l'accès à certains comptes (sécurité)

## Prérequis

1. **VPS** : ~10€/mois, 8GB RAM minimum
   - **Recommandé** : [Hetzner CX41](https://www.hetzner.com/cloud) (Allemagne, latence ~50ms vers Afrique francophone)
   - Alternatives : Scaleway DEV1-M, OVH VPS Comfort
   - Ubuntu 22.04 ou 24.04
2. **Compte Cloudflare** (gratuit)
3. **Domaine** géré par Cloudflare (ex: atlas-studio.org)

## Étape 1 — Créer un Cloudflare Tunnel

1. Va sur https://one.dash.cloudflare.com/?to=/:account/networks/tunnels
2. Clique **"Create a tunnel"** → choisis "Cloudflared"
3. Nomme-le `ollama-atlas`
4. **Copie le tunnel token** (commence par `eyJ...`, une longue chaîne)
5. Dans **"Public Hostnames"** :
   - Subdomain : `ollama`
   - Domain : `atlas-studio.org`
   - Service : `http://ollama:11434` ⚠️ *important : nom de container Docker, pas localhost*
6. Sauvegarde

## Étape 2 — Provisionner le VPS

Sur Hetzner :
1. Console → **Server** → **Add Server**
2. **Image** : Ubuntu 24.04
3. **Type** : `CX41` (4 vCPU, 8GB RAM, 80GB disk) — ~10€/mois
4. **Location** : Falkenstein (DE) ou Helsinki (FI) selon ta préférence
5. Crée → note l'IP publique
6. Connecte-toi en SSH : `ssh root@<IP>`

## Étape 3 — Lancer le setup

```bash
# Sur le VPS, en root :
export CLOUDFLARE_TUNNEL_TOKEN="eyJ..."  # ton token
curl -fsSL https://raw.githubusercontent.com/Oss53pa/Atlas-Studio-Website/main/infra/ollama/setup.sh | bash
```

Le script :
1. Installe Docker
2. Lance Ollama + cloudflared en containers
3. Pull les modèles `llama3.1:8b-instruct-q4_K_M` (~4.7GB) et `nomic-embed-text` (~270MB)
4. Affiche un test de santé

⏱ Durée totale : ~10 min (le pull des modèles est le plus long).

## Étape 4 — Vérifier que ça marche

Depuis ta machine locale :
```bash
curl https://ollama.atlas-studio.org/api/tags
# Doit afficher : {"models":[{"name":"llama3.1:8b-instruct-q4_K_M","..."},{"name":"nomic-embed-text","..."}]}
```

Test de génération :
```bash
curl -X POST https://ollama.atlas-studio.org/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b-instruct-q4_K_M","prompt":"Bonjour","stream":false}'
```

## Étape 5 — Configurer Supabase

```bash
cd "C:\devs\SiteWeb Atlas Studio"
supabase secrets set OLLAMA_URL=https://ollama.atlas-studio.org
supabase functions deploy proph3t-ask
```

À partir de là :
- Les users sans BYOK (Anthropic/Gemini) → tombent sur Ollama gratuit (qualité basique)
- Les users avec BYOK → continuent d'utiliser leur clé premium
- **Les tools `search_knowledge` et `search_documents` (RAG OHADA) deviennent accessibles** pour TOUS les providers (Anthropic + Gemini + Ollama), car Ollama sert d'embeddings via `nomic-embed-text`

## Sécurité

Par défaut Ollama est exposé publiquement via le tunnel. **N'importe qui** connaissant l'URL peut envoyer des requêtes (et te coûter de la conso CPU/électricité).

**Recommandation** : ajoute Cloudflare Access pour restreindre l'accès :
1. Dans Cloudflare → **Zero Trust** → **Access** → **Applications** → **Add an application**
2. Type : **Self-hosted**
3. Hostname : `ollama.atlas-studio.org`
4. Policy : **Service Auth** (basé sur un token shared secret) OU **Email** (whitelist)
5. Pour Service Auth : génère un token, ajoute-le aux requêtes via header `CF-Access-Client-Id` + `CF-Access-Client-Secret`

⚠️ Ça nécessite de modifier `_shared/proph3t/ollama.ts` pour envoyer ces headers. Je peux le faire quand tu seras prête.

## Coûts indicatifs

| Item | Coût/mois |
|---|---|
| Hetzner CX41 (8GB RAM) | ~10€ |
| Cloudflare Tunnel | 0€ (gratuit) |
| Cloudflare Access (50 users free tier) | 0€ |
| Domaine atlas-studio.org | déjà payé |
| **Total** | **~10€/mois** |

À ~10€/mois, tu as un Ollama qui sert tes 7 apps clientes + admin sans coût marginal par requête. Compare aux $0.50-1.50/user/mois de Gemini Flash centralisé.

## Performance attendue (CX41 sans GPU)

- **Llama 3.1 8B q4_K_M** : ~5-10 tokens/seconde
- Pour une réponse OHADA de 200 tokens : ~20-40 secondes (acceptable mais lent)
- **nomic-embed-text** (embeddings) : ~50ms/embedding (rapide)

Si tu veux 10× plus rapide, prends un VPS GPU (Hetzner GEX-44, ~150€/mois) — mais à ce prix, autant payer Gemini Flash centralisé.

## Maintenance

Le container redémarre automatiquement (`restart: unless-stopped`). Pour les opérations courantes :

```bash
# Voir les logs
docker compose -f /opt/atlas-ollama/docker-compose.yml logs -f

# Redémarrer
docker compose -f /opt/atlas-ollama/docker-compose.yml restart

# Mettre à jour Ollama
docker compose -f /opt/atlas-ollama/docker-compose.yml pull
docker compose -f /opt/atlas-ollama/docker-compose.yml up -d

# Pull un nouveau modèle
docker exec ollama ollama pull <model-name>
```

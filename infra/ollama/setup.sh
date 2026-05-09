#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Atlas Studio — Setup Ollama public sur VPS (Hetzner / Scaleway / OVH)
# ═══════════════════════════════════════════════════════════════════════════
# Usage : sur un VPS Ubuntu 22.04+ frais, en root :
#   curl -fsSL https://raw.githubusercontent.com/Oss53pa/Atlas-Studio-Website/main/infra/ollama/setup.sh | bash
# Ou clone le repo et lance ce script.
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🚀 Atlas Studio — Setup Ollama public"
echo ""

# ── 1. Update OS & install Docker ──
echo "📦 Installing Docker..."
apt-get update -qq
apt-get install -y curl ca-certificates gnupg

if ! command -v docker &> /dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -qq
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable --now docker

# ── 2. Cloudflare Tunnel token ──
if [ -z "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
  echo ""
  echo "⚠️  CLOUDFLARE_TUNNEL_TOKEN n'est pas défini."
  echo ""
  echo "Pour obtenir un tunnel token :"
  echo "  1. Va sur https://one.dash.cloudflare.com/?to=/:account/networks/tunnels"
  echo "  2. Crée un nouveau tunnel (ex: 'ollama-atlas')"
  echo "  3. Copie le token (commence par 'eyJ...')"
  echo "  4. Configure le routage public : https://ollama.atlas-studio.org"
  echo "     Service : http://ollama:11434"
  echo ""
  echo "Puis relance avec :"
  echo "  CLOUDFLARE_TUNNEL_TOKEN='eyJ...' bash $0"
  exit 1
fi

# ── 3. Deploy stack ──
echo "📂 Setup project directory at /opt/atlas-ollama..."
mkdir -p /opt/atlas-ollama
cd /opt/atlas-ollama

# Download docker-compose.yml from github
curl -fsSL -o docker-compose.yml \
  https://raw.githubusercontent.com/Oss53pa/Atlas-Studio-Website/main/infra/ollama/docker-compose.yml

# Write env file
cat > .env <<EOF
CLOUDFLARE_TUNNEL_TOKEN=$CLOUDFLARE_TUNNEL_TOKEN
EOF

echo "🐳 Starting Ollama + Cloudflare Tunnel..."
docker compose up -d

# ── 4. Pull models ──
echo "⏳ Waiting for Ollama to be ready..."
for i in {1..30}; do
  if curl -sf http://localhost:11434/api/tags > /dev/null; then break; fi
  sleep 2
done

echo "📥 Pulling models (this takes 5-10 min)..."
docker exec ollama ollama pull llama3.1:8b-instruct-q4_K_M
docker exec ollama ollama pull nomic-embed-text

echo ""
echo "✅ Setup terminé !"
echo ""
echo "Vérification locale :"
curl -s http://localhost:11434/api/tags | head -c 500
echo ""
echo ""
echo "Maintenant configure le secret Supabase :"
echo "  supabase secrets set OLLAMA_URL=https://ollama.atlas-studio.org"
echo ""

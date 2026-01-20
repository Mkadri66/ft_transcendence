#!/bin/bash
set -e

# 🔐 Certificat SSL
CERT_DIR="/app/cert"
KEY_FILE="$CERT_DIR/key.pem"
CERT_FILE="$CERT_DIR/cert.pem"
mkdir -p "$CERT_DIR"
if [ ! -s "$KEY_FILE" ] || [ ! -s "$CERT_FILE" ]; then
  echo "🔑 Génération certificat..."
  openssl req -x509 -nodes -days 365 \
    -subj "/C=FR/ST=Paris/L=Paris/O=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE"
fi

echo "🚀 Déploiement Fuji Testnet..."
npx hardhat compile
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network fuji --show-stack-traces)
echo "$DEPLOY_OUTPUT"
DEPLOY_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o "0x[a-fA-F0-9]\{40\}" | head -n1)

if [ -n "$DEPLOY_ADDRESS" ]; then
  echo "📌 Contrat déployé à l'adresse : $DEPLOY_ADDRESS"
  echo "💾 Adresse enregistrée dans /app/blockchain/contract-address.json"
  echo "📦 ABI copiée vers /app/blockchain/TournamentScores.json"
else
  echo "❌ Impossible de récupérer l'adresse du contrat."
fi

exec node --watch server.js

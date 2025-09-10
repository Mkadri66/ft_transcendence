#!/bin/bash
set -e

CERT_DIR="/app/cert"
KEY_FILE="$CERT_DIR/key.pem"
CERT_FILE="$CERT_DIR/cert.pem"

mkdir -p "$CERT_DIR"

# Vérifie si les 2 fichiers existent
if [ ! -s "$KEY_FILE" ] || [ ! -s "$CERT_FILE" ]; then
  echo "🔑 Aucun certificat valide trouvé, génération en cours..."
  openssl req -x509 -nodes -days 365 \
    -subj "/C=FR/ST=Paris/L=Paris/O=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE"
  echo "✅ Certificat généré : $CERT_FILE"
else
  echo "🔐 Certificat déjà présent et valide."
fi

# Lancer le serveur Node
exec node --watch server.js

#!/bin/sh
set -e

mkdir -p /app/cert

if [ ! -f /app/cert/key.pem ] || [ ! -f /app/cert/cert.pem ]; then
  openssl req -x509 -nodes -days 365 \
    -subj "/C=FR/ST=Paris/L=Paris/O=Dev/CN=localhost" \
    -newkey rsa:2048 \
    -keyout /app/cert/key.pem \
    -out /app/cert/cert.pem
fi

node --watch server.js

# Image Node officielle basée sur Debian (pas Alpine)
FROM node:20-slim

# Dossier de travail dans le conteneur
WORKDIR /app

# Installer outils de build natif
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package.json package-lock.json ./

# Installer les dépendances (dont better-sqlite3) dans Docker (donc pour Linux)
RUN npm install --omit=dev

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Commande pour démarrer l'app
CMD ["node", "server.js"]

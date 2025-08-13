# Image Node officielle basée sur Debian (pas Alpine)
FROM node:20-slim

# Définition du fuseau horaire (étape ajoutée)
ENV TZ=Europe/Paris
RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances (optimisée)
COPY package*.json ./
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    npm install --production && \
    apt-get remove -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copie des fichiers de l'application
COPY . .

EXPOSE 3000

# Vérification du fuseau horaire (pour debug)
RUN echo "Fuseau horaire configuré : $(cat /etc/timezone)" && \
    echo "Date actuelle : $(date)"

# Commande pour démarrer l'app
CMD ["node", "--watch", "server.js"]
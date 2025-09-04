# Image Node officielle basée sur Debian
FROM node:20-slim

# Définition du fuseau horaire
ENV TZ=Europe/Paris
RUN apt-get update && \
    apt-get install -y tzdata openssl && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copie des fichiers de package pour installer les dépendances
COPY package*.json ./

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    npm install --production && \
    apt-get remove -y python3 make g++ && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copie du reste de l'application
COPY . .

# Copier et rendre exécutable le script d'entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Exposer le port
EXPOSE 3000

# Utiliser l'entrypoint pour générer le certificat et démarrer le serveur
ENTRYPOINT ["/entrypoint.sh"]

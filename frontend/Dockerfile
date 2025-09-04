FROM node:20

WORKDIR /app

# Copie les fichiers package
COPY package*.json ./
RUN npm install

# Copie le reste du projet
COPY . .

# Génère les certificats pour HTTPS (uniquement pour dev)
RUN mkdir -p /app/cert && \
    openssl req -x509 -nodes -days 365 \
    -subj "/C=FR/ST=Paris/L=Paris/O=Dev/CN=localhost" \
    -newkey rsa:2048 \
    -keyout /app/cert/key.pem \
    -out /app/cert/cert.pem

# Build frontend
RUN npm run build

EXPOSE 5173

# Pour dev HTTPS
CMD ["npm", "run", "dev", "--", "--host"]

# ft_transcendence (Docker fullstack setup)

## Lancer le projet

Assure-toi d'avoir Docker et Docker Compose installés.

### 1. À la racine du projet :
```bash
docker-compose up --build
```

### 2. Accéder à l'application :
- Frontend : http://localhost:5173
- Backend : http://localhost:3000

### 3. Appels API depuis le frontend :
Utilise `http://backend:3000/...` dans tes requêtes JS (en local Docker, `backend` = nom du conteneur).

---

**Chaque modification du code nécessite un redémarrage du conteneur concerné pour être prise en compte !**

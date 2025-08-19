# ft_transcendence - Chat + Tournoi (wizard) + Pong

## Lancer
```bash
docker-compose build --no-cache
docker-compose up
```
- Frontend : http://localhost:5173
- Backend  : http://localhost:3000

## Tournoi (Wizard)
- Bouton **Nouveau tournoi** ➜ étapes : nombre de joueurs (2–8), alias par joueur, confirmation
- Bracket **visuel** (colonnes + liaisons SVG), scores affichés dans chaque carte
- **Lancer le match** ➜ Pong démarre avec alias; **score auto** à la fin ➜ avance au tour suivant
- Annonces dans le chat : **matchups** et **🏆 champion**

## Pong
- J1 : W / S — J2 : ↑ / ↓
- Pause : Espace / P
- Score : 11

> Démo en mémoire sans BDD. Pour persister tournois/scores, brancher une API et stocker côté backend.

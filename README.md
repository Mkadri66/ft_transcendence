# ft\_transcendence 

## Project Overview - Description

This project has been created as part of the **42 curriculum** by evella, jlongin and mkadri.
It consists of building a **fullstack web application** centered around a **multiplayer Pong game** (local multiplayer).  
The goal is to design a secure, containerized, and feature-rich application using modern web technologies.

## Instructions

- Make sure you have **Docker** and **Docker Compose** installed.
- Do not forget to fill the missing informations for the hidden file **.env** ( you can find an example from the '.env.example')
In the root folder, tap :
``` bash
docker-compose up --build
```
- Connect first to https://localhost:3000 to enable backend.
- Then, go to **https://localhost:5173**

Finally, everything is set up.

## AI Usage

- AI is used to perform repetitive tasks and comprehend the global goal of each module.

---

## Team Information

**mkadri** - Product Owner, Architect, Developer
```
- validates completed work.
- maintains the product backlog.

- defines technical architecture.
- ensures code quality.
```

**evella** - Technical Lead, Developer
```
- reviews critical code changes.
- makes decisions.
```

**jlongin** - Project Manager, Developer
```
- Ensures team communication.
- organizes team meetings.
```

## Project Management

- The team is build with the optimal qualities of each member. Depending on that, it was natural to concede roles.
- We mainly use **Github**
- Communication with both **Discord** and **Slack**

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript, Tailwind
- **Backend**: Node.js with Fastify
- **Database**: SQLite ( easiest database for us. )
- **Containerization**: Docker & Docker Compose

## Database Schema

- The tables are :
    -> blocked\_users
    -> game\_players
    -> tournaments
    -> users
    -> friends
    -> games
    -> user\_stats

- The main categories :

    -> tournaments
        id | name | winner_id | created at
    -> users
        id | username | email | password | google_id | is_2fa_enabled | 2fa_secret | avatar | created_at
    -> games
        id | tournament_id | name | created_at | finished_at | winner_id | status

- Structure :

tournaments
   ↓
 games
   ↓
game\_players
   ↑
 users

## Key Features

Everyone worked on these features :

- 🎮 **Multiplayer Pong game** with match customization options.  
- 🔐 **Google Sign-In** integration for user authentication.  
- 📱 **Multi-Factor Authentication (MFA)** setup using a QR code for enhanced security.  
- 📝 **Custom registration form** with thorough data validation.  
- 🔑 **JWT tokens** implementation for secure API authentication.  
- ⚙️ **Dockerized architecture** with separate containers for frontend and backend.

## Modules

- For each module, we liked them and was perfect for what we wanted to achieve, so we implememented those.

Major : Use a framework for both the frontend and backend.
Major : Allow users to interact with other users.
Major : Standard user management and authentication.
Minor : Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
Minor : Implement a complete 2FA (Two-Factor Authentication) system for the
users.
Minor : Implement a tournament system.
Major : Store tournament scores on the Blockchain.


## Individual Contributions

**mkadri** — Backend & Security
``` bash
- Built backend with Node.js & Fastify.
- Implemented authentication: JWT, Google OAuth, 2FA.

Challenge: Securing authentication and 2FA → solved with bcrypt and middleware.
```

**jlongin** — Database & Blockchain
``` bash
- Designed database schema and statistics system.
- Integrated blockchain integration

Challenge: Syncing blockchain fuji testnet with the database → using of hardhat.
```

**evella** — Frontend & Infrastructure
``` bash
- Configured Docker & project integration.
- Managed user, game, and tournament relations.

Challenge: Handling many-to-many relations & container networking → solved with proper foreign keys and Docker setup.
```

// Fastify v4 backend + WS chat + matchup/tournament broadcast
import fastifyFactory from 'fastify';
import cors from '@fastify/cors';
import websocketPlugin from '@fastify/websocket';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const app = fastifyFactory({ logger: false });

await app.register(cors, {
  origin: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
});
await app.register(websocketPlugin);

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
);

app.get('/', async () => ({ ok: true, service: 'backend' }));
app.get('/health', async () => ({ status: 'ok' }));

const users = [
  { id: 1, username: 'alice' },
  { id: 2, username: 'bob' },
  { id: 3, username: 'eva' },
];
app.get('/users', async () => users);

app.post('/auth/google', async (req, reply) => {
  const { idToken } = req.body || {};
  if (!idToken) return reply.code(400).send({ error: 'missing token' });
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    return { success: true, profile: { email: payload?.email, name: payload?.name } };
  } catch {
    return reply.code(401).send({ error: 'invalid token' });
  }
});

// --- Simple WS chat state ---
const sockets = new Set();
const blocked = {}; // username -> [blockedUsernames]
app.get('/ws', { websocket: true }, (conn) => {
  sockets.add(conn);
  conn.socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'chat') {
        const list = blocked[msg.to] || [];
        if (list.includes(msg.from)) return;
        for (const s of sockets) if (!s.socket._isClosed) s.socket.send(JSON.stringify(msg));
      }
      if (msg.type === 'block') {
        if (!blocked[msg.from]) blocked[msg.from] = [];
        if (!blocked[msg.from].includes(msg.to)) blocked[msg.from].push(msg.to);
        conn.socket.send(JSON.stringify({ type: 'info', text: `User ${msg.to} blocked.` }));
      }
      if (msg.type === 'invite') {
        for (const s of sockets) if (!s.socket._isClosed)
          s.socket.send(JSON.stringify({ type: 'invite', from: msg.from, to: msg.to, text: `${msg.from} invited ${msg.to} to play Pong!` }));
      }
      if (msg.type === 'matchup') {
        for (const s of sockets) if (!s.socket._isClosed)
          s.socket.send(JSON.stringify({ type: 'matchup', p1: msg.p1, p2: msg.p2, text: `Match à venir : ${msg.p1} vs ${msg.p2}` }));
      }
      if (msg.type === 'tournament') {
        for (const s of sockets) if (!s.socket._isClosed)
          s.socket.send(JSON.stringify({ type: 'tournament', text: msg.text || '' }));
      }
      if (msg.type === 'profile') {
        const demo = { username: msg.username, wins: 5, losses: 3 };
        conn.socket.send(JSON.stringify({ type: 'profile', user: demo }));
      }
    } catch {}
  });
  conn.socket.on('close', () => sockets.delete(conn));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = '0.0.0.0';
app.listen({ port: PORT, host: HOST }).then(() => {
  console.log(`Backend running on http://localhost:${PORT}`);
}).catch(err => { console.error(err); process.exit(1); });

import { bootTournament, attachWs } from './scripts/tournament';

const env = import.meta.env as any;
const apiBase = env.VITE_API_URL || 'http://localhost:3000';
console.log('Env:', { VITE_API_URL: env.VITE_API_URL, Mode: env.MODE });

function addMsg(text: string) {
  const box = document.getElementById('messages')!;
  const div = document.createElement('div');
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

let ws: WebSocket | null = null;
let me = localStorage.getItem('alias') || prompt('Choisis ton alias pour le chat et le tournoi:', 'player1') || 'player1';
localStorage.setItem('alias', me);

async function fetchUsers() {
  const r = await fetch(apiBase + '/users');
  return r.json();
}

async function bootChat() {
  const users = await fetchUsers();
  const select = document.getElementById('user-select') as HTMLSelectElement;
  select.innerHTML='';
  for (const u of users) {
    const opt = document.createElement('option');
    opt.value = u.username; opt.textContent = u.username;
    select.appendChild(opt);
  }
  ws = new WebSocket(apiBase.replace('http','ws') + '/ws');
  attachWs(ws);
  ws.addEventListener('message', e => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'chat') addMsg(`💬 ${msg.from} -> ${msg.to}: ${msg.text}`);
      if (msg.type === 'invite') addMsg(`🎮 ${msg.text}`);
      if (msg.type === 'matchup') addMsg(`🆚 ${msg.text}`);
      if (msg.type === 'profile') {
        addMsg('👤 ' + JSON.stringify(msg.user));
      }
      if (msg.type === 'info') addMsg(`ℹ️ ${msg.text}`);
      if (msg.type === 'tournament') addMsg(`🏆 ${msg.text}`);
    } catch {}
  });

  document.getElementById('send-btn')!.addEventListener('click', () => {
    const input = document.getElementById('msg-input') as HTMLInputElement;
    const to = select.value || 'all';
    ws?.send(JSON.stringify({ type:'chat', from:me, to, text: input.value }));
    input.value='';
  });
  document.getElementById('block-btn')!.addEventListener('click', () => {
    const to = select.value || me;
    ws?.send(JSON.stringify({ type:'block', from:me, to }));
  });
  document.getElementById('invite-btn')!.addEventListener('click', () => {
    const to = select.value || 'all';
    ws?.send(JSON.stringify({ type:'invite', from:me, to }));
  });
  document.getElementById('profile-btn')!.addEventListener('click', () => {
    const to = select.value || me;
    ws?.send(JSON.stringify({ type:'profile', username: to }));
  });
}

bootChat();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => bootTournament());
} else {
  bootTournament();
}

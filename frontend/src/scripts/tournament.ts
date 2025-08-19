// frontend/src/scripts/tournament.ts
import { mountLocalPong } from './game/pong';

type Match = { p1: string; p2: string; s1?: number; s2?: number; done?: boolean; nextSemi?: number };
type Round = Match[];
type Tournament = {
  players: string[];
  rounds: Round[];
  r: number;   // current round index
  m: number;   // current match index in round
};

let T: Tournament = { players: [], rounds: [], r: 0, m: 0 };

let ws: WebSocket | null = null;
export function attachWs(socket: WebSocket) { ws = socket; }

const $ = (sel: string) => document.querySelector(sel) as HTMLElement;

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pairs(list: string[]): Round {
  const out: Round = [];
  for (let i = 0; i < list.length - 1; i += 2) {
    out.push({ p1: list[i], p2: list[i + 1] });
  }
  return out;
}

/**
 * Build bracket rules:
 * - 2 players: Round 1 only.
 * - 3..4 players: Round 1 + Final (for 3: one player seeded to Final).
 * - 5..8 players: Round 1 + Semis + Final (R1 = only real pairs, no BYE vs BYE).
 *   * 6 players: ensure one seeded player per semi (no seed vs seed immediately).
 */
function buildBracket(players: string[]): Round[] {
  const p = shuffle(players);
  const n = p.length;
  if (n <= 1) return [];

  if (n === 2) {
    return [ pairs(p) ];
  }

  if (n === 3 || n === 4) {
    let round1: Round = [];
    const final: Round = [{ p1: 'TBD', p2: 'TBD' }];
    if (n === 4) {
      round1 = pairs(p);
    } else {
      // n === 3
      round1 = [{ p1: p[0], p2: p[1] }];
      final[0].p2 = p[2]; // un joueur seedé en finale
    }
    return [round1, final];
  }

  // 5..8 players
  const targetSemisPlayers = 4;
  const r1Matches = n - targetSemisPlayers; // 1..4
  const playersForR1 = p.slice(0, r1Matches * 2);
  const seeds = p.slice(r1Matches * 2); // vont directement en demis

  const round1 = pairs(playersForR1); // uniquement des vrais joueurs
  const semis: Round = [{ p1: 'TBD', p2: 'TBD' }, { p1: 'TBD', p2: 'TBD' }];

  // Répartition des seeds
  if (seeds.length === 1) {
    semis[0].p1 = seeds[0];
  } else if (seeds.length === 2) {
    // 6 joueurs → un seed dans chaque demi
    semis[0].p1 = seeds[0];
    semis[1].p1 = seeds[1];
  } else if (seeds.length === 3) {
    semis[0].p1 = seeds[0];
    semis[1].p1 = seeds[1];
    semis[0].p2 = seeds[2];
  } else if (seeds.length >= 4) {
    semis[0].p1 = seeds[0];
    semis[1].p1 = seeds[1];
    semis[0].p2 = seeds[2];
    semis[1].p2 = seeds[3];
  }

  // Mapping explicite R1 → demis (empêche d'écraser un seed)
  for (let i = 0; i < round1.length; i++) {
    (round1[i] as Match).nextSemi = i % semis.length; // 0→semi0, 1→semi1, 2→semi0, 3→semi1
  }

  const final: Round = [{ p1: 'TBD', p2: 'TBD' }];
  return [round1, semis, final];
}

function announce(text: string) {
  ($('#t-status')!).textContent = text;
  if (ws) ws.send(JSON.stringify({ type: 'tournament', text }));
}

function announceMatch(p1: string, p2: string) {
  const msg = `Match à venir : ${p1} vs ${p2}`;
  ($('#t-status')!).textContent = msg;
  if (ws) ws.send(JSON.stringify({ type: 'matchup', p1, p2 }));
}

/** Pyramid rendering: columns per round with vertical offset (no SVG). */
function renderBracket() {
  const host = $('#t-bracket'); host.innerHTML = '';

  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridAutoFlow = 'column';
  container.style.gridAutoColumns = '1fr';
  container.style.gap = '20px';
  host.appendChild(container);

  const maxLen = Math.max(...T.rounds.map(r => r.length));

  T.rounds.forEach((round, ri) => {
    const col = document.createElement('div');
    const title = (T.rounds.length === 3)
      ? (['Round 1', 'Demi-finales', 'Finale'][ri] || `Round ${ri + 1}`)
      : (T.rounds.length === 2
        ? (['Round 1', 'Finale'][ri] || `Round ${ri + 1}`)
        : `Round ${ri + 1}`);

    const offset = Math.max(0, (maxLen - round.length) * 25);
    col.style.marginTop = offset + 'px';
    col.innerHTML = `<div style="font-weight:bold;margin-bottom:8px;">${title}</div>`;

    round.forEach((m, mi) => {
      const isCur = (ri === T.r && mi === T.m);
      const box = document.createElement('div');
      box.style.border = '1px solid #374151';
      box.style.background = isCur ? '#0f172a' : '#111827';
      box.style.padding = '10px';
      box.style.borderRadius = '10px';
      box.style.margin = '12px 0';
      const score = m.done ? `<div style="opacity:.8;margin-top:4px;">${m.s1 ?? 0} – ${m.s2 ?? 0}</div>` : '';
      box.innerHTML = `<div>${m.p1}</div><div>${m.p2}</div>${score}`;
      (box as any).dataset.ri = String(ri);
      (box as any).dataset.mi = String(mi);
      col.appendChild(box);
    });

    container.appendChild(col);
  });
}

function currentMatch(): Match | null {
  const r = T.rounds[T.r]; if (!r) return null; return r[T.m] || null;
}

function startCurrentMatch() {
  const match = currentMatch(); if (!match) return;

  if (match.p1 === 'BYE' && match.p2 === 'BYE') { nextWithWinner('BYE'); return; }
  if (match.p1 === 'BYE') { announce(`${match.p2} avance (BYE)`); nextWithWinner(match.p2); return; }
  if (match.p2 === 'BYE') { announce(`${match.p1} avance (BYE)`); nextWithWinner(match.p1); return; }
  if (match.p1 === 'TBD' || match.p2 === 'TBD') {
    announce('En attente des autres résultats...');
    return;
  }

  const root = document.getElementById('pong-root') || (() => {
    const d = document.createElement('div'); d.id = 'pong-root'; document.body.appendChild(d); return d;
  })();
  mountLocalPong(root!, {
    p1Name: match.p1,
    p2Name: match.p2,
    onEnd: ({ p1, p2, s1, s2, winner }) => {
      match.s1 = s1; match.s2 = s2; match.done = true;
      renderBracket();
      announce(`Résultat: ${p1} ${s1} – ${s2} ${p2}. Vainqueur: ${winner}`);
      nextWithWinner(winner);
    }
  });
}

function nextWithWinner(winner: string) {
  const nextR = T.r + 1; 
  const curRound = T.rounds[T.r];
  const next = T.rounds[nextR];

  if (next && curRound) {
    const curMatch = curRound[T.m] as Match | undefined;
    let target: number;
    if (curMatch && typeof curMatch.nextSemi === 'number') {
      target = Math.max(0, Math.min(next.length - 1, curMatch.nextSemi));
    } else {
      // Generic mapping
      target = (next.length === curRound.length) ? T.m : Math.floor(T.m / 2);
    }

    // Remplir un slot 'TBD' (préserve le seed)
    if (next[target].p1 === 'TBD') {
      next[target].p1 = winner;
    } else if (next[target].p2 === 'TBD') {
      next[target].p2 = winner;
    } else {
      // Chercher une autre demi avec 'TBD'
      let placed = false;
      for (let i = 0; i < next.length; i++) {
        if (next[i].p1 === 'TBD') { next[i].p1 = winner; placed = true; break; }
        if (next[i].p2 === 'TBD') { next[i].p2 = winner; placed = true; break; }
      }
      if (!placed) {
        // dernier recours : éviter d'écraser un seed si possible
        if (next[target].p2 !== 'TBD') next[target].p2 = winner;
        else next[target].p1 = winner;
      }
    }
  }

  // avancer les pointeurs
  T.m++;
  if (curRound && T.m >= curRound.length) { T.r++; T.m = 0; }

  renderBracket();
  const nm = currentMatch();
  const startBtn = document.getElementById('t-start') as HTMLButtonElement;
  if (nm && nm.p1 !== 'TBD' && nm.p2 !== 'TBD') {
    announceMatch(nm.p1, nm.p2);
    startBtn.disabled = false;
  } else if (nm) {
    startBtn.disabled = true;
    announce('En attente des autres résultats...');
  } else {
    // Tournoi terminé : déterminer le champion via la finale jouée
    const lastRound = T.rounds[T.rounds.length - 1];
    const finalMatch = lastRound && lastRound[0];
    let champ = winner;
    if (finalMatch && finalMatch.done && typeof finalMatch.s1 === 'number' && typeof finalMatch.s2 === 'number') {
      champ = (finalMatch.s1 > finalMatch.s2) ? finalMatch.p1 : finalMatch.p2;
    }
    announce(`🏆 Champion : ${champ}`);
  }
}

// ---- Wizard ----
function wizard() {
  const overlay = document.getElementById('t-wizard') as HTMLElement;
  const stepBox = document.getElementById('t-step') as HTMLElement;
  const nextBtn = document.getElementById('t-next') as HTMLButtonElement;
  const prevBtn = document.getElementById('t-prev') as HTMLButtonElement;
  const cancelBtn = document.getElementById('t-cancel') as HTMLButtonElement;
  let step = 0;
  let count = 2;
  let aliases: string[] = [];

  function render() {
    if (step === 0) {
      stepBox.innerHTML = `
        <h3>Nouveau tournoi</h3>
        <p>Combien de joueurs ? (2 à 8)</p>
        <input id="w-count" type="number" min="2" max="8" value="${count}" />
      `;
      prevBtn.disabled = true;
      nextBtn.textContent = 'Suivant';
      return;
    }
    if (step === 1) {
      const n = count;
      let fields = '';
      for (let i = 0; i < n; i++) {
        const val = aliases[i] || `player${i + 1}`;
        fields += `<div style="margin:6px 0;"><label>Alias J${i + 1}: <input class="w-alias" data-i="${i}" value="${val}" /></label></div>`;
      }
      stepBox.innerHTML = `<h3>Alias des joueurs</h3>${fields}`;
      prevBtn.disabled = false;
      nextBtn.textContent = 'Créer le bracket';
      return;
    }
    if (step === 2) {
      stepBox.innerHTML = `<h3>Prêt !</h3><p>Le bracket va être généré.</p>`;
      prevBtn.disabled = false;
      nextBtn.textContent = 'Terminer';
      return;
    }
  }

  function open() { overlay.style.display = 'block'; step = 0; render(); }
  function close() { overlay.style.display = 'none'; }

  nextBtn.onclick = () => {
    if (step === 0) {
      const el = document.getElementById('w-count') as HTMLInputElement;
      count = Math.max(2, Math.min(8, Number(el?.value || 2)));
      step = 1; render(); return;
    }
    if (step === 1) {
      const inputs = Array.from(stepBox.querySelectorAll('.w-alias')) as HTMLInputElement[];
      aliases = inputs.map(x => (x.value || '').trim() || 'player');
      step = 2; render(); return;
    }
    if (step === 2) {
      const unique = Array.from(new Set(aliases));
      T.players = unique;
      T.rounds = buildBracket(T.players);
      T.r = 0; T.m = 0;
      renderBracket();
      const cm = currentMatch();
      if (cm && cm.p1 !== 'TBD' && cm.p2 !== 'TBD') announceMatch(cm.p1, cm.p2);
      (document.getElementById('t-start') as HTMLButtonElement).disabled = !cm || cm.p1 === 'TBD' || cm.p2 === 'TBD';
      close();
      return;
    }
  };
  prevBtn.onclick = () => { if (step > 0) { step--; render(); } };
  cancelBtn.onclick = () => close();

  open();
}

export function bootTournament() {
  const newBtn = document.getElementById('t-new') as HTMLButtonElement;
  const startBtn = document.getElementById('t-start') as HTMLButtonElement;
  newBtn.onclick = () => wizard();
  startBtn.onclick = () => startCurrentMatch();
  if (T.rounds.length) renderBracket();
}

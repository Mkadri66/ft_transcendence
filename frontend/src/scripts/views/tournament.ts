// frontend/src/scripts/views/TournamentView.ts
import { mountLocalPong, PONG_THEMES } from './pong';

type Match = {
    p1: string;
    p2: string;
    s1?: number;
    s2?: number;
    done?: boolean;
    nextSemi?: number;
    nextRoundIndex?: number;
    targetSlot?: 'p1' | 'p2';
};
type Round = Match[];
type Tournament = { players: string[]; rounds: Round[]; r: number; m: number };

export class TournamentView {
    private current_user: string | null;
    private section: HTMLElement;
    private container: HTMLElement | any;
    private T: Tournament = { players: [], rounds: [], r: 0, m: 0 };
    private isMatchInProgress: boolean = false;
    private selectedTheme: string = 'classic';
    private pointBonusEnabled: boolean = false;
    private announcements: string[] = [];

    constructor() {
        this.section = document.createElement('section');
        this.current_user = '';
        this.section.className = 'tournament';
        this.section.innerHTML = this.getHtml();
        this.setupEventListeners();
    }

    private async getTournament(): Promise<any | null> {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/tournament`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );
            if (response.status === 401) {
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
                return null;
            }

            const data = await response.json();
            this.current_user = data.username;
            return data;
        } catch (error) {
            console.error('Erreur serveur :', error);
            return null;
        }
    }

    public render(container: HTMLElement): void {
        this.getTournament();
        container.appendChild(this.section);
    }

    public destroy(): void {
        this.teardownEventListeners();
        this.section.remove();
    }

    private announceToUI(text: string) {
        const status = this.section.querySelector('#t-status')!;
        status.textContent = text;
        console.log('Annonce tournoi:', text);

        // Ajouter à l'historique avec timestamp
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        this.announcements.push(`[${timestamp}] ${text}`);
        this.updateAnnouncements();
    }

    private updateAnnouncements(): void {
        const historyBox = this.section.querySelector('#t-history');
        if (!historyBox) return;

        historyBox.innerHTML = this.announcements
            .map(
                (announcement, index) => `
                <div style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
                    ${announcement}
                </div>
            `
            )
            .join('');

        // Auto-scroll vers le bas
        historyBox.scrollTop = historyBox.scrollHeight;
    }

    private getHtml(): string {
        return `
        <div>
            <h1>Tournoi Pong</h1>
            <p>Organisez et gérez des tournois de Pong avec jusqu'à 8 joueurs !</p>
            <p> Le joueur 1 joue avec les touches W (haut) et S (bas). Le joueur 2 utilise les flèches Haut et Bas.</p>
            <section id="tournament-section" style="margin-top:16px;">
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
                <button id="t-new" type="button" style="padding: 8px 16px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer;">Nouveau tournoi</button>
                <button id="t-start" type="button" disabled style="padding: 8px 16px; background: #6B7280; color: white; border: none; border-radius: 6px;">Lancer le match</button>
              </div>
              
              <!-- Historique des annonces -->
              <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                <div style="flex: 2;">
                  <div id="t-status" style="margin:8px 0; font-weight: bold; padding: 12px; background: #f0f9ff; border-radius: 6px; min-height: 40px;"></div>
                  <div id="t-bracket" style="margin-top:8px;"></div>
                </div>
                
                <div style="flex: 1; background: #f9fafb; border-radius: 6px; padding: 12px; border: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📋 Historique</h3>
                  <div id="t-history" style="height: 300px; font-size: 13px;"></div>
                </div>
              </div>

              <div id="t-wizard" style="display:none; position:fixed; inset:0; background:rgba(255, 255, 255, 0.9); z-index:50; backdrop-filter: blur(4px);">
                <div style="max-width:520px; margin:60px auto; background:#ffffff; border:1px solid #374151; border-radius:12px; padding:16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                  <div id="t-step" style="min-height:120px;"></div>
                  <div style="display:flex; justify-content:space-between; margin-top:12px;">
                    <button id="t-prev" type="button" style="padding: 8px 16px; background: #6B7280; color: white; border: none; border-radius: 6px; cursor: pointer;">Précédent</button>
                    <div style="display:flex; gap:8px;">
                      <button id="t-cancel" type="button" style="padding: 8px 16px; background: #EF4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Annuler</button>
                      <button id="t-next" type="button" style="padding: 8px 16px; background: #10B981; color: white; border: none; border-radius: 6px; cursor: pointer;">Suivant</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <div id="pong-root"></div>
        </div>
        `;
    }

    private setupEventListeners(): void {
        this.section
            .querySelector<HTMLButtonElement>('#t-new')
            ?.addEventListener('click', () => {
                if (this.T.rounds.length > 0) {
                    const confirmCancel = confirm(
                        "Un tournoi est déjà en cours. Voulez-vous l'annuler et en créer un nouveau ?"
                    );
                    if (!confirmCancel) return;
                    this.resetTournament();
                }
                this.openWizard();
            });

        this.section
            .querySelector<HTMLButtonElement>('#t-start')
            ?.addEventListener('click', () => this.startCurrentMatch());
    }

    private teardownEventListeners(): void {}

    private shuffle<T>(a: T[]): T[] {
        const arr = [...a];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    private pairs(list: string[]): Round {
        const round: Round = [];
        for (let i = 0; i < list.length; i += 2) {
            const p1 = list[i];
            const p2 = list[i + 1] || 'BYE';
            round.push({ p1, p2 });
        }
        return round;
    }

    private buildBracket(players: string[]): Round[] {
        const n = players.length;
        if (n < 2) return [];

        const shuffled = this.shuffle(players);
        const rounds: Round[] = [];

        switch (n) {
            case 2:
                const final2 = [{ p1: shuffled[0], p2: shuffled[1] }];
                rounds.push(final2);
                break;

            case 3:
                const qualified3 = shuffled[0];
                const qualifier3 = [
                    { p1: shuffled[1], p2: shuffled[2], nextSemi: 0 },
                ];
                const final3 = [{ p1: qualified3, p2: 'Gagnant qualif' }];
                rounds.push(qualifier3, final3);
                break;

            case 4:
                // 4 joueurs: 2 demi-finales + finale
                const semis4 = this.pairs(shuffled);
                semis4.forEach((m, i) => (m.nextSemi = 0));
                const final4 = [{ p1: 'Gagnant demi 1', p2: 'Gagnant demi 2' }];
                rounds.push(semis4, final4);
                break;

            case 5:
                const qualif5 = [
                    { p1: shuffled[0], p2: shuffled[1], nextSemi: 0 },
                ];

                const semis5: Round = [
                    { p1: 'Gagnant match qualif', p2: shuffled[2] },
                    { p1: shuffled[3], p2: shuffled[4] },
                ];
                semis5.forEach((m, i) => (m.nextSemi = 0));

                const final5 = [{ p1: 'Gagnant demi 1', p2: 'Gagnant demi 2' }];

                rounds.push(qualif5, semis5, final5);
                break;

            case 6:
                const qualifs6: Round = [
                    { p1: shuffled[0], p2: shuffled[1], nextSemi: 0 },
                    { p1: shuffled[2], p2: shuffled[3], nextSemi: 1 },
                ];

                const semis6: Round = [
                    { p1: 'Gagnant match 1', p2: shuffled[4] },
                    { p1: 'Gagnant match 2', p2: shuffled[5] },
                ];
                semis6.forEach((m) => (m.nextSemi = 0));

                const final6 = [{ p1: 'Gagnant demi 1', p2: 'Gagnant demi 2' }];
                rounds.push(qualifs6, semis6, final6);
                break;

            case 7:
                const qualifs7: Round = [
                    { p1: shuffled[1], p2: shuffled[2], nextSemi: 0 },
                    { p1: shuffled[3], p2: shuffled[4], nextSemi: 0 },
                    { p1: shuffled[5], p2: shuffled[6], nextSemi: 1 },
                ];

                const semis7: Round = [
                    { p1: shuffled[0], p2: 'Gagnant match 1' },
                    { p1: 'Gagnant match 2', p2: 'Gagnant match 3' },
                ];
                semis7.forEach((m) => (m.nextSemi = 0));

                const final7 = [{ p1: 'Gagnant demi 1', p2: 'Gagnant demi 2' }];
                rounds.push(qualifs7, semis7, final7);
                break;

            case 8:
                const quarters8 = this.pairs(shuffled);
                quarters8[0].nextSemi = 0;
                quarters8[1].nextSemi = 0;
                quarters8[2].nextSemi = 1;
                quarters8[3].nextSemi = 1;

                const semis8: Round = [
                    { p1: 'Gagnant quart 1', p2: 'Gagnant quart 2' },
                    { p1: 'Gagnant quart 3', p2: 'Gagnant quart 4' },
                ];
                semis8.forEach((m) => (m.nextSemi = 0));

                const final8 = [{ p1: 'Gagnant demi 1', p2: 'Gagnant demi 2' }];
                rounds.push(quarters8, semis8, final8);
                break;
        }

        return rounds;
    }

    private renderBracket() {
        const host = this.section.querySelector('#t-bracket')!;
        host.innerHTML = '';

        if (!this.T.rounds.length) return;

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '50px';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.minHeight = '300px';
        container.style.padding = '20px';

        this.T.rounds.forEach((round, ri) => {
            const col = document.createElement('div');
            col.style.display = 'flex';
            col.style.flexDirection = 'column';
            col.style.gap = '20px';
            col.style.alignItems = 'center';

            const title = document.createElement('h3');
            title.style.marginBottom = '15px';
            title.style.fontSize = '16px';
            title.style.fontWeight = 'bold';
            title.style.color = '#1F2937';
            title.style.textAlign = 'center';

            const totalRounds = this.T.rounds.length;
            const playerCount = this.T.players.length;

            if (ri === totalRounds - 1) {
                title.textContent = '🏆 FINALE';
                title.style.color = '#DC2626';
            } else if (ri === totalRounds - 2) {
                title.textContent = '🥊 DEMI-FINALES';
                title.style.color = '#059669';
            } else if (playerCount === 8 && ri === 0) {
                title.textContent = '⚔️ QUARTS DE FINALE';
                title.style.color = '#7C2D12';
            } else if (playerCount >= 5 && ri === 0) {
                title.textContent = '🎯 PREMIER TOUR';
                title.style.color = '#1D4ED8';
            } else {
                title.textContent = '🎮 QUALIFICATIONS';
                title.style.color = '#7C2D12';
            }

            col.appendChild(title);

            // Espacement vertical pour effet pyramide
            const spacerTop = document.createElement('div');
            const spacerHeight = Math.max(0, (totalRounds - ri - 1) * 25);
            spacerTop.style.height = `${spacerHeight}px`;
            col.appendChild(spacerTop);

            round.forEach((m, mi) => {
                const matchDiv = document.createElement('div');
                matchDiv.style.border = '2px solid #E5E7EB';
                matchDiv.style.borderRadius = '12px';
                matchDiv.style.padding = '16px';
                matchDiv.style.backgroundColor = m.done ? '#F0FDF4' : '#FFFFFF';
                matchDiv.style.minWidth = '180px';
                matchDiv.style.textAlign = 'center';
                matchDiv.style.fontSize = '13px';
                matchDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                matchDiv.style.transition = 'all 0.2s ease';

                if (m.done) {
                    matchDiv.style.borderColor = '#10B981';
                    matchDiv.style.boxShadow =
                        '0 4px 8px rgba(16, 185, 129, 0.2)';
                }

                // Joueur 1
                const p1Div = document.createElement('div');
                p1Div.style.padding = '8px';
                p1Div.style.borderRadius = '6px';
                p1Div.style.marginBottom = '4px';

                let p1Text = m.p1;
                if (m.done && typeof m.s1 === 'number') {
                    p1Text += ` (${m.s1})`;
                }
                p1Div.textContent = p1Text;

                // Style pour le gagnant ou joueurs en attente
                if (m.done && m.s1 !== undefined && m.s1 > (m.s2 || 0)) {
                    p1Div.style.fontWeight = 'bold';
                    p1Div.style.backgroundColor = '#D1FAE5';
                    p1Div.style.color = '#065F46';
                } else if (m.p1.includes('Gagnant') || m.p1 === 'Bye') {
                    p1Div.style.backgroundColor = '#FEF3C7';
                    p1Div.style.color = '#92400E';
                    p1Div.style.fontStyle = 'italic';
                } else {
                    p1Div.style.backgroundColor = '#F3F4F6';
                    p1Div.style.color = '#374151';
                }

                // Séparateur VS
                const vsDiv = document.createElement('div');
                vsDiv.textContent = 'VS';
                vsDiv.style.margin = '8px 0';
                vsDiv.style.fontSize = '11px';
                vsDiv.style.fontWeight = 'bold';
                vsDiv.style.color = '#6B7280';
                vsDiv.style.letterSpacing = '1px';

                // Joueur 2
                const p2Div = document.createElement('div');
                p2Div.style.padding = '8px';
                p2Div.style.borderRadius = '6px';
                p2Div.style.marginTop = '4px';

                let p2Text = m.p2;
                if (m.done && typeof m.s2 === 'number') {
                    p2Text += ` (${m.s2})`;
                }
                p2Div.textContent = p2Text;

                if (m.done && m.s2 !== undefined && m.s2 > (m.s1 || 0)) {
                    p2Div.style.fontWeight = 'bold';
                    p2Div.style.backgroundColor = '#D1FAE5';
                    p2Div.style.color = '#065F46';
                } else if (m.p2.includes('Gagnant') || m.p2 === 'Bye') {
                    p2Div.style.backgroundColor = '#FEF3C7';
                    p2Div.style.color = '#92400E';
                    p2Div.style.fontStyle = 'italic';
                } else {
                    p2Div.style.backgroundColor = '#F3F4F6';
                    p2Div.style.color = '#374151';
                }

                matchDiv.appendChild(p1Div);
                matchDiv.appendChild(vsDiv);
                matchDiv.appendChild(p2Div);

                col.appendChild(matchDiv);
            });

            container.appendChild(col);
        });

        host.appendChild(container);
    }

    private announce(text: string) {
        const status = this.section.querySelector('#t-status')!;
        status.textContent = text;
    }

    private announceMatch(p1: string, p2: string) {
        this.announce(`Prochain match: ${p1} vs ${p2}`);
    }

    private startCurrentMatch() {
        const match = this.currentMatch();
        if (!match || this.isMatchInProgress) return;

        this.isMatchInProgress = true;
        this.updateStartButton();

        if (this.isWaitingPlayer(match.p1) || this.isWaitingPlayer(match.p2)) {
            this.announceToUI('⏳ En attente des résultats précédents...');
            this.isMatchInProgress = false;
            this.updateStartButton();
            return;
        }

        this.announceToUI(`▶️ Match: ${match.p1} vs ${match.p2}`);
        this.launchPongGame(match);
    }

    private launchPongGame(match: Match): void {
        const root =
            document.getElementById('pong-root') ||
            (() => {
                const d = document.createElement('div');
                d.id = 'pong-root';
                document.body.appendChild(d);
                return d;
            })();

        mountLocalPong(root, {
            p1Name: match.p1,
            p2Name: match.p2,
            theme: this.selectedTheme as keyof typeof PONG_THEMES,
            pointBonus: this.pointBonusEnabled,
            countdownSeconds: 5,
            onEnd: ({ p1, p2, s1, s2, winner }) => {
                match.s1 = s1;
                match.s2 = s2;
                match.done = true;
                this.renderBracket();
                this.announceToUI(
                    `✅ Résultat: ${p1} ${s1} – ${s2} ${p2} | Vainqueur: ${winner}`
                );
                this.isMatchInProgress = false;
                this.nextWithWinner(winner);
            },
        });
    }

    private updateStartButton(): void {
        const startBtn =
            this.section.querySelector<HTMLButtonElement>('#t-start')!;
        const currentMatch = this.currentMatch();

        if (!currentMatch || this.isMatchInProgress) {
            startBtn.disabled = true;
            startBtn.style.background = '#6B7280';
            startBtn.style.cursor = 'not-allowed';

            if (this.isMatchInProgress) {
                startBtn.textContent = 'Match en cours...';
            } else if (!currentMatch) {
                startBtn.textContent = '🏆 Tournoi terminé';
            }
            return;
        }

        const canStart =
            !this.isWaitingPlayer(currentMatch.p1) &&
            !this.isWaitingPlayer(currentMatch.p2) &&
            !currentMatch.done;

        if (canStart) {
            startBtn.disabled = false;
            startBtn.style.background = '#10B981';
            startBtn.style.cursor = 'pointer';
            startBtn.textContent = `▶️ ${currentMatch.p1} vs ${currentMatch.p2}`;
        } else {
            startBtn.disabled = true;
            startBtn.style.background = '#6B7280';
            startBtn.style.cursor = 'not-allowed';

            if (currentMatch.done) {
                startBtn.textContent = '✅ Match terminé';
            } else if (
                this.isWaitingPlayer(currentMatch.p1) ||
                this.isWaitingPlayer(currentMatch.p2)
            ) {
                startBtn.textContent = '⏳ En attente des matchs précédents';
            } else {
                startBtn.textContent = '🎮 Prêt à jouer';
            }
        }
    }

    private currentMatch(): Match | null {
        const r = this.T.rounds[this.T.r];
        return r ? r[this.T.m] || null : null;
    }

    private findNextPlayableMatch(): { r: number; m: number } | null {
        for (let r = 0; r < this.T.rounds.length; r++) {
            const round = this.T.rounds[r];
            for (let m = 0; m < round.length; m++) {
                const match = round[m];
                if (match.done) continue;
                if (
                    !this.isWaitingPlayer(match.p1) &&
                    !this.isWaitingPlayer(match.p2)
                ) {
                    return { r, m };
                }
            }
        }
        return null;
    }

    private async nextWithWinner(winner: string) {
        const nextR = this.T.r + 1;
        const curRound = this.T.rounds[this.T.r];
        const next = this.T.rounds[nextR];

        if (next && curRound) {
            const curMatch = curRound[this.T.m] as Match | undefined;
            let target: number;

            if (curMatch && typeof curMatch.nextSemi === 'number') {
                target = Math.max(
                    0,
                    Math.min(next.length - 1, curMatch.nextSemi)
                );
            } else {
                target =
                    next.length === curRound.length
                        ? this.T.m
                        : Math.floor(this.T.m / 2);
            }

            if (this.isWaitingPlayer(next[target].p1)) {
                next[target].p1 = winner;
            } else if (this.isWaitingPlayer(next[target].p2)) {
                next[target].p2 = winner;
            } else {
                let placed = false;
                for (let i = 0; i < next.length; i++) {
                    if (this.isWaitingPlayer(next[i].p1)) {
                        next[i].p1 = winner;
                        placed = true;
                        break;
                    }
                    if (this.isWaitingPlayer(next[i].p2)) {
                        next[i].p2 = winner;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    next[target].p2 = winner;
                }
            }
        }

        this.T.m++;
        if (curRound && this.T.m >= curRound.length) {
            this.T.r++;
            this.T.m = 0;
        }

        this.renderBracket();
        this.updateStartButton();

        const nm = this.currentMatch();
        if (
            nm &&
            !this.isWaitingPlayer(nm.p1) &&
            !this.isWaitingPlayer(nm.p2)
        ) {
            this.announceToUI(`🎯 Prochain match prêt: ${nm.p1} vs ${nm.p2}`);
        } else if (nm) {
            this.announceToUI(
                '⏳ En attente que les autres matchs se terminent...'
            );
        } else {
            // Tournoi terminé
            const lastRound = this.T.rounds[this.T.rounds.length - 1];
            const finalMatch = lastRound && lastRound[0];
            let champ = winner;
            if (
                finalMatch &&
                finalMatch.done &&
                typeof finalMatch.s1 === 'number' &&
                typeof finalMatch.s2 === 'number'
            ) {
                champ =
                    finalMatch.s1 > finalMatch.s2
                        ? finalMatch.p1
                        : finalMatch.p2;
            }
            this.announceToUI(`🏆 CHAMPION DU TOURNOI : ${champ} ! 🎉`);

            try {
                const summary = this.getTournamentSummary();
                console.log('--- Résumé du tournoi ---');
                console.log('Nombre total de matchs:', summary.totalMatches);
                console.log('Vainqueurs:', summary.winners);
                console.log('Historique:', summary.history);

                await fetch(`${import.meta.env.VITE_API_URL}/save-tournament`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ summary }),
                });
            } catch (e) {
                console.error('Erreur lors de la sauvegarde du tournoi:', e);
            }

            const pongRoot = document.getElementById('pong-root');
            if (pongRoot) {
                pongRoot.innerHTML = '';
            }
            this.resetTournament();
        }
    }

    private isWaitingPlayer(playerName: string): boolean {
        return (
            playerName.includes('Gagnant') ||
            playerName.includes('Vainqueur') ||
            playerName.includes('Qualifié') ||
            playerName === 'En attente' ||
            playerName === 'TBD' ||
            playerName === 'Bye' ||
            playerName === 'Attente'
        );
    }

    private getTournamentSummary() {
        const rounds = this.T.rounds || [];
        const totalMatches = rounds.reduce(
            (acc, r) => acc + (r ? r.length : 0),
            0
        );
        const winners: string[] = [];
        const history: Array<{
            round: number;
            match: number;
            p1: string;
            p2: string;
            s1?: number;
            s2?: number;
            done: boolean;
            winner?: string | null;
        }> = [];

        rounds.forEach((r, ri) => {
            r.forEach((m, mi) => {
                const rec = {
                    round: ri,
                    match: mi,
                    p1: m.p1,
                    p2: m.p2,
                    s1: m.s1,
                    s2: m.s2,
                    done: !!m.done,
                    winner: null as string | null,
                };
                if (
                    m.done &&
                    typeof m.s1 === 'number' &&
                    typeof m.s2 === 'number'
                ) {
                    rec.winner = m.s1 > m.s2 ? m.p1 : m.p2;
                    winners.push(rec.winner);
                } else if (
                    m.done &&
                    (typeof m.s1 === 'number' || typeof m.s2 === 'number')
                ) {
                    // cas partiel : tenter d'inférer
                    if (typeof m.s1 === 'number' && typeof m.s2 !== 'number') {
                        rec.winner = m.s1 > 0 ? m.p1 : m.p2;
                        if (rec.winner) winners.push(rec.winner);
                    } else if (
                        typeof m.s2 === 'number' &&
                        typeof m.s1 !== 'number'
                    ) {
                        rec.winner = m.s2 > 0 ? m.p2 : m.p1;
                        if (rec.winner) winners.push(rec.winner);
                    }
                }
                history.push(rec);
            });
        });

        return {
            totalMatches,
            winners,
            history,
            tournament: this.T,
        };
    }

    private closeWizard(): void {
        const overlay = this.section.querySelector('#t-wizard') as HTMLElement;
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    private async openWizard() {
        const overlay = this.section.querySelector('#t-wizard') as HTMLElement;
        if (!overlay) {
            console.error('Overlay wizard non trouvé');
            return;
        }

        overlay.style.display = 'block';

        let step = 0;
        let count = 2;
        let aliases: string[] = [];
        // S'assurer que current_user est disponible avant d'afficher le wizard
        if (!this.current_user) {
            await this.getTournament();
        }
        // Préremplir le premier alias avec le current_user (fallback sur this.me)
        aliases[0] = this.current_user || 'player1';

        let selectedTheme: string = 'classic';
        let pointBonus: boolean = false;
        let validationError: string = ''; // Variable pour les erreurs de validation

        const stepDiv = this.section.querySelector('#t-step')!;
        const prevBtn =
            this.section.querySelector<HTMLButtonElement>('#t-prev')!;
        const nextBtn =
            this.section.querySelector<HTMLButtonElement>('#t-next')!;
        const cancelBtn =
            this.section.querySelector<HTMLButtonElement>('#t-cancel')!;

        // Cloner les boutons AVANT de définir renderStep()
        const newPrevBtn = prevBtn.cloneNode(true) as HTMLButtonElement;
        const newNextBtn = nextBtn.cloneNode(true) as HTMLButtonElement;
        const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;

        prevBtn.parentNode?.replaceChild(newPrevBtn, prevBtn);
        nextBtn.parentNode?.replaceChild(newNextBtn, nextBtn);
        cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

        const renderStep = () => {
            if (step === 0) {
                stepDiv.innerHTML = `
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Nouveau tournoi</h3>
                <p style="margin-bottom: 12px;">Combien de joueurs ? (2 à 8)</p>
                <input id="w-count" type="number" min="2" max="8" value="${count}" 
                       style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px;" />
            `;
                newPrevBtn.disabled = true;
                newPrevBtn.style.background = '#9CA3AF';
                newNextBtn.textContent = 'Suivant';
            } else if (step === 1) {
                let fields = '';
                for (let i = 0; i < count; i++) {
                    const val = aliases[i] || `player${i + 1}`;
                    // Pour le joueur 1 : prérempli, grisé et non modifiable
                    if (i === 0) {
                        fields += `
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">
                                Alias J${i + 1}:
                            </label>
                            <input class="w-alias" data-i="${i}" value="${val}" disabled
                                   title="Ton alias (récupéré depuis ton profil)"
                                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px; background:#F3F4F6; color:#6B7280;" />
                        </div>
                    `;
                    } else {
                        fields += `
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">
                                Alias J${i + 1}:
                            </label>
                            <input class="w-alias" data-i="${i}" value="${val}" 
                                   style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px;" />
                        </div>
                    `;
                    }
                }

                // Ajouter le message d'erreur s'il y en a un
                const errorHtml = validationError
                    ? `<div style="color: #DC2626; background-color: #FEE2E2; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: 500;">⚠️ ${validationError}</div>`
                    : '';

                stepDiv.innerHTML = `
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Alias des joueurs</h3>
                ${errorHtml}
                ${fields}
            `;
                newPrevBtn.disabled = false;
                newPrevBtn.style.background = '#6B7280';
                newNextBtn.textContent = 'Suivant';
            } else if (step === 2) {
                const themeOptions = Object.entries(PONG_THEMES)
                    .map(
                        ([key, theme]) => `
                        <label style="display: flex; align-items: center; gap: 8px; margin: 8px 0; padding: 8px; border: 1px solid #ccc; border-radius: 6px; cursor: pointer;">
                            <input type="radio" name="theme" value="${key}" ${ key === selectedTheme ? 'checked' : ''} />
                        <span style="flex-grow: 1;">
                            ${key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <div style="width: 40px; height: 20px; border-radius: 4px;" class="theme-preview-${key}"></div>
                    </label>`
                    )
                    .join('');

                stepDiv.innerHTML = `
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Choisir un thème</h3>
                <div>
                    ${themeOptions}
                </div>
                <div class="bonus-options" style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 2px solid #e9ecef;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" id="pointBonus" name="pointBonus" ${
                            pointBonus ? 'checked' : ''
                        }
                               style="transform: scale(1.2); cursor: pointer;">
                        <span style="font-weight: 600; color: #495057;">Point Bonus (x2)</span>
                    </label>
                    <p style="margin-top: 5px; font-size: 14px; color: #6c757d; font-style: italic; margin-left: 25px;">
                        Les points marqués comptent double pendant tout le tournoi
                    </p>
                </div>
                <style>
                    .theme-preview-classic { background: linear-gradient(to right, #e2e8f0 50%, #0b1220 50%); }
                    .theme-preview-neon { background: linear-gradient(to right, #ff00ff 50%, #000000 50%); }
                    .theme-preview-retro { background: linear-gradient(to right, #a87000 50%, #382800 50%); }
                    .theme-preview-nature { background: linear-gradient(to right, #90ee90 50%, #1a472a 50%); }
                    .theme-preview-sunset { background: linear-gradient(to right, #ff7f50 50%, #2c1810 50%); }
                </style>
                `;
                newPrevBtn.disabled = false;
                newNextBtn.textContent = 'Suivant';
            } else if (step === 3) {
                const bonusText = pointBonus ? ' avec Points Bonus (x2)' : '';
                stepDiv.innerHTML = `
                <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Prêt !</h3>
                <p>Le bracket va être généré avec le thème "${selectedTheme}"${bonusText}.</p>
            `;
                newNextBtn.textContent = 'Terminer';
            }
        };
        renderStep();

        newPrevBtn.onclick = () => {
            if (step > 0) {
                step--;
                renderStep();
            }
        };
        newNextBtn.onclick = () => {
            if (step === 0) {
                const el = this.section.querySelector(
                    '#w-count'
                ) as HTMLInputElement;
                count = Math.max(2, Math.min(8, Number(el?.value || 2)));
                step = 1;
                renderStep();
            } else if (step === 1) {
                const inputs = Array.from(
                    stepDiv.querySelectorAll('.w-alias')
                ) as HTMLInputElement[];

                // Collecter tous les alias
                const newAliases = inputs.map((x, i) => {
                    const val = (x.value || '').trim();
                    return val || `player${i + 1}`;
                });
                const uniqueSet = new Set(newAliases);
                if (uniqueSet.size !== newAliases.length) {
                    validationError =
                        'Erreur: des joueurs ont le même alias. Chaque joueur doit avoir un alias unique.';
                    renderStep();
                    return;
                }
                validationError = '';
                aliases = newAliases;
                step = 2;
                renderStep();
            } else if (step === 2) {
                const selectedRadio = stepDiv.querySelector(
                    'input[name="theme"]:checked'
                ) as HTMLInputElement;
                selectedTheme = selectedRadio?.value || 'classic';

                const bonusCheckbox = stepDiv.querySelector(
                    '#pointBonus'
                ) as HTMLInputElement;
                pointBonus = bonusCheckbox?.checked || false;

                step = 3;
                renderStep();
            } else if (step === 3) {
                try {
                    this.initTournament(aliases, selectedTheme, pointBonus);
                    this.closeWizard();
                } catch (error) {
                    console.error(
                        "Erreur lors de l'initialisation du tournoi:",
                        error
                    );
                    alert('Erreur lors de la création du tournoi');
                }
            }
        };

        newCancelBtn.onclick = () => {
            this.closeWizard();
        };
        const wizardBox = stepDiv.parentElement!;
        wizardBox.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        overlay.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    private initTournament(
        players: string[],
        theme: string = 'classic',
        pointBonus: boolean = false
    ) {
        if (players.length < 2) {
            alert('Il faut au moins 2 joueurs pour créer un tournoi');
            return;
        }

        this.announcements = [];
        this.selectedTheme = theme;
        this.pointBonusEnabled = pointBonus;
        this.T.players = players;
        this.T.rounds = this.buildBracket(this.T.players);

        const firstMatch = this.findNextPlayableMatch();
        if (firstMatch) {
            this.T.r = firstMatch.r;
            this.T.m = firstMatch.m;
        } else {
            this.T.r = 0;
            this.T.m = 0;
        }

        this.renderBracket();
        this.announceToUI(`🎮 Tournoi créé avec ${players.length} joueurs !`);
        this.updateStartButton();

        const current = this.currentMatch();
        if (current) {
            this.announceToUI(
                `📋 Prochain match: ${current.p1} vs ${current.p2}`
            );
        }
    }

    private resetTournament(): void {
        this.T = { players: [], rounds: [], r: 0, m: 0 };
        this.isMatchInProgress = false;
        this.announcements = [];

        const bracketElement = this.section.querySelector('#t-bracket');
        if (bracketElement) {
            bracketElement.innerHTML = '';
        }

        const startBtn =
            this.section.querySelector<HTMLButtonElement>('#t-start');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.style.background = '#6B7280';
            startBtn.style.cursor = 'not-allowed';
            startBtn.textContent = 'Lancer le match';
        }

        const pongRoot = document.getElementById('pong-root');
        if (pongRoot) {
            pongRoot.innerHTML = '';
        }

        const statusElement = this.section.querySelector('#t-status');
        if (statusElement) {
            statusElement.textContent = '';
        }
    }
}

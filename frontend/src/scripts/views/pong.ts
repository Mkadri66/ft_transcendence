type Unmount = () => void;

// Ajout des thèmes disponibles
export const PONG_THEMES = {
    classic: {
        background: '#0b1220',
        paddle: '#e2e8f0',
        ball: '#e2e8f0',
        separator: '#2d3a58',
        score: '#94a3b8',
        text: '#cbd5e1',
    },
    neon: {
        background: '#000000',
        paddle: '#ff00ff',
        ball: '#00ffff',
        separator: '#0000ff',
        score: '#ff00ff',
        text: '#00ffff',
    },
    retro: {
        background: '#382800',
        paddle: '#a87000',
        ball: '#ffb000',
        separator: '#704c00',
        score: '#ffb000',
        text: '#ffd000',
    },
    nature: {
        background: '#1a472a',
        paddle: '#90ee90',
        ball: '#ffffff',
        separator: '#2e8b57',
        score: '#98fb98',
        text: '#f0fff0',
    },
    sunset: {
        background: '#2c1810',
        paddle: '#ff7f50',
        ball: '#ffd700',
        separator: '#8b4513',
        score: '#ffa07a',
        text: '#ffe4b5',
    },
};

export function mountLocalPong(
    root: HTMLElement,
    opts?: {
        p1Name?: string;
        p2Name?: string;
        theme?: keyof typeof PONG_THEMES;
        onEnd?: (res: {
            p1: string;
            p2: string;
            s1: number;
            s2: number;
            winner: string;
        }) => void;
    }
): Unmount {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const W = 800,
        H = 500;
    canvas.width = W;
    canvas.height = H;
    canvas.style.border = '1px solid #374151';
    canvas.style.display = 'block';
    canvas.style.maxWidth = '100%';
    root.innerHTML = '';
    root.appendChild(canvas);

    const p1Name = opts?.p1Name || 'Joueur 1';
    const p2Name = opts?.p2Name || 'Joueur 2';

    const PADDLE_W = 12,
        PADDLE_H = 90,
        PADDLE_SPEED = 6;
    const BALL_R = 8,
        BALL_SPEED_INIT = 5,
        BALL_SPEED_MAX = 10;
    const SCORE_TO_WIN = 1;

    let p1y = (H - PADDLE_H) / 2;
    let p2y = (H - PADDLE_H) / 2;
    let ballX = W / 2;
    let ballY = H / 2;
    let ballVX = Math.random() < 0.5 ? -BALL_SPEED_INIT : BALL_SPEED_INIT;
    let ballVY = (Math.random() * 2 - 1) * BALL_SPEED_INIT * 0.6;
    let score1 = 0,
        score2 = 0;
    let paused = false,
        gameEnded = false;
    let rafId = 0;
    const keys = new Set<string>();

    function resetBall(lastScoredLeft: boolean) {
        ballX = W / 2;
        ballY = H / 2;
        const dir = lastScoredLeft ? -1 : 1;
        ballVX = dir * BALL_SPEED_INIT;
        ballVY = (Math.random() * 2 - 1) * BALL_SPEED_INIT * 0.6;
    }

    const onKeyDown = (e: KeyboardEvent) => {
        const k = e.key;
        if (['ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
        if (
            [
                'w',
                's',
                'W',
                'S',
                'ArrowUp',
                'ArrowDown',
                ' ',
                'p',
                'P',
            ].includes(k)
        )
            keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function update() {
        // toggle pause
        if (keys.has(' ') || keys.has('p') || keys.has('P')) {
            if (!gameEnded) paused = !paused;
            else unmount(); // match terminé
            keys.delete(' ');
            keys.delete('p');
            keys.delete('P');
        }

        if (paused || gameEnded) return;

        if (keys.has('w') || keys.has('W')) p1y -= PADDLE_SPEED;
        if (keys.has('s') || keys.has('S')) p1y += PADDLE_SPEED;
        if (keys.has('ArrowUp')) p2y -= PADDLE_SPEED;
        if (keys.has('ArrowDown')) p2y += PADDLE_SPEED;

        p1y = Math.max(0, Math.min(H - PADDLE_H, p1y));
        p2y = Math.max(0, Math.min(H - PADDLE_H, p2y));

        ballX += ballVX;
        ballY += ballVY;

        if (ballY - BALL_R <= 0 && ballVY < 0) {
            ballY = BALL_R;
            ballVY *= -1;
        }
        if (ballY + BALL_R >= H && ballVY > 0) {
            ballY = H - BALL_R;
            ballVY *= -1;
        }

        const p1x = 20;
        if (
            ballX - BALL_R <= p1x + PADDLE_W &&
            ballX - BALL_R >= p1x &&
            ballY >= p1y &&
            ballY <= p1y + PADDLE_H &&
            ballVX < 0
        ) {
            ballX = p1x + PADDLE_W + BALL_R;
            ballVX = Math.min(Math.abs(ballVX) + 0.5, BALL_SPEED_MAX);
            ballVY =
                ((ballY - (p1y + PADDLE_H / 2)) / (PADDLE_H / 2)) *
                Math.max(Math.abs(ballVX) * 0.8, 3);
        }
        const p2x = W - 20 - PADDLE_W;
        if (
            ballX + BALL_R >= p2x &&
            ballX + BALL_R <= p2x + PADDLE_W &&
            ballY >= p2y &&
            ballY <= p2y + PADDLE_H &&
            ballVX > 0
        ) {
            ballX = p2x - BALL_R;
            ballVX = -Math.min(Math.abs(ballVX) + 0.5, BALL_SPEED_MAX);
            ballVY =
                ((ballY - (p2y + PADDLE_H / 2)) / (PADDLE_H / 2)) *
                Math.max(Math.abs(ballVX) * 0.8, 3);
        }

        if (ballX < -BALL_R) {
            score2++;
            resetBall(true);
        }
        if (ballX > W + BALL_R) {
            score1++;
            resetBall(false);
        }

        if ((score1 >= SCORE_TO_WIN || score2 >= SCORE_TO_WIN) && !gameEnded) {
            paused = true;
            gameEnded = true;
            opts?.onEnd?.({
                p1: p1Name,
                p2: p2Name,
                s1: score1,
                s2: score2,
                winner: score1 > score2 ? p1Name : p2Name,
            });
        }
    }

    const theme = PONG_THEMES[opts?.theme || 'classic'];

    function draw() {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = theme.separator;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = theme.paddle;
        ctx.fillRect(20, p1y, PADDLE_W, PADDLE_H);
        ctx.fillRect(W - 20 - PADDLE_W, p2y, PADDLE_W, PADDLE_H);
        ctx.beginPath();
        ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = theme.ball;
        ctx.fill();
        ctx.fillStyle = theme.score;
        ctx.font = 'bold 28px ui-sans-serif, system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${score1}`, W / 2 - 50, 40);
        ctx.fillText(`${score2}`, W / 2 + 50, 40);
        ctx.font = 'bold 16px ui-sans-serif, system-ui';
        ctx.fillStyle = theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(p1Name, 120, 28);
        ctx.textAlign = 'right';
        ctx.fillText(p2Name, W - 120, 28);
        ctx.textAlign = 'center';

        if (paused) {
            ctx.fillStyle = theme.text;
            ctx.font = 'bold 22px ui-sans-serif, system-ui';
            if (gameEnded) {
                ctx.fillText(
                    `Vainqueur: ${score1 > score2 ? p1Name : p2Name}`,
                    W / 2,
                    H / 2 - 10
                );
                ctx.fillText(
                    'Appuyez sur Espace ou P pour continuer',
                    W / 2,
                    H / 2 + 20
                );
            } else {
                ctx.fillText(
                    'Pause - Espace ou P pour reprendre',
                    W / 2,
                    H / 2 - 10
                );
                ctx.fillText('Premier à 5 gagne', W / 2, H / 2 + 20);
            }
        }
    }

    function loop() {
        update();
        draw();
        rafId = requestAnimationFrame(loop);
    }
    loop();

    function unmount() {
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        root.innerHTML = '';
    }

    return unmount;
}

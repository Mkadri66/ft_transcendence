import bcrypt from 'bcrypt';
import db from '../config/db.js';

export default async function Tournament(app) {
    app.post(
        '/save-tournament',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            console.log('REQUEST BODY', request.body);

            const userPayload = request.user;
            if (!userPayload || !userPayload.email) {
                return reply
                    .status(401)
                    .send({ error: 'Utilisateur non authentifié' });
            }

            const saver = db
                .prepare('SELECT id, username FROM users WHERE email = ?')
                .get(userPayload.email);
            if (!saver) {
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur non trouvé' });
            }

            const summary = request.body && request.body.summary;
            if (!summary) {
                return reply
                    .status(400)
                    .send({ error: 'Missing summary in body' });
            }

            const history = Array.isArray(summary.history)
                ? summary.history
                : [];

            const isPlaceholder = (name) =>
                !name ||
                /Gagnant|Vainqueur|Qualifi|Bye|En attente|TBD|Attente|Gagnant match/i.test(
                    name
                );

            try {
                db.prepare('BEGIN').run();

                const tRes = db
                    .prepare(
                        'INSERT INTO tournaments (name, created_by) VALUES (?, ?)'
                    )
                    .run(
                        `Tournoi sauvegardé par ${
                            saver.username
                        } - ${new Date().toISOString()}`,
                        saver.id
                    );
                const tournamentId = tRes.lastInsertRowid;

                // Log création tournoi
                console.log(
                    `[TOURNOI] Created tournament id=${tournamentId} name="Tournoi sauvegardé par ${saver.username}" created_by=${saver.id}`
                );

                // helper: find user id by username (no creation)
                const findUserId = (username) => {
                    if (!username || isPlaceholder(username)) return null;
                    const res = db
                        .prepare('SELECT id FROM users WHERE username = ?')
                        .get(username);
                    return res ? res.id : null;
                };

                for (const h of history) {
                    const round = typeof h.round === 'number' ? h.round : 0;
                    const match = typeof h.match === 'number' ? h.match : 0;
                    const gameName = `Round ${round} Match ${match}`;

                    const p1Name = h.p1 || null;
                    const p2Name = h.p2 || null;
                    const s1 = typeof h.s1 === 'number' ? h.s1 : null;
                    const s2 = typeof h.s2 === 'number' ? h.s2 : null;
                    const winnerName = h.winner || null;

                    const p1Id = findUserId(p1Name);
                    const p2Id = findUserId(p2Name);
                    const winnerId = findUserId(winnerName);

                    const gRes = db
                        .prepare(
                            'INSERT INTO games (tournament_id, game_name, start_time, end_time, winner_id, winner_alias) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?)'
                        )
                        .run(
                            tournamentId,
                            gameName,
                            winnerId || null,
                            winnerName || null
                        );
                    const gameId = gRes.lastInsertRowid;

                    // Log game inséré
                    console.log(
                        `[TOURNOI] Inserted game id=${gameId} name="${gameName}" tournament_id=${tournamentId} winner_id=${
                            winnerId || 'NULL'
                        } winner_alias=${winnerName || 'NULL'}`
                    );

                    // Insert players: user_id if exists, else player_alias
                    if (p1Id) {
                        db.prepare(
                            'INSERT INTO game_players (game_id, user_id, score) VALUES (?, ?, ?)'
                        ).run(gameId, p1Id, s1);
                        console.log(
                            `[TOURNOI]   player1 -> user_id=${p1Id} score=${s1}`
                        );
                    } else {
                        db.prepare(
                            'INSERT INTO game_players (game_id, player_alias, score) VALUES (?, ?, ?)'
                        ).run(gameId, p1Name, s1);
                        console.log(
                            `[TOURNOI]   player1 -> alias="${p1Name}" score=${s1}`
                        );
                    }

                    if (p2Id) {
                        db.prepare(
                            'INSERT INTO game_players (game_id, user_id, score) VALUES (?, ?, ?)'
                        ).run(gameId, p2Id, s2);
                        console.log(
                            `[TOURNOI]   player2 -> user_id=${p2Id} score=${s2}`
                        );
                    } else {
                        db.prepare(
                            'INSERT INTO game_players (game_id, player_alias, score) VALUES (?, ?, ?)'
                        ).run(gameId, p2Name, s2);
                        console.log(
                            `[TOURNOI]   player2 -> alias="${p2Name}" score=${s2}`
                        );
                    }

                    // Mettre à jour stats uniquement pour users existants
                    const updateStatsFor = (uid, score, won) => {
                        if (!uid) return;
                        let stats = db
                            .prepare(
                                'SELECT * FROM user_stats WHERE user_id = ?'
                            )
                            .get(uid);
                        if (!stats) {
                            db.prepare(
                                'INSERT INTO user_stats (user_id) VALUES (?)'
                            ).run(uid);
                            stats = db
                                .prepare(
                                    'SELECT * FROM user_stats WHERE user_id = ?'
                                )
                                .get(uid);
                        }
                        const totalGames = (stats.total_games || 0) + 1;
                        const wins = (stats.wins || 0) + (won ? 1 : 0);
                        const losses = (stats.losses || 0) + (won ? 0 : 1);
                        const highest = Math.max(
                            stats.highest_score || 0,
                            score || 0
                        );
                        db.prepare(
                            `UPDATE user_stats
                             SET total_games = ?, wins = ?, losses = ?, last_played = CURRENT_TIMESTAMP, highest_score = ?
                             WHERE user_id = ?`
                        ).run(totalGames, wins, losses, highest, uid);
                        console.log(
                            `[TOURNOI]   updated stats for user_id=${uid} (totalGames=${totalGames}, wins=${wins}, losses=${losses}, highest=${highest})`
                        );
                    };

                    if (p1Id) updateStatsFor(p1Id, s1, winnerId === p1Id);
                    if (p2Id) updateStatsFor(p2Id, s2, winnerId === p2Id);
                }

                db.prepare('COMMIT').run();

                console.log(
                    `[TOURNOI] Commit complete for tournament id=${tournamentId}`
                );

                return reply.send({
                    ok: true,
                    message: 'Tournoi sauvegardé en base',
                    tournamentId,
                });
            } catch (err) {
                try {
                    db.prepare('ROLLBACK').run();
                } catch (e) {
                    console.error('Rollback failed', e);
                }
                console.error('[TOURNOI] Erreur save-tournament:', err);
                console.error('Erreur save-tournament:', err);
                return reply.status(500).send({ error: 'Erreur serveur' });
            }
        }
    );

    app.get(
        '/tournament',
        { preHandler: [app.authenticate] },
        async (request, reply) => {
            const userPayload = request.user;

            if (!userPayload || !userPayload.email) {
                return reply
                    .status(401)
                    .send({ error: 'Utilisateur non authentifié' });
            }

            const user = db
                .prepare('SELECT username FROM users WHERE email = ?')
                .get(userPayload.email);

            if (!user) {
                return reply
                    .status(404)
                    .send({ error: 'Utilisateur non trouvé' });
            }
            return reply.send({
                username: user.username,
            });
        }
    );
}

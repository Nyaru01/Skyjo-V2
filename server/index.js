
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import webpush from 'web-push';
import dotenv from 'dotenv';
import {
    initializeGame,
    revealInitialCards,
    drawFromPile,
    drawFromDiscard,
    replaceCard,
    discardAndReveal,
    calculateFinalScores,
    endTurn
} from '../src/lib/skyjoEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the dist folder (built React app)
app.use(express.static(path.join(__dirname, '../dist')));

// --- Database Configuration ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                emoji TEXT,
                avatar_id TEXT,
                vibe_id TEXT UNIQUE,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS friends (
                user_id TEXT REFERENCES users(id),
                friend_id TEXT REFERENCES users(id),
                status TEXT DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, friend_id)
            );

            CREATE TABLE IF NOT EXISTS push_subscriptions (
                user_id TEXT PRIMARY KEY REFERENCES users(id),
                subscription JSONB NOT NULL
            );
        `);
        console.log('[DB] Database initialized');
    } catch (err) {
        console.error('[DB] Init error:', err);
    }
};

initDb();

// --- Web Push Configuration ---
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:nyaru@skyjo.offline',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('[PUSH] VAPID keys configured');
}

// --- Social & Profile API ---

app.post('/api/social/profile', async (req, res) => {
    const { id, name, emoji, avatarId, vibeId, level, currentXP } = req.body;
    try {
        await pool.query(`
            INSERT INTO users (id, name, emoji, avatar_id, vibe_id, level, xp, last_seen)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                emoji = EXCLUDED.emoji,
                avatar_id = EXCLUDED.avatar_id,
                vibe_id = EXCLUDED.vibe_id,
                level = EXCLUDED.level,
                xp = EXCLUDED.xp,
                last_seen = CURRENT_TIMESTAMP
        `, [id, name, emoji, avatarId, vibeId, level, currentXP]);
        res.json({ status: 'ok' });
    } catch (err) {
        console.error('[API] Profile Sync error:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

app.get('/api/social/search', async (req, res) => {
    const { query } = req.query;
    try {
        const result = await pool.query(`
            SELECT id, name, avatar_id, vibe_id FROM users
            WHERE name ILIKE $1 OR vibe_id ILIKE $1
            LIMIT 10
        `, [`%${query}%`]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/social/friends/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.avatar_id, u.vibe_id, f.status, f.user_id as requester_id
            FROM users u
            JOIN friends f ON (f.user_id = $1 AND f.friend_id = u.id) OR (f.friend_id = $1 AND f.user_id = u.id)
            WHERE u.id != $1
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Fetch friends failed' });
    }
});

app.post('/api/social/friends/request', async (req, res) => {
    const { userId, friendId } = req.body;
    try {
        await pool.query(`
            INSERT INTO friends (user_id, friend_id, status)
            VALUES ($1, $2, 'PENDING')
            ON CONFLICT DO NOTHING
        `, [userId, friendId]);
        res.json({ status: 'sent' });
    } catch (err) {
        res.status(500).json({ error: 'Request failed' });
    }
});

app.post('/api/social/friends/accept', async (req, res) => {
    const { userId, friendId } = req.body;
    try {
        await pool.query(`
            UPDATE friends SET status = 'ACCEPTED'
            WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
        `, [userId, friendId]);
        res.json({ status: 'accepted' });
    } catch (err) {
        res.status(500).json({ error: 'Accept failed' });
    }
});

app.get('/api/social/leaderboard/global', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, avatar_id, vibe_id, level, xp FROM users
            ORDER BY level DESC, xp DESC LIMIT 20
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Leaderboard failed' });
    }
});

app.get('/api/social/leaderboard/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Includes user and their accepted friends
        const result = await pool.query(`
            SELECT u.id, u.name, u.avatar_id, u.vibe_id, u.level, u.xp FROM users u
            WHERE u.id = $1 OR u.id IN (
                SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END
                FROM friends WHERE (user_id = $1 OR friend_id = $1) AND status = 'ACCEPTED'
            )
            ORDER BY level DESC, xp DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Friend leaderboard failed' });
    }
});

app.post('/api/push/subscribe', async (req, res) => {
    const { userId, subscription } = req.body;
    try {
        await pool.query(`
            INSERT INTO push_subscriptions (user_id, subscription)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET subscription = EXCLUDED.subscription
        `, [userId, subscription]);
        res.json({ status: 'subscribed' });
    } catch (err) {
        res.status(500).json({ error: 'Subscription failed' });
    }
});

app.post('/api/push/unsubscribe', async (req, res) => {
    const { userId } = req.body;
    try {
        await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
        res.json({ status: 'unsubscribed' });
    } catch (err) {
        res.status(500).json({ error: 'Unsubscription failed' });
    }
});

// --- Server Utilities ---

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();
const userStatus = new Map(); // userId -> { socketId, status: 'ONLINE' | 'IN_GAME' }

const getPublicRooms = () => {
    const publicRooms = [];
    for (const [code, room] of rooms.entries()) {
        if (!room.gameStarted && room.players.length < 8 && room.isPublic) {
            publicRooms.push({
                code,
                hostName: room.players.find(p => p.isHost)?.name || 'Inconnu',
                playerCount: room.players.length,
                emoji: room.players.find(p => p.isHost)?.emoji || '🎮'
            });
        }
    }
    return publicRooms;
};

const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

const startNextRoundForRoom = (roomCode, room, ioInstance) => {
    room.playersReadyForNextRound = new Set();
    if (room.nextRoundTimeout) {
        clearTimeout(room.nextRoundTimeout);
        room.nextRoundTimeout = null;
    }

    if (!room.roundScored) {
        const roundScores = calculateFinalScores(room.gameState);
        roundScores.forEach(score => {
            const currentTotal = room.totalScores[score.playerId] || 0;
            const additional = score.finalScore || 0;
            room.totalScores[score.playerId] = currentTotal + additional;
        });
        room.roundScored = true;
    }

    const maxScore = Math.max(...Object.values(room.totalScores));
    if (maxScore >= 100) {
        room.isGameOver = true;
        const minScore = Math.min(...Object.values(room.totalScores));
        const winnerId = Object.keys(room.totalScores).find(id => room.totalScores[id] === minScore);
        const winnerPlayer = room.players.find(p => p.id === winnerId);
        room.gameWinner = { id: winnerId, name: winnerPlayer?.name, emoji: winnerPlayer?.emoji, score: minScore };
        ioInstance.to(roomCode).emit('game_over', { totalScores: room.totalScores, winner: room.gameWinner });

        // Return players to 'ONLINE' status
        room.players.forEach(p => {
            if (userStatus.has(p.dbId)) {
                userStatus.set(p.dbId, { ...userStatus.get(p.dbId), status: 'ONLINE' });
                io.emit('user_presence_update', { userId: p.dbId, status: 'ONLINE' });
            }
        });
    } else {
        room.roundNumber++;
        room.roundScored = false;
        const gamePlayers = room.players.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }));
        room.gameState = initializeGame(gamePlayers);
        ioInstance.to(roomCode).emit('game_started', { gameState: room.gameState, totalScores: room.totalScores, roundNumber: room.roundNumber });
    }
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.emit('room_list_update', getPublicRooms());

    socket.on('register_user', ({ id, name, emoji, vibeId }) => {
        socket.dbId = id;
        userStatus.set(id, { socketId: socket.id, status: 'ONLINE' });
        io.emit('user_presence_update', { userId: id, status: 'ONLINE' });
        console.log(`[USER] Registered: ${name} (${id})`);
    });

    socket.on('create_room', ({ playerName, emoji, dbId }) => {
        const roomCode = generateRoomCode();
        const effectiveDbId = dbId || socket.dbId;
        rooms.set(roomCode, {
            gameState: null,
            players: [{ id: socket.id, dbId: effectiveDbId, name: playerName, emoji, isHost: true }],
            totalScores: {},
            roundNumber: 1,
            gameStarted: false,
            isGameOver: false,
            gameWinner: null,
            isPublic: true
        });
        socket.join(roomCode);
        socket.emit('room_created', roomCode);
        io.to(roomCode).emit('player_list_update', rooms.get(roomCode).players);
        io.emit('room_list_update', getPublicRooms());
    });

    socket.on('join_room', ({ roomCode, playerName, emoji, dbId }) => {
        const room = rooms.get(roomCode?.toUpperCase());
        if (!room) { socket.emit('error', 'Salle introuvable'); return; }
        if (room.gameStarted) { socket.emit('error', 'La partie a déjà commencé'); return; }
        if (room.players.some(p => p.id === socket.id)) return;
        if (room.players.length >= 8) { socket.emit('error', 'Salle pleine'); return; }

        const effectiveDbId = dbId || socket.dbId;
        room.players.push({ id: socket.id, dbId: effectiveDbId, name: playerName, emoji, isHost: false });
        socket.join(roomCode.toUpperCase());
        io.to(roomCode.toUpperCase()).emit('player_list_update', room.players);
        io.emit('room_list_update', getPublicRooms());
        socket.to(roomCode.toUpperCase()).emit('new_player_joined', { playerName, emoji });
    });

    socket.on('start_game', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;
        const gamePlayers = room.players.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }));
        room.gameState = initializeGame(gamePlayers);
        room.gameStarted = true;

        // Update presence to IN_GAME
        room.players.forEach(p => {
            if (p.dbId) {
                userStatus.set(p.dbId, { ...userStatus.get(p.dbId), status: 'IN_GAME' });
                io.emit('user_presence_update', { userId: p.dbId, status: 'IN_GAME' });
            }
        });

        io.emit('room_list_update', getPublicRooms());
        if (Object.keys(room.totalScores).length === 0) gamePlayers.forEach(p => room.totalScores[p.id] = 0);
        io.to(roomCode).emit('game_started', { gameState: room.gameState, totalScores: room.totalScores, roundNumber: room.roundNumber });
    });

    socket.on('game_action', ({ roomCode, action, payload }) => {
        const room = rooms.get(roomCode);
        if (!room || !room.gameState) return;
        const pIdx = room.gameState.players.findIndex(p => p.id === socket.id);
        if (pIdx === -1) return;

        let lastAction = { type: action, playerId: socket.id, playerName: room.gameState.players[pIdx]?.name, card: null, timestamp: Date.now() };

        try {
            let newState = { ...room.gameState };
            if (newState.phase === 'INITIAL_REVEAL') {
                if (action === 'reveal_initial') newState = revealInitialCards(newState, pIdx, payload.cardIndices);
            } else {
                if (room.gameState.players[room.gameState.currentPlayerIndex].id !== socket.id) return;
                switch (action) {
                    case 'draw_pile': newState = drawFromPile(newState); break;
                    case 'draw_discard': newState = drawFromDiscard(newState); break;
                    case 'replace_card':
                        const replacedCard = room.gameState.players[pIdx].hand[payload.cardIndex];
                        lastAction.card = replacedCard ? { ...replacedCard, isRevealed: true } : null;
                        newState = replaceCard(newState, payload.cardIndex);
                        newState = endTurn(newState);
                        break;
                    case 'discard_and_reveal': newState = discardAndReveal(newState, payload.cardIndex); newState = endTurn(newState); break;
                    case 'discard_drawn':
                        if (!newState.drawnCard) return;
                        lastAction.card = { ...newState.drawnCard, isRevealed: true };
                        newState = { ...newState, discardPile: [...newState.discardPile, { ...newState.drawnCard, isRevealed: true }], drawnCard: null, turnPhase: 'MUST_REVEAL' };
                        break;
                    case 'reveal_hidden':
                        const player = newState.players[pIdx];
                        const newHand = player.hand.map((card, i) => i === payload.cardIndex ? { ...card, isRevealed: true } : card);
                        newState.players[pIdx] = { ...player, hand: newHand };
                        newState.turnPhase = 'DRAW';
                        newState = endTurn(newState);
                        break;
                    case 'undo_draw_discard':
                        if (newState.turnPhase !== 'MUST_REPLACE' || !newState.drawnCard) return;
                        newState = { ...newState, discardPile: [...newState.discardPile, newState.drawnCard], drawnCard: null, turnPhase: 'DRAW' };
                        lastAction.type = 'undo_draw_discard';
                        lastAction.card = null;
                        break;
                }
            }
            room.gameState = newState;
            io.to(roomCode).emit('game_update', { gameState: newState, lastAction });
        } catch (e) {
            socket.emit('error', e.message);
        }
    });

    socket.on('invite_friend', async ({ friendId, roomCode, fromName }) => {
        const friend = userStatus.get(friendId);
        if (friend) {
            io.to(friend.socketId).emit('game_invitation', { fromName, roomCode });

            // Try Push Notification
            try {
                const subResp = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [friendId]);
                if (subResp.rows.length > 0) {
                    const payload = JSON.stringify({
                        title: 'Invitation SkyJo',
                        body: `${fromName} t'invite à rejoindre sa partie !`,
                        icon: '/logo.jpg',
                        data: { url: `/?room=${roomCode}` }
                    });
                    await webpush.sendNotification(subResp.rows[0].subscription, payload);
                }
            } catch (err) {
                console.error('[PUSH] Invite error:', err);
            }
        }
    });

    socket.on('disconnect', () => {
        if (socket.dbId) {
            userStatus.delete(socket.dbId);
            io.emit('user_presence_update', { userId: socket.dbId, status: 'OFFLINE' });
        }
        for (const [roomCode, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const leavingPlayer = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) { rooms.delete(roomCode); }
                else {
                    let newHostName = null;
                    if (leavingPlayer.isHost) { room.players[0].isHost = true; newHostName = room.players[0].name; }
                    io.to(roomCode).emit('player_left', { playerId: socket.id, playerName: leavingPlayer.name, newHost: newHostName });
                    io.to(roomCode).emit('player_list_update', room.players);
                    if (room.gameStarted && room.players.length < 2) {
                        room.gameStarted = false; room.gameState = null;
                        io.to(roomCode).emit('game_cancelled', { reason: 'Pas assez de joueurs' });
                    }
                }
                io.emit('room_list_update', getPublicRooms());
                break;
            }
        }
    });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'connected' }));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'), (err) => {
        if (err) res.status(200).send('<h1>SkyJo Server Running</h1>');
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

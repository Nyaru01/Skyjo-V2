
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from the dist folder (built React app)
app.use(express.static(path.join(__dirname, '../dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send initial list
    socket.emit('room_list_update', getPublicRooms());

    socket.on('get_public_rooms', () => {
        socket.emit('room_list_update', getPublicRooms());
    });

    // --- Lobby Events ---

    socket.on('create_room', ({ playerName, emoji }) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            gameState: null,
            players: [{ id: socket.id, name: playerName, emoji, isHost: true }],
            totalScores: {},
            roundNumber: 1,
            gameStarted: false,
            isGameOver: false,
            gameWinner: null,
            isPublic: true // Par défaut public
        });

        socket.join(roomCode);
        socket.emit('room_created', roomCode);
        io.to(roomCode).emit('player_list_update', rooms.get(roomCode).players);
        console.log(`Room ${roomCode} created by ${playerName}`);

        // Broadcast update to all for lobby list
        io.emit('room_list_update', getPublicRooms());
    });

    socket.on('join_room', ({ roomCode, playerName, emoji }) => {
        // Normalize room code?
        const room = rooms.get(roomCode?.toUpperCase());
        if (!room) {
            socket.emit('error', 'Salle introuvable');
            return;
        }

        if (room.gameStarted) {
            socket.emit('error', 'La partie a déjà commencé');
            return;
        }

        if (room.players.some(p => p.id === socket.id)) {
            return; // Already joined
        }

        if (room.players.length >= 8) {
            socket.emit('error', 'Salle pleine');
            return;
        }

        room.players.push({ id: socket.id, name: playerName, emoji, isHost: false });
        socket.join(roomCode.toUpperCase());

        io.to(roomCode.toUpperCase()).emit('player_list_update', room.players);
        io.to(roomCode.toUpperCase()).emit('player_list_update', room.players);
        console.log(`${playerName} joined room ${roomCode}`);

        // Update lobby list (player count changed)
        io.emit('room_list_update', getPublicRooms());

        // Notify others in room
        socket.to(roomCode.toUpperCase()).emit('new_player_joined', { playerName, emoji });
    });

    socket.on('start_game', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Verify host?
        // const player = room.players.find(p => p.id === socket.id);
        // if (!player?.isHost) return;

        const gamePlayers = room.players.map(p => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji
        }));

        room.gameState = initializeGame(gamePlayers);
        room.gameStarted = true;
        io.emit('room_list_update', getPublicRooms()); // Update list (room no longer available)

        // Init scores if first game
        if (Object.keys(room.totalScores).length === 0) {
            gamePlayers.forEach(p => room.totalScores[p.id] = 0);
        }

        io.to(roomCode).emit('game_started', {
            gameState: room.gameState,
            totalScores: room.totalScores,
            roundNumber: room.roundNumber
        });
    });

    // --- Gameplay Events ---

    socket.on('game_action', ({ roomCode, action, payload }) => {
        const room = rooms.get(roomCode);
        if (!room || !room.gameState) return;

        const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];

        try {
            let newState = { ...room.gameState };
            // Find player index in game state based on socket ID
            // Be careful: gameState.players[i].id matches socket.id because we mapped it in start_game
            const pIdx = room.gameState.players.findIndex(p => p.id === socket.id);
            if (pIdx === -1) return;

            // Track the last action for animation feedback
            let lastAction = {
                type: action,
                playerId: socket.id,
                playerName: room.gameState.players[pIdx]?.name,
                card: null, // Card that went to discard (if any)
                timestamp: Date.now()
            };

            // Initial Reveal Phase
            if (newState.phase === 'INITIAL_REVEAL') {
                if (action === 'reveal_initial') {
                    // payload: { cardIndices: [...] }
                    newState = revealInitialCards(newState, pIdx, payload.cardIndices);
                }
            } else {
                // Game Loop
                // Verify it is this player's turn
                if (currentPlayer.id !== socket.id) return;

                switch (action) {
                    case 'draw_pile':
                        newState = drawFromPile(newState);
                        break;
                    case 'draw_discard':
                        newState = drawFromDiscard(newState);
                        break;
                    case 'replace_card':
                        // Capture the card being replaced BEFORE the action
                        const replacedCard = room.gameState.players[pIdx].hand[payload.cardIndex];
                        lastAction.card = replacedCard ? { ...replacedCard, isRevealed: true } : null;
                        newState = replaceCard(newState, payload.cardIndex);
                        newState = endTurn(newState);
                        break;
                    case 'discard_and_reveal':
                        newState = discardAndReveal(newState, payload.cardIndex);
                        newState = endTurn(newState);
                        break;
                    case 'discard_drawn':
                        if (!newState.drawnCard) return;
                        // Capture the drawn card being discarded
                        lastAction.card = { ...newState.drawnCard, isRevealed: true };
                        newState = {
                            ...newState,
                            discardPile: [...newState.discardPile, { ...newState.drawnCard, isRevealed: true }],
                            drawnCard: null,
                            turnPhase: 'MUST_REVEAL',
                        };
                        break;
                    case 'reveal_hidden':
                        const player = newState.players[pIdx];
                        const newHand = player.hand.map((card, i) =>
                            i === payload.cardIndex ? { ...card, isRevealed: true } : card
                        );
                        newState.players[pIdx] = { ...player, hand: newHand };

                        // After revealing, turn is over
                        // But we must construct state correctly for endTurn
                        // Wait, `revealHiddenCard` in store set turnPhase='DRAW' then called endTurn.
                        newState.turnPhase = 'DRAW'; // Reset phase expected by endTurn?
                        newState = endTurn(newState);
                        break;
                    case 'undo_draw_discard':
                        // Only allowed if we just took from discard (implies MUST_REPLACE phase in this engine)
                        if (newState.turnPhase !== 'MUST_REPLACE' || !newState.drawnCard) return;

                        // Put card back on discard pile
                        newState = {
                            ...newState,
                            discardPile: [...newState.discardPile, newState.drawnCard],
                            drawnCard: null,
                            turnPhase: 'DRAW'
                        };
                        // Clear last action type to avoid confusing clients? 
                        // Or send specific type so client can handle it (e.g. clear drawn card slot)
                        lastAction.type = 'undo_draw_discard';
                        lastAction.card = null;
                        break;
                }
            }

            room.gameState = newState;
            io.to(roomCode).emit('game_update', { gameState: newState, lastAction });

        } catch (e) {
            console.error("Action Error:", e.message);
            socket.emit('error', e.message);
        }
    });

    socket.on('next_round', (roomCode) => {
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', 'Salle introuvable ou expirée');
            return;
        }

        // If game is already restarted (e.g. other player triggered it), sync this client
        if (room.gameState && (room.gameState.phase === 'INITIAL_REVEAL' || room.gameState.phase === 'PLAYING')) {
            console.log(`Resyncing ${socket.id} to new round ${room.roundNumber}`);
            socket.emit('game_started', {
                gameState: room.gameState,
                totalScores: room.totalScores,
                roundNumber: room.roundNumber
            });
            return;
        }

        if (!room.gameState || room.gameState.phase !== 'FINISHED') {
            socket.emit('error', 'La manche n\'est pas terminée');
            return;
        }

        // Initialize ready set if not exists
        if (!room.playersReadyForNextRound) {
            room.playersReadyForNextRound = new Set();
        }

        // Find the player who clicked
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Mark this player as ready
        room.playersReadyForNextRound.add(socket.id);
        console.log(`${player.name} is ready for next round (${room.playersReadyForNextRound.size}/${room.players.length})`);

        // Notify all players about who is ready
        io.to(roomCode).emit('player_ready_next_round', {
            playerId: socket.id,
            playerName: player.name,
            playerEmoji: player.emoji,
            readyCount: room.playersReadyForNextRound.size,
            totalPlayers: room.players.length
        });

        // Check if all players are ready
        if (room.playersReadyForNextRound.size >= room.players.length) {
            console.log(`All players ready! Starting next round for room ${roomCode}`);

            // Reset ready set
            room.playersReadyForNextRound = new Set();

            // Calculate scores adding to total (only once)
            if (!room.roundScored) {
                const roundScores = calculateFinalScores(room.gameState);
                roundScores.forEach(score => {
                    const currentTotal = room.totalScores[score.playerId] || 0;
                    const additional = score.finalScore || 0;
                    room.totalScores[score.playerId] = currentTotal + additional;
                    console.log(`Score update for ${score.playerName}: ${currentTotal} + ${additional} = ${room.totalScores[score.playerId]}`);
                });
                room.roundScored = true;
            }

            // Check 100 points
            const maxScore = Math.max(...Object.values(room.totalScores));
            if (maxScore >= 100) {
                room.isGameOver = true;
                const minScore = Math.min(...Object.values(room.totalScores));
                const winnerId = Object.keys(room.totalScores).find(id => room.totalScores[id] === minScore);
                const winnerPlayer = room.players.find(p => p.id === winnerId);
                room.gameWinner = { name: winnerPlayer?.name, emoji: winnerPlayer?.emoji, score: minScore };

                io.to(roomCode).emit('game_over', {
                    totalScores: room.totalScores,
                    winner: room.gameWinner
                });
            } else {
                // Next Round
                room.roundNumber++;
                room.roundScored = false;
                const gamePlayers = room.players.map(p => ({
                    id: p.id, name: p.name, emoji: p.emoji
                }));
                room.gameState = initializeGame(gamePlayers);
                io.to(roomCode).emit('game_started', {
                    gameState: room.gameState,
                    totalScores: room.totalScores,
                    roundNumber: room.roundNumber
                });
            }
        }
    });

    socket.on('rematch', (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Reset everything
        const gamePlayers = room.players.map(p => ({
            id: p.id, name: p.name, emoji: p.emoji
        }));

        room.totalScores = {};
        gamePlayers.forEach(p => room.totalScores[p.id] = 0);
        room.roundNumber = 1;
        room.isGameOver = false;
        room.gameWinner = null;
        room.roundScored = false;

        room.gameState = initializeGame(gamePlayers);

        io.to(roomCode).emit('game_started', {
            gameState: room.gameState,
            totalScores: room.totalScores,
            roundNumber: room.roundNumber
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Find and clean up the player's room
        for (const [roomCode, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const leavingPlayer = room.players[playerIndex];
                const wasHost = leavingPlayer.isHost;

                // Remove player from room
                room.players.splice(playerIndex, 1);

                console.log(`${leavingPlayer.name} left room ${roomCode}`);

                if (room.players.length === 0) {
                    // Delete empty room
                    rooms.delete(roomCode);
                    rooms.delete(roomCode);
                    console.log(`Room ${roomCode} deleted (empty)`);
                    io.emit('room_list_update', getPublicRooms());
                } else {
                    // Transfer host role if needed
                    let newHostName = null;
                    if (wasHost && room.players.length > 0) {
                        room.players[0].isHost = true;
                        newHostName = room.players[0].name;
                        console.log(`New host for ${roomCode}: ${newHostName}`);
                    }

                    // Notify remaining players
                    io.to(roomCode).emit('player_left', {
                        playerId: socket.id,
                        playerName: leavingPlayer.name,
                        playerEmoji: leavingPlayer.emoji,
                        newHost: newHostName
                    });
                    io.to(roomCode).emit('player_list_update', room.players);
                    io.emit('room_list_update', getPublicRooms()); // Update player count

                    // If game was in progress and < 2 players remain, end the game
                    if (room.gameStarted && room.players.length < 2) {
                        room.gameStarted = false;
                        room.gameState = null;
                        io.to(roomCode).emit('game_cancelled', {
                            reason: 'Pas assez de joueurs pour continuer'
                        });
                        // Update because game cancelled = room might be available or gone? 
                        // Actually if < 2 players and game cancelled, it becomes a lobby again? 
                        // Logic in 'game_cancelled' usually implies reset. 
                        // Let's ensure we update the list.
                        io.emit('room_list_update', getPublicRooms());
                    }
                }
                break;
            }
        }
    });
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../dist', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // If index.html doesn't exist, send a basic response
            res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head><title>SkyJo</title></head>
                <body>
                    <h1>SkyJo Server Running</h1>
                    <p>Build files not found. The app may still be building.</p>
                </body>
                </html>
            `);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

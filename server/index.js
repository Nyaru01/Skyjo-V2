
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

const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

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
            gameWinner: null
        });

        socket.join(roomCode);
        socket.emit('room_created', roomCode);
        io.to(roomCode).emit('player_list_update', rooms.get(roomCode).players);
        console.log(`Room ${roomCode} created by ${playerName}`);
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
        console.log(`${playerName} joined room ${roomCode}`);
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
        if (!room || !room.gameState || room.gameState.phase !== 'FINISHED') return;

        // Check if host? 
        // For now, anyone can trigger next round to keep it simple, or checking socket.id

        // Calculate scores adding to total
        // Note: We might have already calculated stats on client side, but source of truth is here.
        // We should only add scores ONCE.
        // We can add a flag `room.roundScored`?

        if (!room.roundScored) {
            const roundScores = calculateFinalScores(room.gameState);
            roundScores.forEach(score => {
                room.totalScores[score.playerId] = (room.totalScores[score.playerId] || 0) + score.finalScore;
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
                    console.log(`Room ${roomCode} deleted (empty)`);
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

                    // If game was in progress and < 2 players remain, end the game
                    if (room.gameStarted && room.players.length < 2) {
                        room.gameStarted = false;
                        room.gameState = null;
                        io.to(roomCode).emit('game_cancelled', {
                            reason: 'Pas assez de joueurs pour continuer'
                        });
                    }
                }
                break;
            }
        }
    });
});

// Catch-all route for SPA (React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

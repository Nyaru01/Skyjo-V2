
import { create } from 'zustand';
import { io } from 'socket.io-client';

// Dynamic socket URL: in production use same origin, in dev use localhost
const SOCKET_URL = import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3000';

const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling']
});

export const useOnlineGameStore = create((set, get) => ({
    // Connection State
    isConnected: false,
    socketId: null, // Expose ID
    playerName: '',
    playerEmoji: '🐱',
    roomCode: null,
    isHost: false,
    error: null,

    // Game State (synced from server)
    gameState: null,
    players: [],
    totalScores: {},
    roundNumber: 1,
    gameStarted: false,
    isGameOver: false,
    gameWinner: null,

    // UI Local State
    selectedCardIndex: null,

    // Animation feedback state
    lastAction: null,

    // Notification state for toasts
    lastNotification: null,

    // Actions
    connect: () => {
        if (!socket.connected) {
            socket.on('connect', () => {
                set({ isConnected: true, socketId: socket.id, error: null });
            });

            socket.on('disconnect', () => {
                set({ isConnected: false, socketId: null });
            });

            socket.on('error', (msg) => {
                set({ error: msg });
                // Auto-clear error after 3s
                setTimeout(() => set({ error: null }), 3000);
            });

            socket.on('room_created', (roomCode) => {
                set({ roomCode, isHost: true, error: null });
            });

            socket.on('player_list_update', (players) => {
                // Check if we became host
                const { socketId } = get();
                const me = players.find(p => p.id === socketId);
                set({ players, isHost: me?.isHost || false });
            });

            socket.on('game_started', ({ gameState, totalScores, roundNumber }) => {
                set({
                    gameState,
                    totalScores,
                    roundNumber,
                    gameStarted: true,
                    isGameOver: false,
                    gameWinner: null,
                    selectedCardIndex: null
                });
            });

            socket.on('game_update', ({ gameState, lastAction }) => {
                set({ gameState, lastAction: lastAction || null });
            });

            socket.on('game_over', ({ totalScores, winner }) => {
                set({
                    totalScores,
                    gameWinner: winner,
                    isGameOver: true
                });
            });

            // Handle player leaving
            socket.on('player_left', ({ playerName, playerEmoji, newHost }) => {
                set({
                    lastNotification: {
                        type: 'info',
                        message: `${playerEmoji} ${playerName} a quitté la partie`,
                        timestamp: Date.now()
                    }
                });

                // If we became the new host, update isHost
                const { socketId, players } = get();
                const me = players.find(p => p.id === socketId);
                if (me && newHost === me.name) {
                    set({ isHost: true });
                }
            });

            // Handle game cancelled (not enough players)
            socket.on('game_cancelled', ({ reason }) => {
                set({
                    gameStarted: false,
                    gameState: null,
                    lastNotification: {
                        type: 'warning',
                        message: reason,
                        timestamp: Date.now()
                    }
                });
            });

            socket.connect();
        }
    },

    // Get socket ID (for comparing with player IDs)
    getSocketId: () => socket?.id,

    disconnect: () => {
        socket.disconnect();
        set({
            isConnected: false,
            roomCode: null,
            gameState: null,
            gameStarted: false
        });
    },

    setPlayerInfo: (name, emoji) => {
        set({ playerName: name, playerEmoji: emoji });
    },

    createRoom: () => {
        const { playerName, playerEmoji } = get();
        if (!playerName) {
            set({ error: "Entrez un pseudo !" });
            return;
        }
        socket.emit('create_room', { playerName, emoji: playerEmoji });
    },

    joinRoom: (code) => {
        const { playerName, playerEmoji } = get();
        if (!playerName) {
            set({ error: "Entrez un pseudo !" });
            return;
        }
        if (!code) {
            set({ error: "Entrez un code de salle !" });
            return;
        }
        socket.emit('join_room', { roomCode: code, playerName, emoji: playerEmoji });
        set({ roomCode: code }); // Set optimistically, validated by events
    },

    startGame: () => {
        const { roomCode } = get();
        if (roomCode) socket.emit('start_game', roomCode);
    },

    startNextRound: () => {
        const { roomCode } = get();
        if (roomCode) socket.emit('next_round', roomCode);
    },

    rematch: () => {
        const { roomCode } = get();
        if (roomCode) socket.emit('rematch', roomCode);
    },

    // In-Game Actions
    emitGameAction: (action, payload = {}) => {
        const { roomCode } = get();
        if (roomCode) {
            socket.emit('game_action', { roomCode, action, payload });
            set({ selectedCardIndex: null });
        }
    },

    // UI Helpers
    selectCard: (index) => set({ selectedCardIndex: index }),
    clearError: () => set({ error: null }),
}));

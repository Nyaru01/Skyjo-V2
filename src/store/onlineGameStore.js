
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { AVATARS } from '../lib/avatars';
import { useGameStore } from './gameStore';

// Dynamic socket URL: in production use same origin, in dev use localhost
const SOCKET_URL = import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling']
});

// Track if listeners have been set up
let listenersInitialized = false;

export const useOnlineGameStore = create((set, get) => ({
    // Connection State
    isConnected: false,
    socketId: null, // Expose ID
    playerName: '',
    playerEmoji: '🐱',
    roomCode: null,
    isHost: false,
    publicRooms: [], // Available public rooms
    error: null,

    // Game State (synced from server)
    gameState: null,
    players: [],
    totalScores: {},
    roundNumber: 1,
    gameStarted: false,
    isGameOver: false,
    gameWinner: null,
    readyStatus: { readyCount: 0, totalPlayers: 0 }, // Track ready players for next round
    timeoutExpired: false, // True when 10s timeout has passed and host can force-start

    // UI Local State
    selectedCardIndex: null,

    // Animation feedback state
    lastAction: null,

    // Notification state for toasts
    lastNotification: null,

    // Animation state
    pendingAnimation: null, // { type, sourceId, targetId, card, onComplete }
    setPendingAnimation: (animation) => set({ pendingAnimation: animation }),
    clearPendingAnimation: () => set({ pendingAnimation: null }),


    // Actions
    connect: () => {
        // Set up listeners only once
        if (!listenersInitialized) {
            listenersInitialized = true;

            socket.on('connect', () => {
                console.log('[Socket] Connected:', socket.id);
                set({ isConnected: true, socketId: socket.id, error: null });
            });

            socket.on('disconnect', () => {
                console.log('[Socket] Disconnected');
                set({ isConnected: false, socketId: null });
            });

            socket.on('error', (msg) => {
                console.log('[Socket] Error:', msg);
                set({ error: msg });
                // Auto-clear error after 3s
                setTimeout(() => set({ error: null }), 3000);
            });

            socket.on('room_created', (roomCode) => {
                console.log('[Socket] Room created:', roomCode);
                set({ roomCode, isHost: true, error: null });
            });

            socket.on('room_list_update', (rooms) => {
                set({ publicRooms: rooms });
            });

            socket.on('new_player_joined', ({ playerName, emoji }) => {
                // Convert avatarId to real emoji (emoji field contains the avatar ID like 'cat')
                const avatar = AVATARS.find(a => a.id === emoji);
                const displayEmoji = avatar?.emoji || '👤';

                set({
                    lastNotification: {
                        type: 'info',
                        message: `${displayEmoji} ${playerName} a rejoint la partie !`,
                        sound: 'join', // Custom flag to trigger sound
                        timestamp: Date.now()
                    }
                });
            });

            socket.on('invitation_sent', () => {
                set({
                    lastNotification: {
                        type: 'success',
                        message: "🚀 Invitation envoyée !",
                        timestamp: Date.now()
                    }
                });
            });

            socket.on('invitation_failed', ({ reason }) => {
                set({
                    lastNotification: {
                        type: 'error',
                        message: reason === 'OFFLINE' ? "👤 L'ami est hors ligne" : "❌ Échec de l'invitation",
                        timestamp: Date.now()
                    }
                });
            });

            socket.on('player_list_update', (players) => {
                console.log('[Socket] Player list update:', players.length, 'players, my socket.id:', socket.id);
                // Use socket.id directly - more reliable than state.socketId which may be stale
                const me = players.find(p => p.id === socket.id);
                console.log('[Socket] Found me:', me?.name, 'isHost:', me?.isHost);
                set({ players, isHost: me?.isHost === true });
            });

            socket.on('game_started', ({ gameState, totalScores, roundNumber }) => {
                console.log('[Socket] Game started, round:', roundNumber);
                set({
                    gameState,
                    totalScores,
                    roundNumber,
                    gameStarted: true,
                    isGameOver: false,
                    gameWinner: null,
                    selectedCardIndex: null,
                    readyStatus: { readyCount: 0, totalPlayers: 0 },
                    timeoutExpired: false
                });
            });

            socket.on('game_update', ({ gameState, lastAction }) => {
                // If there's an action to animate, do it first
                if (lastAction) {
                    const { type, playerId, cardIndex, cardValue } = lastAction;
                    // We need to find the player to execute animation 
                    // But wait, the `gameState` received is the NEW state (post-action).
                    // This is tricky. In local, we animate THEN update.
                    // Here we receive the update. If we set it immediately, the card teleports.
                    // So we must: 
                    // 1. NOT set gameState immediately.
                    // 2. Set animation.
                    // 3. On animation complete, set gameState.

                    // Helper to get Source/Target IDs
                    let sourceId = null;
                    let targetId = null;
                    let cardToAnimate = null;

                    if (type === 'draw_pile') {
                        sourceId = 'deck-pile';
                        targetId = 'drawn-card-slot';
                        // For draw, we might not know the card if it's hidden, 
                        // but usually if I drew it, I know it? 
                        // Or if opponent drew, I assume it's face down?
                        // The server `lastAction` should probably contain details.
                    } else if (type === 'draw_discard') {
                        sourceId = 'discard-pile';
                        targetId = 'drawn-card-slot';
                        cardToAnimate = { value: cardValue, isRevealed: true }; // We know value if from discard
                    } else if (type === 'replace_card') {
                        // From center to slot
                        sourceId = 'drawn-card-slot';
                        targetId = `card-${playerId}-${cardIndex}`;
                        cardToAnimate = { value: cardValue, isRevealed: true };
                    } else if (type === 'discard_drawn') {
                        // From center to discard
                        sourceId = 'drawn-card-slot';
                        targetId = 'discard-pile';
                        cardToAnimate = { value: cardValue, isRevealed: true };
                    } else if (type === 'discard_and_reveal') {
                        // This is a complex one: Card goes to discard, AND another card is revealed.
                        // Animation: Drawn card -> Discard.
                        sourceId = 'drawn-card-slot';
                        targetId = 'discard-pile';
                        cardToAnimate = { value: cardValue, isRevealed: true };
                    } else if (type === 'undo_draw_discard') {
                        // Undo: Drawn card (Center) -> Discard Pile
                        sourceId = 'drawn-card-slot';
                        targetId = 'discard-pile';
                        // For undo, we don't have 'cardValue' in payload usually, 
                        // but we know what the card WAS because it's in the CURRENT gameState.drawnCard
                        // before we apply the update.
                        const currentDrawn = get().gameState?.drawnCard;
                        cardToAnimate = currentDrawn ? { ...currentDrawn, isRevealed: true } : { value: '?', isRevealed: true };
                    }

                    if (sourceId && targetId) {
                        set({
                            pendingAnimation: {
                                sourceId,
                                targetId,
                                card: cardToAnimate,
                                onComplete: () => {
                                    set({ gameState, lastAction: lastAction || null });
                                }
                            }
                        });
                        return; // Stop here, wait for animation
                    }
                }

                // Default: just update if no animation
                set({ gameState, lastAction: lastAction || null });
            });

            socket.on('game_over', ({ totalScores, winner }) => {
                console.log('[Socket] Game over, winner:', winner);
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
                // If we became host
                const { socketId, players } = get();
                const me = players.find(p => p.id === socketId);
                if (me && newHost === me.name) {
                    set({ isHost: true });
                }
            });

            socket.on('game_cancelled', ({ reason }) => {
                console.log('[Socket] Game cancelled:', reason);
                set({
                    gameStarted: false,
                    gameState: null,
                    roomCode: null,
                    players: [],
                    isHost: false,
                    lastNotification: {
                        type: 'warning',
                        message: reason + ' - Retour au menu',
                        timestamp: Date.now()
                    }
                });
            });

            // Handle player ready for next round
            socket.on('player_ready_next_round', ({ playerId, playerName, playerEmoji, readyCount, totalPlayers }) => {
                console.log(`[Socket] ${playerName} is ready (${readyCount}/${totalPlayers})`);
                const { socketId } = get();

                // Update ready status
                set({
                    readyStatus: { readyCount, totalPlayers }
                });

                // Only notify if someone else clicked ready
                const isMe = playerId === socketId;
                if (!isMe) {
                    // Convert avatarId to real emoji
                    const avatar = AVATARS.find(a => a.id === playerEmoji);
                    const displayEmoji = avatar?.emoji || '👤';

                    set({
                        lastNotification: {
                            type: 'info',
                            message: `${displayEmoji} ${playerName} veut continuer (${readyCount}/${totalPlayers})`,
                            timestamp: Date.now()
                        }
                    });
                }
            });

            // Handle timeout expired (host can now force start)
            socket.on('timeout_expired', ({ message }) => {
                console.log(`[Socket] Timeout expired: ${message}`);
                const { isHost } = get();
                set({
                    timeoutExpired: true,
                    lastNotification: isHost ? {
                        type: 'info',
                        message: 'Délai expiré - Vous pouvez lancer la manche suivante',
                        timestamp: Date.now()
                    } : {
                        type: 'info',
                        message: 'Délai expiré - En attente de l\'hôte',
                        timestamp: Date.now()
                    }
                });
            });
        }

        // Connect if not already connected
        if (!socket.connected) {
            socket.connect();
        }
    },

    // Get socket ID (for comparing with player IDs)
    getSocketId: () => socket?.id,

    disconnect: () => {
        // socket.disconnect(); // KEEP CONNECTION ALIVE!
        // We only reset the game state locally.
        // If we need to leave a room explicitly, we should emit 'leave_room'
        if (get().roomCode) {
            socket.emit('leave_room', get().roomCode);
        }

        set({
            isConnected: true, // Remain "Connected" to the server (presence), just not in a game
            roomCode: null,
            gameState: null,
            gameStarted: false,
            isGameOver: false,
            gameWinner: null,
            players: [],
            roundNumber: 1
        });
    },

    setPlayerInfo: (name, emoji) => {
        set({ playerName: name, playerEmoji: emoji });
    },

    createRoom: (isPublic = true, autoInviteFriendId = null) => {
        const { playerName, playerEmoji } = get();
        if (!playerName) {
            set({ error: "Entrez un pseudo !" });
            return;
        }

        // CRITICAL: Ensure listeners are set up before emitting
        get().connect();

        const dbId = useGameStore.getState().userProfile.id;
        const payload = { playerName, emoji: playerEmoji, dbId, isPublic, autoInviteFriendId };

        if (!socket.connected) {
            socket.connect();
            socket.once('connect', () => {
                socket.emit('create_room', payload);
            });
        } else {
            socket.emit('create_room', payload);
        }
    },

    createRoomAndInvite: (friendId) => {
        const { userProfile } = useGameStore.getState();
        set({
            playerName: userProfile.name,
            playerEmoji: userProfile.avatarId
        });

        get().createRoom(false, friendId); // Create as PRIVATE with ATOMIC AUTO-INVITE
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

        // CRITICAL: Ensure listeners are set up before emitting
        get().connect();

        const dbId = useGameStore.getState().userProfile.id;

        if (!socket.connected) {
            socket.connect();
            socket.once('connect', () => {
                socket.emit('join_room', { roomCode: code, playerName, emoji: playerEmoji, dbId });
            });
        } else {
            socket.emit('join_room', { roomCode: code, playerName, emoji: playerEmoji, dbId });
        }
        set({ roomCode: code });
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

    forceNextRound: () => {
        const { roomCode } = get();
        if (roomCode) socket.emit('force_next_round', roomCode);
    },

    // In-Game Actions
    emitGameAction: (action, payload = {}) => {
        const { roomCode } = get();
        if (roomCode) {
            socket.emit('game_action', { roomCode, action, payload });
            set({ selectedCardIndex: null });
        }
    },

    undoTakeFromDiscard: () => {
        const { roomCode } = get();
        if (roomCode) {
            socket.emit('game_action', { roomCode, action: 'undo_draw_discard' });
        }
    },

    // UI Helpers
    selectCard: (index) => set({ selectedCardIndex: index }),
    clearError: () => set({ error: null }),
}));

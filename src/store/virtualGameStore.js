/**
 * Virtual Skyjo Game Store
 * Manages state for the virtual card game mode
 */
import { create } from 'zustand';
import {
    initializeGame,
    revealInitialCards,
    drawFromPile,
    drawFromDiscard,
    replaceCard,
    discardAndReveal,
    endTurn,
    calculateFinalScores,
    getValidActions,
} from '../lib/skyjoEngine';
import { useGameStore } from './gameStore';
import {
    AI_DIFFICULTY,
    AI_NAMES,
    chooseInitialCardsToReveal,
    decideDrawSource,
    decideCardAction,
} from '../lib/skyjoAI';

export const useVirtualGameStore = create((set, get) => ({
    // Game state
    gameState: null,
    gameMode: null, // 'local' or 'online'
    roomCode: null,

    // Multi-round state
    totalScores: {}, // Cumulative scores per player: { playerId: score }
    roundNumber: 1,
    isGameOver: false, // True when someone reaches 100 points
    gameWinner: null, // Player with lowest score at game end

    // UI state
    selectedCardIndex: null,
    showScores: false,
    animatingCards: [],

    // AI mode state
    aiMode: false,
    aiPlayers: [], // Indices of AI players
    aiDifficulty: AI_DIFFICULTY.NORMAL,
    isAIThinking: false,

    // Notifications
    lastNotification: null,

    clearNotification: () => set({ lastNotification: null }),

    // Animation State
    pendingAnimation: null, // { type, sourceId, targetId, card, onComplete }
    setPendingAnimation: (animation) => set({ pendingAnimation: animation }),
    clearPendingAnimation: () => set({ pendingAnimation: null }),


    /**
     * Start a new local game (full game with multiple rounds)
     */
    startLocalGame: (players) => {
        const gameState = initializeGame(players);
        // Initialize total scores for each player
        const totalScores = {};
        players.forEach(p => {
            totalScores[p.id] = 0;
        });
        set({
            gameState,
            gameMode: 'local',
            roomCode: null,
            totalScores,
            roundNumber: 1,
            isGameOver: false,
            gameWinner: null,
            selectedCardIndex: null,
            showScores: false,
            aiMode: false,
            aiPlayers: [],
        });
    },

    /**
     * Start a new AI game (human vs AI players)
     */
    startAIGame: (humanPlayer, aiCount = 1, difficulty = AI_DIFFICULTY.NORMAL) => {
        // Create players array: human first, then AI players
        const players = [
            { id: 'human-1', name: humanPlayer.name || 'Joueur', emoji: humanPlayer.emoji || '🐱' },
        ];

        const aiPlayerIndices = [];
        for (let i = 0; i < aiCount; i++) {
            players.push({
                id: `ai-${i + 1}`,
                name: AI_NAMES[i] || `🤖 Bot ${i + 1}`,
                emoji: '🤖',
            });
            aiPlayerIndices.push(i + 1); // AI players are at indices 1, 2, 3...
        }

        const gameState = initializeGame(players);
        const totalScores = {};
        players.forEach(p => {
            totalScores[p.id] = 0;
        });

        set({
            gameState,
            gameMode: 'ai',
            roomCode: null,
            totalScores,
            roundNumber: 1,
            isGameOver: false,
            gameWinner: null,
            selectedCardIndex: null,
            showScores: false,
            aiMode: true,
            aiPlayers: aiPlayerIndices,
            aiDifficulty: difficulty,
            isAIThinking: false,
        });
    },

    /**
     * Set AI thinking state (for UI indicator)
     */
    setAIThinking: (isThinking) => {
        set({ isAIThinking: isThinking });
    },

    /**
     * Execute AI turn - called automatically when it's an AI player's turn
     */
    executeAITurn: () => {
        const { gameState, aiDifficulty, aiPlayers } = get();
        if (!gameState) return;

        const currentPlayerIndex = gameState.currentPlayerIndex;
        if (!aiPlayers.includes(currentPlayerIndex)) return;

        const phase = gameState.phase;
        const turnPhase = gameState.turnPhase;

        // Handle initial reveal phase
        if (phase === 'INITIAL_REVEAL') {
            const currentPlayer = gameState.players[currentPlayerIndex];
            const revealedCount = currentPlayer.hand.filter(c => c && c.isRevealed).length;

            if (revealedCount < 2) {
                const cardsToReveal = chooseInitialCardsToReveal(currentPlayer.hand, aiDifficulty);
                const newState = revealInitialCards(gameState, currentPlayerIndex, cardsToReveal);
                set({
                    gameState: newState,
                    isAIThinking: false,
                    lastNotification: {
                        type: 'info',
                        message: `🤖 ${currentPlayer.name} a retourné 2 cartes`,
                        timestamp: Date.now()
                    }
                });
            }
            return;
        }

        // Handle playing/final round phase
        if (phase === 'PLAYING' || phase === 'FINAL_ROUND') {
            if (turnPhase === 'DRAW') {
                // Step 1: Decide where to draw from
                const drawSource = decideDrawSource(gameState, aiDifficulty);
                let newState;
                // Animation setup
                const currentPlayer = gameState.players[currentPlayerIndex];

                // Helper to execute draw with animation
                const executeDrawWithAnimation = (sourceId, sourceCard, finalStateCalc) => {
                    // 1. Set notification
                    set({
                        lastNotification: {
                            type: 'info',
                            message: `🤖 ${currentPlayer.name} ${sourceId === 'deck-pile' ? 'a pioché' : `a pris (${sourceCard.value})`}`,
                            timestamp: Date.now()
                        }
                    });

                    // 2. Trigger Animation
                    // For draw, we don't have a specific target "hand" element that is visible for AI usually
                    // But we can target the player's avatar or hand container if visible
                    // Or just a central point. Let's try to target the player's hand container if possible.
                    // Or we can add an ID to the hand container itself.
                    // We want the card to fly to the CENTER (the drawn card slot)
                    // We added ID `drawn-card-slot` in DrawDiscardTrigger
                    const targetId = 'drawn-card-slot';

                    set({
                        pendingAnimation: {
                            sourceId: sourceId,
                            targetId: targetId,
                            card: sourceCard || { value: '?', color: 'gray' }, // Provide dummy if deck
                            onComplete: () => {
                                // 3. Commit State Change after animation
                                set({ gameState: finalStateCalc() });
                            }
                        }
                    });
                };

                if (drawSource === 'DISCARD_PILE' && gameState.discardPile.length > 0) {
                    const discardTop = gameState.discardPile[gameState.discardPile.length - 1];
                    executeDrawWithAnimation(
                        'discard-pile',
                        discardTop,
                        () => drawFromDiscard(get().gameState)
                    );
                } else {
                    // Draw from pile
                    executeDrawWithAnimation(
                        'deck-pile',
                        null, // Unknown card for animation (face down)
                        () => drawFromPile(get().gameState)
                    );
                }

                return; // Will be called again for the next phase
            }

            if (turnPhase === 'REPLACE_OR_DISCARD' || turnPhase === 'MUST_REPLACE') {
                // Step 2: Decide what to do with drawn card
                const decision = decideCardAction(gameState, aiDifficulty);

                const currentPlayer = gameState.players[currentPlayerIndex];
                const drawnCard = gameState.drawnCard;

                // We assume the card starts from "hand" area (or where it landed).
                // But for the REPLACE animation, we want it to go from "somewhere" to the Grid Target.
                // We'll use the center of screen or the player's general area as source?
                // Actually, the previous animation landed it at `card-${currentPlayer.id}-4`.
                // So let's start from there? Or maybe just use `deck-pile` if we didn't track it.
                // Better: The "drawn card" is usually displayed in the UI (e.g., in the DrawDiscard component).
                // But in AI turn, we don't see the Draw/Discard popup usually? 
                // Wait, if AI is playing, the local player sees... the board.
                // The AI doesn't open the popup.
                // So the "drawn card" concept is abstract visually unless we show it.
                // For now, let's assume it flies from the deck/discard to the target.

                // If it was REPLACE:
                // Animation: Hand/Deck -> Target Slot.

                if (decision.action === 'REPLACE') {
                    // 1. Notify
                    set({
                        lastNotification: {
                            type: 'info',
                            message: `🤖 ${currentPlayer.name} a remplacé une carte`,
                            timestamp: Date.now()
                        }
                    });

                    // 2. Animate
                    const targetId = `card-${currentPlayer.id}-${decision.cardIndex}`;

                    // Source? If we just drew, it's virtually "in hand". 
                    // Source? The card is currently displayed at the CENTER (drawn-card-slot)
                    const sourceId = 'drawn-card-slot';

                    set({
                        pendingAnimation: {
                            sourceId: sourceId,
                            targetId: targetId,
                            card: drawnCard,
                            onComplete: () => {
                                // 3. Commit
                                let ns = replaceCard(get().gameState, decision.cardIndex);
                                ns = endTurn(ns);
                                set({ gameState: ns, selectedCardIndex: null, isAIThinking: false });
                            }
                        }
                    });

                } else {
                    // DISCARD AND REVEAL
                    // 1. Notify
                    set({
                        lastNotification: {
                            type: 'info',
                            message: `🤖 ${currentPlayer.name} a défaussé et retourné une carte`,
                            timestamp: Date.now()
                        }
                    });

                    // 2. Animate: Center -> Discard Pile
                    const sourceId = 'drawn-card-slot';
                    const targetId = 'discard-pile';

                    set({
                        pendingAnimation: {
                            sourceId: sourceId,
                            targetId: targetId,
                            card: drawnCard,
                            onComplete: () => {
                                // 3. Commit
                                let ns = discardAndReveal(get().gameState, decision.cardIndex);
                                ns = endTurn(ns);
                                set({ gameState: ns, selectedCardIndex: null, isAIThinking: false });
                            }
                        }
                    });
                }

                return;
            }
        }
    },

    /**
     * Reveal initial 2 cards for a player
     */
    revealInitial: (playerIndex, cardIndices) => {
        const { gameState } = get();
        if (!gameState) return;

        const newState = revealInitialCards(gameState, playerIndex, cardIndices);
        set({ gameState: newState });
    },

    /**
     * Draw from the main pile
     */
    drawFromDrawPile: () => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'DRAW') return;

        const newState = drawFromPile(gameState);
        set({ gameState: newState });
    },

    /**
     * Take from discard pile
     */
    takeFromDiscard: () => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'DRAW') return;
        if (gameState.discardPile.length === 0) return;

        const newState = drawFromDiscard(gameState);
        set({ gameState: newState });
    },

    /**
     * Replace a card in hand with drawn card
     */
    replaceHandCard: (cardIndex) => {
        const { gameState } = get();
        if (!gameState) return;
        if (gameState.turnPhase !== 'REPLACE_OR_DISCARD' && gameState.turnPhase !== 'MUST_REPLACE') return;

        let newState = replaceCard(gameState, cardIndex);
        newState = endTurn(newState);
        set({ gameState: newState, selectedCardIndex: null });
    },

    /**
     * Discard drawn card and reveal a hidden card
     */
    discardAndRevealCard: (cardIndex) => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'REPLACE_OR_DISCARD') return;

        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.hand[cardIndex]?.isRevealed) return;

        let newState = discardAndReveal(gameState, cardIndex);
        newState = endTurn(newState);
        set({ gameState: newState, selectedCardIndex: null });
    },


    /**
     * Reveal a card on the grid (used when in MUST_REVEAL phase)
     */
    revealGridCard: (cardIndex) => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'MUST_REVEAL') return;

        const player = gameState.players[gameState.currentPlayerIndex];
        // Can only reveal hidden cards
        if (player.hand[cardIndex]?.isRevealed) return;

        // Reveal the card
        const newHand = [...player.hand];
        newHand[cardIndex] = { ...newHand[cardIndex], isRevealed: true };

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = { ...player, hand: newHand };

        // After revealing, turn ends
        let newState = {
            ...gameState,
            players: newPlayers,
            turnPhase: 'DRAW' // Reset for next turn logic inside endTurn
        };

        // Use engine's endTurn to handle column clearing and next player
        newState = endTurn(newState);
        set({ gameState: newState });
    },
    discardDrawnCard: () => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'REPLACE_OR_DISCARD') return;
        if (!gameState.drawnCard) return;

        // Put drawn card on discard pile and set phase to reveal a hidden card
        const newState = {
            ...gameState,
            discardPile: [...gameState.discardPile, { ...gameState.drawnCard, isRevealed: true }],
            drawnCard: null,
            turnPhase: 'MUST_REVEAL', // New phase: must reveal a hidden card
        };
        set({ gameState: newState });
    },

    /**
     * Reveal a hidden card (after discarding drawn card)
     */
    revealHiddenCard: (cardIndex) => {
        const { gameState } = get();
        if (!gameState || gameState.turnPhase !== 'MUST_REVEAL') return;

        const player = gameState.players[gameState.currentPlayerIndex];
        if (player.hand[cardIndex]?.isRevealed) return; // Can only reveal hidden cards

        // Reveal the card
        const newHand = player.hand.map((card, i) =>
            i === cardIndex ? { ...card, isRevealed: true } : card
        );

        const newPlayers = [...gameState.players];
        newPlayers[gameState.currentPlayerIndex] = {
            ...player,
            hand: newHand,
        };

        let newState = {
            ...gameState,
            players: newPlayers,
            turnPhase: 'DRAW',
        };
        newState = endTurn(newState);
        set({ gameState: newState, selectedCardIndex: null });
    },

    /**
     * Select a card in hand (for UI highlighting)
     */
    selectCard: (index) => {
        set({ selectedCardIndex: index });
    },

    /**
     * Get current valid actions
     */
    getActions: () => {
        const { gameState } = get();
        if (!gameState) return null;
        return getValidActions(gameState);
    },

    /**
     * Undo taking from discard (if user changes mind/closes popup)
     * Puts the drawn card back to discard pile and resets phase
     */
    undoTakeFromDiscard: () => {
        const { gameState } = get();
        if (!gameState || !gameState.drawnCard || gameState.turnPhase !== 'MUST_REPLACE') return;

        // Animate return to discard
        // Source: Center (drawn-card-slot)
        // Target: Discard Pile (discard-pile)

        const cardToAnimate = gameState.drawnCard;

        set({
            pendingAnimation: {
                sourceId: 'drawn-card-slot',
                targetId: 'discard-pile',
                card: { ...cardToAnimate, isRevealed: true },
                onComplete: () => {
                    // Revert state
                    const newDiscardPile = [...gameState.discardPile, gameState.drawnCard];
                    set({
                        gameState: {
                            ...gameState,
                            discardPile: newDiscardPile,
                            drawnCard: null,
                            turnPhase: 'DRAW'
                        }
                    });
                }
            }
        });
    },

    /**
     * Get final scores
     */
    getFinalScores: () => {
        const { gameState } = get();
        if (!gameState || gameState.phase !== 'FINISHED') return null;
        return calculateFinalScores(gameState);
    },

    /**
     * Reset game (back to menu)
     */
    resetGame: () => {
        set({
            gameState: null,
            gameMode: null,
            roomCode: null,
            totalScores: {},
            roundNumber: 1,
            isGameOver: false,
            gameWinner: null,
            selectedCardIndex: null,
            showScores: false,
            aiMode: false,
            aiPlayers: [],
            aiDifficulty: AI_DIFFICULTY.NORMAL,
            isAIThinking: false,
        });
    },

    /**
     * End current round, update cumulative scores, check for game end
     */
    endRound: () => {
        const { gameState, totalScores, roundNumber, aiPlayers } = get();
        if (!gameState || gameState.phase !== 'FINISHED') return;

        const roundScores = calculateFinalScores(gameState);
        const newTotalScores = { ...totalScores };

        // Add this round's scores to totals
        roundScores.forEach(score => {
            newTotalScores[score.playerId] = (newTotalScores[score.playerId] || 0) + score.finalScore;
        });

        // Grant XP if human player won the round (lowest score = first in sorted array)
        const roundWinner = roundScores[0]; // Sorted by score, lowest first
        const humanPlayerIndex = 0; // Human is always player 0 in AI games
        const humanPlayer = gameState.players[humanPlayerIndex];

        if (roundWinner && humanPlayer && roundWinner.playerId === humanPlayer.id) {
            // Human won this round! Grant 1 XP
            try {
                useGameStore.getState().addXP(1);
            } catch (e) {
                console.warn('Could not grant XP:', e);
            }
        }

        // Check if anyone reached 100 points (game over condition)
        const maxScore = Math.max(...Object.values(newTotalScores));
        const isGameOver = maxScore >= 100;

        let gameWinner = null;
        if (isGameOver) {
            // Find player with LOWEST total score (they win!)
            const minScore = Math.min(...Object.values(newTotalScores));
            const winnerId = Object.keys(newTotalScores).find(id => newTotalScores[id] === minScore);
            const winner = gameState.players.find(p => p.id === winnerId);
            gameWinner = winner ? { ...winner, score: minScore } : null;
        }

        set({
            totalScores: newTotalScores,
            isGameOver,
            gameWinner,
        });

        return { isGameOver, newTotalScores, gameWinner };
    },

    /**
     * Start next round with same players
     */
    startNextRound: () => {
        const { gameState, roundNumber, isGameOver } = get();
        if (!gameState || isGameOver) return;

        const players = gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
        }));

        const newGameState = initializeGame(players);
        set({
            gameState: newGameState,
            roundNumber: roundNumber + 1,
            selectedCardIndex: null,
            showScores: false,
        });
    },

    /**
     * Play again with same players (new full game)
     */
    rematch: () => {
        const { gameState } = get();
        if (!gameState) return;

        const players = gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
        }));

        // Reset everything for a new full game
        const newGameState = initializeGame(players);
        const totalScores = {};
        players.forEach(p => {
            totalScores[p.id] = 0;
        });

        set({
            gameState: newGameState,
            totalScores,
            roundNumber: 1,
            isGameOver: false,
            gameWinner: null,
            selectedCardIndex: null,
            showScores: false,
        });
    },
}));

// Selectors
export const selectGameState = (state) => state.gameState;
export const selectCurrentPlayer = (state) => {
    if (!state.gameState) return null;
    return state.gameState.players[state.gameState.currentPlayerIndex];
};
export const selectGamePhase = (state) => state.gameState?.phase;
export const selectTurnPhase = (state) => state.gameState?.turnPhase;
export const selectDrawnCard = (state) => state.gameState?.drawnCard;
export const selectDiscardTop = (state) => {
    if (!state.gameState?.discardPile?.length) return null;
    return state.gameState.discardPile[state.gameState.discardPile.length - 1];
};
export const selectTotalScores = (state) => state.totalScores;
export const selectRoundNumber = (state) => state.roundNumber;
export const selectIsGameOver = (state) => state.isGameOver;
export const selectGameWinner = (state) => state.gameWinner;

// AI selectors
export const selectAIMode = (state) => state.aiMode;
export const selectAIPlayers = (state) => state.aiPlayers;
export const selectAIDifficulty = (state) => state.aiDifficulty;
export const selectIsAIThinking = (state) => state.isAIThinking;
export const selectIsCurrentPlayerAI = (state) => {
    if (!state.gameState || !state.aiMode) return false;
    return state.aiPlayers.includes(state.gameState.currentPlayerIndex);
};

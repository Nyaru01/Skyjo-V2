import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateRoundScore, checkStrictlyLowest } from '../lib/scoreUtils';

/**
 * Calculate total scores for all players across all rounds
 * @param {Array} players - Array of player objects with id
 * @param {Array} rounds - Array of round objects with scores
 * @returns {Object} Map of player id to total score
 */
const calculateTotals = (players, rounds) => {
    const totals = {};
    players.forEach(p => totals[p.id] = 0);
    rounds.forEach(r => {
        players.forEach(p => {
            totals[p.id] += r.scores[p.id] || 0;
        });
    });
    return totals;
};

/**
 * Check if any player has reached or exceeded the threshold
 */
const checkGameOver = (totals, threshold) => {
    return Object.values(totals).some(score => score >= threshold);
};

export const useGameStore = create(
    persist(
        (set, get) => ({
            // Initial clean state
            players: [],
            threshold: 100,
            rounds: [],
            gameStatus: 'SETUP',
            gameHistory: [], // Array of archived finished games
            achievements: [], // Array of unlocked achievements
            darkMode: true, // Always default to dark mode
            soundEnabled: true,
            musicEnabled: true,
            vibrationEnabled: true,
            hasSeenTutorial: false,
            cardSkin: 'classic', // classic, papyrus
            userProfile: {
                id: `u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: 'Joueur',
                avatarId: 'cat',
                emoji: '🐱',
                vibeId: '',
                level: 1,
                currentXP: 0
            },

            setCardSkin: (skin) => set({ cardSkin: skin }),

            setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),

            // XP & Level System
            // Note: We'll keep these values in parallel with userProfile for backward compatibility 
            // but sync them to userProfile when they change
            level: 1,
            lastAcknowledgedLevel: 1,
            currentXP: 0,

            generateSkyId: () => {
                const { userProfile, syncProfileWithBackend } = get();
                if (userProfile.vibeId) return;
                const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newVibeId = `#${randomPart}`;
                set(state => ({
                    userProfile: { ...state.userProfile, vibeId: newVibeId }
                }));
                // Sync after ID generation
                syncProfileWithBackend();
            },

            updateUserProfile: (updates) => {
                set(state => ({
                    userProfile: { ...state.userProfile, ...updates }
                }));
                // Sync after update
                get().syncProfileWithBackend();
            },

            syncProfileWithBackend: async () => {
                const { userProfile } = get();
                try {
                    await fetch('/api/social/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userProfile)
                    });
                } catch (err) {
                    console.error('[STORE] Sync error:', err);
                }
            },

            /**
             * Add XP points (called on victory)
             * @param {number} amount - XP to add (default 1)
             */
            addXP: (amount = 1) => {
                const { currentXP, level, userProfile, syncProfileWithBackend } = get();
                const newXP = currentXP + amount;

                if (newXP >= 10) {
                    // Level up!
                    set(state => ({
                        currentXP: newXP - 10,
                        level: level + 1,
                        userProfile: {
                            ...state.userProfile,
                            level: level + 1,
                            currentXP: newXP - 10
                        }
                    }));
                } else {
                    set(state => ({
                        currentXP: newXP,
                        userProfile: {
                            ...state.userProfile,
                            currentXP: newXP
                        }
                    }));
                }
                // Sync XP/Level change
                syncProfileWithBackend();
            },

            /**
             * Acknowledge that the user has seen the level up reward
             */
            acknowledgeLevelUp: () => {
                set({ lastAcknowledgedLevel: get().level });
            },

            /**
             * Reset XP and Level (for testing/admin)
             */
            resetXP: () => set({ currentXP: 0, level: 1, lastAcknowledgedLevel: 1 }),

            /**
             * Debug: Force level up
             */
            debugLevelUp: () => {
                const { level } = get();
                set({ level: level + 1, currentXP: 0 });
            },

            toggleDarkMode: () => {
                const newMode = !get().darkMode;
                document.documentElement.classList.toggle('dark', newMode);
                set({ darkMode: newMode });
            },

            toggleSound: () => set({ soundEnabled: !get().soundEnabled }),

            toggleMusic: () => set({ musicEnabled: !get().musicEnabled }),

            toggleVibration: () => set({ vibrationEnabled: !get().vibrationEnabled }),

            setConfiguration: (playerData, threshold) => {
                const players = playerData.map((p, index) => ({
                    id: `p${Date.now()}-${index}`,
                    name: p.name || `Player ${index + 1}`,
                    emoji: p.emoji || '👤',
                    avatarId: p.avatarId || 'cat'
                }));
                set({
                    players,
                    threshold: Number(threshold) || 100,
                    rounds: [],
                    gameStatus: 'PLAYING'
                });
            },

            addRound: (rawScores, finisherId) => {
                const { rounds, players, threshold } = get();

                const isStrictlyLowest = checkStrictlyLowest(finisherId, rawScores);

                const finalScores = {};
                players.forEach(p => {
                    const raw = rawScores[p.id];
                    const isFinisher = p.id === finisherId;
                    finalScores[p.id] = calculateRoundScore(raw, isFinisher, isStrictlyLowest);
                });

                const newRound = {
                    id: `r${Date.now()}`,
                    rawScores,
                    scores: finalScores,
                    finisherId,
                    isStrictlyLowest
                };

                const nextRounds = [...rounds, newRound];
                const totals = calculateTotals(players, nextRounds);
                const isGameOver = checkGameOver(totals, threshold);

                set({
                    rounds: nextRounds,
                    gameStatus: isGameOver ? 'FINISHED' : 'PLAYING'
                });
            },

            deleteRound: (roundId) => {
                const { rounds, threshold, players } = get();
                const nextRounds = rounds.filter(r => r.id !== roundId);
                const totals = calculateTotals(players, nextRounds);
                const isGameOver = checkGameOver(totals, threshold);

                set({
                    rounds: nextRounds,
                    gameStatus: isGameOver ? 'FINISHED' : 'PLAYING'
                });
            },

            undoLastRound: () => {
                const { rounds, threshold, players } = get();
                if (rounds.length === 0) return;

                const nextRounds = rounds.slice(0, -1);
                const totals = calculateTotals(players, nextRounds);
                const isGameOver = checkGameOver(totals, threshold);

                set({
                    rounds: nextRounds,
                    gameStatus: isGameOver ? 'FINISHED' : 'PLAYING'
                });
            },

            /**
             * Archive the current finished game to history
             */
            archiveGame: () => {
                const { players, rounds, threshold, gameHistory } = get();
                if (players.length === 0 || rounds.length === 0) return;

                // Calculate final scores
                const totals = calculateTotals(players, rounds);
                const playersWithScores = players.map(p => ({
                    ...p,
                    finalScore: totals[p.id]
                })).sort((a, b) => a.finalScore - b.finalScore);

                const winner = playersWithScores[0];

                const archivedGame = {
                    id: `game-${Date.now()}`,
                    date: new Date().toISOString(),
                    players: playersWithScores,
                    rounds: [...rounds],
                    threshold,
                    winner: { id: winner.id, name: winner.name, score: winner.finalScore }
                };

                // Add to history (newest first), keep max 50 games
                const updatedHistory = [archivedGame, ...gameHistory].slice(0, 50);
                set({ gameHistory: updatedHistory });
            },

            /**
             * Archive an online game to history
             * @param {Object} params - Online game data
             * @param {Array} params.players - Array of player objects with name, emoji
             * @param {Object} params.totalScores - Map of player id to total score
             * @param {Object} params.winner - Winner object with name, emoji, score
             * @param {number} params.roundsPlayed - Number of rounds played
             */
            archiveOnlineGame: ({ players, totalScores, winner, roundsPlayed }) => {
                const { gameHistory } = get();
                if (!players || players.length === 0) return;

                // Convert online format to archive format
                const playersWithScores = players.map(p => ({
                    id: p.id,
                    name: p.name,
                    emoji: p.emoji,
                    finalScore: totalScores[p.id] || 0
                })).sort((a, b) => a.finalScore - b.finalScore);

                const archivedGame = {
                    id: `game-online-${Date.now()}`,
                    date: new Date().toISOString(),
                    players: playersWithScores,
                    rounds: [], // Online games don't track individual rounds the same way
                    threshold: 100,
                    winner: winner ? {
                        id: winner.id || 'online-winner',
                        name: winner.name,
                        score: winner.score
                    } : playersWithScores[0] ? {
                        id: playersWithScores[0].id,
                        name: playersWithScores[0].name,
                        score: playersWithScores[0].finalScore
                    } : null,
                    gameType: 'online', // Partie en ligne
                    roundsPlayed: roundsPlayed || 1
                };

                // Add to history (newest first), keep max 50 games
                const updatedHistory = [archivedGame, ...gameHistory].slice(0, 50);
                set({ gameHistory: updatedHistory });
            },

            /**
             * Archive a virtual game (AI or local) to history
             * @param {Object} params - Virtual game data
             * @param {Array} params.players - Array of player objects with name, emoji, id
             * @param {Object} params.totalScores - Map of player id to total score
             * @param {Object} params.winner - Winner object with name, emoji, score
             * @param {number} params.roundsPlayed - Number of rounds played
             * @param {string} params.gameType - Type of game: 'ai' or 'local'
             */
            archiveVirtualGame: ({ players, totalScores, winner, roundsPlayed, gameType = 'ai' }) => {
                const { gameHistory } = get();
                if (!players || players.length === 0) return;

                // Convert virtual format to archive format
                const playersWithScores = players.map(p => ({
                    id: p.id,
                    name: p.name,
                    emoji: p.emoji,
                    finalScore: totalScores[p.id] || 0
                })).sort((a, b) => a.finalScore - b.finalScore);

                const archivedGame = {
                    id: `game-${gameType}-${Date.now()}`,
                    date: new Date().toISOString(),
                    players: playersWithScores,
                    rounds: [], // Virtual games don't track rounds the same way
                    threshold: 100,
                    winner: winner ? {
                        id: winner.id || `${gameType}-winner`,
                        name: winner.name,
                        score: winner.score
                    } : playersWithScores[0] ? {
                        id: playersWithScores[0].id,
                        name: playersWithScores[0].name,
                        score: playersWithScores[0].finalScore
                    } : null,
                    gameType: gameType, // 'ai' ou 'local'
                    roundsPlayed: roundsPlayed || 1
                };

                // Add to history (newest first), keep max 50 games
                const updatedHistory = [archivedGame, ...gameHistory].slice(0, 50);
                set({ gameHistory: updatedHistory });
            },

            /**
             * Delete a game from history
             */
            deleteArchivedGame: (gameId) => {
                const { gameHistory } = get();
                set({ gameHistory: gameHistory.filter(g => g.id !== gameId) });
            },

            /**
             * Clear all game history
             */
            clearArchivedGames: () => {
                set({ gameHistory: [] });
            },

            resetGame: () => {
                set({
                    gameStatus: 'SETUP',
                    rounds: [],
                    players: []
                });
            },

            rematch: () => {
                set({
                    gameStatus: 'PLAYING',
                    rounds: []
                });
            }
        }),
        {
            name: 'skyjo-storage',
            version: 3, // Increment version to force new migration
            migrate: (persistedState, version) => {
                if (version < 2) {
                    // Handling migration from v1 to v2/v3
                    return {
                        ...persistedState,
                        hasSeenTutorial: false,
                        achievements: [],
                    };
                }
                if (version < 3) {
                    // Start fresh with tutorial seen if it was missing to avoid spam
                    return {
                        ...persistedState,
                        hasSeenTutorial: persistedState.hasSeenTutorial ?? false,
                        achievements: persistedState.achievements || [],
                    };
                }
                return persistedState;
            },
        }
    )
);

// Computed selectors for optimized re-renders
export const selectPlayers = (state) => state.players;
export const selectRounds = (state) => state.rounds;
export const selectThreshold = (state) => state.threshold;
export const selectGameStatus = (state) => state.gameStatus;
export const selectGameHistory = (state) => state.gameHistory;

/**
 * Selector for player totals - use with shallow comparison
 */
export const selectPlayerTotals = (state) => {
    return state.players.map(p => ({
        ...p,
        score: state.rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0)
    })).sort((a, b) => a.score - b.score);
};

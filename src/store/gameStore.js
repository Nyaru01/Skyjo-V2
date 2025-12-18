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

            setConfiguration: (names, threshold) => {
                const players = names.map((name, index) => ({
                    id: `p${Date.now()}-${index}`,
                    name: name || `Player ${index + 1}`
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
        }
    )
);

// Computed selectors for optimized re-renders
export const selectPlayers = (state) => state.players;
export const selectRounds = (state) => state.rounds;
export const selectThreshold = (state) => state.threshold;
export const selectGameStatus = (state) => state.gameStatus;

/**
 * Selector for player totals - use with shallow comparison
 */
export const selectPlayerTotals = (state) => {
    return state.players.map(p => ({
        ...p,
        score: state.rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0)
    })).sort((a, b) => a.score - b.score);
};

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, ArrowLeft, RotateCcw, Trophy, Info, Sparkles, CheckCircle, BookOpen, X, Bot } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Toast } from './ui/Toast';
import PlayerHand from './virtual/PlayerHand';
import DrawDiscard from './virtual/DrawDiscard';
import DrawDiscardPopup from './virtual/DrawDiscardPopup';
import DrawDiscardTrigger from './virtual/DrawDiscardTrigger';
import SkyjoCard from './virtual/SkyjoCard';
import ExperienceBar from './ExperienceBar';
import { useVirtualGameStore, selectAIMode, selectAIPlayers, selectIsCurrentPlayerAI, selectIsAIThinking } from '../store/virtualGameStore';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { useGameStore } from '../store/gameStore';
import { calculateFinalScores } from '../lib/skyjoEngine';
import { AI_DIFFICULTY, chooseInitialCardsToReveal } from '../lib/skyjoAI';
import { useFeedback } from '../hooks/useFeedback';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { cn } from '../lib/utils';
import { Copy, Wifi, WifiOff, Share2, Music, Music2 } from 'lucide-react';

// Player colors for avatars

// Player colors for avatars
const PLAYER_EMOJIS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🦄', '🐲'];
const PLAYER_COLORS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵']; // Backward compat for local

/**
 * Virtual Skyjo Game Component
 * Main component for playing virtual Skyjo locally
 */
export default function VirtualGame() {
    const [screen, setScreen] = useState('menu'); // menu, setup, game, scores
    const [players, setPlayers] = useState([
        { name: '', emoji: '🐱' },
        { name: '', emoji: '🐶' },
    ]);
    const [localPlayerIndex, setLocalPlayerIndex] = useState(0);
    const [initialReveals, setInitialReveals] = useState({});

    const gameState = useVirtualGameStore((s) => s.gameState);
    const totalScores = useVirtualGameStore((s) => s.totalScores);
    const roundNumber = useVirtualGameStore((s) => s.roundNumber);
    const isGameOver = useVirtualGameStore((s) => s.isGameOver);
    const gameWinner = useVirtualGameStore((s) => s.gameWinner);
    const startLocalGame = useVirtualGameStore((s) => s.startLocalGame);
    const revealInitial = useVirtualGameStore((s) => s.revealInitial);
    const drawFromDrawPile = useVirtualGameStore((s) => s.drawFromDrawPile);
    const takeFromDiscard = useVirtualGameStore((s) => s.takeFromDiscard);
    const replaceHandCard = useVirtualGameStore((s) => s.replaceHandCard);
    const discardAndRevealCard = useVirtualGameStore((s) => s.discardAndRevealCard);
    const discardDrawnCard = useVirtualGameStore((s) => s.discardDrawnCard);
    const revealHiddenCard = useVirtualGameStore((s) => s.revealHiddenCard);
    const resetGame = useVirtualGameStore((s) => s.resetGame);
    const rematch = useVirtualGameStore((s) => s.rematch);
    const endRound = useVirtualGameStore((s) => s.endRound);
    const startNextRound = useVirtualGameStore((s) => s.startNextRound);
    const getFinalScores = useVirtualGameStore((s) => s.getFinalScores);

    // AI Store
    const startAIGame = useVirtualGameStore((s) => s.startAIGame);
    const executeAITurn = useVirtualGameStore((s) => s.executeAITurn);
    const setAIThinking = useVirtualGameStore((s) => s.setAIThinking);
    const aiMode = useVirtualGameStore(selectAIMode);
    const aiPlayers = useVirtualGameStore(selectAIPlayers);
    const isCurrentPlayerAI = useVirtualGameStore(selectIsCurrentPlayerAI);
    const isAIThinking = useVirtualGameStore(selectIsAIThinking);
    const aiDifficulty = useVirtualGameStore((s) => s.aiDifficulty);

    // Online Store
    const isOnlineConnected = useOnlineGameStore(s => s.isConnected);
    const onlineGameState = useOnlineGameStore(s => s.gameState);
    const onlinePlayers = useOnlineGameStore(s => s.players);
    const onlineTotalScores = useOnlineGameStore(s => s.totalScores);
    const onlineRoundNumber = useOnlineGameStore(s => s.roundNumber);
    const onlineGameStarted = useOnlineGameStore(s => s.gameStarted);
    const onlineIsGameOver = useOnlineGameStore(s => s.isGameOver);
    const onlineGameWinner = useOnlineGameStore(s => s.gameWinner);
    const onlineError = useOnlineGameStore(s => s.error);
    const onlineRoomCode = useOnlineGameStore(s => s.roomCode);
    const onlineIsHost = useOnlineGameStore(s => s.isHost);
    const socketId = useOnlineGameStore(s => s.socketId);
    const lastNotification = useOnlineGameStore(s => s.lastNotification);
    const lastAction = useOnlineGameStore(s => s.lastAction);

    // Main game store for archiving
    const archiveOnlineGame = useGameStore(s => s.archiveOnlineGame);

    // Online Actions
    const connectOnline = useOnlineGameStore(s => s.connect);
    const disconnectOnline = useOnlineGameStore(s => s.disconnect);
    const setPlayerInfo = useOnlineGameStore(s => s.setPlayerInfo);
    const createRoom = useOnlineGameStore(s => s.createRoom);
    const joinRoom = useOnlineGameStore(s => s.joinRoom);
    const startOnlineGame = useOnlineGameStore(s => s.startGame);
    const startOnlineNextRound = useOnlineGameStore(s => s.startNextRound);
    const emitGameAction = useOnlineGameStore(s => s.emitGameAction);
    const selectOnlineCard = useOnlineGameStore(s => s.selectCard);

    // Local State for Lobby
    const [lobbyCode, setLobbyCode] = useState('');
    const [myPseudo, setMyPseudo] = useState('');
    const [myEmoji, setMyEmoji] = useState('🐱');
    const [copyToast, setCopyToast] = useState(null);
    const [notification, setNotification] = useState(null);
    const [hasPlayedVictory, setHasPlayedVictory] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showDrawDiscardPopup, setShowDrawDiscardPopup] = useState(false);

    // AI Config State
    const [aiConfig, setAIConfig] = useState({
        playerName: '',
        playerEmoji: '🐱',
        aiCount: 1,
        difficulty: AI_DIFFICULTY.NORMAL,
    });

    // Feedback sounds and Music
    const { playVictory } = useFeedback();
    const musicEnabled = useGameStore(state => state.musicEnabled);
    const toggleMusic = useGameStore(state => state.toggleMusic);

    // Play music when in game or lobby
    useBackgroundMusic(screen === 'game' || screen === 'lobby');

    // Sync notifications from store
    useEffect(() => {
        if (lastNotification) {
            setNotification(lastNotification);
        }
    }, [lastNotification]);

    // Auto-navigate to game screen when online game starts
    useEffect(() => {
        if (onlineGameStarted && onlineGameState && screen === 'lobby') {
            setScreen('game');
            setInitialReveals({}); // Reset initial reveals for new game
        }
    }, [onlineGameStarted, onlineGameState, screen]);

    // Return to lobby when online game is cancelled (host quits)
    useEffect(() => {
        if (screen === 'game' && onlineRoomCode && !onlineGameStarted && !onlineIsGameOver) {
            // Game was cancelled (host left or not enough players)
            setScreen('lobby');
        }
    }, [onlineGameStarted, onlineIsGameOver, onlineRoomCode, screen]);

    // Determine if game is finished (for sound effect)
    const activeGameStateForEffect = onlineGameStarted ? onlineGameState : gameState;
    const isGameFinished = activeGameStateForEffect?.phase === 'FINISHED';

    // Play victory sound when game finishes
    useEffect(() => {
        if (isGameFinished && !hasPlayedVictory) {
            playVictory();
            setHasPlayedVictory(true);
        }
        // Reset flag when game restarts (not finished anymore)
        if (!isGameFinished && hasPlayedVictory) {
            setHasPlayedVictory(false);
        }
    }, [isGameFinished, hasPlayedVictory, playVictory]);

    // Track if we've archived the current online game
    const [hasArchivedOnline, setHasArchivedOnline] = useState(false);

    // Track if we've archived the current AI/local game
    const [hasArchivedVirtual, setHasArchivedVirtual] = useState(false);
    const archiveVirtualGame = useGameStore(s => s.archiveVirtualGame);
    const addXP = useGameStore(s => s.addXP);
    const gameMode = useVirtualGameStore(s => s.gameMode);

    // Archive online game when it ends
    useEffect(() => {
        if (onlineIsGameOver && onlineGameStarted && !hasArchivedOnline) {
            archiveOnlineGame({
                players: onlinePlayers,
                totalScores: onlineTotalScores,
                winner: onlineGameWinner,
                roundsPlayed: onlineRoundNumber
            });

            // Award XP if human won the online game
            if (onlineGameWinner && socketId && onlineGameWinner.id === socketId) {
                addXP(1);
            }

            setHasArchivedOnline(true);
        }
        // Reset when starting a new game
        if (!onlineIsGameOver && hasArchivedOnline) {
            setHasArchivedOnline(false);
        }
    }, [onlineIsGameOver, onlineGameStarted, hasArchivedOnline, onlinePlayers, onlineTotalScores, onlineGameWinner, onlineRoundNumber, archiveOnlineGame, socketId, addXP]);

    // Archive AI/local game when it ends
    useEffect(() => {
        if (isGameOver && gameState && !hasArchivedVirtual && !onlineGameStarted) {
            archiveVirtualGame({
                players: gameState.players,
                totalScores: totalScores,
                winner: gameWinner,
                roundsPlayed: roundNumber,
                gameType: aiMode ? 'ai' : 'local'
            });

            // Award XP if human player won
            // In AI mode, human is 'human-1', in local mode, award XP to any winner
            if (gameWinner) {
                if (aiMode && gameWinner.id === 'human-1') {
                    addXP(1);
                } else if (!aiMode) {
                    // In local virtual mode, always award XP (playing with friends)
                    addXP(1);
                }
            }

            setHasArchivedVirtual(true);
        }
        // Reset when starting a new game
        if (!isGameOver && hasArchivedVirtual) {
            setHasArchivedVirtual(false);
        }
    }, [isGameOver, gameState, hasArchivedVirtual, totalScores, gameWinner, roundNumber, aiMode, onlineGameStarted, archiveVirtualGame, addXP]);


    // AI Auto-play: Execute AI turns automatically with delay
    useEffect(() => {
        if (!aiMode || !gameState) return;
        if (gameState.phase === 'FINISHED') return;

        // During initial reveal, AI players should automatically reveal their cards
        // NOTE: In INITIAL_REVEAL phase, currentPlayerIndex stays at 0 - all players reveal simultaneously
        if (gameState.phase === 'INITIAL_REVEAL') {
            // Find AI players that still need to reveal their cards
            const aiNeedingReveal = aiPlayers.filter(aiIndex => {
                const aiPlayer = gameState.players[aiIndex];
                if (!aiPlayer) return false;
                const revealedCount = aiPlayer.hand.filter(c => c && c.isRevealed).length;
                return revealedCount < 2;
            });

            // If any AI still needs to reveal, do it one at a time with delay
            if (aiNeedingReveal.length > 0) {
                const firstAIToReveal = aiNeedingReveal[0];
                setAIThinking(true);
                const timer = setTimeout(() => {
                    // Manually reveal for this AI player
                    const aiPlayer = gameState.players[firstAIToReveal];
                    const cardsToReveal = chooseInitialCardsToReveal(aiPlayer.hand, aiDifficulty);
                    revealInitial(firstAIToReveal, cardsToReveal);
                    setAIThinking(false);
                }, 800);
                return () => clearTimeout(timer);
            }
            return;
        }

        // Regular gameplay - only current AI player acts
        if (!isCurrentPlayerAI) return;

        setAIThinking(true);
        const delay = 1200;
        const timer = setTimeout(() => {
            executeAITurn();

            // If AI still needs to make another action (e.g., after drawing), set another timer
            const checkNextAction = setTimeout(() => {
                const currentState = useVirtualGameStore.getState().gameState;
                if (currentState &&
                    currentState.currentPlayerIndex !== undefined &&
                    useVirtualGameStore.getState().aiPlayers.includes(currentState.currentPlayerIndex) &&
                    (currentState.turnPhase === 'REPLACE_OR_DISCARD' || currentState.turnPhase === 'MUST_REPLACE' || currentState.turnPhase === 'MUST_REVEAL')) {
                    executeAITurn();
                }
                setAIThinking(false);
            }, 800);

            return () => clearTimeout(checkNextAction);
        }, delay);

        return () => clearTimeout(timer);
    }, [aiMode, gameState?.currentPlayerIndex, gameState?.phase, gameState?.turnPhase, isCurrentPlayerAI, aiPlayers, executeAITurn, setAIThinking, gameState, aiDifficulty, revealInitial]);

    // Add player
    const addPlayer = () => {
        if (players.length < 8) {
            setPlayers([
                ...players,
                { name: '', emoji: PLAYER_COLORS[players.length] },
            ]);
        }
    };

    // Remove player
    const removePlayer = (index) => {
        if (players.length > 2) {
            setPlayers(players.filter((_, i) => i !== index));
        }
    };

    // Update player name
    const updatePlayer = (index, field, value) => {
        const newPlayers = [...players];
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setPlayers(newPlayers);
    };

    // Start game
    const handleStartGame = () => {
        const gamePlayers = players.map((p, i) => ({
            id: `player-${i}`,
            name: p.name.trim() || `Joueur ${i + 1}`,
            emoji: p.emoji,
        }));
        startLocalGame(gamePlayers);
        setInitialReveals({});
        setScreen('game');
    };

    // Handle initial reveal selection
    const handleInitialReveal = (playerIndex, cardIndex) => {
        const key = `player-${playerIndex}`;
        const current = initialReveals[key] || [];

        if (current.includes(cardIndex)) {
            setInitialReveals({
                ...initialReveals,
                [key]: current.filter((i) => i !== cardIndex),
            });
        } else if (current.length < 2) {
            const newReveals = [...current, cardIndex];
            setInitialReveals({
                ...initialReveals,
                [key]: newReveals,
            });

            if (newReveals.length === 2) {
                if (onlineGameStarted) {
                    emitGameAction('reveal_initial', { cardIndices: newReveals });
                } else {
                    revealInitial(playerIndex, newReveals);
                }
            }
        }
    };

    // Handle card click during gameplay
    const handleCardClick = (cardIndex) => {
        const isOnline = !!onlineGameStarted;
        const activeState = isOnline ? onlineGameState : gameState;

        if (!activeState) return;

        // In online mode, we just emit actions
        if (isOnline) {
            if (activeState.turnPhase === 'REPLACE_OR_DISCARD') {
                emitGameAction('replace_card', { cardIndex });
            } else if (activeState.turnPhase === 'MUST_REPLACE') {
                // Not used in official rules directly but if engine supports it?
                // Engine 'replace_card' handles replacement.
                emitGameAction('replace_card', { cardIndex });
            } else if (activeState.turnPhase === 'MUST_REVEAL') {
                emitGameAction('reveal_hidden', { cardIndex });
            }
            return;
        }

        // Local mode
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const card = currentPlayer.hand[cardIndex];

        if (gameState.turnPhase === 'REPLACE_OR_DISCARD') {
            replaceHandCard(cardIndex);
        } else if (gameState.turnPhase === 'MUST_REPLACE') {
            replaceHandCard(cardIndex);
        } else if (gameState.turnPhase === 'MUST_REVEAL') {
            if (!card?.isRevealed) {
                revealHiddenCard(cardIndex);
            }
        }
    };

    // Back to menu
    const handleBackToMenu = () => {
        // Archive online game if it was started and has data (avoid duplicates)
        if (onlineGameStarted && onlinePlayers.length > 0 && !hasArchivedOnline) {
            archiveOnlineGame({
                players: onlinePlayers,
                totalScores: onlineTotalScores,
                winner: onlineGameWinner,
                roundsPlayed: onlineRoundNumber
            });
            disconnectOnline();
        } else if (onlineGameStarted) {
            // Just disconnect if already archived
            disconnectOnline();
        }

        // Archive AI/local game when quitting (even if not finished)
        // Only archive if not already archived (avoid duplicates)
        if (gameState && gameState.players && gameState.players.length > 0 && !onlineGameStarted && !hasArchivedVirtual) {
            // Calculate current winner based on totalScores
            const scores = totalScores || {};
            const playersWithScores = gameState.players.map(p => ({
                ...p,
                finalScore: scores[p.id] || 0
            })).sort((a, b) => a.finalScore - b.finalScore);

            const winner = playersWithScores[0];

            archiveVirtualGame({
                players: gameState.players,
                totalScores: scores,
                winner: winner ? { id: winner.id, name: winner.name, score: winner.finalScore } : null,
                roundsPlayed: roundNumber || 1,
                gameType: aiMode ? 'ai' : 'local'
            });
        }

        resetGame();
        setScreen('menu');
    };

    // Render menu screen
    if (screen === 'menu') {
        return (
            <div className="max-w-md mx-auto p-4 pt-8 pb-20 space-y-3 animate-in fade-in">
                <Card className="glass-premium dark:glass-dark shadow-xl relative">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-float overflow-hidden bg-slate-900 border border-skyjo-blue/30">
                                <img
                                    src="/logo.jpg"
                                    alt="Skyjo Logo"
                                    className="w-full h-full object-cover scale-110"
                                />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-skyjo-blue font-bold">
                            Skyjo Virtuel
                        </CardTitle>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                            Jouez avec les vraies cartes !
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Local Game Button */}
                        <Button
                            size="lg"
                            className="w-full bg-skyjo-blue hover:bg-skyjo-blue/90 text-white font-bold shadow-xl shadow-skyjo-blue/40 border border-white/20 animate-pulse-glow"
                            onClick={() => setScreen('setup')}
                        >
                            <Play className="mr-2 h-5 w-5" />
                            Partie Locale
                        </Button>

                        {/* Online Game Button */}
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold shadow-xl shadow-blue-400/40 animate-pulse-glow"
                            style={{ animationDelay: '0.3s' }}
                            onClick={() => {
                                setScreen('lobby');
                                connectOnline();
                            }}
                        >
                            <Wifi className="mr-2 h-5 w-5" />
                            En Ligne (1v1)
                        </Button>

                        {/* AI Game Button */}
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 font-bold shadow-xl shadow-purple-400/40 animate-pulse-glow"
                            style={{ animationDelay: '0.6s' }}
                            onClick={() => setScreen('ai-setup')}
                        >
                            <Bot className="mr-2 h-5 w-5" />
                            Contre l'IA
                        </Button>

                        <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                                <p>
                                    En mode local, passez l'écran entre les joueurs à
                                    chaque tour.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Experience Bar */}
                <ExperienceBar className="px-1" />

                {/* Rules Button */}
                <button
                    onClick={() => setShowRulesModal(true)}
                    className="w-full p-3 rounded-2xl glass-premium dark:glass-dark border border-amber-200/50 dark:border-amber-700/50 hover:border-amber-400 transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <BookOpen className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-slate-800 dark:text-slate-200">Règles du jeu</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Comment jouer à Skyjo</p>
                        </div>
                        <span className="text-amber-500 dark:text-amber-400 text-lg">→</span>
                    </div>
                </button>

                {/* Rules Modal */}
                {showRulesModal && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                            onClick={() => setShowRulesModal(false)}
                        />
                        <div className="fixed inset-4 top-8 bottom-8 z-[110] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
                                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-amber-500" />
                                    Règles de Skyjo
                                </h2>
                                <button
                                    onClick={() => setShowRulesModal(false)}
                                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    <X className="h-5 w-5 text-slate-400" />
                                </button>
                            </div>
                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-slate-300">
                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">🎯 Objectif</h3>
                                    <p>Avoir le <strong>moins de points possible</strong> à la fin de la partie. Le jeu se termine quand un joueur atteint 100 points.</p>
                                </section>

                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">🃏 Mise en place</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Chaque joueur reçoit <strong>12 cartes face cachée</strong> (grille 3×4)</li>
                                        <li>Retournez <strong>2 cartes</strong> de votre choix</li>
                                        <li>Le joueur avec la somme la plus élevée commence</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">🔄 Tour de jeu</h3>
                                    <p className="mb-2">Piochez une carte de la <strong>pioche</strong> ou de la <strong>défausse</strong> :</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><strong>Pioche</strong> : Gardez-la pour remplacer une carte OU défaussez-la et retournez une carte cachée</li>
                                        <li><strong>Défausse</strong> : Remplacez obligatoirement une de vos cartes</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">✨ Colonnes identiques</h3>
                                    <p className="mb-2">Si une colonne contient <strong>3 cartes identiques</strong> (toutes face visible), elle est <strong>éliminée</strong> !</p>
                                    <div className="p-2 bg-amber-900/20 rounded-lg text-xs border border-amber-700">
                                        <strong>⚠️ Ordre important :</strong> D'abord défausser la carte échangée, PUIS les 3 cartes identiques par-dessus.
                                    </div>
                                </section>

                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">🏁 Fin de manche</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>La manche se termine quand un joueur retourne toutes ses cartes</li>
                                        <li>Les autres joueurs jouent <strong>un dernier tour</strong></li>
                                        <li><strong>Attention :</strong> Si le finisseur n'a pas le score le plus bas, ses points sont <strong>doublés</strong> !</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-bold text-amber-400 mb-2">🏆 Valeurs des cartes</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-red-900/30 rounded-lg text-center">
                                            <span className="font-bold text-red-400">-2</span> à <span className="font-bold text-red-400">12</span>
                                        </div>
                                        <div className="p-2 bg-blue-900/30 rounded-lg text-center">
                                            <span className="font-bold text-blue-400">0</span> = neutre
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Render AI setup screen
    if (screen === 'ai-setup') {
        const handleStartAIGame = () => {
            startAIGame(
                { name: aiConfig.playerName || 'Joueur', emoji: aiConfig.playerEmoji },
                aiConfig.aiCount,
                aiConfig.difficulty
            );
            setInitialReveals({});
            setScreen('game');
        };

        return (
            <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen('menu')}
                    className="mb-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Retour
                </Button>

                <Card className="glass-premium dark:glass-dark shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#e2e8f0' }}>
                            <Bot className="h-5 w-5 text-purple-600" />
                            Partie contre l'IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Player Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" style={{ color: '#cbd5e1' }}>Votre pseudo</label>
                            <div className="flex gap-2">
                                <select
                                    value={aiConfig.playerEmoji}
                                    onChange={(e) => setAIConfig({ ...aiConfig, playerEmoji: e.target.value })}
                                    className="h-10 w-14 text-2xl text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                                >
                                    {PLAYER_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <Input
                                    placeholder="Votre nom"
                                    value={aiConfig.playerName}
                                    onChange={(e) => setAIConfig({ ...aiConfig, playerName: e.target.value })}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* AI Count */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" style={{ color: '#cbd5e1' }}>Nombre d'adversaires IA</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(count => (
                                    <Button
                                        key={count}
                                        variant={aiConfig.aiCount === count ? 'default' : 'outline'}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1",
                                            aiConfig.aiCount === count && "bg-purple-600 hover:bg-purple-700 text-white"
                                        )}
                                        onClick={() => setAIConfig({ ...aiConfig, aiCount: count })}
                                    >
                                        {count} <Bot className="h-4 w-4" />
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium" style={{ color: '#cbd5e1' }}>Difficulté</label>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.EASY ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm",
                                        aiConfig.difficulty === AI_DIFFICULTY.EASY && "bg-green-600 hover:bg-green-700 text-white"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.EASY })}
                                >
                                    Facile
                                </Button>
                                <Button
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.NORMAL ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm",
                                        aiConfig.difficulty === AI_DIFFICULTY.NORMAL && "bg-amber-600 hover:bg-amber-700 text-white"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.NORMAL })}
                                >
                                    Normal
                                </Button>
                                <Button
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.HARD ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm",
                                        aiConfig.difficulty === AI_DIFFICULTY.HARD && "bg-red-600 hover:bg-red-700 text-white"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.HARD })}
                                >
                                    Difficile
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg"
                    onClick={handleStartAIGame}
                >
                    🚀 Affronter l'IA
                </Button>
            </div>
        );
    }

    // Render setup screen
    if (screen === 'setup') {
        return (
            <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen('menu')}
                    className="mb-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Retour
                </Button>

                <Card className="glass-premium dark:glass-dark shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-600" />
                            Joueurs ({players.length}/8)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {players.map((player, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-2xl w-10 text-center">
                                    {player.emoji}
                                </span>
                                <Input
                                    placeholder={`Joueur ${index + 1}`}
                                    value={player.name}
                                    onChange={(e) =>
                                        updatePlayer(index, 'name', e.target.value)
                                    }
                                    className="flex-1"
                                />
                                {players.length > 2 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePlayer(index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        ✕
                                    </Button>
                                )}
                            </div>
                        ))}

                        {players.length < 8 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addPlayer}
                                className="w-full border-dashed"
                            >
                                + Ajouter un joueur
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                    onClick={handleStartGame}
                >
                    🚀 Lancer la partie
                </Button>
            </div>
        );
    }


    // Render Lobby (Online)
    if (screen === 'lobby') {
        const isRoomJoined = !!onlineRoomCode;

        if (isRoomJoined) {
            return (
                <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                    {/* Toast notifications */}
                    <Toast
                        notification={notification}
                        onDismiss={() => setNotification(null)}
                    />
                    {copyToast && (
                        <Toast
                            notification={copyToast}
                            onDismiss={() => setCopyToast(null)}
                        />
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            disconnectOnline();
                            setScreen('menu');
                        }}
                        className="mb-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Quitter
                    </Button>
                    <Card className="glass-premium dark:glass-dark shadow-xl">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-2">
                                <div className={cn(
                                    "p-3 rounded-full transition-all",
                                    isOnlineConnected
                                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                                        : "bg-red-100 dark:bg-red-900/30 animate-pulse"
                                )}>
                                    {isOnlineConnected ? (
                                        <Wifi className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
                                    )}
                                </div>
                            </div>
                            <CardTitle>Salle d'attente</CardTitle>
                            <div className="mt-2 flex items-center justify-center gap-2">
                                <div className="flex-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
                                    onClick={() => {
                                        navigator.clipboard.writeText(onlineRoomCode);
                                        setCopyToast({
                                            type: 'success',
                                            message: 'Code copié !',
                                            timestamp: Date.now()
                                        });
                                    }}>
                                    <span className="text-xl font-mono tracking-wider font-bold text-slate-700 dark:text-slate-300">
                                        {onlineRoomCode}
                                    </span>
                                    <Copy className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                </div>
                                {navigator.share && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-10 px-3 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                        onClick={() => {
                                            const playerName = onlinePlayers.find(p => p.id === socketId)?.name || 'Un ami';
                                            navigator.share({
                                                title: 'Partie Skyjo',
                                                text: `${playerName} vous invite à rejoindre une partie de Skyjo en ligne !\n\nCode de salle : ${onlineRoomCode}`,
                                                url: window.location.href
                                            }).catch(() => { });
                                        }}
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Partagez ce code avec vos amis</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 mb-2">Joueurs ({onlinePlayers.length}/8)</h3>
                                <div className="space-y-2">
                                    {onlinePlayers.map(p => (
                                        <div key={p.id} className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg transition-all",
                                            p.id === socketId
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-400/50"
                                                : "bg-white/50 dark:bg-white/5"
                                        )}>
                                            <span className="text-2xl">{p.emoji}</span>
                                            <span className="font-medium">
                                                {p.name}
                                                {p.id === socketId && (
                                                    <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">(Moi)</span>
                                                )}
                                            </span>
                                            {p.isHost && (
                                                <span className="text-xs bg-gradient-to-r from-amber-200 to-yellow-200 dark:from-amber-800 dark:to-yellow-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full ml-auto font-medium">
                                                    👑 Hôte
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {onlineIsHost ? (
                                <Button
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg"
                                    size="lg"
                                    onClick={startOnlineGame}
                                    disabled={onlinePlayers.length < 2}
                                >
                                    <Play className="mr-2 h-4 w-4" />
                                    Lancer la partie
                                </Button>
                            ) : (
                                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                    <p className="text-sm text-slate-500 animate-pulse">En attente de l'hôte...</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        disconnectOnline();
                        setScreen('menu');
                    }}
                    className="mb-2"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Retour
                </Button>

                <Card className="glass-premium dark:glass-dark shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wifi className="h-5 w-5 text-blue-600" />
                            Connexion
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {onlineError && (
                            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                {onlineError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Votre Pseudo</label>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <select
                                        className="appearance-none h-10 w-14 text-2xl text-center bg-white border border-slate-200 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={myEmoji}
                                        onChange={(e) => setMyEmoji(e.target.value)}
                                    >
                                        {PLAYER_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <Input
                                    placeholder="Ex: SuperJoueur"
                                    value={myPseudo}
                                    onChange={(e) => setMyPseudo(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => {
                                        setPlayerInfo(myPseudo || 'Joueur', myEmoji);
                                        createRoom();
                                    }}
                                >
                                    Créer une salle
                                </Button>
                                <p className="text-xs text-center text-slate-500">Devenez l'hôte de la partie</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Code"
                                        value={lobbyCode}
                                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                                        maxLength={4}
                                        className="text-center font-mono tracking-widest uppercase"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setPlayerInfo(myPseudo || 'Joueur', myEmoji);
                                            joinRoom(lobbyCode);
                                        }}
                                    >
                                        Rejoindre
                                    </Button>
                                </div>
                                <p className="text-xs text-center text-slate-500">Entrez le code à 4 lettres</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine which game state to use based on mode
    const isOnlineMode = !!onlineGameStarted;
    const activeGameState = isOnlineMode ? onlineGameState : gameState;
    const activeTotalScores = isOnlineMode ? onlineTotalScores : totalScores;
    const activeRoundNumber = isOnlineMode ? onlineRoundNumber : roundNumber;

    // If no active game state and we're on game screen, show loading or redirect
    if (!activeGameState && screen === 'game') {
        return (
            <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-500">Chargement de la partie...</p>
                </div>
            </div>
        );
    }

    // Early return if no game state
    if (!activeGameState) {
        return null;
    }

    const currentPlayer = activeGameState.players[activeGameState.currentPlayerIndex];
    const isInitialReveal = activeGameState.phase === 'INITIAL_REVEAL';
    const isFinished = activeGameState.phase === 'FINISHED';
    const discardTop =
        activeGameState.discardPile[activeGameState.discardPile.length - 1];

    // Get number of cards already selected for initial reveal
    const currentPlayerKey = `player-${activeGameState.currentPlayerIndex}`;
    const selectedForReveal = initialReveals[currentPlayerKey] || [];

    // If game finished, show scores
    if (isFinished) {
        // Calculate scores directly from activeGameState (works for both local and online)
        const scores = calculateFinalScores(activeGameState);

        // Calculate what cumulative scores would be after this round
        const projectedTotals = {};
        scores?.forEach(score => {
            projectedTotals[score.playerId] = (activeTotalScores[score.playerId] || 0) + score.finalScore;
        });

        // Check if game would end after this round
        const maxProjected = Math.max(...Object.values(projectedTotals), 0);
        const gameEndsAfterThisRound = maxProjected >= 100;

        // If game is already over (endRound was called), show final results
        if (isGameOver && gameWinner) {
            return (
                <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                    <Card className="glass-premium shadow-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-orange-900/20" />
                        <CardHeader className="text-center relative">
                            <div className="relative">
                                <Trophy className="h-20 w-20 mx-auto text-amber-500 mb-2" />
                                <Sparkles className="absolute top-0 right-1/3 h-6 w-6 text-yellow-400 animate-pulse" />
                            </div>
                            <CardTitle className="text-2xl text-amber-400">
                                🎉 Fin de partie ! 🎉
                            </CardTitle>
                            <p className="text-slate-400 text-sm mt-1">
                                Après {roundNumber} manche{roundNumber > 1 ? 's' : ''}
                            </p>
                        </CardHeader>
                        <CardContent className="relative space-y-4">
                            {/* Winner announcement */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center p-4 bg-gradient-to-r from-amber-900/50 to-yellow-900/50 rounded-xl"
                            >
                                <span className="text-4xl block mb-2">{gameWinner.emoji}</span>
                                <span className="text-xl font-bold text-amber-200">
                                    {gameWinner.name} gagne !
                                </span>
                                <span className="text-sm text-amber-400 block mt-1">
                                    Score final : {gameWinner.score} pts
                                </span>
                            </motion.div>

                            {/* All players final scores */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Classement final
                                </h3>
                                {gameState.players
                                    .map(p => ({ ...p, total: totalScores[p.id] || 0 }))
                                    .sort((a, b) => a.total - b.total)
                                    .map((player, index) => (
                                        <div
                                            key={player.id}
                                            className={cn(
                                                "flex items-center justify-between p-2 rounded-lg",
                                                index === 0 ? "bg-amber-900/30" : "bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-400">#{index + 1}</span>
                                                <span>{player.emoji}</span>
                                                <span className="font-medium text-slate-300">{player.name}</span>
                                            </div>
                                            <span className={cn(
                                                "font-bold",
                                                player.total >= 100 ? "text-red-500" : "text-slate-300"
                                            )}>
                                                {player.total} pts
                                            </span>
                                        </div>
                                    ))}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleBackToMenu}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Menu
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                                    onClick={rematch}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Nouvelle partie
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // Regular end-of-round screen
        return (
            <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in">
                <Card className="glass-premium shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-orange-900/20" />
                    <CardHeader className="text-center relative">
                        <Trophy className="h-16 w-16 mx-auto text-amber-500 mb-2 animate-bounce" />
                        <CardTitle className="text-2xl text-amber-400">
                            Fin de la manche {roundNumber}
                        </CardTitle>
                        {gameEndsAfterThisRound && (
                            <p className="text-red-500 text-sm font-medium mt-1">
                                ⚠️ Un joueur atteint 100 points !
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="relative space-y-3">
                        {/* Round scores with cumulative totals */}
                        {scores?.map((score, index) => (
                            <motion.div
                                key={score.playerId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl",
                                    index === 0
                                        ? "bg-gradient-to-r from-amber-900/50 to-yellow-900/50"
                                        : "bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-slate-400">
                                        #{index + 1}
                                    </span>
                                    <span className="font-medium text-slate-200">
                                        {score.playerName}
                                    </span>
                                    {score.isFinisher && (
                                        <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">
                                            Finisseur
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-lg font-bold",
                                        score.penalized ? "text-red-500" : "text-slate-200"
                                    )}>
                                        +{score.finalScore}
                                    </span>
                                    {score.penalized && (
                                        <span className="text-xs text-red-500 block">
                                            (doublé!)
                                        </span>
                                    )}
                                    <span className={cn(
                                        "text-xs block",
                                        projectedTotals[score.playerId] >= 100 ? "text-red-500 font-bold" : "text-slate-500"
                                    )}>
                                        Total: {projectedTotals[score.playerId]}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleBackToMenu}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Quitter
                            </Button>
                            <Button
                                className="flex-1 bg-skyjo-blue hover:bg-skyjo-blue/90 text-white"
                                onClick={() => {
                                    if (isOnlineMode) {
                                        // Online mode: emit to server
                                        startOnlineNextRound();
                                    } else {
                                        // Local mode: use local store
                                        endRound(); // Update cumulative scores
                                        if (!gameEndsAfterThisRound) {
                                            startNextRound(); // Start next round if game continues
                                        }
                                    }
                                    setInitialReveals({}); // Reset initial reveals for new round
                                }}
                            >
                                {gameEndsAfterThisRound ? (
                                    <>
                                        <Trophy className="h-4 w-4 mr-1" />
                                        Voir résultats
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4 mr-1" />
                                        Manche suivante
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine vignette color based on whose turn it is
    const isPlayerTurn = !isInitialReveal && activeGameState.currentPlayerIndex === 0;
    const isBotTurn = !isInitialReveal && activeGameState.currentPlayerIndex === 1;
    const vignetteColor = isPlayerTurn
        ? 'radial-gradient(ellipse at center, transparent 50%, rgba(34, 197, 94, 0.15) 100%)'
        : isBotTurn
            ? 'radial-gradient(ellipse at center, transparent 50%, rgba(239, 68, 68, 0.15) 100%)'
            : 'none';

    return (
        <div
            className="max-w-3xl mx-auto p-1 sm:p-2 space-y-1 sm:space-y-3 animate-in fade-in relative"
            style={{
                // Vignette effect around edges based on turn
                boxShadow: isPlayerTurn
                    ? 'inset 0 0 80px rgba(34, 197, 94, 0.2)'
                    : isBotTurn
                        ? 'inset 0 0 80px rgba(239, 68, 68, 0.2)'
                        : 'none',
            }}
        >
            {/* Header - ultra-thin single line */}
            <div className="flex items-center justify-between px-2 py-1 mb-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMenu}
                    className="h-6 px-2 text-xs"
                >
                    ← Quitter
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMusic}
                        className={cn(
                            "h-6 w-6 p-0 rounded-full transition-all duration-500 relative overflow-visible",
                            musicEnabled
                                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                : "text-slate-500 hover:bg-slate-800"
                        )}
                        title={musicEnabled ? "Couper la musique" : "Activer la musique"}
                    >
                        {/* Ping effect behind the button */}
                        {musicEnabled && (
                            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-[ping_2s_ease-in-out_infinite] opacity-50" />
                        )}

                        {musicEnabled ? (
                            <Music className="h-3.5 w-3.5 relative z-10 animate-[bounce_2s_infinite]" />
                        ) : (
                            <Music2 className="h-3.5 w-3.5 opacity-50 relative z-10" />
                        )}
                    </Button>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        MANCHE {activeRoundNumber}
                    </span>
                </div>
            </div>

            {/* Bot/Opponent (Player 2) at TOP for thumb zone optimization */}
            {activeGameState.players[1] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[1]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === 1}
                        isOpponent={true}
                        selectedCardIndex={null}
                        canInteract={
                            isInitialReveal ||
                            (activeGameState.currentPlayerIndex === 1 && (
                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ||
                                activeGameState.turnPhase === 'MUST_REPLACE' ||
                                activeGameState.turnPhase === 'MUST_REVEAL'
                            ))
                        }
                        onCardClick={(index) => {
                            if (isInitialReveal) {
                                handleInitialReveal(1, index);
                            } else {
                                if (activeGameState.currentPlayerIndex !== 1) return;
                                handleCardClick(index);
                            }
                        }}
                        size="md"
                    />
                </div>
            )}

            {/* Compact Draw/Discard Trigger Button - ABOVE the banner */}
            {!isInitialReveal && (
                <div
                    className="flex justify-center px-4"
                    style={{ marginTop: '6px', marginBottom: '8px' }}
                >
                    <div style={{ width: '100%', maxWidth: '340px' }}>
                        <DrawDiscardTrigger
                            onClick={() => setShowDrawDiscardPopup(true)} // Default open
                            onDrawAction={() => {
                                // Direct draw action
                                if (activeGameState.turnPhase === 'DRAW') {
                                    drawFromDrawPile();
                                    setShowDrawDiscardPopup(true);
                                }
                            }}
                            onDiscardAction={() => {
                                // Direct discard take action
                                if (activeGameState.turnPhase === 'DRAW') {
                                    // Just open popup for discard take confirmation/action
                                    // Or we could auto-take: takeFromDiscard();
                                    // But taking from discard commits you. The popup shows the discard card clearly.
                                    // Let's auto-take to be fluid as requested "montre la carte" -> implies we took it
                                    takeFromDiscard();
                                    setShowDrawDiscardPopup(true);
                                }
                            }}
                            discardTop={discardTop}
                            drawnCard={activeGameState.drawnCard}
                            drawPileCount={activeGameState.drawPile.length}
                            discardPileCount={activeGameState.discardPile.length}
                            canInteract={
                                !isInitialReveal &&
                                activeGameState.currentPlayerIndex === 0 &&
                                (activeGameState.turnPhase === 'DRAW' || (!!activeGameState.drawnCard))
                            }
                            turnPhase={activeGameState.turnPhase}
                        />
                    </div>
                </div>
            )}

            {/* Instruction Banner - BELOW the PIOCHER button */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeGameState.turnPhase + activeGameState.phase}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-center"
                    style={{ marginBottom: '12px' }}
                >
                    <span
                        className={cn(
                            "inline-block px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg",
                            isInitialReveal
                                ? "bg-purple-600 text-white"
                                : activeGameState.turnPhase === 'DRAW'
                                    ? "bg-blue-600 text-white"
                                    : "bg-violet-600 text-white"
                        )}
                        style={{
                            maxWidth: '85%',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                        }}
                    >
                        {isInitialReveal && (
                            <>
                                Retournez chacun 2 cartes
                                {selectedForReveal.length > 0 && ` (${selectedForReveal.length}/2)`}
                            </>
                        )}
                        {!isInitialReveal && activeGameState.turnPhase === 'DRAW' && (
                            '👆 Touchez la pioche ou la défausse'
                        )}
                        {activeGameState.turnPhase === 'REPLACE_OR_DISCARD' && (
                            '👆 Jouez dans votre grille ou défaussez'
                        )}
                        {activeGameState.turnPhase === 'MUST_REPLACE' && (
                            '👆 Remplacez une de vos cartes'
                        )}
                        {activeGameState.turnPhase === 'MUST_REVEAL' && (
                            '👆 Retournez une carte cachée'
                        )}
                    </span>
                </motion.div>
            </AnimatePresence>

            {/* Human Player (Player 1) at BOTTOM for thumb zone optimization */}
            {activeGameState.players[0] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[0]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === 0}
                        isOpponent={false}
                        selectedCardIndex={null}
                        canInteract={
                            isInitialReveal ||
                            (activeGameState.currentPlayerIndex === 0 && (
                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ||
                                activeGameState.turnPhase === 'MUST_REPLACE' ||
                                activeGameState.turnPhase === 'MUST_REVEAL'
                            ))
                        }
                        onCardClick={(index) => {
                            if (isInitialReveal) {
                                handleInitialReveal(0, index);
                            } else {
                                if (activeGameState.currentPlayerIndex !== 0) return;
                                handleCardClick(index);
                            }
                        }}
                        size="md"
                    />
                </div>
            )}

            {/* Additional players (if more than 2 - players at index 2+) */}
            {activeGameState.players.length > 2 && (
                <div className="mt-4 pb-20">
                    <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide text-center">
                        Autres adversaires ({activeGameState.players.length - 2} IA)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {activeGameState.players.slice(2).map((player, displayIndex) => {
                            const actualIndex = displayIndex + 2;
                            const isAI = aiPlayers.includes(actualIndex);
                            return (
                                <div
                                    key={player.id}
                                    className={cn(
                                        "relative rounded-xl p-2 transition-all duration-300",
                                        !isInitialReveal && activeGameState.currentPlayerIndex === actualIndex
                                            ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/30 ring-2 ring-emerald-400"
                                            : "bg-slate-800/40"
                                    )}
                                >
                                    {/* Compact name badge */}
                                    <div className={cn(
                                        "flex items-center gap-2 mb-2 px-2 py-1 rounded-lg text-sm font-medium",
                                        !isInitialReveal && activeGameState.currentPlayerIndex === actualIndex
                                            ? "bg-emerald-500 text-white"
                                            : "bg-slate-700 text-slate-200"
                                    )}>
                                        {isAI && <Bot className="h-4 w-4" />}
                                        <span className="truncate">{player.name}</span>
                                        {!isInitialReveal && activeGameState.currentPlayerIndex === actualIndex && (
                                            <span className="ml-auto animate-pulse">🎯</span>
                                        )}
                                    </div>

                                    {/* Compact card grid */}
                                    <div className="grid grid-cols-4 gap-0.5">
                                        {player.hand.map((card, cardIdx) => {
                                            const row = cardIdx % 3;
                                            const col = Math.floor(cardIdx / 3);
                                            const actualCardIdx = col * 3 + row;
                                            return (
                                                <SkyjoCard
                                                    key={cardIdx}
                                                    card={player.hand[actualCardIdx]}
                                                    size="xs"
                                                    isClickable={false}
                                                />
                                            );
                                        })}
                                    </div>

                                    {/* Mini score */}
                                    <div className="text-center mt-1">
                                        <span className="text-xs text-slate-400">
                                            Score: <span className="font-bold text-slate-200">
                                                {player.hand
                                                    .filter((c) => c?.isRevealed)
                                                    .reduce((sum, c) => sum + c.value, 0)}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Draw/Discard Popup Modal */}
            <DrawDiscardPopup
                isOpen={showDrawDiscardPopup}
                onClose={() => {
                    // Check if we need to undo "Take from Discard" action
                    // Logic: If we are in 'MUST_REPLACE' phase (meaning we took from discard)
                    // and we close the popup without confirming placement (which would change phase)
                    // then we should UN-DO the take action (put card back).
                    if (activeGameState.turnPhase === 'MUST_REPLACE' && !isOnlineMode) {
                        useVirtualGameStore.getState().undoTakeFromDiscard();
                    }
                    setShowDrawDiscardPopup(false);
                }}
                drawPileCount={activeGameState.drawPile.length}
                discardTop={discardTop}
                drawnCard={activeGameState.drawnCard}
                canDraw={activeGameState.turnPhase === 'DRAW'}
                canTakeDiscard={
                    activeGameState.turnPhase === 'DRAW' &&
                    activeGameState.discardPile.length > 0
                }
                canDiscardDrawn={activeGameState.turnPhase === 'REPLACE_OR_DISCARD'}
                onDrawClick={() => {
                    if (isOnlineMode) {
                        emitGameAction('draw_pile');
                    } else {
                        drawFromDrawPile();
                    }
                }}
                onDiscardClick={() => {
                    if (isOnlineMode) {
                        emitGameAction('draw_discard');
                    } else {
                        takeFromDiscard();
                    }
                }}
                onConfirmPlacement={() => {
                    // Just close popup - we are in 'MUST_REPLACE' or 'REPLACE_OR_DISCARD'
                    // and user wants to place on grid.
                    setShowDrawDiscardPopup(false);
                }}
                onDiscardDrawnCard={() => {
                    if (isOnlineMode) {
                        emitGameAction('discard_drawn');
                    } else {
                        useVirtualGameStore.getState().discardDrawnCard();
                    }
                    setShowDrawDiscardPopup(false);
                }}
            />
        </div>
    );
}

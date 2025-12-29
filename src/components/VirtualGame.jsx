import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, ArrowLeft, RotateCcw, Trophy, Info, Sparkles, CheckCircle, BookOpen, X, Bot, Lock, Image as ImageIcon, Palette } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Toast } from './ui/Toast';
import PlayerHand from './virtual/PlayerHand';
import DrawDiscard from './virtual/DrawDiscard';
import DrawDiscardPopup from './virtual/DrawDiscardPopup';
import DrawDiscardTrigger from './virtual/DrawDiscardTrigger';
import CardAnimationLayer from './virtual/CardAnimationLayer';
import SkyjoCard from './virtual/SkyjoCard';
import LevelUpReward from './LevelUpReward';
import ExperienceBar from './ExperienceBar';
import SkinCarousel from './SkinCarousel';
import { useVirtualGameStore, selectAIMode, selectAIPlayers, selectIsCurrentPlayerAI, selectIsAIThinking } from '../store/virtualGameStore';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { useGameStore } from '../store/gameStore';
import { calculateFinalScores } from '../lib/skyjoEngine';
import { AI_DIFFICULTY, chooseInitialCardsToReveal } from '../lib/skyjoAI';
import { useFeedback } from '../hooks/useFeedback';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useNotifications } from '../hooks/useNotifications';
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

    // Notifications
    const virtualLastNotification = useVirtualGameStore((s) => s.lastNotification);
    const clearNotification = useVirtualGameStore((s) => s.clearNotification);
    const virtualPendingAnimation = useVirtualGameStore(s => s.pendingAnimation);
    const clearVirtualPendingAnimation = useVirtualGameStore(s => s.clearPendingAnimation);

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
    const publicRooms = useOnlineGameStore(s => s.publicRooms);
    const socketId = useOnlineGameStore(s => s.socketId);
    const onlineLastNotificationRaw = useOnlineGameStore(s => s.lastNotification);
    const lastAction = useOnlineGameStore(s => s.lastAction);
    const onlinePendingAnimation = useOnlineGameStore(s => s.pendingAnimation);
    const clearOnlinePendingAnimation = useOnlineGameStore(s => s.clearPendingAnimation);

    // Main game store for archiving
    const archiveOnlineGame = useGameStore(s => s.archiveOnlineGame);
    const playerLevel = useGameStore(s => s.level);
    const playerCardSkin = useGameStore(s => s.cardSkin);

    // Online Actions
    const connectOnline = useOnlineGameStore(s => s.connect);
    const disconnectOnline = useOnlineGameStore(s => s.disconnect);

    // Enforce Level Requirements for Skins
    useEffect(() => {
        if (playerLevel < 3 && playerCardSkin !== 'classic') {
            // If user is below level 3 but has a non-classic skin (e.g. from previous high level or bug), reset it.
            useGameStore.getState().setCardSkin('classic');
        }
    }, [playerLevel, playerCardSkin]);
    const setPlayerInfo = useOnlineGameStore(s => s.setPlayerInfo);
    const createRoom = useOnlineGameStore(s => s.createRoom);
    const joinRoom = useOnlineGameStore(s => s.joinRoom);
    const startOnlineGame = useOnlineGameStore(s => s.startGame);
    const startOnlineNextRound = useOnlineGameStore(s => s.startNextRound);
    const emitGameAction = useOnlineGameStore(s => s.emitGameAction);
    const selectOnlineCard = useOnlineGameStore(s => s.selectCard);

    // Local State for Lobby
    const [lobbyCode, setLobbyCode] = useState('');
    const [myPseudo, setMyPseudo] = useState(() => localStorage.getItem('skyjo_player_pseudo') || '');
    const [myEmoji, setMyEmoji] = useState(() => localStorage.getItem('skyjo_player_emoji') || '🐱');
    const [copyToast, setCopyToast] = useState(null);
    const [notification, setNotification] = useState(null);
    const [hasPlayedVictory, setHasPlayedVictory] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showDrawDiscardPopup, setShowDrawDiscardPopup] = useState(false);
    const [isNextRoundPending, setIsNextRoundPending] = useState(false);

    // AI Config State - Load from localStorage for persistence
    const [aiConfig, setAIConfig] = useState(() => {
        const savedPseudo = localStorage.getItem('skyjo_player_pseudo') || '';
        const savedEmoji = localStorage.getItem('skyjo_player_emoji') || '🐱';
        return {
            playerName: savedPseudo,
            playerEmoji: savedEmoji,
            aiCount: 1,
            difficulty: AI_DIFFICULTY.NORMAL,
        };
    });

    // Cards shaking state (for invalid actions)
    const [shakingCard, setShakingCard] = useState(null);

    // Feedback sounds and Music
    const {
        playVictory,
        playCardFlip,
        playCardDraw,
        playCardPlace,
        playStart
    } = useFeedback();
    const musicEnabled = useGameStore(state => state.musicEnabled);
    const toggleMusic = useGameStore(state => state.toggleMusic);

    // Browser notifications for lobby
    const { requestPermission, sendNotification, isTabHidden, hasPermission } = useNotifications();

    // Play music when in game or lobby
    useBackgroundMusic(screen === 'game' || screen === 'lobby');

    // Save pseudo and emoji to localStorage when they change
    useEffect(() => {
        if (aiConfig.playerName) {
            localStorage.setItem('skyjo_player_pseudo', aiConfig.playerName);
        }
        if (aiConfig.playerEmoji) {
            localStorage.setItem('skyjo_player_emoji', aiConfig.playerEmoji);
        }
    }, [aiConfig.playerName, aiConfig.playerEmoji]);

    // Also save from online mode
    useEffect(() => {
        if (myPseudo) {
            localStorage.setItem('skyjo_player_pseudo', myPseudo);
        }
        if (myEmoji) {
            localStorage.setItem('skyjo_player_emoji', myEmoji);
        }
    }, [myPseudo, myEmoji]);
    // Sync notifications from store
    useEffect(() => {
        if (virtualLastNotification) {
            setNotification(virtualLastNotification);
            // Auto clear from store to avoid re-triggering
            setTimeout(() => {
                clearNotification();
            }, 500);
        }
    }, [virtualLastNotification, clearNotification]);

    // Online: Sync notifications from store
    useEffect(() => {
        if (onlineLastNotificationRaw) {
            setNotification(onlineLastNotificationRaw);
            // If we got an error or info, likely the pending state should be cleared (especially error)
            if (onlineLastNotificationRaw.type === 'error') {
                setIsNextRoundPending(false);
            }
            if (onlineLastNotificationRaw.type === 'error') {
                setIsNextRoundPending(false);
            }
            // Check for sound trigger
            if (onlineLastNotificationRaw.sound === 'join') {
                const audio = new Audio('/Sounds/whoosh-radio-ready-219487.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio play failed', e)); // Auto-play restrictions

                // Send browser notification if tab is in background
                if (isTabHidden()) {
                    sendNotification('Skyjo - Nouveau joueur ! 🎮', {
                        body: onlineLastNotificationRaw.message,
                        tag: 'player-joined', // Prevents duplicate notifications
                        renotify: true
                    });
                }
            }
        }
    }, [onlineLastNotificationRaw, isTabHidden, sendNotification]);

    // Reset pending state when round number changes
    useEffect(() => {
        setIsNextRoundPending(false);
        setInitialReveals({}); // Clear any previous round's initial reveals
    }, [onlineRoundNumber]);

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
            setScreen('menu');
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
    // Track if we've archived the current AI/local game (REMOVED: handled manually now)
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

    // Track last round we awarded XP for to prevent duplicates
    const lastAwardedRoundRef = useRef(0);

    // Award XP for winning an online ROUND
    useEffect(() => {
        if (!onlineGameStarted || !onlineGameState || onlineGameState.phase !== 'FINISHED') return;

        const currentRound = onlineRoundNumber;

        // Only proceed if we haven't processed this round yet
        if (lastAwardedRoundRef.current === currentRound) return;

        // Calculate results for this round
        const roundResults = calculateFinalScores(onlineGameState);
        if (!roundResults || roundResults.length === 0) return;

        // Find the lowest score in this round
        const sortedResults = [...roundResults].sort((a, b) => a.finalScore - b.finalScore);
        const roundWinnerScore = sortedResults[0].finalScore;

        // Check if WE are one of the winners (lowest score)
        // In online mode, we need to match our ID (socketId)
        const myResult = roundResults.find(r => r.playerId === socketId);

        if (myResult && myResult.finalScore === roundWinnerScore) {
            // We won (or tied for win) the round!
            addXP(1);

            // Show a small celebration toast? 
            // Maybe not needed if the XP bar animates, but let's log it
            console.log("XP Awarded for Round Win!", currentRound);
        }

        // Mark this round as processed
        lastAwardedRoundRef.current = currentRound;

    }, [onlineGameStarted, onlineGameState, onlineRoundNumber, socketId, addXP]);

    // Reset awarded round tracker when game restarts
    useEffect(() => {
        if (!onlineGameStarted) {
            lastAwardedRoundRef.current = 0;
        }
    }, [onlineGameStarted]);




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
        setAIThinking(true);
        // Slower delay for better readability (was 1200)
        const delay = 2000;
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
                setAIThinking(false);
            }, 2500); // Wait longer before next action (was 800)

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
        playCardFlip();
        const key = `player-${playerIndex}`;
        const current = initialReveals[key] || [];

        if (current.includes(cardIndex)) {
            // Already revealed, do nothing (cannot hide it back)
            return;
        }

        if (current.length < 2) {
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
                playCardPlace();
                emitGameAction('replace_card', { cardIndex });
            } else if (activeState.turnPhase === 'MUST_REPLACE') {
                // Not used in official rules directly but if engine supports it?
                // Engine 'replace_card' handles replacement.
                playCardPlace();
                emitGameAction('replace_card', { cardIndex });
            } else if (activeState.turnPhase === 'MUST_REVEAL') {
                playCardFlip();
                emitGameAction('reveal_hidden', { cardIndex });
            }
            return;
        }

        // Local mode
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const card = currentPlayer.hand[cardIndex];

        if (gameState.turnPhase === 'REPLACE_OR_DISCARD') {
            playCardPlace();
            replaceHandCard(cardIndex);
        } else if (gameState.turnPhase === 'MUST_REPLACE') {
            playCardPlace();
            replaceHandCard(cardIndex);
        } else if (gameState.turnPhase === 'MUST_REVEAL') {
            if (!card?.isRevealed) {
                playCardFlip();
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
        // If game is over, it was already archived by the "See Results" button
        if (gameState && gameState.players && gameState.players.length > 0 && !onlineGameStarted && !isGameOver) {
            // Calculate current winner based on totalScores
            let scores = { ...totalScores } || {};
            let currentRoundScores = [];

            // If the current round is FINISHED but not yet committed to totalScores (e.g. user quits on result screen),
            // we need to add these scores to the archive
            if (gameState.phase === 'FINISHED') {
                const roundResults = calculateFinalScores(gameState);
                currentRoundScores = roundResults;
                roundResults.forEach(r => {
                    scores[r.playerId] = (scores[r.playerId] || 0) + r.finalScore;
                });

                // Award XP if quitting after a win
                // Find round winner (lowest score)
                const roundWinner = roundResults.sort((a, b) => a.finalScore - b.finalScore)[0];
                if (roundWinner && roundWinner.playerId === 'human-1') { // Assuming human-1 is always the player ID in AI mode or local P1
                    // Check if we haven't already awarded XP for this (might be tricky if we don't track it)
                    // But quitting implies we are leaving, so awarding here is safe as long as we don't save "game state" to resume
                    addXP(1);
                }
            }

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
                <LevelUpReward />
                <Card className="glass-premium dark:glass-dark shadow-xl relative">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="flex justify-center mb-3">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg animate-float overflow-hidden bg-slate-900 border border-skyjo-blue/30">
                                    <img
                                        src="/virtual-logo.jpg"
                                        alt="Skyjo Virtual"
                                        className="w-full h-full object-cover scale-110"
                                    />
                                </div>
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-skyjo-blue font-bold">
                            Skyjo Virtuel
                        </CardTitle>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                            Défiez l'IA ou vos amis en ligne !
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">


                        {/* Online Game Button */}
                        <button
                            onClick={() => {
                                setScreen('lobby');
                                connectOnline();
                            }}
                            className="w-full relative group cursor-pointer rounded-[20px] transition-all hover:scale-[1.02] shadow-xl"
                            style={{ animationDelay: '0.3s' }}
                        >
                            {/* Border Gradient - #5DA0F2 */}
                            <div className="absolute inset-0 bg-[#5DA0F2] rounded-[20px] animate-border-pulse opacity-100 shadow-[0_0_20px_#5DA0F2]" />
                            {/* Opaque Center */}
                            <div className="absolute inset-[2px] bg-[#1e2235] rounded-[18px] z-10" />

                            {/* Content */}
                            <div className="relative z-20 flex items-center justify-center gap-3 h-16 w-full text-[#5DA0F2] font-bold text-lg">
                                {/* Halo effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#5DA0F2]/0 via-[#5DA0F2]/5 to-[#5DA0F2]/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[18px]" />
                                <Wifi className="h-6 w-6" />
                                En Ligne (1v1)
                            </div>
                        </button>

                        {/* AI Game Button */}
                        <button
                            onClick={() => setScreen('ai-setup')}
                            className="w-full relative group cursor-pointer rounded-[20px] transition-all hover:scale-[1.02] shadow-xl"
                            style={{ animationDelay: '0.6s' }}
                        >
                            {/* Border Gradient - #C084FC */}
                            <div className="absolute inset-0 bg-[#C084FC] rounded-[20px] animate-border-pulse opacity-100 shadow-[0_0_20px_#C084FC]" />
                            {/* Opaque Center */}
                            <div className="absolute inset-[2px] bg-[#1e2235] rounded-[18px] z-10" />

                            {/* Content */}
                            <div className="relative z-20 flex items-center justify-center gap-3 h-16 w-full text-[#C084FC] font-bold text-lg">
                                {/* Halo effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[#C084FC]/0 via-[#C084FC]/5 to-[#C084FC]/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[18px]" />
                                <Bot className="h-6 w-6" />
                                Affronter l'IA
                            </div>
                        </button>

                        {/* Rules Button (Moved) */}
                        <button
                            onClick={() => setShowRulesModal(true)}
                            className="w-full p-2 mt-4 rounded-2xl glass-premium dark:glass-dark border border-amber-200/50 dark:border-amber-700/50 hover:border-amber-400 transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <BookOpen className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Règles du jeu</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Comment jouer à Skyjo</p>
                                </div>
                                <span className="text-amber-500 dark:text-amber-400 text-base">→</span>
                            </div>
                        </button>


                    </CardContent>
                </Card>

                {/* Experience Bar */}
                <ExperienceBar className="px-1" />



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

                {/* Card Customization Container */}
                <Card className="glass-premium dark:glass-dark shadow-xl border border-slate-200/50 dark:border-slate-700/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <Palette className="h-4 w-4 text-purple-500" />
                            Personnaliser vos cartes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SkinCarousel
                            skins={[
                                { id: 'classic', name: 'Classique', img: '/card-back.png', level: 1 },
                                { id: 'papyrus', name: 'Papyrus', img: '/card-back-papyrus.jpg', level: 3 },
                                { id: 'neon', name: 'Neon', img: '/card-back-neon.png', level: 5 },
                                { id: 'gold', name: 'Gold', img: '/card-back-gold.png', level: 10 },
                                { id: 'galaxy', name: 'Galaxy', img: '/card-back-galaxy.png', level: 15 }
                            ]}
                            selectedSkinId={playerCardSkin}
                            onSelect={(id) => useGameStore.getState().setCardSkin(id)}
                            playerLevel={playerLevel}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render AI setup screen
    if (screen === 'ai-setup') {
        const handleStartAIGame = () => {
            playStart(); // Play start sound
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
                            <div className="flex gap-2 items-center">
                                <select
                                    value={aiConfig.playerEmoji}
                                    onChange={(e) => setAIConfig({ ...aiConfig, playerEmoji: e.target.value })}
                                    className="h-10 w-14 text-2xl text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                                >
                                    {PLAYER_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <Input
                                    placeholder="Votre pseudo"
                                    value={aiConfig.playerName}
                                    onChange={(e) => setAIConfig({ ...aiConfig, playerName: e.target.value })}
                                    className="flex-1 h-10"
                                    required
                                    style={{
                                        borderColor: '#5742e2',
                                        borderWidth: '2px'
                                    }}
                                />
                            </div>
                            {!aiConfig.playerName.trim() && (
                                <p className="text-xs text-amber-400 mt-1">* Pseudo obligatoire</p>
                            )}
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
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.NORMAL ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm",
                                        aiConfig.difficulty === AI_DIFFICULTY.NORMAL && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.NORMAL })}
                                >
                                    Normal
                                </Button>
                                <Button
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.HARD ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm",
                                        aiConfig.difficulty === AI_DIFFICULTY.HARD && "bg-amber-600 hover:bg-amber-700 text-white"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.HARD })}
                                >
                                    Difficile
                                </Button>
                                <Button
                                    variant={aiConfig.difficulty === AI_DIFFICULTY.HARDCORE ? 'default' : 'outline'}
                                    className={cn(
                                        "w-full px-2 text-sm font-extrabold",
                                        aiConfig.difficulty === AI_DIFFICULTY.HARDCORE && "bg-red-800 hover:bg-red-900 border border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"
                                    )}
                                    onClick={() => setAIConfig({ ...aiConfig, difficulty: AI_DIFFICULTY.HARDCORE })}
                                >
                                    HARDCORE
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    size="lg"
                    className={cn(
                        "w-full text-white shadow-lg transition-all",
                        aiConfig.playerName.trim()
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                            : "bg-slate-600 cursor-not-allowed opacity-60"
                    )}
                    onClick={handleStartAIGame}
                    disabled={!aiConfig.playerName.trim()}
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
                            Joueurs (1v1)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {players.map((player, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <select
                                    value={player.emoji}
                                    onChange={(e) => updatePlayer(index, 'emoji', e.target.value)}
                                    className="h-10 w-14 text-2xl text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer appearance-none"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 0.3rem center',
                                        backgroundSize: '0.65em auto',
                                        paddingRight: '1rem'
                                    }}
                                >
                                    {PLAYER_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
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

                        {players.length < 2 && (
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
                    className="w-full bg-[#1e2235] text-white shadow-lg hover:bg-[#1e2235]/90 transition-colors border border-white/20"
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
                            <label className="text-sm font-medium">Votre pseudo</label>
                            <div className="flex gap-2 items-center">
                                <select
                                    value={myEmoji}
                                    onChange={(e) => setMyEmoji(e.target.value)}
                                    className="h-10 w-14 text-2xl text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer"
                                >
                                    {PLAYER_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <Input
                                    placeholder="Votre pseudo"
                                    value={myPseudo}
                                    onChange={(e) => setMyPseudo(e.target.value)}
                                    className="flex-1 h-10"
                                    required
                                    style={{
                                        borderColor: '#5742e2',
                                        borderWidth: '2px'
                                    }}
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
                                        // Request notification permission when creating a room
                                        requestPermission();
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

                        {/* Public Lobbies List */}
                        <div className="pt-4 border-t border-slate-700/50">
                            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Salons en attente ({publicRooms.length})
                            </h3>

                            {publicRooms.length === 0 ? (
                                <div className="text-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                                    <p className="text-slate-500 text-sm">Aucun salon public disponible.</p>
                                    <p className="text-xs text-slate-600 mt-1">Créez une salle pour commencer !</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    {publicRooms.map((room) => (
                                        <div
                                            key={room.code}
                                            className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl transition-all cursor-pointer group"
                                            onClick={() => {
                                                setPlayerInfo(myPseudo || 'Joueur', myEmoji);
                                                joinRoom(room.code);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl shadow-inner">
                                                    {room.emoji}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                                                        Salon de {room.hostName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">
                                                            {room.code}
                                                        </span>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Users className="h-3 w-3" />
                                                            {room.playerCount}/8
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white"
                                            >
                                                Rejoindre
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
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

    // Calculate the local player's index in the game state
    // In online mode, find the player matching our socketId
    // In local/AI mode, player 0 is always the local player
    const myPlayerIndex = isOnlineMode
        ? activeGameState.players.findIndex(p => p.id === socketId)
        : 0;

    // Determine the opponent's index (for 2-player games)
    const opponentIndex = myPlayerIndex === 0 ? 1 : 0;

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
            const currentTotal = Number(activeTotalScores[score.playerId]) || 0;
            const roundScore = Number(score.finalScore) || 0;
            projectedTotals[score.playerId] = currentTotal + roundScore;
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
                                        <span className="text-xs bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">
                                            🎯 A retourné
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
                                disabled={isOnlineMode && isNextRoundPending}
                                onClick={() => {
                                    if (isOnlineMode) {
                                        // Online mode: emit to server
                                        setIsNextRoundPending(true);
                                        startOnlineNextRound();
                                    } else {
                                        // Local mode: use local store

                                        // 1. Check for Round Winner XP (before ending round)
                                        if (activeGameState.phase === 'FINISHED') {
                                            const roundResults = calculateFinalScores(activeGameState);
                                            // Find round winner (strictly lowest score wins round?) 
                                            // Skyjo rules: lowest score wins round.
                                            // Sort by score ascending
                                            const sortedResults = [...roundResults].sort((a, b) => a.finalScore - b.finalScore);
                                            const roundWinner = sortedResults[0];

                                            // Tie handling: if multiple people have same lowest score, both considered winners?
                                            // Simplification: if player has equal lowest score, they get XP
                                            const playerResult = roundResults.find(r => r.playerId === 'human-1');

                                            if (playerResult && playerResult.finalScore === roundWinner.finalScore) {
                                                // Player won or tied for win in this round
                                                addXP(1);
                                            }
                                        }

                                        // Capture results directly to ensure we have the latest state for archiving
                                        const result = endRound();

                                        // If game is over, archive immediately with the fresh scores
                                        if (result && result.isGameOver) {
                                            archiveVirtualGame({
                                                players: activeGameState.players,
                                                totalScores: result.newTotalScores,
                                                winner: result.gameWinner,
                                                roundsPlayed: roundNumber,
                                                gameType: aiMode ? 'ai' : 'local'
                                            });

                                            // Award EXTRA XP if Game Winner (Bonus)
                                            // We already gave XP for round win above.
                                            // Should we give more for game win?
                                            // Let's say yes, Game Win is +2 XP ? Or just another +1.
                                            // Original code gave +1. Let's keep +1 for Game Win.
                                            if (result.gameWinner) {
                                                if (aiMode && result.gameWinner.id === 'human-1') {
                                                    addXP(1);
                                                } else if (!aiMode) {
                                                    addXP(1);
                                                }
                                            }
                                        } else {
                                            // Start next round if game continues
                                            startNextRound();
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
                                        {isNextRoundPending ? (
                                            <>
                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1" />
                                                Attendez...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4 mr-1" />
                                                Manche suivante
                                            </>
                                        )}
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
    const isMyTurn = !isInitialReveal && activeGameState.currentPlayerIndex === myPlayerIndex;
    const isOpponentTurn = !isInitialReveal && activeGameState.currentPlayerIndex === opponentIndex;
    const vignetteColor = isMyTurn
        ? 'radial-gradient(ellipse at center, transparent 50%, rgba(34, 197, 94, 0.15) 100%)'
        : isOpponentTurn
            ? 'radial-gradient(ellipse at center, transparent 50%, rgba(239, 68, 68, 0.15) 100%)'
            : 'none';

    return (
        <div
            className="skyjo-game-container max-w-3xl mx-auto p-0 py-1 animate-in fade-in relative h-screen supports-[height:100svh]:h-[100svh] flex flex-col justify-between overflow-hidden"
            style={{
                // Vignette effect around edges based on turn
                boxShadow: isMyTurn
                    ? 'inset 0 0 80px rgba(34, 197, 94, 0.2)'
                    : isOpponentTurn
                        ? 'inset 0 0 80px rgba(239, 68, 68, 0.2)'
                        : 'none',
            }}
        >
            {/* Header - ultra-thin single line */}
            <div className="flex items-center justify-between px-2 py-0.5 shrink-0">
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

            {/* Opponent at TOP for thumb zone optimization */}
            {activeGameState.players[opponentIndex] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[opponentIndex]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === opponentIndex}
                        isOpponent={true}
                        isOnlineOpponent={isOnlineMode} // Show real name for online opponents
                        selectedCardIndex={null}
                        canInteract={false} // Opponent's hand is never directly interactive for local player
                        onCardClick={() => { }} // No interaction on opponent's hand
                        size="sm"
                    />
                </div>
            )}

            {/* Initial Reveal Instruction Banner */}
            {isInitialReveal && (
                <div className="flex justify-center px-4 relative z-40">
                    <div
                        className="flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 border border-indigo-400/50 shadow-lg"
                        style={{
                            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        <span className="text-2xl">👆</span>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-white text-sm uppercase tracking-wide">
                                Retournez 2 cartes
                            </span>
                            <span className="text-indigo-200 text-xs font-medium">
                                {(initialReveals[`player-${myPlayerIndex}`] || []).length}/2 sélectionnées
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {[0, 1].map(i => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${(initialReveals[`player-${myPlayerIndex}`] || []).length > i
                                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                        : 'bg-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Compact Draw/Discard Trigger Button - ABOVE the banner */}
            {!isInitialReveal && (
                <div
                    className="flex justify-center px-4 relative z-40"
                    style={{ marginTop: '0', marginBottom: '0' }}
                >
                    <div style={{ width: '100%', maxWidth: '340px' }}>
                        <DrawDiscardTrigger
                            onClick={() => setShowDrawDiscardPopup(true)} // Default open
                            onDrawAction={() => {
                                // Direct draw action
                                if (activeGameState.turnPhase === 'DRAW') {
                                    if (isOnlineMode) {
                                        emitGameAction('draw_pile');
                                    } else {
                                        drawFromDrawPile();
                                    }
                                    setShowDrawDiscardPopup(true);
                                }
                            }}
                            onDiscardAction={() => {
                                // Direct discard take action
                                if (activeGameState.turnPhase === 'DRAW') {
                                    if (isOnlineMode) {
                                        emitGameAction('draw_discard');
                                    } else {
                                        takeFromDiscard();
                                    }
                                    setShowDrawDiscardPopup(true);
                                }
                            }}
                            discardTop={discardTop}
                            discardPile={activeGameState.discardPile}
                            drawnCard={activeGameState.drawnCard}
                            drawPileCount={activeGameState.drawPile.length}
                            discardPileCount={activeGameState.discardPile.length}
                            canInteract={
                                !isInitialReveal &&
                                activeGameState.currentPlayerIndex === myPlayerIndex &&
                                (activeGameState.turnPhase === 'DRAW' || (!!activeGameState.drawnCard))
                            }
                            turnPhase={activeGameState.turnPhase}
                            activeActionSource={
                                (onlineGameStarted ? onlinePendingAnimation?.sourceId : virtualPendingAnimation?.sourceId)
                            }
                            instructionText={
                                activeGameState.phase === 'FINAL_ROUND'
                                    ? '⚠️ DERNIER TOUR'
                                    : (isInitialReveal ? `Retournez chacun 2 cartes ${selectedForReveal.length > 0 ? `(${selectedForReveal.length}/2)` : ''}` :
                                        // Only show action instructions when it's the human player's turn (virtual mode only)
                                        activeGameState.currentPlayerIndex !== myPlayerIndex && !isOnlineMode
                                            ? "🤖 Tour de l'IA..."
                                            : (activeGameState.turnPhase === 'DRAW' ? 'Piocher ou défausser' :
                                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ? '👆 Jouez dans votre grille ou défaussez' :
                                                    activeGameState.turnPhase === 'MUST_REPLACE' ? '👆 Remplacez une de vos cartes' :
                                                        activeGameState.turnPhase === 'MUST_REVEAL' ? '👆 Retournez une carte cachée' : ''))
                            }
                        />
                    </div>
                </div>
            )}

            {/* Instruction Banner - BELOW the PIOCHER button */}
            {/* Instruction Banner moved inside DrawDiscardTrigger */}

            {/* Local Player at BOTTOM for thumb zone optimization */}
            {activeGameState.players[myPlayerIndex] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[myPlayerIndex]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === myPlayerIndex}
                        isOpponent={false}
                        selectedCardIndex={null}
                        pendingRevealIndices={isInitialReveal ? (initialReveals[`player-${myPlayerIndex}`] || []) : []}
                        canInteract={
                            isInitialReveal ||
                            (activeGameState.currentPlayerIndex === myPlayerIndex && (
                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ||
                                activeGameState.turnPhase === 'MUST_REPLACE' ||
                                activeGameState.turnPhase === 'MUST_REVEAL'
                            ))
                        }
                        onCardClick={(index) => {
                            if (isInitialReveal) {
                                handleInitialReveal(myPlayerIndex, index);
                            } else {
                                if (activeGameState.currentPlayerIndex !== myPlayerIndex) return;
                                handleCardClick(index);
                            }
                        }}
                        size="md"
                        shakingCardIndex={shakingCard?.playerIndex === myPlayerIndex ? shakingCard.cardIndex : null}
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
                                    <div className="grid grid-cols-4 gap-1 justify-items-center">
                                        {player.hand.map((card, cardIdx) => {
                                            const row = cardIdx % 3;
                                            const col = Math.floor(cardIdx / 3);
                                            const actualCardIdx = col * 3 + row;
                                            return (
                                                <SkyjoCard
                                                    key={cardIdx}
                                                    card={player.hand[actualCardIdx]}
                                                    size="sm"
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
            <LevelUpReward />
            <DrawDiscardPopup
                isOpen={showDrawDiscardPopup}
                onClose={() => {
                    // Check if we need to undo "Take from Discard" action
                    // Logic: If we are in 'MUST_REPLACE' phase (meaning we took from discard)
                    // and we close the popup without confirming placement (which would change phase)
                    // then we should UN-DO the take action (put card back).
                    if (activeGameState.turnPhase === 'MUST_REPLACE') {
                        if (!isOnlineMode) {
                            useVirtualGameStore.getState().undoTakeFromDiscard();
                        } else {
                            useOnlineGameStore.getState().undoTakeFromDiscard();
                        }
                    }
                    setShowDrawDiscardPopup(false);
                }}
                drawPileCount={activeGameState.drawPile.length}
                discardPileCount={activeGameState.discardPile.length}
                discardTop={discardTop}
                discardPile={activeGameState.discardPile}
                drawnCard={activeGameState.drawnCard}
                canDraw={activeGameState.turnPhase === 'DRAW'}
                canTakeDiscard={
                    activeGameState.turnPhase === 'DRAW' &&
                    activeGameState.discardPile.length > 0
                }
                canDiscardDrawn={activeGameState.turnPhase === 'REPLACE_OR_DISCARD'}
                onDrawClick={() => {
                    playCardDraw();
                    if (isOnlineMode) {
                        emitGameAction('draw_pile');
                    } else {
                        drawFromDrawPile();
                    }
                }}
                onDiscardClick={() => {
                    playCardDraw();
                    if (isOnlineMode) {
                        emitGameAction('draw_discard');
                    } else {
                        takeFromDiscard();
                    }
                }}
                onConfirmPlacement={() => {
                    // Just close popup - we are in 'MUST_REPLACE' or 'REPLACE_OR_DISCARD'
                    // and user wants to place on grid
                    setShowDrawDiscardPopup(false);
                }}
                onDiscardDrawnCard={() => {
                    playCardFlip(); // Sound for discarding
                    if (isOnlineMode) {
                        emitGameAction('discard_drawn');
                    } else {
                        useVirtualGameStore.getState().discardDrawnCard();
                    }
                    setShowDrawDiscardPopup(false);
                }}
            />

            {/* Animation Layer - always on top */}
            <CardAnimationLayer
                pendingAnimation={onlineGameStarted ? onlinePendingAnimation : virtualPendingAnimation}
                onClear={onlineGameStarted ? clearOnlinePendingAnimation : clearVirtualPendingAnimation}
            />
        </div>
    );
}

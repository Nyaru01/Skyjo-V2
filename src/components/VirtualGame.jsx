import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, ArrowLeft, RotateCcw, Trophy, Info, Sparkles, CheckCircle, BookOpen, X, Bot, Lock, Image as ImageIcon, Palette, Copy, Share2, Wifi, Globe, Plus, ChevronRight, WifiOff, Music, Music2 } from 'lucide-react';
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
import LevelUpCelebration from './LevelUpCelebration';
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

import { AVATARS, getAvatarPath } from '../lib/avatars';
import AvatarSelector from './AvatarSelector';
import SkyjoLoader from './SkyjoLoader';

// Player colors for avatars

// Player colors for avatars
const PLAYER_EMOJIS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🦄', '🐲'];
const PLAYER_COLORS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵']; // Backward compat for local

/**
 * Virtual Skyjo Game Component
 * Main component for playing virtual Skyjo locally
 */
export default function VirtualGame({ initialScreen = 'menu', onBackToMenu }) {
    const [screen, setScreen] = useState(initialScreen); // menu, setup, game, scores
    const [players, setPlayers] = useState([
        { name: '', avatarId: 'cat' },
        { name: '', avatarId: 'dog' },
    ]);
    const [openAvatarSelector, setOpenAvatarSelector] = useState(null);
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
    const onlineReadyStatus = useOnlineGameStore(s => s.readyStatus);

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

    // Force scroll to top on game mount to avoid 1-2mm shift
    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }, 100);
        return () => clearTimeout(timer);
    }, []);
    const setPlayerInfo = useOnlineGameStore(s => s.setPlayerInfo);
    const createRoom = useOnlineGameStore(s => s.createRoom);
    const joinRoom = useOnlineGameStore(s => s.joinRoom);
    const startOnlineGame = useOnlineGameStore(s => s.startGame);
    const startOnlineNextRound = useOnlineGameStore(s => s.startNextRound);
    const forceOnlineNextRound = useOnlineGameStore(s => s.forceNextRound);
    const onlineTimeoutExpired = useOnlineGameStore(s => s.timeoutExpired);
    const emitGameAction = useOnlineGameStore(s => s.emitGameAction);
    const selectOnlineCard = useOnlineGameStore(s => s.selectCard);

    // Local State for Lobby
    const [lobbyCode, setLobbyCode] = useState('');
    const [myPseudo, setMyPseudo] = useState(() => localStorage.getItem('skyjo_player_pseudo') || '');
    const [myAvatarId, setMyAvatarId] = useState(() => localStorage.getItem('skyjo_player_avatar_id') || 'cat');
    const [copyToast, setCopyToast] = useState(null);
    const [notification, setNotification] = useState(null);
    const [hasPlayedVictory, setHasPlayedVictory] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [showDrawDiscardPopup, setShowDrawDiscardPopup] = useState(false);
    const [isNextRoundPending, setIsNextRoundPending] = useState(false);

    // Reset pending state when new round starts (phase becomes INITIAL_REVEAL)
    useEffect(() => {
        if (onlineGameState?.phase === 'INITIAL_REVEAL') {
            setIsNextRoundPending(false);
        }
    }, [onlineGameState?.phase]);

    // AI Config State - Load from localStorage for persistence
    const [aiConfig, setAIConfig] = useState(() => {
        const savedPseudo = localStorage.getItem('skyjo_player_pseudo') || '';
        const savedAvatarId = localStorage.getItem('skyjo_player_avatar_id') || 'cat';
        return {
            playerName: savedPseudo,
            playerAvatarId: savedAvatarId,
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

    // Save pseudo and emoji to localStorage when they change
    useEffect(() => {
        if (aiConfig.playerName) {
            localStorage.setItem('skyjo_player_pseudo', aiConfig.playerName);
        }
        if (aiConfig.playerAvatarId) {
            localStorage.setItem('skyjo_player_avatar_id', aiConfig.playerAvatarId);
        }
    }, [aiConfig.playerName, aiConfig.playerAvatarId]);

    // Also save from online mode
    useEffect(() => {
        if (myPseudo) {
            localStorage.setItem('skyjo_player_pseudo', myPseudo);
        }
        if (myAvatarId) {
            localStorage.setItem('skyjo_player_avatar_id', myAvatarId);
        }
    }, [myPseudo, myAvatarId]);
    // Sync screen with initialScreen prop
    useEffect(() => {
        if (initialScreen) {
            setScreen(initialScreen);
        }
    }, [initialScreen]);

    // Auto-navigate to game screen when any game starts
    useEffect(() => {
        const activeState = onlineGameStarted ? onlineGameState : gameState;

        if (activeState && activeState.phase !== 'FINISHED' && screen !== 'game') {
            setScreen('game');
            setInitialReveals({});
        }
    }, [onlineGameStarted, onlineGameState, gameState, screen]);

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

    // Auto-archive online game on Game Over
    // We use a ref to prevent double-archiving in the same mounting cycle if store updates slowly
    const hasArchivedOnlineRef = useRef(false);

    // Reset ref when game starts
    useEffect(() => {
        if (onlineGameStarted && !onlineIsGameOver) {
            hasArchivedOnlineRef.current = false;
        }
    }, [onlineGameStarted, onlineIsGameOver]);

    useEffect(() => {
        if (onlineIsGameOver && onlineGameStarted && onlinePlayers.length > 0 && !hasArchivedOnlineRef.current) {
            console.log("Auto-archiving online game results...");
            hasArchivedOnlineRef.current = true;
            archiveOnlineGame({
                players: onlinePlayers,
                totalScores: onlineTotalScores,
                winner: onlineGameWinner,
                roundsPlayed: onlineRoundNumber
            });
        }
    }, [onlineIsGameOver, onlineGameStarted, onlinePlayers, onlineTotalScores, onlineGameWinner, onlineRoundNumber, archiveOnlineGame]);

    // Reset pending state when round number changes
    useEffect(() => {
        setIsNextRoundPending(false);
        setInitialReveals({}); // Clear any previous round's initial reveals
    }, [onlineRoundNumber]);

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


    // Helper to update player avatar from selector
    const updateAvatar = (indexOrKey, avatarId) => {
        if (indexOrKey === 'ai-player') {
            setAIConfig({ ...aiConfig, playerAvatarId: avatarId });
            setMyAvatarId(avatarId); // Sync with online state
            setOpenAvatarSelector(null);
        } else if (indexOrKey === 'online-setup') {
            setMyAvatarId(avatarId);
            setAIConfig({ ...aiConfig, playerAvatarId: avatarId }); // Sync with AI state
            setOpenAvatarSelector(null);
        } else {
            const index = Number(indexOrKey);
            const newPlayers = [...players];
            newPlayers[index] = { ...newPlayers[index], avatarId };
            setPlayers(newPlayers);
            setOpenAvatarSelector(null);
        }
    };

    // Back to menu
    // Back to menu
    const handleBackToMenu = () => {
        // Archive online game if it was started and has data (avoid duplicates)
        // Check our ref to see if we already auto-archived
        if (onlineGameStarted && onlinePlayers.length > 0 && !hasArchivedOnlineRef.current) {
            console.log("Manual archiving on quit...");
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

        // Archive AI/local game when quitting (only if at least one round is finished)
        if (gameState && gameState.players && gameState.players.length > 0 && !onlineGameStarted && !isGameOver) {
            // Intelligent Archiving: Only save to history if at least one round was completed
            const isAtLeastOneRoundDone = roundNumber > 1 || gameState.phase === 'FINISHED';

            if (isAtLeastOneRoundDone) {
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
                    const roundWinner = roundResults.sort((a, b) => a.finalScore - b.finalScore)[0];
                    if (roundWinner && roundWinner.playerId === 'human-1') {
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
        }

        resetGame();
        setScreen('menu');

        // Signal parent to switch back to main menu
        if (onBackToMenu) onBackToMenu();
    };

    const avatarSelectorComponent = (
        <AvatarSelector
            isOpen={openAvatarSelector !== null}
            onClose={() => setOpenAvatarSelector(null)}
            selectedId={
                openAvatarSelector === 'ai-player'
                    ? aiConfig.playerAvatarId
                    : openAvatarSelector === 'online-setup'
                        ? myAvatarId
                        : (openAvatarSelector !== null && players[openAvatarSelector] ? players[openAvatarSelector].avatarId : null)
            }
            onSelect={(id) => updateAvatar(openAvatarSelector, id)}
        />
    );

    // Redirect to main menu if screen is 'menu' (Legacy menu removal)
    useEffect(() => {
        if (screen === 'menu' && onBackToMenu) {
            onBackToMenu();
        }
    }, [screen, onBackToMenu]);

    if (screen === 'menu') {
        return null; // Don't render anything, wait for redirect
    }

    // Render AI setup screen
    if (screen === 'ai-setup') {
        const handleStartAIGame = () => {
            startAIGame(
                { name: aiConfig.playerName || 'Joueur', emoji: aiConfig.playerEmoji },
                1, // Forced to 1 AI opponent
                aiConfig.difficulty
            );
            setInitialReveals({});
            setScreen('game');
        };

        return (
            <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in pt-10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMenu}
                    className="mb-2 text-slate-300 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Retour
                </Button>

                <div className="text-center mb-6 space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center justify-center gap-2">
                        <Bot className="h-8 w-8 text-purple-400" />
                        CONTRE L'IA
                    </h2>
                    <div className="h-1 w-12 bg-purple-500 mx-auto rounded-full" />
                </div>

                <Card className="glass-premium dark:glass-dark shadow-xl border-t border-white/10">
                    <CardContent className="space-y-6 pt-6">
                        {/* Player Name */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-purple-200 ml-1">Votre Profil</label>
                            <div className="flex gap-3 items-center bg-slate-900/40 p-2 rounded-2xl border border-white/5">
                                {/* Avatar Button */}
                                <button
                                    onClick={() => setOpenAvatarSelector('ai-player')}
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 border-2 border-purple-500/30 overflow-hidden relative group bg-slate-800"
                                >
                                    <div className="absolute inset-0 bg-white">
                                        <img
                                            src={getAvatarPath(aiConfig.playerAvatarId)}
                                            alt="Avatar"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => { e.target.src = '/avatars/cat.png' }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent pointer-events-none" />
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 h-4 bg-black/60 flex items-center justify-center">
                                        <Palette className="w-2 h-2 text-white/80" />
                                    </div>
                                </button>

                                <div className="flex-1">
                                    <Input
                                        placeholder="Votre pseudo"
                                        value={aiConfig.playerName}
                                        onChange={(e) => setAIConfig({ ...aiConfig, playerName: e.target.value })}
                                        className="h-12 bg-transparent border-0 text-lg font-bold text-white placeholder:text-slate-500 focus-visible:ring-0 px-2"
                                        required
                                    />
                                    <div className="h-0.5 w-full bg-gradient-to-r from-purple-500/50 to-transparent" />
                                </div>
                            </div>
                            {!aiConfig.playerName.trim() && (
                                <p className="text-xs text-red-400 pl-2 font-medium flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Pseudo obligatoire
                                </p>
                            )}
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-purple-200 ml-1">Niveau de difficulté</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { level: AI_DIFFICULTY.NORMAL, label: 'Normal', color: 'bg-emerald-500', icon: '🙂', desc: 'Idéal pour débuter' },
                                    { level: AI_DIFFICULTY.HARD, label: 'Difficile', color: 'bg-amber-500', icon: '🤖', desc: 'Un véritable défi' },
                                    { level: AI_DIFFICULTY.HARDCORE, label: 'HARDCORE', color: 'bg-red-600', icon: '🔥', desc: 'IA impitoyable' }
                                ].map((mode) => (
                                    <button
                                        key={mode.level}
                                        onClick={() => setAIConfig({ ...aiConfig, difficulty: mode.level })}
                                        className={cn(
                                            "relative w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 text-left group overflow-hidden",
                                            aiConfig.difficulty === mode.level
                                                ? `border-${mode.color.replace('bg-', '')} bg-slate-800/80 ring-1 ring-${mode.color.replace('bg-', '')} shadow-lg`
                                                : "border-white/5 bg-slate-900/40 hover:bg-slate-800/60 hover:border-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110",
                                            aiConfig.difficulty === mode.level ? mode.color : "bg-slate-800"
                                        )}>
                                            {mode.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className={cn(
                                                "font-bold text-base transition-colors",
                                                aiConfig.difficulty === mode.level ? "text-white" : "text-slate-300"
                                            )}>
                                                {mode.label}
                                            </div>
                                            <div className="text-xs text-slate-500 font-medium">{mode.desc}</div>
                                        </div>
                                        {aiConfig.difficulty === mode.level && (
                                            <div className="absolute right-4 w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    size="lg"
                    className={cn(
                        "w-full h-16 text-lg font-black uppercase tracking-widest text-white shadow-xl transition-all rounded-2xl relative overflow-hidden group",
                        aiConfig.playerName.trim()
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:scale-[1.02] hover:shadow-purple-500/25"
                            : "bg-slate-700 cursor-not-allowed opacity-50"
                    )}
                    onClick={handleStartAIGame}
                    disabled={!aiConfig.playerName.trim()}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out skew-y-12" />
                    <span className="relative flex items-center gap-2">
                        🚀 Affronter l'IA
                    </span>
                </Button>
                {avatarSelectorComponent}
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
                    onClick={handleBackToMenu}
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
                                {/* Avatar Button */}
                                <button
                                    onClick={() => setOpenAvatarSelector(index)}
                                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 border border-white/10 overflow-hidden relative group bg-slate-800 ring-2 ring-white/5 hover:ring-white/20"
                                >
                                    <div className="absolute inset-0 bg-white">
                                        <img
                                            src={getAvatarPath(player.avatarId)}
                                            alt="Avatar"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => { e.target.src = '/avatars/cat.png' }}
                                        />
                                        {/* Glossy Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/20 to-white/0 opacity-50 pointer-events-none" />
                                    </div>
                                </button>
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
                {avatarSelectorComponent}
            </div>
        );
    }


    // Render Lobby (Online)
    if (screen === 'lobby') {
        const isRoomJoined = !!onlineRoomCode;

        if (isRoomJoined) {
            return (
                <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in pt-10">
                    {avatarSelectorComponent}
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
                        onClick={handleBackToMenu}
                        className="mb-2 text-slate-300 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Quitter le salon
                    </Button>

                    <div className="text-center mb-2 space-y-1">
                        <h2 className="text-2xl font-black text-white tracking-tighter flex items-center justify-center gap-2">
                            <Wifi className="h-8 w-8 text-blue-400 animate-pulse" />
                            SALON EN LIGNE
                        </h2>
                        <div className="h-1 w-12 bg-blue-500 mx-auto rounded-full" />
                    </div>

                    <Card className="glass-premium dark:glass-dark shadow-xl border-t border-white/10 overflow-hidden relative">
                        {/* Ambient Background */}
                        <div className="absolute inset-0 bg-blue-500/10 blur-3xl opacity-20 pointer-events-none" />

                        <CardHeader className="text-center relative z-10 pb-2">
                            <CardTitle className="text-slate-200 text-sm uppercase tracking-widest font-bold">Code d'invitation</CardTitle>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <div className="relative group cursor-pointer"
                                    onClick={() => {
                                        navigator.clipboard.writeText(onlineRoomCode);
                                        setCopyToast({
                                            type: 'success',
                                            message: 'Code copié !',
                                            timestamp: Date.now()
                                        });
                                    }}>
                                    <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-xl" />
                                    <div className="relative p-4 bg-slate-900/80 border border-blue-500/30 rounded-xl flex items-center justify-center gap-3 min-w-[200px] transition-all group-hover:scale-105 group-hover:border-blue-400">
                                        <span className="text-4xl font-black tracking-[0.2em] text-white text-shadow-glow">
                                            {onlineRoomCode}
                                        </span>
                                        <Copy className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                </div>

                                {navigator.share && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-14 w-14 rounded-xl border-blue-500/30 bg-slate-900/50 hover:bg-blue-500/20 text-blue-400 relative group overflow-hidden"
                                        onClick={() => {
                                            const playerName = onlinePlayers.find(p => p.id === socketId)?.name || 'Un ami';
                                            navigator.share({
                                                title: 'Partie Skyjo',
                                                text: `${playerName} vous invite à rejoindre une partie de Skyjo en ligne !\n\nCode de salle : ${onlineRoomCode}`,
                                                url: window.location.href
                                            }).catch(() => { });
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-blue-400/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                                        <Share2 className="h-6 w-6 relative z-10" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-blue-300/80 mt-3 font-medium">Invitez vos amis avec ce code</p>
                        </CardHeader>

                        <CardContent className="space-y-6 relative z-10">
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-400" />
                                        Joueurs ({onlinePlayers.length}/8)
                                    </h3>
                                    {onlineIsHost && (
                                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full border border-amber-500/30 font-bold">
                                            Voust êtes l'hôte
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {onlinePlayers.map(p => (
                                        <div key={p.id} className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl transition-all border",
                                            p.id === socketId
                                                ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                                : "bg-slate-800/40 border-white/5"
                                        )}>
                                            <div className="w-12 h-12 rounded-xl overflow-hidden relative ring-2 ring-white/10 shrink-0 bg-slate-800 shadow-lg">
                                                <img
                                                    src={getAvatarPath(p.emoji)}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                                <span className="hidden absolute inset-0 flex items-center justify-center text-2xl bg-slate-700">
                                                    {p.emoji || '👤'}
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/20 to-white/0 opacity-50 pointer-events-none" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "font-bold text-base",
                                                        p.id === socketId ? "text-blue-400" : "text-slate-200"
                                                    )}>
                                                        {p.name}
                                                    </span>
                                                    {p.isHost && (
                                                        <Trophy className="h-4 w-4 text-amber-400" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <div className={cn("w-2 h-2 rounded-full", p.id === socketId ? "bg-green-500 animate-pulse" : "bg-green-500/50")} />
                                                    En ligne
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Empty slots placeholders */}
                                    {Array.from({ length: Math.max(0, 4 - onlinePlayers.length) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="p-3 rounded-xl border border-dashed border-white/5 bg-white/5 flex items-center gap-3 opacity-50">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-white/20" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-500">En attente...</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {onlineIsHost ? (
                                <Button
                                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg text-lg font-black uppercase tracking-widest relative group overflow-hidden transition-all hover:scale-[1.02] hover:shadow-blue-500/25 rounded-xl border border-white/10"
                                    onClick={startOnlineGame}
                                    disabled={onlinePlayers.length < 2}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out skew-y-12" />
                                    <span className="relative flex items-center gap-2">
                                        <Play className="h-5 w-5 fill-current" />
                                        Lancer la partie
                                    </span>
                                </Button>
                            ) : (
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/10 text-center animate-pulse">
                                    <p className="text-blue-300 font-medium">En attente de l'hôte...</p>
                                    <p className="text-xs text-slate-500 mt-1">La partie va bientôt commencer</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in pt-10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMenu}
                    className="mb-2 text-slate-300 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Retour
                </Button>

                <div className="text-center mb-6 space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tighter flex items-center justify-center gap-2">
                        <Globe className="h-8 w-8 text-blue-400" />
                        MULTIJOUEUR
                    </h2>
                    <div className="h-1 w-12 bg-blue-500 mx-auto rounded-full" />
                </div>

                <Card className="glass-premium dark:glass-dark shadow-xl border-t border-white/10">
                    <CardContent className="space-y-6 pt-6">
                        {onlineError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                                <Info className="h-4 w-4 text-red-400" />
                                {onlineError}
                            </div>
                        )}

                        {/* Player Profile */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-blue-200 ml-1">Votre Profil</label>
                            <div className="flex gap-3 items-center bg-slate-900/40 p-2 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setOpenAvatarSelector('online-setup')}
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 border-2 border-blue-500/30 overflow-hidden relative group bg-slate-800"
                                >
                                    <div className="absolute inset-0 bg-white">
                                        <img
                                            src={getAvatarPath(myAvatarId)}
                                            alt="Avatar"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={(e) => { e.target.src = '/avatars/cat.png' }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent pointer-events-none" />
                                    </div>
                                    <div className="absolute bottom-0 inset-x-0 h-4 bg-black/60 flex items-center justify-center">
                                        <Palette className="w-2 h-2 text-white/80" />
                                    </div>
                                </button>
                                <div className="flex-1">
                                    <Input
                                        placeholder="Votre pseudo"
                                        value={myPseudo}
                                        onChange={(e) => setMyPseudo(e.target.value)}
                                        className="h-12 bg-transparent border-0 text-lg font-bold text-white placeholder:text-slate-500 focus-visible:ring-0 px-2"
                                        required
                                    />
                                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-500/50 to-transparent" />
                                </div>
                            </div>
                        </div>

                        {/* Actions Grid */}
                        <div className="grid grid-cols-1 gap-3 pt-2">
                            <Button
                                className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg text-lg font-bold relative group overflow-hidden rounded-xl"
                                onClick={() => {
                                    setPlayerInfo(myPseudo || 'Joueur', myAvatarId);
                                    createRoom();
                                    requestPermission();
                                }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out skew-y-12" />
                                <span className="relative flex items-center justify-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    Créer une partie
                                </span>
                            </Button>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="CODE"
                                        value={lobbyCode}
                                        onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                                        maxLength={4}
                                        className="h-12 bg-slate-900/50 border-white/10 text-center font-mono tracking-[0.2em] font-bold text-lg text-white uppercase placeholder:tracking-normal"
                                    />
                                </div>
                                <Button
                                    className="h-12 px-6 bg-slate-800 hover:bg-slate-700 text-white border border-white/5 rounded-xl transition-all hover:border-blue-500/50"
                                    onClick={() => {
                                        setPlayerInfo(myPseudo || 'Joueur', myAvatarId);
                                        joinRoom(lobbyCode);
                                    }}
                                >
                                    Rejoindre
                                </Button>
                            </div>
                        </div>

                        {/* Public Lobbies & Friends Split */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            {/* Public Lobbies */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <Globe className="h-3 w-3 text-blue-400" />
                                    Salons publics ({publicRooms.length})
                                </h3>

                                {publicRooms.length === 0 ? (
                                    <div className="text-center p-4 border border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
                                        <p className="text-slate-500 text-xs font-medium">Aucun salon public.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                        {publicRooms.map((room) => (
                                            <div
                                                key={room.code}
                                                className="flex items-center justify-between p-2 pl-3 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer group"
                                                onClick={() => {
                                                    setPlayerInfo(myPseudo || 'Joueur', myAvatarId);
                                                    joinRoom(room.code);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm shadow-inner overflow-hidden ring-1 ring-white/10">
                                                        {getAvatarPath(room.emoji) ? (
                                                            <img src={getAvatarPath(room.emoji)} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{room.emoji}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200 text-xs group-hover:text-blue-300 transition-colors">
                                                            {room.hostName}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500 font-mono bg-black/20 px-1 rounded">
                                                                {room.code}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full">
                                                        <Users className="h-3 w-3" />
                                                        {room.playerCount}/8
                                                    </span>
                                                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Friends (Mock) */}
                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <Users className="h-3 w-3 text-emerald-400" />
                                        Amis en ligne
                                    </h3>
                                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Bientôt</span>
                                </div>
                                <div className="p-3 bg-slate-800/20 border border-white/5 rounded-xl flex items-center justify-center gap-2 opacity-60">
                                    <div className="text-xs text-slate-500 text-center">
                                        Invitez vos amis pour les voir ici !
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div >
        );
    }

    // Determine which game state to use based on mode
    const isOnlineMode = !!onlineGameStarted;
    const activeGameState = isOnlineMode ? onlineGameState : gameState;
    const activeTotalScores = isOnlineMode ? onlineTotalScores : totalScores;
    const activeRoundNumber = isOnlineMode ? onlineRoundNumber : roundNumber;

    // If no active game state and we're on game screen, show loading indicator
    if (!activeGameState && screen === 'game') {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Bot className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                <p className="text-sm font-medium">Initialisation de la partie...</p>
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
                                                {getAvatarPath(player.avatarId || player.emoji) ? (
                                                    <img
                                                        src={getAvatarPath(player.avatarId || player.emoji)}
                                                        alt="Avatar"
                                                        className="w-5 h-5 object-contain rounded-full"
                                                    />
                                                ) : (
                                                    <span>{player.emoji || '👤'}</span>
                                                )}
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
                {/* Toast notifications for ready status */}
                <Toast
                    notification={notification}
                    onDismiss={() => setNotification(null)}
                />
                <Card className="glass-premium shadow-xl overflow-hidden min-h-[450px] flex flex-col">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-orange-900/20" />
                    <CardHeader className="text-center relative py-4">
                        <Trophy className="h-10 w-10 mx-auto text-amber-500 mb-1" />
                        <CardTitle className="text-xl text-amber-400">
                            Fin de la manche {roundNumber}
                        </CardTitle>
                        {gameEndsAfterThisRound && (
                            <p className="text-red-500 text-xs font-medium mt-0.5">
                                ⚠️ Un joueur atteint 100 points !
                            </p>
                        )}
                    </CardHeader>
                    <CardContent className="relative space-y-4 flex-1 pb-4">
                        {/* Round scores with cumulative totals */}
                        <div className="space-y-3">
                            {scores?.map((score, index) => (
                                <motion.div
                                    key={score.playerId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={cn(
                                        "flex flex-col p-3 rounded-xl gap-2",
                                        index === 0
                                            ? "bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border border-amber-500/10"
                                            : "bg-white/5 border border-white/5"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-bold text-slate-400">
                                                #{index + 1}
                                            </span>
                                            <span className="font-medium text-slate-200">
                                                {score.playerName}
                                            </span>
                                            {score.isFinisher && (
                                                <span className="text-[10px] bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    🎯 A retourné
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className={cn(
                                                "text-lg font-bold",
                                                score.penalized ? "text-red-500" : "text-slate-200"
                                            )}>
                                                +{Number(score.finalScore) || 0}
                                            </span>
                                            {score.penalized && (
                                                <span className="text-[10px] text-red-500 block leading-tight">
                                                    (doublé!)
                                                </span>
                                            )}
                                            <span className={cn(
                                                "text-[10px] block opacity-60",
                                                projectedTotals[score.playerId] >= 100 ? "text-red-500 font-bold opacity-100" : "text-slate-400"
                                            )}>
                                                Total: {projectedTotals[score.playerId]}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Mini grid of cards - arranged in 4 columns like the game board */}
                                    <div className="grid grid-cols-4 gap-1.5 p-2 w-fit mx-auto">
                                        {[0, 1, 2].map(row =>
                                            [0, 1, 2, 3].map(col => {
                                                const cardIdx = col * 3 + row;
                                                const player = activeGameState.players.find(p => p.id === score.playerId);
                                                const card = player?.hand[cardIdx];
                                                const isAutoRevealed = card && !card.isRevealed;

                                                return card ? (
                                                    <div key={`${score.playerId}-card-${cardIdx}`} className="relative">
                                                        <SkyjoCard
                                                            card={{ ...card, isRevealed: true }}
                                                            size="xs"
                                                            className={cn(
                                                                "opacity-95 shadow-md transition-all duration-500",
                                                                isAutoRevealed && "shadow-[0_0_12px_rgba(168,85,247,0.8)] scale-110 z-10 brightness-110"
                                                            )}
                                                        />
                                                        {isAutoRevealed && (
                                                            <div className="absolute -top-1 -right-1 flex items-center justify-center z-20">
                                                                <div className="relative">
                                                                    <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-75" />
                                                                    <div className="relative w-3.5 h-3.5 bg-gradient-to-tr from-purple-600 to-fuchsia-400 rounded-full border-2 border-slate-900 shadow-sm flex items-center justify-center">
                                                                        <Sparkles className="w-2 h-2 text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={`${score.playerId}-card-${cardIdx}`}
                                                        className="w-[2.25rem] h-[2.25rem] opacity-0"
                                                    />
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Legend for the auto-reveal cards */}
                        <div className="flex items-center justify-center gap-2 pt-2 opacity-60">
                            <div className="w-3 h-3 bg-gradient-to-tr from-purple-600 to-fuchsia-400 rounded-full flex items-center justify-center shadow-sm">
                                <Sparkles className="w-2 h-2 text-white" />
                            </div>
                            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                                Carte(s) révélée(s) en fin de manche
                            </span>
                        </div>

                        <div className="flex gap-3 pt-2">
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
                                disabled={isOnlineMode && isNextRoundPending && !(onlineTimeoutExpired && onlineIsHost)}
                                onClick={() => {
                                    if (isOnlineMode) {
                                        // If host and timeout expired, force start
                                        if (isNextRoundPending && onlineTimeoutExpired && onlineIsHost) {
                                            forceOnlineNextRound();
                                        } else {
                                            // Normal flow: emit ready status
                                            setIsNextRoundPending(true);
                                            startOnlineNextRound();
                                        }
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
                                        {isOnlineMode ? (
                                            <>
                                                {isNextRoundPending ? (
                                                    <>
                                                        {onlineTimeoutExpired && onlineIsHost ? (
                                                            <>
                                                                <Play className="h-4 w-4 mr-1" />
                                                                Lancer maintenant ({onlineReadyStatus.readyCount}/{onlineReadyStatus.totalPlayers})
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1" />
                                                                Attendez... ({onlineReadyStatus.readyCount}/{onlineReadyStatus.totalPlayers})
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {onlineIsHost ? (
                                                            <>
                                                                <Play className="h-4 w-4 mr-1" />
                                                                Manche suivante
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Proposer la suite
                                                            </>
                                                        )}
                                                    </>
                                                )}
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
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div >
        );
    }

    // Determine whose turn it is (for player hand indicators)
    const isMyTurn = !isInitialReveal && activeGameState.currentPlayerIndex === myPlayerIndex;
    const isOpponentTurn = !isInitialReveal && activeGameState.currentPlayerIndex === opponentIndex;

    return (
        <div
            className={cn(
                "skyjo-game-container max-w-3xl mx-auto p-0 animate-in fade-in relative min-h-[100dvh] flex flex-col overflow-x-hidden touch-none pb-safe-plus",
                activeGameState?.players?.length <= 2 ? "justify-between py-2" : "justify-start gap-2 py-1 pb-6"
            )}
        >
            {/* Header - ultra-thin single line with glass-style elements */}
            <div className="flex items-center justify-between px-3 py-1.5 shrink-0 z-50">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToMenu}
                        className="h-8 px-3 text-[11px] font-black uppercase tracking-tighter bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-white/5 rounded-full backdrop-blur-md shadow-lg flex items-center gap-1"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Quitter
                    </Button>
                </motion.div>

                <div className="flex items-center gap-2">
                    {/* Round Indicator Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/40 border border-white/5 backdrop-blur-md shadow-lg">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Manche
                        </span>
                        <span className="text-xs font-black text-white font-mono bg-indigo-500/30 px-1.5 py-0.5 rounded-md border border-indigo-400/30">
                            {activeRoundNumber}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleMusic}
                        className={cn(
                            "h-8 w-8 p-0 rounded-full transition-all duration-500 relative overflow-visible border border-white/5 backdrop-blur-md shadow-lg",
                            musicEnabled
                                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/30"
                                : "bg-slate-800/40 text-slate-500 hover:bg-slate-700/60"
                        )}
                        title={musicEnabled ? "Couper la musique" : "Activer la musique"}
                    >
                        {/* Ping effect behind the button */}
                        {musicEnabled && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 rounded-full bg-emerald-400/20 animate-[ping_2s_ease-in-out_infinite]"
                            />
                        )}

                        {musicEnabled ? (
                            <Music className="h-3.5 w-3.5 relative z-10" />
                        ) : (
                            <Music2 className="h-3.5 w-3.5 opacity-50 relative z-10" />
                        )}
                    </Button>
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
                            isDrawing={!!(onlineGameStarted ? onlinePendingAnimation?.sourceId : virtualPendingAnimation?.sourceId)}
                            instructionText={
                                activeGameState.phase === 'FINAL_ROUND'
                                    ? '⚠️ DERNIER TOUR'
                                    : (isInitialReveal ? `Retournez chacun 2 cartes ${selectedForReveal.length > 0 ? `(${selectedForReveal.length}/2)` : ''}` :
                                        // Only show action instructions when it's the human player's turn (virtual mode only)
                                        activeGameState.currentPlayerIndex !== myPlayerIndex && !isOnlineMode
                                            ? (isAIThinking ? `🤖 ${currentPlayer?.name} réfléchit...` : `🤖 Tour de ${currentPlayer?.name}`)
                                            : (activeGameState.turnPhase === 'DRAW' ? 'Piocher ou défausser' :
                                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ? '👆 Jouez dans votre grille ou défaussez' :
                                                    activeGameState.turnPhase === 'MUST_REPLACE' ? '👆 Remplacez une de vos cartes' :
                                                        activeGameState.turnPhase === 'MUST_REVEAL' ? '👆 Retournez une carte cachée' : ''))
                            }
                            isAIThinking={isAIThinking}
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
                        size="sm"
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
            <LevelUpCelebration />
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
                        // Close popup immediately - player will see drawn card and decide from there
                        setShowDrawDiscardPopup(false);
                    } else {
                        drawFromDrawPile();
                    }
                }}
                onDiscardClick={() => {
                    playCardDraw();
                    if (isOnlineMode) {
                        emitGameAction('draw_discard');
                        // Close popup immediately - don't wait for server response
                        // Player will place the card on grid, no need to show popup during wait
                        setShowDrawDiscardPopup(false);
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

            {/* Avatar Selector Modal */}
            <AvatarSelector
                isOpen={openAvatarSelector !== null}
                onClose={() => setOpenAvatarSelector(null)}
                selectedId={
                    openAvatarSelector === 'ai-player'
                        ? aiConfig.playerAvatarId
                        : openAvatarSelector === 'online-setup'
                            ? myAvatarId
                            : (openAvatarSelector !== null && players[openAvatarSelector] ? players[openAvatarSelector].avatarId : null)
                }
                onSelect={(id) => updateAvatar(openAvatarSelector, id)}
            />
        </div>
    );
}

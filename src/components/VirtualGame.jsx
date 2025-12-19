import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Users, ArrowLeft, RotateCcw, Trophy, Info, Sparkles, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Toast } from './ui/Toast';
import PlayerHand from './virtual/PlayerHand';
import DrawDiscard from './virtual/DrawDiscard';
import SkyjoCard from './virtual/SkyjoCard';
import { useVirtualGameStore } from '../store/virtualGameStore';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { calculateFinalScores } from '../lib/skyjoEngine';
import { useFeedback } from '../hooks/useFeedback';
import { cn } from '../lib/utils';
import { Copy, Wifi, WifiOff } from 'lucide-react';

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

    // Online Store
    const isOnlineConnected = useOnlineGameStore(s => s.isConnected);
    const onlineGameState = useOnlineGameStore(s => s.gameState);
    const onlinePlayers = useOnlineGameStore(s => s.players);
    const onlineTotalScores = useOnlineGameStore(s => s.totalScores);
    const onlineRoundNumber = useOnlineGameStore(s => s.roundNumber);
    const onlineGameStarted = useOnlineGameStore(s => s.gameStarted);
    const onlineError = useOnlineGameStore(s => s.error);
    const onlineRoomCode = useOnlineGameStore(s => s.roomCode);
    const onlineIsHost = useOnlineGameStore(s => s.isHost);
    const socketId = useOnlineGameStore(s => s.socketId);
    const lastNotification = useOnlineGameStore(s => s.lastNotification);
    const lastAction = useOnlineGameStore(s => s.lastAction);

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

    // Feedback sounds
    const { playVictory } = useFeedback();

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
        resetGame();
        setScreen('menu');
    };

    // Render menu screen
    if (screen === 'menu') {
        return (
            <div className="max-w-md mx-auto p-4 space-y-6 animate-in fade-in">
                <Card className="glass-premium dark:glass-dark shadow-xl overflow-hidden">
                    <div className="absolute inset-0 animate-shimmer opacity-10 pointer-events-none" />
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 rounded-2xl gradient-winner flex items-center justify-center shadow-glow-emerald animate-float">
                                <Sparkles className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Skyjo Virtuel
                        </CardTitle>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                            Jouez avec les vraies cartes !
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg"
                            onClick={() => setScreen('setup')}
                        >
                            <Play className="mr-2 h-5 w-5" />
                            Partie Locale
                        </Button>

                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full border-blue-300 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            onClick={() => {
                                setScreen('lobby');
                                connectOnline();
                            }}
                        >
                            <Wifi className="mr-2 h-5 w-5" />
                            En Ligne (Versus)
                        </Button>

                        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
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
                            <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors group"
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
                    <Card className="glass-premium dark:glass-dark shadow-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20" />
                        <CardHeader className="text-center relative">
                            <div className="relative">
                                <Trophy className="h-20 w-20 mx-auto text-amber-500 mb-2" />
                                <Sparkles className="absolute top-0 right-1/3 h-6 w-6 text-yellow-400 animate-pulse" />
                            </div>
                            <CardTitle className="text-2xl text-amber-700 dark:text-amber-400">
                                🎉 Fin de partie ! 🎉
                            </CardTitle>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                Après {roundNumber} manche{roundNumber > 1 ? 's' : ''}
                            </p>
                        </CardHeader>
                        <CardContent className="relative space-y-4">
                            {/* Winner announcement */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-center p-4 bg-gradient-to-r from-amber-200 to-yellow-200 dark:from-amber-900/50 dark:to-yellow-900/50 rounded-xl"
                            >
                                <span className="text-4xl block mb-2">{gameWinner.emoji}</span>
                                <span className="text-xl font-bold text-amber-800 dark:text-amber-200">
                                    {gameWinner.name} gagne !
                                </span>
                                <span className="text-sm text-amber-600 dark:text-amber-400 block mt-1">
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
                                                index === 0 ? "bg-amber-100/50 dark:bg-amber-900/30" : "bg-white/30 dark:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-400">#{index + 1}</span>
                                                <span>{player.emoji}</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{player.name}</span>
                                            </div>
                                            <span className={cn(
                                                "font-bold",
                                                player.total >= 100 ? "text-red-600" : "text-slate-700 dark:text-slate-300"
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
                <Card className="glass-premium dark:glass-dark shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-100/50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-900/20" />
                    <CardHeader className="text-center relative">
                        <Trophy className="h-16 w-16 mx-auto text-amber-500 mb-2 animate-bounce" />
                        <CardTitle className="text-2xl text-amber-700 dark:text-amber-400">
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
                                        ? "bg-gradient-to-r from-amber-200 to-yellow-200 dark:from-amber-900/50 dark:to-yellow-900/50"
                                        : "bg-white/50 dark:bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-slate-400">
                                        #{index + 1}
                                    </span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {score.playerName}
                                    </span>
                                    {score.isFinisher && (
                                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                                            Finisseur
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-lg font-bold",
                                        score.penalized ? "text-red-600" : "text-slate-800 dark:text-slate-200"
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
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
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

    return (
        <div className="max-w-3xl mx-auto p-2 space-y-3 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToMenu}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Quitter
                </Button>
                <div className="text-center">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {currentPlayer.emoji} {currentPlayer.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        {isInitialReveal
                            ? 'Révélez 2 cartes'
                            : activeGameState.turnPhase === 'DRAW'
                                ? 'Piochez une carte'
                                : 'Jouez votre carte'}
                    </span>
                </div>
                <div className="text-xs text-slate-500">
                    Manche {activeGameState.roundNumber || 1}
                </div>
            </div>

            {/* Action hint */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeGameState.turnPhase + activeGameState.phase}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="text-center py-2"
                >
                    <span className={cn(
                        "inline-block px-4 py-2 rounded-full text-sm font-medium",
                        isInitialReveal
                            ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                            : activeGameState.turnPhase === 'DRAW'
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                : "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300"
                    )}>
                        {isInitialReveal && (
                            <>
                                Touchez 2 cartes pour les révéler
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

            {/* Player 1 (always first player, on top) */}
            {activeGameState.players[0] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[0]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === 0}
                        selectedCardIndex={null}
                        canInteract={
                            // During initial reveal: player can interact with their own cards
                            // After: only if it's their turn
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

            {/* Draw/Discard Area (between players) */}
            <Card className={cn(
                "glass-premium dark:glass-dark transition-all duration-500",
                !isInitialReveal && "ring-2 ring-emerald-400/50"
            )}>
                {!isInitialReveal ? (
                    <DrawDiscard
                        drawPileCount={activeGameState.drawPile.length}
                        discardTop={discardTop}
                        drawnCard={activeGameState.drawnCard}
                        canDraw={activeGameState.turnPhase === 'DRAW'}
                        canTakeDiscard={
                            activeGameState.turnPhase === 'DRAW' &&
                            activeGameState.discardPile.length > 0
                        }
                        canDiscardDrawn={activeGameState.turnPhase === 'REPLACE_OR_DISCARD'}
                        lastDiscardedCard={isOnlineMode ? lastAction?.card : null}
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
                        onDiscardDrawnCard={() => {
                            if (isOnlineMode) {
                                emitGameAction('discard_drawn');
                            } else {
                                discardDrawnCard();
                            }
                        }}
                    />
                ) : (
                    <div className="flex items-center justify-center gap-8 py-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="relative w-14 h-20 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-xl opacity-50">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">S</span>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                                Pioche ({activeGameState.drawPile.length})
                            </span>
                        </div>
                        <div className="text-center text-slate-400 text-sm">
                            Révélation des cartes...
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-20 rounded-xl border-2 border-dashed border-slate-400/30 flex items-center justify-center opacity-50">
                                <span className="text-slate-400/50 text-xs">Vide</span>
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                                Défausse
                            </span>
                        </div>
                    </div>
                )}
            </Card>

            {/* Player 2 (always second player, on bottom) */}
            {activeGameState.players[1] && (
                <div className="relative rounded-2xl transition-all duration-500">
                    <PlayerHand
                        player={activeGameState.players[1]}
                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === 1}
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

            {/* Additional players (if more than 2) */}
            {activeGameState.players.length > 2 && (
                <div className="mt-4">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                        Autres joueurs
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {activeGameState.players.slice(2).map((player, displayIndex) => {
                            const actualIndex = displayIndex + 2;
                            return (
                                <div
                                    key={player.id}
                                    className="relative rounded-2xl transition-all duration-500"
                                >
                                    <PlayerHand
                                        player={player}
                                        isCurrentPlayer={!isInitialReveal && activeGameState.currentPlayerIndex === actualIndex}
                                        canInteract={
                                            isInitialReveal ||
                                            (activeGameState.currentPlayerIndex === actualIndex && (
                                                activeGameState.turnPhase === 'REPLACE_OR_DISCARD' ||
                                                activeGameState.turnPhase === 'MUST_REPLACE' ||
                                                activeGameState.turnPhase === 'MUST_REVEAL'
                                            ))
                                        }
                                        onCardClick={(index) => {
                                            if (isInitialReveal) {
                                                handleInitialReveal(actualIndex, index);
                                            } else {
                                                if (activeGameState.currentPlayerIndex !== actualIndex) return;
                                                handleCardClick(index);
                                            }
                                        }}
                                        size="sm"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}


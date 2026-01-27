import { useState, useRef } from 'react';
import { Archive, Trophy, Calendar, Users, ChevronRight, Trash2, ArrowLeft, Download, Upload, Bot, Wifi, Gamepad2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, selectGameHistory } from '../store/gameStore';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import RoundHistory from './RoundHistory';

/**
 * Format date in French locale
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get game type badge info
 * @param {Object} game - The game object
 * @returns {Object} Badge info with icon, label, and color classes
 */
function getGameTypeBadge(game) {
    // Check gameType first (new format)
    if (game.gameType === 'ai') {
        return {
            icon: Bot,
            label: 'vs IA',
            bgClass: 'bg-purple-100 dark:bg-purple-900/30',
            textClass: 'text-purple-600 dark:text-purple-400',
            borderClass: 'border-purple-200 dark:border-purple-700'
        };
    }
    if (game.gameType === 'online' || game.isOnlineGame) {
        return {
            icon: Wifi,
            label: 'En ligne',
            bgClass: 'bg-blue-100 dark:bg-blue-900/30',
            textClass: 'text-blue-600 dark:text-blue-400',
            borderClass: 'border-blue-200 dark:border-blue-700'
        };
    }
    if (game.gameType === 'local') {
        return {
            icon: Gamepad2,
            label: 'Virtuel',
            bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
            textClass: 'text-emerald-600 dark:text-emerald-400',
            borderClass: 'border-emerald-200 dark:border-emerald-700'
        };
    }
    // Default: Real game (score tracking mode)
    return {
        icon: Users,
        label: 'Réel',
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        textClass: 'text-amber-600 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-700'
    };
}


/**
 * Component showing details of a past game
 */
function PastGameDetail({ game, onBack }) {
    const deleteArchivedGame = useGameStore(state => state.deleteArchivedGame);

    const handleDelete = () => {
        if (confirm('Supprimer définitivement cette partie de l\'historique ?')) {
            deleteArchivedGame(game.id);
            onBack();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between py-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all shadow-lg"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Game Info Card */}
            <Card className="glass-premium dark:glass-dark shadow-lg overflow-hidden">
                <div className="bg-gradient-to-br from-skyjo-blue via-sky-600 to-skyjo-blue p-6 text-white">
                    <div className="flex items-center gap-2 text-sky-100 text-sm mb-2">
                        <Calendar className="h-4 w-4" />
                        {formatDate(game.date)}
                        {/* Game Type Badge */}
                        {(() => {
                            const badge = getGameTypeBadge(game);
                            const BadgeIcon = badge.icon;
                            return (
                                <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30">
                                    <BadgeIcon className="h-3 w-3" />
                                    {badge.label}
                                </span>
                            );
                        })()}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Trophy className="h-6 w-6 text-yellow-300" />
                        </div>
                        <div>
                            <div className="text-sm text-sky-100">Gagnant</div>
                            <div className="text-2xl font-bold">{game.winner.name}</div>
                        </div>
                        <div className="ml-auto text-4xl font-black">{game.winner.score}</div>
                    </div>
                </div>

                <CardContent className="p-4 space-y-4">
                    {/* Final Ranking */}
                    <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            Classement final
                        </h3>
                        <div className="space-y-2">
                            {game.players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        index === 0 ? "bg-sky-50 dark:bg-sky-900/40 border-sky-200 dark:border-sky-700" :
                                            index === 1 ? "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600" :
                                                index === 2 ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700" :
                                                    "bg-white dark:bg-slate-700/30 border-slate-100 dark:border-slate-600"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                            index === 0 ? "bg-skyjo-blue text-white" :
                                                index === 1 ? "bg-slate-400 text-white" :
                                                    index === 2 ? "bg-amber-500 text-white" :
                                                        "bg-slate-200 text-slate-600"
                                        )}>
                                            {index + 1}
                                        </span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{player.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-lg text-slate-700 dark:text-slate-300">
                                        {player.finalScore}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rounds Detail */}
                    <div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">
                            Détail des manches ({game.rounds.length})
                        </h3>
                        <RoundHistory
                            rounds={game.rounds}
                            players={game.players}
                            isFullPage={true}
                            showHeader={false}
                        />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

/**
 * Main GameHistory component - list of all past games
 */
export default function GameHistory() {
    const gameHistory = useGameStore(selectGameHistory);
    const [selectedGame, setSelectedGame] = useState(null);
    const fileInputRef = useRef(null);

    // Export game history to JSON file
    const handleExport = () => {
        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            gameHistory: gameHistory
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skyjo-parties-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import game history from JSON file
    const handleImport = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.gameHistory && Array.isArray(data.gameHistory)) {
                    // Merge with existing history
                    const existingIds = new Set(gameHistory.map(g => g.id));
                    const newGames = data.gameHistory.filter(g => !existingIds.has(g.id));
                    if (newGames.length > 0) {
                        useGameStore.setState(state => ({
                            gameHistory: [...newGames, ...state.gameHistory].slice(0, 50)
                        }));
                        alert(`${newGames.length} partie(s) importée(s) !`);
                    } else {
                        alert('Toutes les parties sont déjà présentes.');
                    }
                } else {
                    alert('Format de fichier invalide.');
                }
            } catch (err) {
                alert('Erreur lors de la lecture du fichier.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    if (selectedGame) {
        return (
            <PastGameDetail
                game={selectedGame}
                onBack={() => setSelectedGame(null)}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Hero Header */}
            <div className="relative text-center py-6 mb-6">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                <h1 className="relative text-3xl font-black text-white drop-shadow-lg tracking-tight flex items-center justify-center gap-3">
                    <Archive className="w-8 h-8 text-sky-400 animate-pulse" />
                    HISTORIQUE
                </h1>
                <p className="relative text-sm text-sky-200/60 font-medium uppercase tracking-widest mt-1">
                    Archives des parties & Détails
                </p>
            </div>
            <div className="flex justify-center gap-2 mb-6 border-b border-white/5 pb-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-500 hover:text-skyjo-blue dark:text-slate-400 dark:hover:text-blue-400"
                    title="Importer"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    disabled={gameHistory.length === 0}
                    className="text-slate-500 hover:text-skyjo-blue dark:text-slate-400 dark:hover:text-blue-400 disabled:opacity-30"
                    title="Exporter"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                </Button>
            </div>

            {
                gameHistory.length === 0 ? (
                    <Card className="glass-premium dark:glass-dark">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Archive className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune partie terminée.</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                Les parties terminées apparaîtront ici.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {gameHistory.map((game, index) => (
                                <motion.div
                                    key={game.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <button
                                        onClick={() => setSelectedGame(game)}
                                        className="w-full text-left"
                                    >
                                        <Card className="glass-premium dark:glass-dark shadow-md hover:shadow-lg transition-all card-hover-lift">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Date + Game Type Badge */}
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDate(game.date)}
                                                            {/* Game Type Badge */}
                                                            {(() => {
                                                                const badge = getGameTypeBadge(game);
                                                                const BadgeIcon = badge.icon;
                                                                return (
                                                                    <span className={cn(
                                                                        "ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                                                        badge.bgClass,
                                                                        badge.textClass,
                                                                        badge.borderClass
                                                                    )}>
                                                                        <BadgeIcon className="h-3 w-3" />
                                                                        {badge.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Winner */}
                                                        <div className="flex items-center gap-2">
                                                            <Trophy className="h-4 w-4 text-yellow-500" />
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                {game.winner.name}
                                                            </span>
                                                            <span className="font-mono text-skyjo-blue dark:text-blue-400 font-bold">
                                                                {game.winner.score} pts
                                                            </span>
                                                        </div>

                                                        {/* Meta info */}
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Users className="h-3 w-3" />
                                                                {game.players.length} joueurs
                                                            </span>
                                                            <span>
                                                                {game.rounds?.length > 0
                                                                    ? `${game.rounds.length} manches`
                                                                    : game.roundsPlayed
                                                                        ? `${game.roundsPlayed} manches`
                                                                        : '1 manche'
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-500 shrink-0" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )
            }
        </div >
    );
}

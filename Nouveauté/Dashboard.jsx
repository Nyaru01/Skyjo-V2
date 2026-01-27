import { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Trophy, Sparkles, History, Undo2, BarChart3, Play, LogOut, CheckCircle2, Users, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, selectPlayers, selectRounds, selectThreshold, selectGameStatus } from '../store/gameStore';
import { useVirtualGameStore } from '../store/virtualGameStore';
import { useOnlineGameStore } from '../store/onlineGameStore';
import { useFeedback } from '../hooks/useFeedback';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import ScoreInput from './ScoreInput';
import RoundHistory from './RoundHistory';
import GameOver from './GameOver';
import GameSetup from './GameSetup';
import GameHistory from './GameHistory';
import Stats from './Stats';
import VirtualGame from './VirtualGame';
import BottomNav from './BottomNav';
import SettingsPage from './SettingsPage';
import ConfirmModal from './ui/ConfirmModal';
import SocialDashboard from './SocialDashboard';
import Tutorial from './Tutorial';
import LevelUpCelebration from './LevelUpCelebration';
import Changelog from './Changelog';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

// Variants d'animation pour les transitions de pages
const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

const pageTransition = {
    type: "tween",
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94]
};

export default function Dashboard() {
    const players = useGameStore(selectPlayers);
    const rounds = useGameStore(selectRounds);
    const threshold = useGameStore(selectThreshold);
    const gameStatus = useGameStore(selectGameStatus);
    const addRound = useGameStore(state => state.addRound);
    const resetGame = useGameStore(state => state.resetGame);
    const undoLastRound = useGameStore(state => state.undoLastRound);
    const level = useGameStore(state => state.level);
    const lastAcknowledgedLevel = useGameStore(state => state.lastAcknowledgedLevel);
    const acknowledgeLevelUp = useGameStore(state => state.acknowledgeLevelUp);
    const hasSeenTutorial = useGameStore(state => state.hasSeenTutorial);
    const setHasSeenTutorial = useGameStore(state => state.setHasSeenTutorial);
    const achievements = useGameStore(state => state.achievements);
    const { playAchievement } = useFeedback();

    const virtualGameState = useVirtualGameStore(state => state.gameState);
    const onlineGameStarted = useOnlineGameStore(state => state.gameStarted);

    const [activeTab, setActiveTab] = useState('home');
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);

    // Activer la musique uniquement pendant une partie (virtuelle ou comptage manuel)
    const isManualGameActive = gameStatus === 'PLAYING' && (activeTab === 'game' || activeTab === 'home');
    const isVirtualGameActive = activeTab === 'virtual' && (!!virtualGameState || onlineGameStarted);

    useBackgroundMusic(isManualGameActive || isVirtualGameActive);

    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        variant: "danger"
    });

    useEffect(() => {
        if (!hasSeenTutorial) {
            setIsTutorialOpen(true);
            setHasSeenTutorial(true);
        }
    }, [hasSeenTutorial, setHasSeenTutorial]);

    useEffect(() => {
        if (achievements.length > 0) {
            playAchievement();
        }
    }, [achievements.length]);

    // Auto-switch to 'game' tab when the game starts
    useEffect(() => {
        if (gameStatus === 'PLAYING') {
            setActiveTab('game');
        }
    }, [gameStatus]);

    // Calculate totals
    const playerTotals = players.map(p => ({
        ...p,
        score: rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0)
    })).sort((a, b) => a.score - b.score);

    const leadingPlayer = playerTotals[0];

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                if (gameStatus === 'SETUP') {
                    return (
                        <motion.div
                            key="setup"
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={pageTransition}
                            className="flex flex-col items-center justify-center min-h-[60vh]"
                        >
                            <GameSetup onNavigate={setActiveTab} />
                        </motion.div>
                    );
                }
                return (
                    <motion.div
                        key="home"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                        className="space-y-6"
                    >
                        <Card className="glass-premium shadow-xl card-hover-lift">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Menu Principal
                                    </div>
                                    <button
                                        onClick={() => setIsTutorialOpen(true)}
                                        className="p-2 hover:bg-sky-500/10 rounded-xl transition-colors text-skyjo-blue group"
                                        title="Revoir le tutoriel"
                                    >
                                        <HelpCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                    </button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                    <p>Partie en cours avec <strong>{players.length} joueurs</strong>.</p>
                                    <p>Seuil de fin : <strong>{threshold} points</strong>.</p>
                                </div>
                                <div className="grid gap-3">
                                    <Button
                                        onClick={() => setActiveTab('game')}
                                        className="w-full bg-skyjo-blue hover:bg-skyjo-blue/90 h-14 rounded-2xl font-black text-lg shadow-xl shadow-skyjo-blue/20 transition-all active:scale-95 group"
                                    >
                                        <Play className="mr-2 h-6 w-6" />
                                        Reprendre la partie
                                    </Button>

                                    <Button
                                        variant="danger"
                                        onClick={() => setConfirmConfig({
                                            isOpen: true,
                                            title: "Quitter la partie ?",
                                            message: "Voulez-vous vraiment quitter et réinitialiser la partie ?",
                                            onConfirm: () => { resetGame(); setActiveTab('home'); },
                                            variant: "danger"
                                        })}
                                        className="w-full h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-200 dark:border-red-900/50 justify-center font-bold"
                                    >
                                        Arrêter la partie
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-lg">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-emerald-900 font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-amber-500" />
                                        En tête
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-800">{leadingPlayer?.name}</div>
                                </div>
                                <div className="text-4xl font-black text-emerald-600 drop-shadow-sm">{leadingPlayer?.score}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                );

            case 'rounds':
                return (
                    <motion.div
                        key="rounds"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <History className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Manches de la partie
                        </h2>
                        <RoundHistory rounds={rounds} players={players} isFullPage={true} />
                        {rounds.length === 0 && (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400 font-medium">
                                Aucune manche jouée.
                            </div>
                        )}
                    </motion.div>
                );


            case 'virtual':
                return (
                    <motion.div
                        key="virtual"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        {gameStatus === 'PLAYING' && (
                            <div className="mb-4 p-4 bg-skyjo-blue/10 border border-skyjo-blue/30 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-skyjo-blue flex items-center justify-center shadow-lg">
                                        <Play className="h-5 w-5 text-white" fill="white" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white text-sm">Partie en cours</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Comptage manuel</p>
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => setActiveTab('game')} className="bg-skyjo-blue h-9 px-4 rounded-xl font-bold text-xs">
                                    Reprendre
                                </Button>
                            </div>
                        )}
                        <VirtualGame />
                    </motion.div>
                );

            case 'pastGames':
                return (
                    <motion.div
                        key="pastGames"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <GameHistory />
                    </motion.div>
                );

            case 'social':
                return (
                    <motion.div
                        key="social"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <SocialDashboard />
                    </motion.div>
                );

            case 'stats':
                return (
                    <motion.div
                        key="stats"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <Stats />
                    </motion.div>
                );

            case 'settings':
                return (
                    <motion.div
                        key="settings"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <SettingsPage onViewChangelog={() => setActiveTab('changelog')} />
                    </motion.div>
                );

            case 'changelog':
                return (
                    <motion.div
                        key="changelog"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                    >
                        <div className="flex items-center gap-2 mb-6 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('settings')}>
                            <Undo2 className="h-5 w-5 text-slate-400" />
                            <span className="text-slate-400 font-bold">Retour aux réglages</span>
                        </div>
                        <Changelog />
                    </motion.div>
                );

            case 'game':
            default:
                return (
                    <motion.div
                        key="game"
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                        className="space-y-6 pt-12 pb-24"
                    >
                        {/* Main Game Container with glassmorphism */}
                        <Card className="glass-premium dark:glass-dark shadow-2xl overflow-hidden">
                            {/* Header with Stop Game */}
                            <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5">
                                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md animate-float overflow-hidden bg-slate-900 border border-skyjo-blue/30">
                                        <img
                                            src="/Gemini_Generated_Image_auzhtfauzhtfauzh.png"
                                            alt="Skyjo Logo"
                                            className="w-full h-full object-cover scale-110"
                                        />
                                    </div>
                                    Partie en cours
                                </h2>
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setIsTutorialOpen(true)}
                                        className="p-2 text-slate-400 hover:text-skyjo-blue transition-colors"
                                        title="Règles du jeu"
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                    </button>
                                    <div className="flex gap-2">
                                        {rounds.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50/80 border-amber-300 bg-white/50 dark:bg-white/10 dark:text-amber-400 dark:border-amber-600"
                                                onClick={() => setConfirmConfig({
                                                    isOpen: true,
                                                    title: "Annuler manche ?",
                                                    message: "Voulez-vous vraiment annuler la dernière manche ?",
                                                    onConfirm: undoLastRound,
                                                    variant: "danger"
                                                })}
                                            >
                                                <Undo2 className="h-4 w-4 mr-1" />
                                                Annuler
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50/80 border-red-300 bg-white/50 dark:bg-white/10 dark:text-red-400 dark:border-red-600"
                                            onClick={() => setConfirmConfig({
                                                isOpen: true,
                                                title: "Arrêter la partie ?",
                                                message: "Arrêter et réinitialiser la partie ?",
                                                onConfirm: () => { resetGame(); setActiveTab('home'); },
                                                variant: "danger"
                                            })}
                                        >
                                            Arrêter
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* History List */}
                            {rounds.length > 0 && (
                                <div className="p-4 border-b border-white/20 dark:border-white/10">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Manches précédentes</h3>
                                    <RoundHistory rounds={rounds} players={players} isFullPage={false} showHeader={false} />
                                </div>
                            )}


                            {/* Embedded Score Input - Always visible for continuous entry */}
                            <div className="p-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px bg-gradient-to-r from-transparent via-skyjo-blue to-transparent flex-1"></div>
                                    <span className="text-xs font-bold text-skyjo-blue dark:text-blue-400 uppercase tracking-wider bg-sky-100 dark:bg-sky-900/50 px-3 py-1 rounded-full shadow-sm">
                                        Nouvelle Manche {rounds.length + 1}
                                    </span>
                                    <div className="h-px bg-gradient-to-r from-transparent via-skyjo-blue to-transparent flex-1"></div>
                                </div>

                                <ScoreInput
                                    key={rounds.length} // Force reset when round increases
                                    players={playerTotals}
                                    rounds={rounds}
                                    isEmbedded={true}
                                    onSave={(scores, finisher) => {
                                        addRound(scores, finisher);
                                        setTimeout(() => {
                                            document.getElementById('score-input-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                    }}
                                />
                            </div>
                        </Card>
                    </motion.div>
                );
        }
    };

    // Determines if we are in an active virtual game (local or online)
    // (Déjà déclaré plus haut pour la musique)

    return (
        <div className="min-h-screen">
            <div className={`max-w-3xl mx-auto p-3 ${isVirtualGameActive ? 'pb-2' : 'pb-24'}`}>
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
                {gameStatus === 'FINISHED' && <GameOver />}
            </div>
            {!isVirtualGameActive && (
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
            )}

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
            />

            {
                level > lastAcknowledgedLevel && (
                    <LevelUpCelebration
                        level={level}
                        onComplete={() => acknowledgeLevelUp()}
                    />
                )
            }

            <Tutorial
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />
        </div >
    );
}


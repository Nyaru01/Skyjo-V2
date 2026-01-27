import { useState } from 'react';
import { Volume2, VolumeX, Music, Music2, Trash2, MessageSquare, ExternalLink, AlertTriangle, Smartphone, Settings, HelpCircle, Sparkles } from 'lucide-react';
import Tutorial from './Tutorial';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import { pushManager } from '../lib/pushManager';
import { Bell, BellOff } from 'lucide-react';

export default function SettingsPage({ onViewChangelog }) {
    const soundEnabled = useGameStore(state => state.soundEnabled);
    const musicEnabled = useGameStore(state => state.musicEnabled);
    const vibrationEnabled = useGameStore(state => state.vibrationEnabled);
    const toggleSound = useGameStore(state => state.toggleSound);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleVibration = useGameStore(state => state.toggleVibration);
    const clearArchivedGames = useGameStore(state => state.clearArchivedGames);

    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    const [pushSubscription, setPushSubscription] = useState(null);
    const [isPushLoading, setIsPushLoading] = useState(false);

    const userProfile = useGameStore(state => state.userProfile);

    // Initial check for push subscription
    useState(() => {
        const checkPush = async () => {
            const sub = await pushManager.getSubscription();
            setPushSubscription(sub);
        };
        checkPush();
    }, []);

    const handleTogglePush = async () => {
        setIsPushLoading(true);
        if (pushSubscription) {
            await pushManager.unsubscribe(userProfile.id);
            setPushSubscription(null);
        } else {
            const sub = await pushManager.subscribe(userProfile.id);
            setPushSubscription(sub);
        }
        setIsPushLoading(false);
    };

    const handleResetHistory = () => {
        clearArchivedGames();
        setShowConfirmReset(false);
    };

    const openFeedbackForm = () => {
        window.open('https://forms.gle/hui2vDfc4XKpcbGt7', '_blank');
    };

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-100">⚙️ Réglages</h1>
                <p className="text-sm text-slate-400 mt-1">Personnalisez votre expérience</p>
            </div>

            {/* Audio Settings */}
            <Card className="glass-premium dark:glass-dark shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                        <Settings className="h-5 w-5 text-blue-400" />
                        Paramètres généraux
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Music Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {musicEnabled ? (
                                <Music className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <Music2 className="h-5 w-5 text-slate-500" />
                            )}
                            <div>
                                <p className="font-medium text-slate-200">Musique de fond</p>
                                <p className="text-xs text-slate-400">Musique lofi pendant les parties</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleMusic}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-all duration-300",
                                musicEnabled
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : "bg-slate-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                                    musicEnabled ? "left-7" : "left-1"
                                )}
                            />
                        </button>
                    </div>

                    {/* Sound Effects Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {soundEnabled ? (
                                <Volume2 className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <VolumeX className="h-5 w-5 text-slate-500" />
                            )}
                            <div>
                                <p className="font-medium text-slate-200">Bruitages</p>
                                <p className="text-xs text-slate-400">Sons de jeu (victoire, cartes...)</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleSound}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-all duration-300",
                                soundEnabled
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : "bg-slate-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                                    soundEnabled ? "left-7" : "left-1"
                                )}
                            />
                        </button>
                    </div>
                    {/* Vibration Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <Smartphone className={cn("h-5 w-5", vibrationEnabled ? "text-emerald-400" : "text-slate-500")} />
                            <div>
                                <p className="font-medium text-slate-200">Vibrations</p>
                                <p className="text-xs text-slate-400">Retour haptique lors des actions</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleVibration}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-all duration-300",
                                vibrationEnabled
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : "bg-slate-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                                    vibrationEnabled ? "left-7" : "left-1"
                                )}
                            />
                        </button>
                    </div>

                    {/* Notifications Push Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            {pushSubscription ? (
                                <Bell className="h-5 w-5 text-emerald-400" />
                            ) : (
                                <BellOff className="h-5 w-5 text-slate-500" />
                            )}
                            <div>
                                <p className="font-medium text-slate-200">Notifications Push</p>
                                <p className="text-xs text-slate-400">Invitations aux parties en ligne</p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePush}
                            disabled={isPushLoading}
                            className={cn(
                                "relative w-14 h-8 rounded-full transition-all duration-300",
                                pushSubscription
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                    : "bg-slate-600",
                                isPushLoading && "opacity-50 cursor-wait"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                                    pushSubscription ? "left-7" : "left-1"
                                )}
                            />
                        </button>
                    </div>

                    {/* Changelog */}
                    <button
                        onClick={onViewChangelog}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all group border border-white/5 hover:border-emerald-500/30"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-200">Nouveautés</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Découvrir les mises à jour</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black tracking-widest uppercase border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                Voir
                            </div>
                        </div>
                    </button>

                    {/* Tutorial Replay */}
                    <button
                        onClick={() => setIsTutorialOpen(true)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all group border border-white/5 hover:border-sky-500/30"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                                <HelpCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-200">Règles du jeu</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Revoir le guide interactif</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-black tracking-widest uppercase border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-all">
                            Voir
                        </div>
                    </button>
                </CardContent>
            </Card>

            <Tutorial
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />

            {/* Data Management */}
            <Card className="glass-premium dark:glass-dark shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                        <Trash2 className="h-5 w-5 text-red-400" />
                        Données
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!showConfirmReset ? (
                        <Button
                            variant="outline"
                            className="w-full justify-start text-red-400 border-red-500/30 hover:bg-red-500/10"
                            onClick={() => setShowConfirmReset(true)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Réinitialiser l'historique des parties
                        </Button>
                    ) : (
                        <div className="space-y-3 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                            <div className="flex items-center gap-2 text-red-400">
                                <AlertTriangle className="h-5 w-5" />
                                <p className="font-medium">Confirmer la suppression ?</p>
                            </div>
                            <p className="text-sm text-slate-400">
                                Cette action supprimera définitivement tout l'historique des parties. Cette action est irréversible.
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowConfirmReset(false)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                    onClick={handleResetHistory}
                                >
                                    Supprimer
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="glass-premium dark:glass-dark shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                        <MessageSquare className="h-5 w-5 text-purple-400" />
                        Feedback
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                            BETA
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-400 mb-4">
                        Vous avez des suggestions, des bugs à signaler ou des idées d'amélioration ? Faites-nous part de vos retours !
                    </p>
                    <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
                        onClick={openFeedbackForm}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Envoyer un commentaire
                        <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                </CardContent>
            </Card>

            {/* Version */}
            <div className="text-center text-xs text-slate-500 pt-4">
                <p>SkyJo Scoring v1.0.0</p>
                <p className="mt-1">Made with ❤️</p>
            </div>
        </div>
    );
}

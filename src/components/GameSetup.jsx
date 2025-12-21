import { useState, useEffect, useRef } from 'react';
import { Plus, X, User, Sparkles, Gamepad2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { useGameStore } from '../store/gameStore';
import { useFeedback } from '../hooks/useFeedback';
import { cn } from '../lib/utils';

// Emojis disponibles pour les avatars
const PLAYER_EMOJIS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🐰', '🐨', '🐯', '🦄', '🐲', '🎮', '⭐', '🔥'];

// Couleurs uniques pour chaque joueur
const PLAYER_COLORS = [
    { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
    { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' },
    { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100' },
    { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
    { bg: 'bg-rose-500', text: 'text-rose-700', light: 'bg-rose-100' },
    { bg: 'bg-cyan-500', text: 'text-cyan-700', light: 'bg-cyan-100' },
    { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-100' },
    { bg: 'bg-pink-500', text: 'text-pink-700', light: 'bg-pink-100' },
];

export default function GameSetup({ onNavigate }) {
    const [players, setPlayers] = useState([
        { name: '', emoji: '🐱' },
        { name: '', emoji: '🐶' }
    ]);
    // const [threshold, setThreshold] = useState(100); // Removed as per request
    const [openEmojiPicker, setOpenEmojiPicker] = useState(null);
    const setConfiguration = useGameStore(state => state.setConfiguration);
    const { playStart } = useFeedback();

    const addPlayer = () => {
        if (players.length < 8) {
            const nextEmoji = PLAYER_EMOJIS[players.length % PLAYER_EMOJIS.length];
            setPlayers([...players, { name: '', emoji: nextEmoji }]);
        }
    };

    const removePlayer = (index) => {
        if (players.length > 2) {
            const newPlayers = [...players];
            newPlayers.splice(index, 1);
            setPlayers(newPlayers);
        }
    };

    const updateName = (index, name) => {
        const newPlayers = [...players];
        newPlayers[index] = { ...newPlayers[index], name };
        setPlayers(newPlayers);
    };

    const updateEmoji = (index, emoji) => {
        const newPlayers = [...players];
        newPlayers[index] = { ...newPlayers[index], emoji };
        setPlayers(newPlayers);
        setOpenEmojiPicker(null);
    };

    const handleStart = () => {
        const finalPlayers = players.map((p, i) => ({
            name: p.name.trim() || `Joueur ${i + 1}`,
            emoji: p.emoji
        }));
        playStart();
        setConfiguration(finalPlayers, 100); // Default threshold 100
    };

    // Récupérer le joueur pour lequel le picker est ouvert
    const selectedPlayerForPicker = openEmojiPicker !== null ? players[openEmojiPicker] : null;

    return (
        <div className="max-w-md mx-auto p-3 space-y-3 animate-in fade-in zoom-in duration-300 h-[calc(100vh-6rem)] flex flex-col justify-center">
            {/* Header Premium */}
            {/* Header Premium - Uniformisé avec le bouton Virtuel */}
            <div className="w-full relative overflow-hidden rounded-2xl">
                {/* Halo Blanc Léger Permanent */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 animate-pulse-slow blur-xl opacity-30" />

                <div className="relative p-6 rounded-2xl glass-premium dark:glass-dark border border-skyjo-blue/30 flex items-center gap-6 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg overflow-hidden border border-white/20 bg-slate-900 shrink-0">
                        <img
                            src="/logo.jpg"
                            alt="Skyjo Logo"
                            className="w-full h-full object-cover scale-110"
                        />
                    </div>
                    <div className="text-left flex-1">
                        <h1 className="text-2xl font-extrabold text-skyjo-blue drops-shadow-sm dark:text-sky-300">
                            Skyjo Score
                        </h1>
                        <p className="text-slate-400 font-medium text-sm mt-1">Compteur de points</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-skyjo-blue animate-pulse"></span>
                            Pour vos vraies parties
                        </p>
                    </div>
                </div>
            </div>

            {/* Carte Joueurs */}
            <Card className="glass-premium dark:glass-dark shadow-xl">
                <CardHeader className="py-2 px-4">
                    <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2 text-base">
                        <User className="h-4 w-4 text-skyjo-blue dark:text-sky-400" />
                        Joueurs
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 py-2 px-4">
                    {players.map((player, index) => {
                        const color = PLAYER_COLORS[index];
                        return (
                            <div
                                key={index}
                                className="flex gap-2 animate-scale-in"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                {/* Emoji Selector Button */}
                                <button
                                    type="button"
                                    onClick={() => setOpenEmojiPicker(openEmojiPicker === index ? null : index)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center text-lg shadow-lg transition-all hover:scale-110 border border-white/10",
                                        "bg-skyjo-blue text-white shadow-skyjo-blue/30"
                                    )}
                                >
                                    {player.emoji}
                                </button>

                                {/* Name Input */}
                                <div className="relative flex-1">
                                    <Input
                                        placeholder={`Joueur ${index + 1}`}
                                        value={player.name}
                                        onChange={(e) => updateName(index, e.target.value)}
                                        className={cn(
                                            "h-9 bg-white/90 dark:bg-white/10 border-slate-300 dark:border-white/20 focus:bg-white dark:focus:bg-white/20 focus:border-emerald-400 transition-all shadow-sm text-sm text-slate-900 dark:text-white placeholder:text-slate-500",
                                            player.name && "font-medium"
                                        )}
                                    />
                                </div>

                                {/* Remove Button */}
                                {players.length > 2 && (
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        onClick={() => removePlayer(index)}
                                        className="shrink-0 h-9 w-9 text-red-600 hover:bg-red-100/70 hover:text-red-700 bg-white/60 dark:bg-white/10 border-white/40 dark:border-white/20 transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}

                    {players.length < 8 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-dashed border-emerald-400/60 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/30 hover:border-emerald-500 bg-white/30 dark:bg-white/5 transition-all"
                            onClick={addPlayer}
                        >
                            <Plus className="mr-1 h-4 w-4" /> Ajouter
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Carte Seuil REMOVED */}

            {/* Bouton Démarrer */}
            <Button
                size="lg"
                className="w-full bg-skyjo-blue hover:bg-skyjo-blue/90 text-white font-bold shadow-xl shadow-skyjo-blue/25 border border-white/20 h-12 text-base animate-pulse-glow"
                onClick={handleStart}
            >
                🚀 Commencer à compter
            </Button>

            {/* Virtual Game Section */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300/50 dark:border-slate-600/50"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-transparent px-2 text-slate-500 dark:text-slate-400">ou</span>
                </div>
            </div>

            <button
                onClick={() => onNavigate?.('virtual')}
                className="w-full relative group cursor-pointer overflow-hidden rounded-2xl transition-all hover:scale-[1.02]"
            >
                {/* Halo Blanc Scintillant */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-pulse-slow blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-6 rounded-2xl glass-premium dark:glass-dark border border-purple-200/50 dark:border-purple-700/50 hover:border-white/40 transition-all flex items-center gap-6 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden border border-white/20 bg-slate-900 shrink-0">
                        <img
                            src="/virtual-logo.jpg"
                            alt="Skyjo Virtual"
                            className="w-full h-full object-cover scale-110"
                        />
                    </div>
                    <div className="text-left flex-1">
                        <p className="font-extrabold text-xl bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Jouer en virtuel</p>
                        <p className="text-sm text-slate-400 mt-1">Mode local ou en ligne</p>
                    </div>
                    <span className="text-white/80 text-2xl group-hover:translate-x-1 transition-transform">→</span>
                </div>
            </button>

            {/* Modal Emoji Picker - RENDU EN DEHORS DE LA BOUCLE */}
            {openEmojiPicker !== null && selectedPlayerForPicker && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm"
                        onClick={() => setOpenEmojiPicker(null)}
                    />
                    {/* Modal centré */}
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-600 p-4 animate-in zoom-in-95 duration-150 w-[200px]">
                        <h3 className="text-center text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Choisis ton avatar</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {PLAYER_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => updateEmoji(openEmojiPicker, emoji)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all hover:scale-110",
                                        selectedPlayerForPicker.emoji === emoji && "bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-500"
                                    )}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

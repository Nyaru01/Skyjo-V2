import { useState, useEffect, useRef } from 'react';
import { Plus, X, User, Sparkles, Gamepad2, RefreshCw, CheckCircle, Edit2, ArrowRight, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
// Card imports removed as they are no longer used
import { useGameStore } from '../store/gameStore';
import { useFeedback } from '../hooks/useFeedback';
import { useUpdateCheck } from './UpdatePrompt';
import { cn } from '../lib/utils';
import { AVATARS, getAvatarPath } from '../lib/avatars';
import AvatarSelector from './AvatarSelector';

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

const useSyncedAnimation = () => {
    const ref = useRef(null);
    useEffect(() => {
        let frameId;
        const animate = () => {
            const time = Date.now() / 1000;
            const angle = (time * 60) % 360; // 60 deg per second
            if (ref.current) {
                ref.current.style.setProperty('--rotation', `${angle}deg`);
            }
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);
    return ref;
};

export default function GameSetup({ onNavigate, onOpenTutorial }) {
    const [players, setPlayers] = useState([
        { name: '', avatarId: 'cat' },
        { name: '', avatarId: 'dog' }
    ]);
    const [openAvatarSelector, setOpenAvatarSelector] = useState(null); // Index of player selecting
    const setConfiguration = useGameStore(state => state.setConfiguration);
    const { playStart } = useFeedback();
    const { checkForUpdates, isChecking, checkResult } = useUpdateCheck();

    // Synced animation refs
    const scoreContainerRef = useRef(null);
    const virtualContainerRef = useRef(null);

    useEffect(() => {
        let frameId;
        const animate = () => {
            const angle = (Date.now() / 20) % 360;
            if (scoreContainerRef.current) scoreContainerRef.current.style.setProperty('--border-angle', `${angle}deg`);
            if (virtualContainerRef.current) virtualContainerRef.current.style.setProperty('--border-angle', `${(angle + 180) % 360}deg`);
            frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, []);

    const addPlayer = () => {
        if (players.length < 8) {
            // Cycle through available avatars
            const nextAvatarId = AVATARS[players.length % AVATARS.length].id;
            setPlayers([...players, { name: '', avatarId: nextAvatarId }]);
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

    const updateAvatar = (index, avatarId) => {
        const newPlayers = [...players];
        newPlayers[index] = { ...newPlayers[index], avatarId };
        setPlayers(newPlayers);
        setOpenAvatarSelector(null);
    };

    const handleStart = () => {
        const finalPlayers = players.map((p, i) => ({
            name: p.name.trim() || `Joueur ${i + 1}`,
            avatarId: p.avatarId
        }));
        playStart();
        setConfiguration(finalPlayers, 100); // Default threshold 100
    };
    return (
        <div className="max-w-md mx-auto p-2 space-y-2 animate-in fade-in zoom-in duration-300 h-[calc(100vh-5rem)] flex flex-col justify-center overflow-hidden">
            {/* Header Premium */}
            {/* Unified Skyjo Score Container - Premium Redesign */}
            <div ref={scoreContainerRef} className="w-full relative group overflow-hidden rounded-[24px] shadow-2xl transition-all">
                {/* Rotating Beam Border (Preserved) */}
                <div
                    className="absolute inset-[-150%] opacity-100"
                    style={{
                        background: 'conic-gradient(from var(--border-angle), transparent 0deg 300deg, #0ea5e9 360deg)'
                    }}
                />

                {/* Glass Background (Premium) */}
                <div className="absolute inset-[2px] bg-slate-900/90 backdrop-blur-xl rounded-[22px] z-10" />

                {/* Internal Ambient Gradient (Blue/Cyan for Score) */}
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-500 opacity-10 z-10 pointer-events-none rounded-[24px]" />

                {/* Decorative Top Beam */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent z-20 opacity-60" />

                {/* Content Layer */}
                <div className="relative z-20 flex flex-col">
                    {/* Header Section */}
                    <div className="relative p-5 flex items-center gap-5 border-b border-white/5">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border border-white/10 bg-slate-900 shrink-0 relative z-30">
                            <div className="absolute inset-0 bg-sky-500/20 mix-blend-overlay" />
                            <img
                                src="/Gemini_Generated_Image_auzhtfauzhtfauzh.png"
                                alt="Skyjo Logo"
                                className="w-full h-full object-cover scale-110"
                            />
                        </div>
                        <div className="text-left flex-1 relative z-30">
                            <h1 className="text-2xl font-black text-white drop-shadow-md tracking-tight">
                                Skyjo Score
                            </h1>
                            <p className="text-sky-400 font-bold text-sm mt-0.5">Compteur de points</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                                </span>
                                <p className="text-xs text-slate-400 font-medium">
                                    Pour vos vraies parties
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Players Section */}
                    <div className="relative p-4 space-y-3 flex-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">
                            <User className="h-3.5 w-3.5 text-sky-500" />
                            Joueurs
                        </div>
                        {players.map((player, index) => {
                            const color = PLAYER_COLORS[index];
                            return (
                                <div
                                    key={index}
                                    className="flex gap-3 items-center"
                                >
                                    {/* Avatar Selector Button */}
                                    <button
                                        type="button"
                                        onClick={() => setOpenAvatarSelector(index)}
                                        className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 border border-white/10 overflow-hidden relative group",
                                            "bg-slate-800 ring-2 ring-white/5 hover:ring-white/20"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-white">
                                            <img
                                                src={getAvatarPath(player.avatarId)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => { e.target.src = '/avatars/cat.png' }} // Fallback
                                            />
                                            {/* Glossy Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/20 to-white/0 opacity-50 pointer-events-none" />
                                        </div>

                                        <div className="absolute bottom-0 right-0 p-1 bg-black/60 rounded-tl-lg backdrop-blur-[2px]">
                                            <Edit2 className="w-2 h-2 text-white/90" />
                                        </div>
                                    </button>

                                    {/* Name Input */}
                                    <div className="relative flex-1">
                                        <Input
                                            placeholder={`Joueur ${index + 1}`}
                                            value={player.name}
                                            onChange={(e) => updateName(index, e.target.value)}
                                            className={cn(
                                                "h-12 bg-slate-950/50 border-slate-800 focus:bg-slate-900 focus:border-sky-500 transition-all shadow-inner text-sm text-white placeholder:text-slate-600 rounded-xl",
                                                player.name && "font-medium"
                                            )}
                                        />
                                    </div>

                                    {/* Remove Button */}
                                    {players.length > 2 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removePlayer(index)}
                                            className="shrink-0 h-12 w-12 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
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
                                className="w-full h-9 border-dashed border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-sky-400 hover:border-sky-500/30 bg-transparent transition-all rounded-xl mt-2"
                                onClick={addPlayer}
                            >
                                <Plus className="mr-2 h-3.5 w-3.5" /> Ajouter un joueur
                            </Button>
                        )}
                    </div>

                    {/* Action Section */}
                    <div className="relative p-4 pt-2 pb-5">
                        <Button
                            size="lg"
                            className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-sky-500/20 border-t border-white/10 h-12 text-base transition-all hover:scale-[1.02] rounded-xl"
                            onClick={handleStart}
                        >
                            🚀 Commencer à compter
                        </Button>
                    </div>
                </div>
            </div>

            {/* Virtual Game Section */}
            {/* Virtual Game Section */}
            <button
                ref={virtualContainerRef}
                onClick={() => {
                    playStart();
                    onNavigate?.('virtual');
                }}
                className="w-full relative group cursor-pointer overflow-hidden rounded-[24px] transition-all hover:scale-[1.02] shadow-2xl mt-8"
            >
                {/* Rotating Beam Border - Pseudo-element simulation */}
                <div
                    className="absolute inset-[-150%] opacity-100"
                    style={{
                        background: 'conic-gradient(from var(--border-angle), transparent 0deg 300deg, #9333ea 360deg)'
                    }}
                />

                {/* Glass Background (Premium) */}
                <div className="absolute inset-[2px] bg-slate-900/90 backdrop-blur-xl rounded-[22px] z-10" />

                {/* Internal Ambient Gradient (Purple) */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 opacity-10 z-10 pointer-events-none rounded-[24px]" />

                {/* Decorative Top Beam */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent z-20 opacity-60" />

                {/* Content Layer */}
                <div className="relative z-20 p-5 flex items-center gap-6 h-full w-full">
                    {/* Halo effect on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[22px]" />

                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform overflow-hidden border border-white/10 bg-slate-900 shrink-0 relative z-30">
                        <div className="absolute inset-0 bg-purple-500/20 mix-blend-overlay" />
                        <img
                            src="/virtual-logo.jpg"
                            alt="Skyjo Virtual"
                            className="w-full h-full object-cover scale-110"
                        />
                    </div>
                    <div className="text-left flex-1 relative z-30">
                        <p className="font-black text-xl text-white drop-shadow-md">Jouer en virtuel</p>
                        <p className="text-sm text-purple-300 font-medium mt-1">Contre l'IA ou en ligne</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative z-30 group-hover:bg-purple-500/20 transition-colors">
                        <span className="text-purple-400 font-bold text-xl group-hover:translate-x-0.5 transition-transform">
                            <ArrowRight strokeWidth={3} className="h-6 w-6" />
                        </span>
                    </div>
                </div>
            </button>

            {/* Discover Tutorial Button */}
            <button
                onClick={onOpenTutorial}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all text-sm font-bold bg-slate-700/50 hover:bg-slate-600/50 text-sky-400 border border-slate-600/30 active:scale-95 group mb-1"
            >
                <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                DÉCOUVRIR LE TUTORIEL
            </button>

            {/* Check for Updates Button */}
            <button
                onClick={checkForUpdates}
                disabled={isChecking}
                className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all text-sm font-medium",
                    checkResult === 'up-to-date'
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border border-slate-600/30"
                )}
            >
                {isChecking ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Recherche en cours...
                    </>
                ) : checkResult === 'up-to-date' ? (
                    <>
                        <CheckCircle className="w-4 h-4" />
                        Vous êtes à jour !
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-4 h-4" />
                        Rechercher des mises à jour
                    </>
                )}
            </button>



            {/* Avatar Selector Modal */}
            <AvatarSelector
                isOpen={openAvatarSelector !== null}
                onClose={() => setOpenAvatarSelector(null)}
                selectedId={openAvatarSelector !== null ? players[openAvatarSelector].avatarId : null}
                onSelect={(id) => updateAvatar(openAvatarSelector, id)}
            />
        </div>
    );
}

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';
import Confetti from 'react-confetti';
import useWindowSize from '../hooks/useWindowSize';

// Reward definitions
import { LEVEL_REWARDS } from '../lib/rewards';

export default function LevelUpCelebration() {
    const level = useGameStore(state => state.level);
    const lastAcknowledgedLevel = useGameStore(state => state.lastAcknowledgedLevel);
    const acknowledgeLevelUp = useGameStore(state => state.acknowledgeLevelUp);

    const [show, setShow] = useState(false);
    const [reward, setReward] = useState(null);
    const { width, height } = useWindowSize();

    useEffect(() => {
        // Show if level > lastAcknowledgedLevel
        // And we have a reward defined (or generic)
        if (level > lastAcknowledgedLevel) {
            setTimeout(() => {
                setReward(LEVEL_REWARDS[level] || {
                    type: 'generic',
                    content: '🎁',
                    name: `Niveau ${level}`,
                    description: 'Bravo ! Vous avez atteint un nouveau niveau.',
                    rarity: 'common'
                });
                setShow(true);
            }, 0);
        } else {
            setShow(false);
        }
    }, [level, lastAcknowledgedLevel]);

    const handleClaim = () => {
        setShow(false);
        // Wait for animation to finish before updating store
        setTimeout(() => {
            acknowledgeLevelUp();
        }, 500);
    };

    if (!show || !reward) return null;

    const rarityColors = {
        common: 'text-slate-400 bg-slate-800/50 border-slate-700',
        uncommon: 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30',
        rare: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
        epic: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
        legendary: 'text-amber-400 bg-amber-900/20 border-amber-500/30',
    };

    const rarityGlow = {
        common: 'shadow-slate-500/20',
        uncommon: 'shadow-emerald-500/40',
        rare: 'shadow-blue-500/40',
        epic: 'shadow-purple-500/40',
        legendary: 'shadow-amber-500/50',
    };

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 font-sans">
                    <Confetti
                        width={width}
                        height={height}
                        recycle={false}
                        numberOfPieces={500}
                        gravity={0.15}
                    />

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 100 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -100 }}
                        transition={{
                            type: "spring",
                            damping: 15,
                            stiffness: 100
                        }}
                        className="relative w-full max-w-md bg-[#1e2235] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                    >
                        {/* Radioactive Glow Background */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-blue-500/10 blur-3xl pointer-events-none animate-pulse" />

                        <div className="relative p-8 flex flex-col items-center text-center">

                            {/* Header: Level Up Badge */}
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-6 relative"
                            >
                                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                                <div className="relative bg-gradient-to-b from-amber-300 to-amber-600 text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg border border-amber-200/50 flex items-center gap-2">
                                    <Star className="w-3 h-3 fill-white" />
                                    Niveau {level} Atteint !
                                    <Star className="w-3 h-3 fill-white" />
                                </div>
                            </motion.div>

                            {/* Main Reward Visual */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: "spring",
                                    delay: 0.4,
                                    damping: 12,
                                    stiffness: 100
                                }}
                                className="mb-8 relative group"
                            >
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-2xl transition-colors duration-500",
                                    rarityGlow[reward.rarity] || rarityGlow.common
                                )} />

                                <div className="relative z-10">
                                    {reward.type === 'emoji' ? (
                                        <span className="text-[8rem] filter drop-shadow-2xl animate-bounce-custom">
                                            {reward.content}
                                        </span>
                                    ) : reward.type === 'skin' ? (
                                        <div className="relative w-48 h-72 rounded-xl overflow-hidden border-4 border-white/20 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                                            <img
                                                src={reward.image}
                                                alt={reward.name}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Shine effect */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-50" />
                                        </div>
                                    ) : (
                                        <span className="text-[6rem]">{reward.content}</span>
                                    )}
                                </div>
                            </motion.div>

                            {/* Reward Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="space-y-2 mb-8"
                            >
                                <h2 className="text-3xl font-black text-white px-4 leading-tight">
                                    {reward.name}
                                </h2>
                                <div className={cn(
                                    "inline-block px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2",
                                    rarityColors[reward.rarity] || rarityColors.common
                                )}>
                                    {reward.rarity}
                                </div>
                                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                                    {reward.description}
                                </p>
                            </motion.div>

                            {/* Claim Button */}
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                onClick={handleClaim}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-4 px-12 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 group w-full justify-center transition-all"
                            >
                                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                Récupérer
                            </motion.button>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

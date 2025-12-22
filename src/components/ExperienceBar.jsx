import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Zap } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

/**
 * Experience Bar Component (Compact version)
 * Displays a horizontal bar with 10 bubbles representing XP progress
 */
const ExperienceBar = memo(function ExperienceBar({ className }) {
    const currentXP = useGameStore(state => state.currentXP);
    const level = useGameStore(state => state.level);

    return (
        <div className={cn("w-full", className)}>
            {/* Header: Level Badge + XP Counter */}
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Star className="w-4 h-4 text-white fill-white" />
                        </div>
                        {/* Level number badge */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-amber-400 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-amber-400">{level}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">Niveau</p>
                        <p className="text-sm font-bold text-white leading-none">{level}</p>
                    </div>
                </div>

                {/* XP Counter */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{currentXP}</span>
                    <span className="text-[10px] text-slate-500">/10</span>
                </div>
            </div>

            {/* XP Bubbles - More compact */}
            <div className="flex items-center gap-1 p-1.5 rounded-lg bg-slate-800/30 backdrop-blur-sm border border-slate-700/50">
                {[...Array(10)].map((_, index) => {
                    const isFilled = index < currentXP;

                    return (
                        <motion.div
                            key={index}
                            initial={false}
                            animate={{
                                scale: isFilled ? 1 : 0.85,
                                opacity: isFilled ? 1 : 0.4
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 25,
                                delay: isFilled ? index * 0.03 : 0
                            }}
                            className={cn(
                                "flex-1 h-2.5 rounded-full transition-colors duration-300",
                                isFilled
                                    ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-sm shadow-amber-500/30"
                                    : "bg-slate-700/50 border border-slate-600/30"
                            )}
                        >
                            {isFilled && (
                                <div className="w-full h-full rounded-full bg-gradient-to-b from-white/30 to-transparent" />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress text - smaller */}
            <p className="text-center text-[9px] text-slate-500 mt-1">
                {10 - currentXP} victoire{10 - currentXP > 1 ? 's' : ''} avant le niveau {level + 1}
            </p>
        </div>
    );
});

export default ExperienceBar;

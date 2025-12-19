import { memo } from 'react';
import { motion } from 'framer-motion';
import SkyjoCard from './SkyjoCard';
import { cn } from '../../lib/utils';

/**
 * Player Hand Component
 * Displays a player's 12 cards in a 3x4 grid (4 columns, 3 rows)
 */
const PlayerHand = memo(function PlayerHand({
    player,
    isCurrentPlayer = false,
    isLocalPlayer = false,
    selectedCardIndex,
    onCardClick,
    canInteract = false,
    showName = true,
    size = 'md',
}) {
    // Skyjo grid: 4 columns x 3 rows = 12 cards
    // Layout: column-first (0,1,2 = col1, 3,4,5 = col2, etc.)
    const getCardIndex = (row, col) => col * 3 + row;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div
            className={cn(
                "relative p-3 rounded-2xl transition-all duration-300",
                isCurrentPlayer
                    ? "bg-gradient-to-br from-emerald-200/90 to-teal-200/90 dark:from-emerald-800/60 dark:to-teal-800/60 ring-4 ring-emerald-400 shadow-xl shadow-emerald-500/40"
                    : "bg-slate-100/50 dark:bg-slate-800/30",
                isLocalPlayer && "border-2 border-amber-400"
            )}
        >
            {/* Player name badge */}
            {showName && (
                <div
                    className={cn(
                        "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-bold shadow-md whitespace-nowrap",
                        isCurrentPlayer
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    )}
                >
                    {player.emoji} {player.name}
                    {isCurrentPlayer && (
                        <span className="ml-2 animate-pulse">🎯</span>
                    )}
                </div>
            )}

            {/* Card grid: 4 columns x 3 rows */}
            <motion.div
                className="grid grid-cols-4 gap-1 mt-2"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {[0, 1, 2].map((row) =>
                    [0, 1, 2, 3].map((col) => {
                        const cardIndex = getCardIndex(row, col);
                        const card = player.hand[cardIndex];

                        return (
                            <motion.div
                                key={`${row}-${col}`}
                                variants={cardVariants}
                            >
                                <SkyjoCard
                                    card={card}
                                    size={size}
                                    isSelected={selectedCardIndex === cardIndex}
                                    isClickable={canInteract && card !== null}
                                    isHighlighted={canInteract && card && !card.isRevealed}
                                    onClick={() => onCardClick?.(cardIndex)}
                                />
                            </motion.div>
                        );
                    })
                )}
            </motion.div>

            {/* Score indicator */}
            <div className="mt-2 text-center">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Score visible:{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                        {player.hand
                            .filter((c) => c?.isRevealed)
                            .reduce((sum, c) => sum + c.value, 0)}
                    </span>
                </span>
            </div>
        </div>
    );
});

export default PlayerHand;

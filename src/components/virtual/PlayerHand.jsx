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
    isOpponent = false,
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

    // Calculate score for display
    const currentScore = player.hand
        .filter((c) => c?.isRevealed)
        .reduce((sum, c) => sum + c.value, 0);

    return (
        <div
            className={cn(
                "relative transition-all duration-300",
                isCurrentPlayer && !isOpponent
                    ? "ring-4 ring-emerald-400 shadow-2xl shadow-emerald-500/50 animate-pulse-slow"
                    : isCurrentPlayer && isOpponent
                        ? "ring-4 ring-blue-400 shadow-2xl shadow-blue-500/50 animate-pulse-slow"
                        : "",
                isLocalPlayer && "border-2 border-amber-400"
            )}
            style={{
                // 85% black overlay + 20px blur + proper styling
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '18px 16px 16px 16px', // Reduced top padding
                borderRadius: '20px', // Softer corners
                border: '1px solid #333333', // Subtle border
                ...(isCurrentPlayer ? {
                    boxShadow: isOpponent
                        ? '0 0 30px rgba(96, 165, 250, 0.6), 0 0 60px rgba(96, 165, 250, 0.3)'
                        : '0 0 30px rgba(52, 211, 153, 0.6), 0 0 60px rgba(52, 211, 153, 0.3)'
                } : {})
            }}
        >
            {/* Player label with score - 16px margin from grid */}
            {showName && (
                <div
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-bold shadow-lg whitespace-nowrap uppercase tracking-wide flex items-center gap-2",
                        isCurrentPlayer && !isOpponent
                            ? "bg-emerald-500 text-white"
                            : isCurrentPlayer && isOpponent
                                ? "bg-blue-500 text-white"
                                : isOpponent
                                    ? "bg-slate-600 text-slate-200"
                                    : "bg-emerald-600 text-white"
                    )}
                    style={{
                        fontSize: '12px',
                        zIndex: 50,
                        top: '-14px', // Slightly adjusted
                    }}
                >
                    {isOpponent ? (
                        <span className="text-base">🤖 BOT</span>
                    ) : (
                        <span className="text-base">👤 VOUS</span>
                    )}
                    {/* Score: 16pt minimum, bold */}
                    <span
                        className="font-black"
                        style={{
                            fontSize: '16pt',
                            fontFamily: "'Outfit', system-ui, sans-serif",
                        }}
                    >
                        {currentScore}
                    </span>
                    {isCurrentPlayer && (
                        <span className="animate-pulse text-sm">🎯</span>
                    )}
                </div>
            )}

            {/* Card grid: 10px margin from badge, strict 12px gap */}
            <motion.div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginTop: '10px', // Reduced margin
                    justifyItems: 'center',
                }}
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
                                style={{ position: 'relative', zIndex: 1 }}
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
        </div>
    );
});

export default PlayerHand;

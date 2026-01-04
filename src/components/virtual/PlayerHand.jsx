import { memo } from 'react';
import { motion } from 'framer-motion';
import SkyjoCard from './SkyjoCard';
import { cn } from '../../lib/utils';
import { getAvatarPath } from '../../lib/avatars';

/**
 * Player Hand Component
 * Displays a player's 12 cards in a 3x4 grid (4 columns, 3 rows)
 */
const PlayerHand = memo(function PlayerHand({
    player,
    isCurrentPlayer = false,
    isLocalPlayer = false,
    isOpponent = false,
    isOnlineOpponent = false, // True if this is an online opponent (show real name, not "BOT")
    selectedCardIndex,
    pendingRevealIndices = [], // Cards currently selected during initial reveal (for visual flip)
    onCardClick,
    canInteract = false,
    showName = true,

    size = 'md',
    shakingCardIndex = null,
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
                    ? "border-[3px] border-emerald-400"
                    : isCurrentPlayer && isOpponent
                        ? "border-[3px] border-blue-400"
                        : "border border-[#333333]", // Default subtle border
                isLocalPlayer && !isCurrentPlayer && "border-2 border-amber-400/50" // Subtle highlight for self when not turn
            )}
            style={{
                // 85% black overlay + 20px blur + proper styling
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '20px 8px 2px 8px', // Top padding for badge, minimal sides/bottom
                borderRadius: '16px', // Slightly tighter corners
                // Border handled by className for active state, remove inline default
                ...(isCurrentPlayer ? {
                    boxShadow: isOpponent
                        ? '0 0 15px rgba(96, 165, 250, 0.4)'
                        : '0 0 15px rgba(52, 211, 153, 0.4)'
                } : {})
            }}
        >
            {/* Player label with score - 16px margin from grid */}
            {showName && (
                <div
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full font-bold shadow-lg whitespace-nowrap uppercase tracking-wide flex items-center gap-2",
                        isCurrentPlayer && !isOpponent
                            ? "bg-emerald-500 text-white"
                            : isCurrentPlayer && isOpponent
                                ? "bg-blue-500 text-white"
                                : isOpponent
                                    ? "bg-slate-600 text-slate-200"
                                    : "bg-emerald-600 text-white"
                    )}
                    style={{
                        fontSize: '11px',
                        zIndex: 50,
                        top: '-15px', // Position above the container
                    }}
                    id={`player-badge-${player.id}`}
                >
                    {isOpponent ? (
                        isOnlineOpponent ? (
                            <div className="flex items-center gap-1.5">
                                {getAvatarPath(player.avatarId || player.emoji) ? (
                                    <img
                                        src={getAvatarPath(player.avatarId || player.emoji)}
                                        alt="Avatar"
                                        className="w-5 h-5 object-contain rounded-full"
                                    />
                                ) : (
                                    <span className="text-xs">{player.emoji}</span>
                                )}
                                <span className="text-xs">{player.name}</span>
                            </div>
                        ) : (
                            <span className="text-xs">🤖 IA</span>
                        )
                    ) : (
                        <div className="flex items-center gap-1.5">
                            {getAvatarPath(player.avatarId || player.emoji) ? (
                                <img
                                    src={getAvatarPath(player.avatarId || player.emoji)}
                                    alt="Avatar"
                                    className="w-5 h-5 object-contain rounded-full"
                                />
                            ) : (
                                <span className="text-xs">👤</span> // Fallback icon for self if no emoji/avatar
                            )}
                            <span className="text-xs">VOUS</span>
                        </div>
                    )}
                    {/* Score: 16pt minimum, bold */}
                    <span
                        className="font-black"
                        style={{
                            fontSize: '14pt',
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
                    gap: '5px', // Minimal gap
                    marginTop: '2px', // Minimal margin since padding handles badge space
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

                        // Check if this card is pending reveal (selected but not yet confirmed)
                        const isPendingReveal = pendingRevealIndices.includes(cardIndex);

                        // Create a modified card for visual display if pending reveal
                        const displayCard = card && isPendingReveal && !card.isRevealed
                            ? { ...card, isRevealed: true }
                            : card;

                        return (
                            <motion.div
                                key={`${row}-${col}`}
                                variants={cardVariants}
                                style={{ position: 'relative', zIndex: 1 }}
                                id={`card-${player.id}-${cardIndex}`}
                            >
                                <SkyjoCard
                                    card={displayCard}
                                    size={size}
                                    isSelected={selectedCardIndex === cardIndex || isPendingReveal}
                                    isClickable={canInteract && card !== null}
                                    isHighlighted={canInteract && card && !card.isRevealed && !isPendingReveal}
                                    isShaking={shakingCardIndex === cardIndex}
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

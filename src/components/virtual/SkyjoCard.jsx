import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { CARD_COLORS } from '../../lib/skyjoEngine';

/**
 * Skyjo Card Component
 * Displays a card with flip animation, value, and color coding
 * 
 * Card sizes now scale dynamically with viewport height so the game
 * fits on mobile screens without scrolling.
 */
const SkyjoCard = memo(function SkyjoCard({
    card,
    size = 'md',
    isSelected = false,
    isClickable = false,
    isHighlighted = false,
    onClick,
    className,
}) {
    // Dynamic sizing based on viewport - STRICT 2:3 RATIO (width:height)
    // Cards use standard playing card proportions
    const sizeStyles = {
        xs: {
            width: 'clamp(1.5rem, 5vw, 2.25rem)',
            height: 'clamp(2.25rem, 7.5vh, 3.375rem)', // 2:3 ratio
            fontSize: 'clamp(0.8rem, 2.4vw, 1.2rem)'
        },
        sm: {
            width: 'clamp(2.5rem, 7.5vw, 3.5rem)', // Widened
            height: 'clamp(3.375rem, 9.75vh, 4.5rem)', // 2:3 ratio
            fontSize: 'clamp(1.1rem, 3vw, 1.5rem)'
        },
        md: {
            width: 'clamp(3rem, 8.5vw, 4.25rem)', // Widened
            height: 'clamp(4.125rem, 11.25vh, 5.25rem)', // 2:3 ratio
            fontSize: 'clamp(1.3rem, 3.5vw, 2rem)'
        },
        lg: {
            width: 'clamp(3.5rem, 9vw, 4.5rem)',
            height: 'clamp(5.25rem, 13.5vh, 6.75rem)', // 2:3 ratio
            fontSize: 'clamp(1.6rem, 4.5vw, 2.4rem)'
        },
    };

    const currentSize = sizeStyles[size] || sizeStyles.md;

    if (card === null) {
        // Empty slot (column was removed)
        return (
            <div
                className={cn(
                    "rounded-lg border-2 border-dashed border-slate-300/50 dark:border-slate-600/50",
                    className
                )}
                style={{
                    width: currentSize.width,
                    height: currentSize.height,
                }}
            />
        );
    }

    const colors = CARD_COLORS[card.color] || CARD_COLORS.green;
    const isRevealed = card.isRevealed;

    return (
        <motion.div
            className={cn(
                "perspective-1000 relative",
                isClickable ? "cursor-pointer" : "cursor-default",
                className
            )}
            style={{
                width: currentSize.width,
                height: currentSize.height,
                fontSize: currentSize.fontSize,
            }}
            onClick={isClickable ? onClick : undefined}
            whileHover={isClickable ? { scale: 1.08, y: -4 } : undefined}
            whileTap={isClickable ? { scale: 0.95 } : undefined}
        >
            {/* Extended invisible touch/click area - 8px padding around the card */}
            {isClickable && (
                <div
                    className="absolute pointer-events-auto"
                    style={{
                        top: '-8px',
                        left: '-8px',
                        right: '-8px',
                        bottom: '-8px',
                        zIndex: 10,
                    }}
                    onClick={onClick}
                />
            )}
            <motion.div
                className="relative w-full h-full preserve-3d transition-transform duration-500"
                animate={{ rotateY: isRevealed ? 0 : 180 }}
                initial={false}
            >
                {/* Front face (value visible) */}
                <div
                    className={cn(
                        "absolute inset-0 backface-hidden flex items-center justify-center font-black",
                        colors.bg,
                        colors.text,
                        isSelected && "ring-4 ring-amber-400 ring-offset-2",
                        isClickable && "hover:shadow-2xl",
                        colors.glow && isRevealed && `${colors.glow}`
                    )}
                    style={{
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                >
                    {/* Glossy effect overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 40%, transparent 60%)',
                        }}
                    />
                    <span className="drop-shadow-md relative z-10">
                        {card.value < 0 ? card.value : card.value}
                    </span>
                </div>

                {/* Back face (hidden) */}
                <div
                    className={cn(
                        "absolute inset-0 backface-hidden flex items-center justify-center rotate-y-180",
                        "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
                        isSelected && "ring-4 ring-amber-400 ring-offset-2",
                    )}
                    style={{
                        borderRadius: '12px',
                        boxShadow: isHighlighted
                            ? '0 0 20px rgba(52, 211, 153, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)'
                            : '0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
                        border: isHighlighted
                            ? '2px solid rgba(52, 211, 153, 0.8)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    {/* Card back pattern - abstract geometric design */}
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: '60%',
                            height: '60%',
                        }}
                    >
                        {/* Abstract diamond/geometric pattern */}
                        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                            <rect x="6" y="6" width="12" height="12" rx="2" fill="url(#cardGrad)" transform="rotate(45 12 12)" />
                            <circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.3)" />
                            <defs>
                                <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#34d399" />
                                    <stop offset="100%" stopColor="#0d9488" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
});

export default SkyjoCard;

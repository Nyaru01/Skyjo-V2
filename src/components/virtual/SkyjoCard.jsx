import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { CARD_COLORS } from '../../lib/skyjoEngine';
import { useGameStore } from '../../store/gameStore';

// Simple haptic feedback for card touches
const triggerHaptic = () => {
    if (navigator.vibrate) {
        navigator.vibrate(50); // Perceptible tap on Android
    }
};

/**
 * Skyjo Card Component - Skeuomorphic Design
 * Reproduces the physical Skyjo card appearance with mosaic texture
 */

// Mosaic color schemes for each card color
const MOSAIC_COLORS = {
    indigo: {
        primary: '#4338ca',
        secondary: '#6366f1',
        tertiary: '#818cf8',
        light: '#a5b4fc',
        lines: 'rgba(255,255,255,0.3)',
    },
    blue: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        tertiary: '#60a5fa',
        light: '#93c5fd',
        lines: 'rgba(255,255,255,0.3)',
    },
    cyan: {
        primary: '#0891b2',
        secondary: '#06b6d4',
        tertiary: '#22d3ee',
        light: '#67e8f9',
        lines: 'rgba(255,255,255,0.3)',
    },
    green: {
        primary: '#059669',
        secondary: '#10b981',
        tertiary: '#34d399',
        light: '#6ee7b7',
        lines: 'rgba(255,255,255,0.25)',
    },
    yellow: {
        primary: '#ca8a04',
        secondary: '#eab308',
        tertiary: '#facc15',
        light: '#fde047',
        lines: 'rgba(255,255,255,0.2)',
    },
    orange: {
        primary: '#ea580c',
        secondary: '#f97316',
        tertiary: '#fb923c',
        light: '#fdba74',
        lines: 'rgba(255,255,255,0.25)',
    },
    red: {
        primary: '#dc2626',
        secondary: '#ef4444',
        tertiary: '#f87171',
        light: '#fca5a5',
        lines: 'rgba(255,255,255,0.25)',
    },
};

// Generate mosaic SVG pattern
const MosaicPattern = ({ colors, id }) => (
    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
            <pattern id={`mosaic-${id}`} patternUnits="userSpaceOnUse" width="30" height="30">
                {/* Gradient background */}
                <rect width="30" height="30" fill={colors.secondary} />

                {/* Irregular polygon cells to create mosaic/stained glass effect */}
                <polygon points="0,0 15,5 10,15 0,12" fill={colors.primary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="15,5 30,0 30,10 20,15 10,15" fill={colors.tertiary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="0,12 10,15 5,30 0,30" fill={colors.tertiary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="10,15 20,15 15,30 5,30" fill={colors.light} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="20,15 30,10 30,25 25,30 15,30" fill={colors.secondary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="30,25 30,30 25,30" fill={colors.primary} stroke={colors.lines} strokeWidth="0.5" />
            </pattern>

            {/* Gradient overlay for depth */}
            <linearGradient id={`depth-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.1)" />
            </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill={`url(#mosaic-${id})`} />
        <rect width="100%" height="100%" fill={`url(#depth-${id})`} />
    </svg>
);

const SkyjoCard = memo(function SkyjoCard({
    card,
    size = 'md',
    isSelected = false,
    isClickable = false,
    isHighlighted = false,
    isShaking = false,
    onClick,
    className,
}) {
    // Shake animation variants
    const shakeVariants = {
        shake: {
            x: [0, -5, 5, -5, 5, 0],
            transition: { duration: 0.4 }
        }
    };
    // Dynamic sizing - 2:3 ratio
    const sizeStyles = {
        xs: {
            width: 'clamp(2.25rem, 7vw, 3.25rem)',
            height: 'clamp(2.25rem, 7.5vh, 3.375rem)',
            fontSize: 'clamp(0.85rem, 2.6vw, 1.3rem)',
            cornerSize: '0.4rem',
            cornerFont: '0.35rem',
        },
        sm: {
            width: 'clamp(2.5rem, 7vw, 3.5rem)',
            height: 'clamp(3.2rem, 9vh, 4.2rem)',
            fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
            cornerSize: '0.6rem',
            cornerFont: '0.45rem',
        },
        md: {
            width: 'clamp(2.7rem, 7.5vw, 3.8rem)',
            height: 'clamp(3.6rem, 10vh, 4.8rem)',
            fontSize: 'clamp(1.2rem, 3.2vw, 1.8rem)',
            cornerSize: '0.7rem',
            cornerFont: '0.45rem',
        },
        lg: {
            width: 'clamp(3.5rem, 9vw, 4.5rem)',
            height: 'clamp(5.25rem, 13.5vh, 6.75rem)',
            fontSize: 'clamp(1.6rem, 4.5vw, 2.4rem)',
            cornerSize: '0.9rem',
            cornerFont: '0.6rem',
        },
    };

    const currentSize = sizeStyles[size] || sizeStyles.md;

    // Robust retrieval with fallback
    const cardSkin = useGameStore(s => (s && s.cardSkin) ? s.cardSkin : 'classic');

    if (card === null) {
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

    const mosaicColors = MOSAIC_COLORS[card.color] || MOSAIC_COLORS.green;
    const isRevealed = card.isRevealed;
    const patternId = `${card.id}-${card.color}`;
    const displayValue = card.value < 0 ? card.value : card.value;

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
            }}
            onClick={isClickable ? () => { triggerHaptic(); onClick?.(); } : undefined}
            whileHover={isClickable ? { scale: 1.08, y: -4 } : undefined}
            whileTap={isClickable ? { scale: 0.95 } : undefined}
            animate={isShaking ? "shake" : undefined}
            variants={shakeVariants}
        >
            {/* Extended touch area */}
            {isClickable && (
                <div
                    className="absolute pointer-events-auto"
                    style={{ top: '-8px', left: '-8px', right: '-8px', bottom: '-8px', zIndex: 10 }}
                    onClick={() => { triggerHaptic(); onClick?.(); }}
                />
            )}

            <motion.div
                className="relative w-full h-full preserve-3d"
                animate={{ rotateY: isRevealed ? 0 : 180 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                initial={false}
            >
                {/* FRONT FACE - Skeuomorphic card design */}
                <div
                    className={cn(
                        "absolute inset-0 backface-hidden overflow-hidden",
                        isSelected && "ring-4 ring-amber-400 ring-offset-2",
                    )}
                    style={{
                        borderRadius: '10px',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                        border: '3px solid white',
                        background: mosaicColors.secondary,
                    }}
                >
                    {/* Mosaic texture pattern */}
                    <MosaicPattern colors={mosaicColors} id={patternId} />

                    {/* Top-left corner number */}
                    <div
                        className="absolute flex items-center justify-center"
                        style={{
                            top: '4px',
                            left: '4px',
                            width: currentSize.cornerSize,
                            height: currentSize.cornerSize,
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: '50%',
                            fontSize: currentSize.cornerFont,
                            fontWeight: 'bold',
                            color: mosaicColors.primary,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                    >
                        {displayValue}
                    </div>

                    {/* Bottom-right corner number (rotated) */}
                    <div
                        className="absolute flex items-center justify-center"
                        style={{
                            bottom: '4px',
                            right: '4px',
                            width: currentSize.cornerSize,
                            height: currentSize.cornerSize,
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: '50%',
                            fontSize: currentSize.cornerFont,
                            fontWeight: 'bold',
                            color: mosaicColors.primary,
                            transform: 'rotate(180deg)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                    >
                        {displayValue}
                    </div>

                    {/* Center number with strong relief effect */}
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ fontSize: currentSize.fontSize }}
                    >
                        <span
                            style={{
                                fontWeight: 900,
                                color: '#ffffff',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.4)',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {displayValue}
                        </span>
                    </div>

                    {/* Glossy overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 30%, transparent 50%)',
                        }}
                    />
                </div>

                {/* BACK FACE */}
                <div
                    className={cn(
                        "absolute inset-0 backface-hidden flex items-center justify-center rotate-y-180 overflow-hidden",
                        isSelected && "ring-4 ring-amber-400 ring-offset-2",
                    )}
                    style={{
                        borderRadius: '10px',
                        boxShadow: isHighlighted
                            ? '0 0 20px rgba(52, 211, 153, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)'
                            : '0 4px 16px rgba(0, 0, 0, 0.4)',
                        border: isHighlighted
                            ? '3px solid rgba(52, 211, 153, 0.8)'
                            : '3px solid rgba(100, 116, 139, 0.5)',
                        backgroundColor: '#1e293b', // Fallback
                    }}
                >
                    <img
                        src={
                            cardSkin === 'papyrus' ? "/card-back-papyrus.jpg" :
                                cardSkin === 'neon' ? "/card-back-neon.png" :
                                    cardSkin === 'gold' ? "/card-back-gold.png" :
                                        cardSkin === 'galaxy' ? "/card-back-galaxy.png" :
                                            "/card-back.png?v=2"
                        }
                        alt="Card Back"
                        className="w-full h-full object-cover"
                    />
                </div>
            </motion.div>
        </motion.div>
    );
});

export default SkyjoCard;

import { memo, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import SkyjoCard from './SkyjoCard';
import { useGameStore } from '../../store/gameStore';
import DiscardHistoryOverlay from './DiscardHistoryOverlay';

// Simple haptic feedback for pile touches
const triggerHaptic = (duration = 50) => {
    if (navigator.vibrate) {
        navigator.vibrate(duration);
    }
};

// Mosaic color schemes for each card color (same as SkyjoCard)
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

// Mini mosaic pattern for discard preview
const MiniMosaicPattern = ({ colors, id }) => (
    <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, borderRadius: '6px' }}>
        <defs>
            <pattern id={`mini-mosaic-${id}`} patternUnits="userSpaceOnUse" width="20" height="20">
                <rect width="20" height="20" fill={colors.secondary} />
                <polygon points="0,0 10,3 7,10 0,8" fill={colors.primary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="10,3 20,0 20,7 13,10 7,10" fill={colors.tertiary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="0,8 7,10 4,20 0,20" fill={colors.tertiary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="7,10 13,10 10,20 4,20" fill={colors.light} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="13,10 20,7 20,17 17,20 10,20" fill={colors.secondary} stroke={colors.lines} strokeWidth="0.5" />
                <polygon points="20,17 20,20 17,20" fill={colors.primary} stroke={colors.lines} strokeWidth="0.5" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#mini-mosaic-${id})`} />
    </svg>
);

/**
 * Compact trigger button for Draw/Discard popup
 * Placed between BOT and VOUS grids
 */
const DrawDiscardTrigger = memo(function DrawDiscardTrigger({
    onClick,
    onDrawAction,
    onDiscardAction,
    discardTop,
    discardPile = [], // Full discard pile for history
    drawnCard,
    drawPileCount,
    discardPileCount = 0,
    canInteract = false,
    turnPhase,
    instructionText = '', // Instruction text to display
    activeActionSource, // 'deck-pile' or 'discard-pile' when an animation is starting from here
}) {
    const cardSkin = useGameStore(s => (s && s.cardSkin) ? s.cardSkin : 'classic');
    const hasDrawnCard = !!drawnCard;
    const showDiscardPreview = discardTop && !hasDrawnCard;

    // Long-press state for discard history
    const [showHistory, setShowHistory] = useState(false);
    const longPressTimer = useRef(null);
    const LONG_PRESS_DURATION = 400; // ms

    // Long-press handlers
    const handleDiscardPointerDown = useCallback(() => {
        longPressTimer.current = setTimeout(() => {
            triggerHaptic(30); // Short haptic on trigger
            setShowHistory(true);
        }, LONG_PRESS_DURATION);
    }, []);

    const handleDiscardPointerUp = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setShowHistory(false);
    }, []);

    const handleDiscardPointerLeave = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        // Don't hide if already showing (user might have moved finger slightly)
    }, []);

    // Determine button state
    const isDrawPhase = turnPhase === 'DRAW';
    const isReplacePhase = turnPhase === 'REPLACE_OR_DISCARD' || turnPhase === 'MUST_REPLACE';

    // Mini card preview for discard - use mosaic colors
    const mosaicColors = discardTop ? (MOSAIC_COLORS[discardTop.color] || MOSAIC_COLORS.green) : null;
    const patternId = discardTop ? `discard-${discardTop.color}` : 'discard-default';

    return (
        <>
            <div className="relative flex items-center justify-center gap-4 w-full">
                {/* Draw pile card preview - Face-down card on the LEFT - CLICKABLE */}
                <motion.div
                    className={cn(
                        "w-10 h-14 rounded-lg flex items-center justify-center shrink-0 relative",
                        canInteract ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                    )}
                    style={{
                        backgroundColor: '#1e293b', // Fallback
                        boxShadow: activeActionSource === 'deck-pile'
                            ? '0 0 20px 5px rgba(52, 211, 153, 0.7)' // Intense Green Glow if active
                            : canInteract ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
                        border: activeActionSource === 'deck-pile'
                            ? '2px solid #34d399' // Green border
                            : '2px solid rgba(100, 116, 139, 0.4)',
                        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                        overflow: 'hidden'
                    }}
                    onClick={canInteract ? () => { triggerHaptic(); (onDrawAction || onClick)?.(); } : undefined}
                    whileHover={canInteract ? { scale: 1.1, rotate: -5 } : undefined}
                    whileTap={canInteract ? { scale: 0.95 } : undefined}
                    animate={
                        activeActionSource === 'deck-pile'
                            ? { scale: [1, 1.1, 1] }
                            : canInteract
                                ? { scale: [1, 1.03, 1] }
                                : {}
                    }
                    transition={{ duration: canInteract ? 1.5 : 0.8, repeat: Infinity }}
                    id="deck-pile"
                >
                    {/* Card back design */}
                    <img
                        src={cardSkin === 'papyrus' ? "/card-back-papyrus.jpg" : "/card-back.png"}
                        alt="Deck"
                        className="w-full h-full object-cover"
                    />

                    {/* Count Badge for Draw Pile (Optional - usually on button but good to have here too maybe? No, kept on button) */}
                </motion.div>

                {hasDrawnCard ? (
                    // Show the actual drawn card in the center
                    <motion.div
                        className={cn(
                            "relative z-10",
                            canInteract ? "cursor-pointer" : "cursor-default"
                        )}
                        onClick={onClick}
                        whileHover={canInteract ? { scale: 1.05 } : undefined}
                        whileTap={canInteract ? { scale: 0.95 } : undefined}
                        id="drawn-card-slot"
                    >
                        <SkyjoCard
                            card={{ ...drawnCard, isRevealed: true }}
                            size="md"
                            isHighlighted={canInteract}
                        // Add a label below or above?
                        />
                        {/* Helper text below */}
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center gap-1">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-lg backdrop-blur-sm",
                                turnPhase === 'MUST_REPLACE'
                                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                                    : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                            )}>
                                {turnPhase === 'MUST_REPLACE' ? 'DÉFAUSSE' : 'PIOCHE'}
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.button
                        onClick={onClick}
                        disabled={!canInteract}
                        className={cn(
                            "flex items-center justify-center gap-4 w-full px-4 py-2 rounded-2xl transition-all relative z-10",
                            canInteract
                                ? "cursor-pointer bg-slate-700 hover:bg-slate-600 border border-emerald-500/50"
                                : "cursor-not-allowed bg-slate-700/60 opacity-60 border border-slate-600/30"
                        )}
                        style={{
                            boxShadow: canInteract
                                ? '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 15px rgba(52, 211, 153, 0.2)'
                                : '0 4px 15px rgba(0, 0, 0, 0.3)',
                            maxWidth: '280px' // Limit button width so cards stay effective
                        }}
                        whileHover={canInteract ? { scale: 1.02, y: -2 } : undefined}
                        whileTap={canInteract ? { scale: 0.98 } : undefined}
                    >
                        {/* Label */}
                        <span className="text-sm font-bold text-white uppercase tracking-wide whitespace-nowrap">
                            Piocher
                        </span>

                        {/* Draw pile count */}
                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                            ({drawPileCount})
                        </span>
                    </motion.button>
                )}

                {/* Discard card preview - positioned to the right - CLICKABLE */}
                {/* Always render a placeholder to keep alignment symmetric if user wants "aligned all time" */}
                <div className="w-10 h-14 flex items-center justify-center shrink-0 relative">
                    {showDiscardPreview ? (
                        <motion.div
                            className={cn(
                                "w-full h-full rounded-lg flex items-center justify-center relative overflow-hidden",
                                canInteract ? "cursor-pointer" : "cursor-default"
                            )}
                            style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                boxShadow: activeActionSource === 'discard-pile'
                                    ? '0 0 20px 5px rgba(245, 158, 11, 0.7)' // Amber Glow
                                    : '0 4px 12px rgba(0,0,0,0.5)',
                                border: activeActionSource === 'discard-pile'
                                    ? '2px solid #f59e0b' // Amber border
                                    : '2px solid rgba(255,255,255,0.5)',
                                background: mosaicColors.secondary,
                                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                                // Prevent text selection on long-press (mobile)
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                WebkitTouchCallout: 'none',
                                touchAction: 'manipulation',
                            }}
                            onClick={canInteract ? () => { triggerHaptic(); (onDiscardAction || onClick)?.(); } : undefined}
                            onPointerDown={handleDiscardPointerDown}
                            onPointerUp={handleDiscardPointerUp}
                            onPointerLeave={handleDiscardPointerLeave}
                            onPointerCancel={handleDiscardPointerUp}
                            whileHover={canInteract ? { scale: 1.1, rotate: 5 } : undefined}
                            whileTap={canInteract ? { scale: 0.95 } : undefined}
                            animate={activeActionSource === 'discard-pile' ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            id="discard-pile"
                        >
                            {/* Mosaic texture pattern */}
                            <MiniMosaicPattern colors={mosaicColors} id={patternId} />

                            {/* Card value - white text */}
                            <span
                                className="relative z-10"
                                style={{
                                    color: '#ffffff',
                                    textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
                                }}
                            >
                                {discardTop.value}
                            </span>

                            {/* Discard Pile Count Badge */}
                            <div className="absolute -bottom-2 -right-2 bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full border border-slate-600 shadow-md z-20">
                                {discardPileCount}
                            </div>
                        </motion.div>
                    ) : (
                        /* Empty placeholder when no discard visible to maintain symmetry if desired */
                        <div className="w-full h-full rounded-lg border-2 border-dashed border-slate-700/50 flex items-center justify-center">
                            <span className="text-[9px] text-slate-600">{discardPileCount}</span>
                        </div>
                    )}
                </div>

                {/* Instruction Banner - Integrated at bottom */}
                {instructionText && (
                    <div className="absolute -bottom-10 left-0 right-0 flex justify-center pointer-events-none z-20">
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={instructionText}
                            className="bg-indigo-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md shadow-xl tracking-wide whitespace-nowrap flex items-center gap-2"
                        >
                            {instructionText}
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Discard History Overlay */}
            <DiscardHistoryOverlay
                cards={discardPile}
                isVisible={showHistory}
                onClose={handleDiscardPointerUp}
            />
        </>
    );
});

export default DrawDiscardTrigger;


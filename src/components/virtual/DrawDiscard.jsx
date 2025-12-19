import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SkyjoCard from './SkyjoCard';
import { cn } from '../../lib/utils';

/**
 * Draw and Discard Piles Component
 * Central area with draw pile and discard pile
 */
const DrawDiscard = memo(function DrawDiscard({
    drawPileCount,
    discardTop,
    drawnCard,
    canDraw = false,
    canTakeDiscard = false,
    canDiscardDrawn = false, // Can click discard pile to discard drawn card
    onDrawClick,
    onDiscardClick,
    onDiscardDrawnCard, // Handler for discarding the drawn card
    lastDiscardedCard = null, // New: card that was just discarded (for animation)
}) {
    // Track animation state for new discard
    const [showNewDiscardGlow, setShowNewDiscardGlow] = useState(false);
    const [discardKey, setDiscardKey] = useState(0);

    // Trigger animation when lastDiscardedCard changes
    useEffect(() => {
        if (lastDiscardedCard) {
            setShowNewDiscardGlow(true);
            setDiscardKey(prev => prev + 1);
            const timer = setTimeout(() => {
                setShowNewDiscardGlow(false);
            }, 1500); // Glow lasts 1.5 seconds
            return () => clearTimeout(timer);
        }
    }, [lastDiscardedCard]);

    return (
        <div className="flex items-center justify-center gap-8 py-4">
            {/* Draw Pile */}
            <div className="flex flex-col items-center gap-2">
                <motion.button
                    onClick={onDrawClick}
                    disabled={!canDraw}
                    className={cn(
                        "relative",
                        canDraw && "cursor-pointer",
                        !canDraw && "cursor-not-allowed opacity-60"
                    )}
                    whileHover={canDraw ? { scale: 1.05 } : undefined}
                    whileTap={canDraw ? { scale: 0.95 } : undefined}
                >
                    {/* Stacked cards effect */}
                    <div className="absolute top-1 left-1 w-14 h-20 rounded-xl bg-slate-700 opacity-40" />
                    <div className="absolute top-0.5 left-0.5 w-14 h-20 rounded-xl bg-slate-600 opacity-60" />

                    {/* Top card (back) */}
                    <div
                        className={cn(
                            "relative w-14 h-20 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-xl",
                            canDraw && "ring-2 ring-emerald-400 animate-pulse"
                        )}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">S</span>
                        </div>
                    </div>
                </motion.button>

                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Pioche ({drawPileCount})
                </span>
            </div>

            {/* Drawn Card (when holding) */}
            <AnimatePresence>
                {drawnCard && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1.1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-2"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400/30 rounded-xl blur-md" />
                            <SkyjoCard
                                card={drawnCard}
                                size="md"
                                isHighlighted
                            />
                        </div>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-bounce">
                            Carte piochée
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Discard Pile */}
            <div className="flex flex-col items-center gap-2">
                <motion.button
                    onClick={canDiscardDrawn ? onDiscardDrawnCard : onDiscardClick}
                    disabled={!canTakeDiscard && !canDiscardDrawn}
                    className={cn(
                        "relative",
                        (canTakeDiscard || canDiscardDrawn) && "cursor-pointer",
                        (!canTakeDiscard && !canDiscardDrawn) && "cursor-not-allowed"
                    )}
                    whileHover={(canTakeDiscard || canDiscardDrawn) ? { scale: 1.05 } : undefined}
                    whileTap={(canTakeDiscard || canDiscardDrawn) ? { scale: 0.95 } : undefined}
                >
                    {discardTop ? (
                        <div className="relative">
                            {/* Glow effect for newly discarded card */}
                            <AnimatePresence>
                                {showNewDiscardGlow && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1.2 }}
                                        exit={{ opacity: 0, scale: 1.4 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 rounded-xl blur-lg -z-10"
                                    />
                                )}
                            </AnimatePresence>

                            <motion.div
                                key={discardKey}
                                initial={discardKey > 0 ? { scale: 1.3, opacity: 0 } : false}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                className={cn(
                                    "rounded-xl",
                                    canTakeDiscard && "ring-2 ring-blue-400 animate-pulse",
                                    canDiscardDrawn && "ring-2 ring-orange-400 animate-pulse"
                                )}
                            >
                                <SkyjoCard card={discardTop} size="md" />
                            </motion.div>
                        </div>
                    ) : (
                        <div className={cn(
                            "w-14 h-20 rounded-xl border-2 border-dashed flex items-center justify-center",
                            canDiscardDrawn ? "border-orange-400 bg-orange-50/50 dark:bg-orange-900/20" : "border-slate-400/50"
                        )}>
                            <span className={cn(
                                "text-xs",
                                canDiscardDrawn ? "text-orange-500 font-medium" : "text-slate-400"
                            )}>
                                {canDiscardDrawn ? "Défausser" : "Vide"}
                            </span>
                        </div>
                    )}
                </motion.button>

                <span className={cn(
                    "text-xs font-medium",
                    canDiscardDrawn ? "text-orange-500" : "text-slate-600 dark:text-slate-400"
                )}>
                    {canDiscardDrawn ? "👆 Cliquez pour défausser" : "Défausse"}
                </span>
            </div>
        </div>
    );
});

export default DrawDiscard;


import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SkyjoCard from './SkyjoCard';
import { cn } from '../../lib/utils';

// Simple haptic feedback function
const triggerHaptic = (pattern = 30) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

/**
 * Draw/Discard Popup Modal
 * Full-screen modal with blur backdrop for draw/discard actions
 */
const DrawDiscardPopup = memo(function DrawDiscardPopup({
    isOpen,
    onClose,
    drawPileCount,
    discardPileCount,
    discardTop,
    discardPile = [], // Full discard pile for history
    drawnCard,
    canDraw = false,
    canTakeDiscard = false,
    canDiscardDrawn = false,
    onDrawClick,
    onDiscardClick,
    onDiscardDrawnCard,
    onConfirmPlacement,
}) {
    // Draw a card but DON'T close popup - let user decide to discard or place on grid
    const handleDrawClick = () => {
        triggerHaptic(40);
        onDrawClick?.();
        // Popup stays open to show drawn card and allow discard option
    };

    const handleDiscardClick = () => {
        triggerHaptic(40);
        onDiscardClick?.();
        // Popup stays open to show drawn card
    };

    const handleConfirmPlacement = () => {
        triggerHaptic([30, 50, 30]); // Double tap feedback for confirmation
        // Explicitly confirm placement - calls parent handler to close WITHOUT undoing
        onConfirmPlacement?.();
    };

    const handleDiscardDrawnCard = () => {
        triggerHaptic(50);
        onDiscardDrawnCard?.();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={onClose}
                >
                    {/* Blur backdrop - lighter for better visibility of background cards */}
                    <div
                        className="absolute inset-0 bg-black/20"
                        style={{
                            backdropFilter: 'blur(3px)',
                            WebkitBackdropFilter: 'blur(3px)',
                        }}
                    />

                    {/* Modal content - vertically centered */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative z-10 p-6 rounded-3xl max-w-sm w-full mx-4 flex flex-col items-center justify-center"
                        style={{
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                            minHeight: drawnCard ? '260px' : '300px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* DRAWN CARD VIEW - Clean, centered layout */}
                        {drawnCard ? (
                            <div className="flex flex-col items-center justify-center">
                                {/* Header */}
                                <h3 className="text-lg font-bold text-white mb-4">🃏 Carte en main</h3>

                                {/* Drawn card + Discard history side by side */}
                                <div className="flex items-center gap-6 mb-4">
                                    {/* Main drawn card */}
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-amber-400/30 rounded-xl blur-md" />
                                        <SkyjoCard card={drawnCard} size="lg" isHighlighted />
                                    </div>


                                </div>

                                {/* Two clear action buttons */}
                                <div className="flex gap-4 mt-2">
                                    <motion.button
                                        onClick={handleConfirmPlacement}
                                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-full transition-colors shadow-lg"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        ✓ Placer sur grille
                                    </motion.button>

                                    {/* Only allow discarding if permitted (e.g. drawn from pile, not taken from discard) */}
                                    {canDiscardDrawn && (
                                        <motion.button
                                            onClick={handleDiscardDrawnCard}
                                            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-full transition-colors shadow-lg"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            ✗ Défausser
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* DRAW OPTIONS VIEW - Pioche and Défausse side by side */
                            <>
                                {/* Header */}
                                <h3 className="text-lg font-bold text-white mb-6">📥 Choisissez une carte</h3>

                                <div className="flex items-start justify-center gap-8">
                                    {/* Draw pile */}
                                    <div className="flex flex-col items-center gap-3">
                                        <motion.button
                                            onClick={handleDrawClick}
                                            disabled={!canDraw}
                                            className={cn(
                                                "relative rounded-xl transition-all",
                                                canDraw ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                                            )}
                                            whileHover={canDraw ? { scale: 1.08, y: -4 } : undefined}
                                            whileTap={canDraw ? { scale: 0.95 } : undefined}
                                        >
                                            {/* 3D Stack effect */}
                                            <div className="relative">
                                                <div
                                                    className="absolute rounded-xl bg-slate-700"
                                                    style={{ width: '70px', height: '98px', top: '5px', left: '5px' }}
                                                />
                                                <div
                                                    className="absolute rounded-xl bg-slate-600"
                                                    style={{ width: '70px', height: '98px', top: '2.5px', left: '2.5px' }}
                                                />
                                                <div
                                                    className="relative flex items-center justify-center rounded-xl"
                                                    style={{
                                                        width: '70px',
                                                        height: '98px',
                                                        background: 'linear-gradient(135deg, #374151 0%, #1e293b 50%, #0f172a 100%)',
                                                        border: canDraw ? '2px solid rgba(52, 211, 153, 0.7)' : '1px solid rgba(100, 116, 139, 0.3)',
                                                        boxShadow: canDraw ? '0 0 25px rgba(52, 211, 153, 0.5)' : 'none',
                                                    }}
                                                >
                                                    <svg className="w-10 h-10 text-emerald-400" viewBox="0 0 24 24" fill="none">
                                                        <rect x="4" y="2" width="10" height="14" rx="2" fill="#475569" stroke="#64748b" strokeWidth="0.5" />
                                                        <rect x="7" y="5" width="10" height="14" rx="2" fill="#334155" stroke="#475569" strokeWidth="0.5" />
                                                        <rect x="10" y="8" width="10" height="14" rx="2" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </motion.button>
                                        <span className="text-sm font-bold text-slate-300">
                                            Pioche <span className="text-emerald-400">({drawPileCount})</span>
                                        </span>
                                        {canDraw && (
                                            <motion.button
                                                onClick={handleDrawClick}
                                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-full transition-colors shadow-lg"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Piocher
                                            </motion.button>
                                        )}
                                    </div>

                                    {/* Discard pile */}
                                    <div className="flex flex-col items-center gap-3">
                                        <motion.button
                                            onClick={handleDiscardClick}
                                            disabled={!canTakeDiscard}
                                            className={cn(
                                                "relative rounded-xl transition-all",
                                                canTakeDiscard ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                                            )}
                                            whileHover={canTakeDiscard ? { scale: 1.08, y: -4 } : undefined}
                                            whileTap={canTakeDiscard ? { scale: 0.95 } : undefined}
                                        >
                                            {discardTop ? (
                                                <div className={cn(
                                                    "rounded-xl",
                                                    canTakeDiscard && "ring-2 ring-blue-400 shadow-xl"
                                                )}>
                                                    <SkyjoCard card={discardTop} size="lg" />
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex flex-col items-center justify-center rounded-xl"
                                                    style={{
                                                        width: '70px',
                                                        height: '98px',
                                                        background: 'rgba(71, 85, 105, 0.2)',
                                                        border: '2px dashed rgba(100, 116, 139, 0.4)',
                                                    }}
                                                >
                                                    <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                    <span className="text-[9px] text-slate-500 mt-1">Vide</span>
                                                </div>
                                            )}
                                        </motion.button>
                                        <span className="text-sm font-bold text-slate-300">
                                            Défausse <span className="text-blue-400">({discardPileCount})</span>
                                        </span>
                                        {canTakeDiscard && (
                                            <motion.button
                                                onClick={handleDiscardClick}
                                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full transition-colors shadow-lg"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Récupérer
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Close button - always visible */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default DrawDiscardPopup;

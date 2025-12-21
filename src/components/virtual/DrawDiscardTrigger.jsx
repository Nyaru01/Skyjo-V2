import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

// Card color mapping for mini preview
const MINI_CARD_COLORS = {
    red: { bg: 'bg-red-500', text: 'text-white' },
    orange: { bg: 'bg-orange-500', text: 'text-white' },
    yellow: { bg: 'bg-yellow-400', text: 'text-slate-800' },
    green: { bg: 'bg-emerald-500', text: 'text-white' },
    blue: { bg: 'bg-blue-500', text: 'text-white' },
};

/**
 * Compact trigger button for Draw/Discard popup
 * Placed between BOT and VOUS grids
 */
const DrawDiscardTrigger = memo(function DrawDiscardTrigger({
    onClick,
    onDrawAction,
    onDiscardAction,
    discardTop,
    drawnCard,
    drawPileCount,
    discardPileCount = 0,
    canInteract = false,
    turnPhase,
}) {
    const hasDrawnCard = !!drawnCard;
    const showDiscardPreview = discardTop && !hasDrawnCard;

    // Determine button state
    const isDrawPhase = turnPhase === 'DRAW';
    const isReplacePhase = turnPhase === 'REPLACE_OR_DISCARD' || turnPhase === 'MUST_REPLACE';

    // Mini card preview for discard
    const miniCardColors = discardTop ? (MINI_CARD_COLORS[discardTop.color] || MINI_CARD_COLORS.green) : null;

    return (
        <div className="relative flex items-center justify-center gap-4 w-full">
            {/* Draw pile card preview - Face-down card on the LEFT - CLICKABLE */}
            <motion.div
                className={cn(
                    "w-10 h-14 rounded-lg flex items-center justify-center shrink-0 relative",
                    canInteract ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                )}
                style={{
                    background: 'linear-gradient(135deg, #374151 0%, #1e293b 50%, #0f172a 100%)',
                    boxShadow: canInteract ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
                    border: '2px solid rgba(100, 116, 139, 0.4)',
                }}
                onClick={canInteract ? (onDrawAction || onClick) : undefined}
                whileHover={canInteract ? { scale: 1.1, rotate: -5 } : undefined}
                whileTap={canInteract ? { scale: 0.95 } : undefined}
            >
                {/* Card back design */}
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" transform="rotate(45 12 12)" opacity="0.3" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5" />
                </svg>

                {/* Count Badge for Draw Pile (Optional - usually on button but good to have here too maybe? No, kept on button) */}
            </motion.div>

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
                    {hasDrawnCard ? 'Jouer' : 'Piocher'}
                </span>

                {/* Draw pile count */}
                <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                    ({drawPileCount})
                </span>

                {/* Drawn card indicator */}
                {hasDrawnCard && (
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse ml-2" />
                )}
            </motion.button>

            {/* Discard card preview - positioned to the right - CLICKABLE */}
            {/* Always render a placeholder to keep alignment symmetric if user wants "aligned all time" */}
            <div className="w-10 h-14 flex items-center justify-center shrink-0 relative">
                {showDiscardPreview ? (
                    <motion.div
                        className={cn(
                            "w-full h-full rounded-lg flex items-center justify-center relative",
                            miniCardColors.bg,
                            canInteract ? "cursor-pointer" : "cursor-not-allowed opacity-80"
                        )}
                        style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            border: '2px solid rgba(255,255,255,0.3)',
                        }}
                        onClick={canInteract ? (onDiscardAction || onClick) : undefined}
                        whileHover={canInteract ? { scale: 1.1, rotate: 5 } : undefined}
                        whileTap={canInteract ? { scale: 0.95 } : undefined}
                    >
                        <span className={miniCardColors.text}>
                            {discardTop.value}
                        </span>

                        {/* Discard Pile Count Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded-full border border-slate-600 shadow-md">
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
        </div>
    );
});

export default DrawDiscardTrigger;

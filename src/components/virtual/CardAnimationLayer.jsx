import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualGameStore } from '../../store/virtualGameStore';
import SkyjoCard from './SkyjoCard';

/**
 * CardAnimationLayer
 * Handles "flying card" animations by overlaying a motion component
 * that moves from a source element to a target element.
 */
/**
 * CardAnimationLayer
 * Handles "flying card" animations by overlaying a motion component
 * that moves from a source element to a target element.
 * 
 * @param {Object} props
 * @param {Object} props.pendingAnimation - Animation object { sourceId, targetId, card, onComplete }
 * @param {Function} props.onClear - Callback to clear animation
 */
export default function CardAnimationLayer({ pendingAnimation, onClear }) {

    const [animationState, setAnimationState] = useState(null); // { startRect, endRect, card }

    useEffect(() => {
        if (pendingAnimation) {
            const { sourceId, targetId, card, onComplete } = pendingAnimation;

            // Find elements
            const sourceEl = document.getElementById(sourceId);
            const targetEl = document.getElementById(targetId);

            if (sourceEl && targetEl) {
                const startRect = sourceEl.getBoundingClientRect();
                const endRect = targetEl.getBoundingClientRect();

                setAnimationState({
                    startRect,
                    endRect,
                    card,
                    onComplete
                });
            } else {
                // Fallback if elements not found: just complete immediately
                // This is expected when popup is not open or card slot not rendered
                onComplete?.();
                onClear();
            }
        }
    }, [pendingAnimation, onClear]);

    const handleAnimationComplete = () => {
        if (animationState?.onComplete) {
            animationState.onComplete();
        }
        setAnimationState(null);
        onClear();
    };

    if (!animationState) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100]">
            <motion.div
                initial={{
                    position: 'absolute',
                    top: animationState.startRect.top,
                    left: animationState.startRect.left,
                    width: animationState.startRect.width,
                    height: animationState.startRect.height,
                    opacity: 1,
                    scale: 1,
                }}
                animate={{
                    top: animationState.endRect.top,
                    left: animationState.endRect.left,
                    width: animationState.endRect.width,
                    height: animationState.endRect.height,
                    scale: 1,
                    transition: {
                        duration: 0.8,
                        ease: "easeInOut"
                    }
                }}
                onAnimationComplete={handleAnimationComplete}
            >
                <SkyjoCard
                    card={animationState.card}
                    isRevealed={animationState.card?.isRevealed}
                    size="md" // We might need to adjust size based on rect, but purely CSS might struggle with 'md' class fixed size
                // Actually, SkyjoCard might have fixed sizes. 
                // Let's force it to fill the container if possible or just be the visual representation
                />
                {/* Override SkyjoCard sizing to match container if needed, or rely on scale */}
            </motion.div>
        </div>
    );
}

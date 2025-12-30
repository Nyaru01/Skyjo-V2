import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useGameStore } from '../store/gameStore';

export default function SkinCarousel({ skins, selectedSkinId, onSelect, playerLevel }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);

    // Find index of selected skin on mount or prop change
    useEffect(() => {
        const index = skins.findIndex(s => s.id === selectedSkinId);
        if (index !== -1) setActiveIndex(index);
    }, [selectedSkinId, skins]);

    const handleNext = () => {
        setActiveIndex(prev => (prev + 1) % skins.length);
    };

    const handlePrev = () => {
        setActiveIndex(prev => (prev - 1 + skins.length) % skins.length);
    };

    const handleItemClick = (index, skin) => {
        if (index === activeIndex) {
            // If clicking active item, select it if unlocked
            if (playerLevel >= skin.level) {
                onSelect(skin.id);
            }
        } else {
            // Otherwise rotate to it
            setActiveIndex(index);
        }
    };

    return (
        <div className="relative w-full h-[260px] flex items-center justify-center perspective-1000 overflow-hidden py-4">
            {/* Background Light Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />

            {/* Prev Button */}
            <button
                className="absolute left-2 z-50 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-white backdrop-blur-sm transition-colors"
                onClick={handlePrev}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Carousel Items */}
            <div className="relative flex items-center justify-center w-full h-full">
                <AnimatePresence initial={false} mode="popLayout">
                    {skins.map((skin, i) => {
                        // Calculate relative position based on active index
                        // We handle wrapping manually for visuals only if needed, 
                        // but a simple list is easier for now. 
                        // Let's implement a centered list window.

                        let offset = i - activeIndex;
                        // Handle circular wrap logic visually if we want endless loop?
                        // Simple linear for defined set of 5 skins is clearer.

                        // Limit visible items to -2, -1, 0, 1, 2
                        if (Math.abs(offset) > 2) return null;

                        const isActive = offset === 0;
                        const isLocked = playerLevel < skin.level;
                        const isSelected = selectedSkinId === skin.id;

                        return (
                            <motion.div
                                key={skin.id}
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                    x: offset * 85 + '%', // Spacing
                                    scale: isActive ? 1 : 0.8,
                                    opacity: isActive ? 1 : 0.5,
                                    zIndex: isActive ? 10 : 10 - Math.abs(offset),
                                    rotateY: offset * -25, // 3D rotation effect
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30
                                }}
                                className="absolute cursor-pointer rounded-xl transition-shadow duration-300"
                                onClick={() => handleItemClick(i, skin)}
                                style={{
                                    width: '120px',
                                    height: '180px',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <div className={cn(
                                    "w-full h-full relative rounded-xl overflow-hidden border-2 shadow-2xl transition-all duration-300 bg-slate-900",
                                    isActive ? "border-amber-500/50 shadow-amber-500/20" : "border-slate-700/50 shadow-black/50 grayscale-[0.5]",
                                    isSelected && isActive && "ring-4 ring-white ring-offset-2 ring-offset-slate-900"
                                )}>
                                    {/* Image */}
                                    <img
                                        src={skin.img}
                                        alt={skin.name}
                                        className={cn(
                                            "w-full h-full object-cover",
                                            isLocked && "blur-[2px] opacity-50"
                                        )}
                                    />

                                    {/* Locked Overlay */}
                                    {isLocked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[1px]">
                                            <Lock className="w-8 h-8 text-slate-400 mb-2" />
                                            <span className="text-xs font-bold text-slate-300 bg-black/50 px-2 py-1 rounded">
                                                Niveau {skin.level}
                                            </span>
                                        </div>
                                    )}

                                    {/* Selected Badge */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 z-20">
                                            <div className="bg-white text-slate-900 p-1 rounded-full shadow-lg">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Shine reflection for active card */}
                                    {isActive && !isLocked && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-30 pointer-events-none" />
                                    )}
                                </div>

                                {/* Label - Moved Below */}
                                <div className={cn(
                                    "absolute -bottom-8 inset-x-0 text-center transition-opacity duration-300",
                                    isActive ? "opacity-100" : "opacity-0"
                                )}>
                                    <span className={cn(
                                        "font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10",
                                        isSelected ? "text-white" : "text-slate-300"
                                    )}>
                                        {skin.name}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Next Button */}
            <button
                className="absolute right-2 z-50 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-white backdrop-blur-sm transition-colors"
                onClick={handleNext}
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}

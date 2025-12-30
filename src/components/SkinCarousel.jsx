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
        <div className="relative w-full h-[260px] flex items-center justify-center perspective-1000 py-4">
            {/* Background Light Effect - Updated to match new container */}
            {/* Background Light Effect - Moved to Parent Container */}

            {/* Prev Button */}
            <button
                className="absolute left-2 z-50 p-2 rounded-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 text-white backdrop-blur-md transition-colors"
                onClick={handlePrev}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Carousel Items */}
            <div className="relative flex items-center justify-center w-full h-full">
                <AnimatePresence initial={false} mode="popLayout">
                    {skins.map((skin, i) => {
                        // Circular Logic
                        const count = skins.length;
                        let offset = (i - activeIndex + count) % count;
                        // Adjust offset to be shortest distance (so -2, -1, 0, 1, 2)
                        if (offset > count / 2) offset -= count;

                        // Limit visible items to -2, -1, 0, 1, 2
                        if (Math.abs(offset) > 2) return null;

                        const isActive = offset === 0;
                        const isLocked = playerLevel < skin.level;
                        const isSelected = selectedSkinId === skin.id;

                        // Calculate visual properties
                        const xOffset = offset * 60; // Slightly tighter spacing
                        const scale = isActive ? 1.1 : Math.max(0.7, 1 - Math.abs(offset) * 0.15);
                        const opacity = isActive ? 1 : Math.max(0.3, 0.8 - Math.abs(offset) * 0.2);
                        const zIndex = 50 - Math.abs(offset);
                        const rotateY = offset * -25;

                        return (
                            <motion.div
                                key={skin.id}
                                layout
                                initial={false}
                                animate={{
                                    x: `${xOffset}%`,
                                    scale: scale,
                                    opacity: opacity,
                                    zIndex: zIndex,
                                    rotateY: rotateY,
                                    filter: isActive ? 'brightness(1.1)' : 'brightness(0.6) blur(0.5px)',
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 35,
                                    mass: 0.8
                                }}
                                className="absolute cursor-pointer rounded-xl transition-shadow duration-300"
                                onClick={() => handleItemClick(i, skin)}
                                style={{
                                    width: '120px',
                                    height: '180px',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                {/* Active Card Glow/Border Effect */}
                                {isActive && (
                                    <>
                                        {/* Pulsating Border - Purple Gradient (Reduced) */}
                                        <div className="absolute -inset-[5px] rounded-[22px] bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 opacity-15 blur-md animate-pulse-slow" />

                                        {/* Sharp Pulsing Border (Matches Main Menu Button Style - Tighter) */}
                                        <div className="absolute -inset-[3px] bg-[#C084FC] rounded-[20px] animate-border-pulse opacity-90 shadow-[0_0_10px_#C084FC]" />
                                    </>
                                )}

                                <div
                                    className={cn(
                                        "relative w-full h-full rounded-[18px] overflow-hidden transition-all duration-300",
                                        isActive ? "ring-0" : "grayscale-[0.5] brightness-75 hover:grayscale-0 hover:brightness-100",
                                        isLocked && "opacity-50"
                                    )}
                                >
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
                className="absolute right-2 z-50 p-2 rounded-full bg-slate-800/40 hover:bg-slate-700/60 border border-white/10 text-white backdrop-blur-md transition-colors"
                onClick={handleNext}
            >
                <ChevronRight className="w-6 h-6" />
            </button>
        </div>
    );
}

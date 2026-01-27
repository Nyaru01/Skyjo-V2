import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
    "Mélange des cartes...",
    "Alignement des colonnes...",
    "Calcul des probabilités...",
    "Attention aux malus...",
    "Prêt à jouer ?"
];

const LoaderText = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prev => (prev + 1) % MESSAGES.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-6 flex items-center justify-center overflow-hidden mb-2">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium text-sky-300 italic flex items-center gap-2"
                >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    {MESSAGES[index]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
};

export default function SkyjoLoader({ progress = 0 }) {
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100]">
            {/* Background Image with Cinematic Zoom - Darker overlay */}
            <motion.div
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.4 }}
                transition={{ duration: 4, ease: "easeOut" }}
                className="absolute inset-0 bg-[url('/premium-bg.jpg')] bg-cover bg-center"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-900/90" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-8">

                {/* Logo / Title Area */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12 flex flex-col items-center"
                >
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-sky-200 to-sky-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.5)] tracking-tighter">
                        SKYJO
                    </h1>
                    <div className="h-1 w-24 bg-sky-500 rounded-full mt-2 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                </motion.div>

                {/* Progress Bar Container */}
                <div className="w-full space-y-4">

                    {/* Flavour Text - Cycling Interval */}
                    <LoaderText />

                    <div className="flex justify-between items-end px-1">
                        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Chargement</span>
                        <span className="text-xl font-black text-white tabular-nums">{Math.round(progress)}%</span>
                    </div>

                    {/* The Bar Itself */}
                    <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/10 shadow-inner backdrop-blur-sm">
                        <motion.div
                            className="h-full bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 relative"
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            transition={{ ease: "circOut", duration: 0.5 }}
                        >
                            {/* Glow at the tip */}
                            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white/40 to-transparent" />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-[4px] shadow-[0_0_10px_white]" />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Version removed as requested */}
        </div>
    );
}

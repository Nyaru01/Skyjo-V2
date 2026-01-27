/**
 * Hook for audio and haptic feedback
 * Provides sound effects and vibration for game events
 * 
 * MOBILE FIX: Audio on iOS Safari and Android Chrome requires user interaction
 * before any audio can play. This module handles unlocking audio on first touch.
 */

import { useGameStore } from '../store/gameStore';
import { useEffect, useCallback } from 'react';

// ============================================
// AUDIO CONTEXT MANAGEMENT (Mobile Fix)
// ============================================

// Shared audio context - created once, unlocked on first user interaction
let sharedAudioContext = null;
let audioUnlocked = false;
let audioUnlockListenerAdded = false;

// Pre-loaded audio buffers for faster playback
const audioBuffers = {};

/**
 * Get or create the shared AudioContext
 */
const getAudioContext = () => {
    if (!sharedAudioContext) {
        try {
            sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('WebAudio API not available');
            return null;
        }
    }
    return sharedAudioContext;
};

/**
 * Unlock audio context on first user interaction (required for mobile)
 * iOS Safari and Android Chrome block AudioContext until user interacts
 */
const unlockAudio = async () => {
    if (audioUnlocked) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume audio context (required on iOS Safari)
    if (ctx.state === 'suspended') {
        try {
            await ctx.resume();
        } catch (e) {
            console.log('Failed to resume audio context:', e);
        }
    }

    // Play a silent sound to fully unlock audio on iOS
    try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) {
        // Silent fail - audio might still work
    }

    audioUnlocked = true;
    console.log('🔊 Audio unlocked for mobile');

    // Pre-load audio files after unlock
    preloadAudioFiles();
};

/**
 * Pre-load audio files into memory for faster playback
 */
const preloadAudioFiles = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    const filesToPreload = [
        '/Sounds/victory.mp3',
        '/Sounds/Start.mp3'
    ];

    for (const path of filesToPreload) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                audioBuffers[path] = audioBuffer;
                console.log(`✓ Preloaded: ${path}`);
            }
        } catch (e) {
            console.log(`Could not preload ${path}:`, e.message);
        }
    }
};

/**
 * Set up audio unlock listener (call once on app init)
 */
const setupAudioUnlockListener = () => {
    if (audioUnlockListenerAdded) return;
    audioUnlockListenerAdded = true;

    const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];

    const handleUnlock = () => {
        unlockAudio();
        // Remove listeners after first interaction
        unlockEvents.forEach(event => {
            document.removeEventListener(event, handleUnlock, true);
        });
    };

    unlockEvents.forEach(event => {
        document.addEventListener(event, handleUnlock, { capture: true, passive: true });
    });
};

// Initialize audio unlock listener immediately
setupAudioUnlockListener();

// ============================================
// SOUND PLAYBACK FUNCTIONS
// ============================================

/**
 * Play a beep sound using Web Audio API oscillator
 */
const playBeep = (frequency = 440, duration = 100, volume = 0.3) => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
        // Silent fail
    }
};

/**
 * Play a pre-loaded audio file using Web Audio API (better for mobile)
 */
const playAudioBuffer = (path, volume = 0.5) => {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const buffer = audioBuffers[path];
    if (!buffer) {
        // Fallback to HTML5 Audio if not preloaded
        playAudioFileFallback(path, volume);
        return;
    }

    try {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        source.buffer = buffer;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
    } catch (e) {
        console.log('Buffer playback failed:', e);
    }
};

/**
 * Fallback: Play audio file using HTML5 Audio
 */
const playAudioFileFallback = (path, volume = 0.5) => {
    try {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(() => {
            // Silent fail - user might not have interacted yet
        });
    } catch (e) {
        // Silent fail
    }
};

// Module-level vibrate function removed - logic moved inside hook to respect vibrationEnabled state

// ============================================
// REACT HOOK
// ============================================

/**
 * Custom hook for feedback effects
 * Respects the soundEnabled setting from the store
 */
export const useFeedback = () => {
    const soundEnabled = useGameStore(state => state.soundEnabled);
    const vibrationEnabled = useGameStore(state => state.vibrationEnabled);

    // Ensure audio unlock listener is set up
    useEffect(() => {
        setupAudioUnlockListener();
    }, []);

    // Helper for vibration that respects setting
    const vibrate = useCallback((pattern = 50) => {
        if (vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }, [vibrationEnabled]);

    // Success sound - higher pitch, pleasant
    const playSuccess = useCallback(() => {
        if (soundEnabled) {
            playBeep(660, 80, 0.2);
            setTimeout(() => playBeep(880, 100, 0.2), 80);
        }
        vibrate(50);
    }, [soundEnabled, vibrate]);

    // Click sound - short tap
    const playClick = useCallback(() => {
        if (soundEnabled) {
            playBeep(440, 50, 0.15);
        }
        vibrate(30);
    }, [soundEnabled, vibrate]);

    // Victory sound - custom audio file
    const playVictory = useCallback(() => {
        if (soundEnabled) {
            playAudioBuffer('/Sounds/victory.mp3', 0.6);
        }
        vibrate([50, 50, 100]);
    }, [soundEnabled, vibrate]);

    // Start game sound - custom audio file
    const playStart = useCallback(() => {
        if (soundEnabled) {
            playAudioBuffer('/Sounds/Start.mp3', 0.5);
        }
        vibrate(50);
    }, [soundEnabled, vibrate]);

    // Error sound - lower pitch
    const playError = useCallback(() => {
        if (soundEnabled) {
            playBeep(220, 150, 0.2);
        }
        vibrate([100, 50, 100]);
    }, [soundEnabled, vibrate]);

    // Undo sound - descending
    const playUndo = useCallback(() => {
        if (soundEnabled) {
            playBeep(440, 80, 0.15);
            setTimeout(() => playBeep(330, 80, 0.15), 80);
        }
        vibrate(30);
    }, [soundEnabled, vibrate]);

    // Card Flip sound - quick ascending
    const playCardFlip = useCallback(() => {
        if (soundEnabled) {
            const ctx = getAudioContext();
            if (ctx && ctx.state === 'running') {
                try {
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);

                    // Swipe effect
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

                    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

                    oscillator.start(ctx.currentTime);
                    oscillator.stop(ctx.currentTime + 0.1);
                } catch (e) { }
            }
        }
    }, [soundEnabled]);

    // Card Draw sound - sharp tap
    const playCardDraw = useCallback(() => {
        if (soundEnabled) {
            playBeep(800, 30, 0.05); // Short high tick
        }
    }, [soundEnabled]);

    // Card Place sound - lower thud
    const playCardPlace = useCallback(() => {
        if (!soundEnabled) return;
        playBeep(200, 80, 0.1); // Lower thud
    }, [soundEnabled]);

    // Social notification sound
    const playSocialNotify = useCallback(() => {
        if (soundEnabled) {
            playBeep(700, 50, 0.1);
            setTimeout(() => playBeep(900, 70, 0.1), 50);
        }
        vibrate([30, 30]);
    }, [soundEnabled, vibrate]);

    // Social invitation sound
    const playSocialInvite = useCallback(() => {
        if (soundEnabled) {
            playBeep(800, 40, 0.1);
            setTimeout(() => playBeep(1000, 40, 0.1), 50);
            setTimeout(() => playBeep(1200, 60, 0.1), 100);
        }
        vibrate([40, 30, 40]);
    }, [soundEnabled, vibrate]);

    return {
        playSuccess,
        playClick,
        playVictory,
        playStart,
        playError,
        playUndo,
        playCardFlip,
        playCardDraw,
        playCardPlace,
        playSocialNotify,
        playSocialInvite,
        vibrate: (pattern) => {
            if (vibrationEnabled && navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        }
    };
};

export default useFeedback;

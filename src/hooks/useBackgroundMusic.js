import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const PLAYLIST = [
    '/Music/bathroom-chill-background-music-14977.mp3',
    '/Music/chill-lofi-347217.mp3',
    '/Music/reveil-239031.mp3'
];

export const useBackgroundMusic = (shouldPlay = false) => {
    const audioRef = useRef(null);
    const musicEnabled = useGameStore(state => state.musicEnabled);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    // Initialize audio object once
    useEffect(() => {
        audioRef.current = new Audio(PLAYLIST[0]);
        audioRef.current.volume = 0.3; // Default volume 30%

        // Handle track ending -> play next
        const handleEnded = () => {
            setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST.length);
        };

        audioRef.current.addEventListener('ended', handleEnded);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleEnded);
                audioRef.current = null;
            }
        };
    }, []);

    // Handle track changes
    useEffect(() => {
        if (!audioRef.current) return;

        const wasPlaying = !audioRef.current.paused;
        audioRef.current.src = PLAYLIST[currentTrackIndex];
        audioRef.current.load();

        if (wasPlaying && musicEnabled && shouldPlay) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Audio play failed:", error);
                    setIsPlaying(false);
                });
            }
        }
    }, [currentTrackIndex, musicEnabled, shouldPlay]);

    // Handle play/pause state based on props and store
    useEffect(() => {
        if (!audioRef.current) return;

        if (musicEnabled && shouldPlay) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => setIsPlaying(true))
                    .catch(error => {
                        console.log("Audio play failed:", error);
                        setIsPlaying(false);
                    });
            }
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [musicEnabled, shouldPlay]);

    const playNext = useCallback(() => {
        setCurrentTrackIndex(prev => (prev + 1) % PLAYLIST.length);
    }, []);

    return {
        isPlaying,
        playNext
    };
};

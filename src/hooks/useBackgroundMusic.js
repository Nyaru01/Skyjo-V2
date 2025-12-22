import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

const PLAYLIST = [
    '/Music/bathroom-chill-background-music-14977.mp3',
    '/Music/chill-lofi-347217.mp3',
    '/Music/reveil-239031.mp3',
    '/Music/scizzie - aquatic ambience.mp3'
];

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export const useBackgroundMusic = (shouldPlay = false) => {
    const audioRef = useRef(null);
    const shuffledPlaylistRef = useRef(shuffleArray(PLAYLIST));
    const currentTrackIndexRef = useRef(0);
    const hasStartedSessionRef = useRef(false);
    const playNextTrackRef = useRef(null);

    const musicEnabled = useGameStore(state => state.musicEnabled);
    const [isPlaying, setIsPlaying] = useState(false);

    // Function to play next track - stored in ref for stable reference
    const playNextTrack = useCallback(() => {
        currentTrackIndexRef.current++;

        // If we've played all tracks, reshuffle and start over
        if (currentTrackIndexRef.current >= PLAYLIST.length) {
            shuffledPlaylistRef.current = shuffleArray(PLAYLIST);
            currentTrackIndexRef.current = 0;
        }

        if (audioRef.current) {
            audioRef.current.src = shuffledPlaylistRef.current[currentTrackIndexRef.current];
            audioRef.current.load();
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        }
    }, []);

    // Keep the ref updated with the latest callback
    playNextTrackRef.current = playNextTrack;

    // Initialize audio object once
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = 0.3;
            // Use a wrapper function that calls the ref to ensure we always use the latest callback
            const handleEnded = () => {
                if (playNextTrackRef.current) {
                    playNextTrackRef.current();
                }
            };
            audioRef.current.addEventListener('ended', handleEnded);

            // Store the handler for cleanup
            audioRef.current._endedHandler = handleEnded;
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                if (audioRef.current._endedHandler) {
                    audioRef.current.removeEventListener('ended', audioRef.current._endedHandler);
                }
            }
        };
    }, []);

    // Handle play/pause and shuffle on new session
    useEffect(() => {
        if (!audioRef.current) return;

        if (musicEnabled && shouldPlay) {
            // If this is a new play session (music was stopped), reshuffle the playlist
            if (!hasStartedSessionRef.current) {
                shuffledPlaylistRef.current = shuffleArray(PLAYLIST);
                currentTrackIndexRef.current = 0;
                hasStartedSessionRef.current = true;

                audioRef.current.src = shuffledPlaylistRef.current[0];
                audioRef.current.load();
            }

            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(error => {
                    console.log("Audio play failed:", error);
                    setIsPlaying(false);
                });
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
            // Reset for next session - will reshuffle when music starts again
            hasStartedSessionRef.current = false;
        }
    }, [musicEnabled, shouldPlay]);

    return {
        isPlaying,
        playNext: playNextTrack
    };
};

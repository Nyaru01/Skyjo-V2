import { useState, useEffect } from 'react';

/**
 * Hook to get window size
 */
export default function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        // Only execute on client
        if (typeof window !== 'undefined') {
            function handleResize() {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }

            window.addEventListener("resize", handleResize);

            // Call immediately
            handleResize();

            return () => window.removeEventListener("resize", handleResize);
        }
    }, []);

    return windowSize;
}

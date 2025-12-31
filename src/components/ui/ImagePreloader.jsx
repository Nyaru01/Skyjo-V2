import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const CRITICAL_IMAGES = [
    '/card-back.png?v=2',
    '/card-back-papyrus.jpg',
    '/bg-skyjo.png',
    '/virtual-logo2.jpg',
    '/logo.jpg'
];

export default function ImagePreloader({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let mounted = true;
        let loadedCount = 0;
        const total = CRITICAL_IMAGES.length;

        const handleImageLoad = () => {
            if (!mounted) return;
            loadedCount++;
            setProgress(Math.round((loadedCount / total) * 100));

            if (loadedCount === total) {
                // Short delay to ensure texture decoding is done
                setTimeout(() => {
                    if (mounted) setIsLoading(false);
                }, 500);
            }
        };

        // Start loading all images
        CRITICAL_IMAGES.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onload = handleImageLoad;
            img.onerror = handleImageLoad; // Proceed even if fails
        });

        return () => {
            mounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 relative mb-4">
                    <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-emerald-500 font-bold text-xl animate-pulse">
                    Chargement... {progress}%
                </div>
                <p className="text-slate-500 text-sm mt-2">Optimisation des ressources</p>
            </div>
        );
    }

    return <>{children}</>;
}

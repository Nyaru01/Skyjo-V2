import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

/**
 * UpdatePrompt Component
 * Shows a toast notification when a new version of the app is available
 * User can click to reload and get the latest version
 */
export default function UpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, registration) {
            console.log('[SW] Registered:', swUrl);

            // Check for updates every 5 minutes
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 5 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('[SW] Registration error:', error);
        },
    });

    // Show prompt when update is available
    useEffect(() => {
        if (needRefresh) {
            setShowPrompt(true);
        }
    }, [needRefresh]);

    const handleUpdate = () => {
        updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed bottom-24 left-4 right-4 z-[200] max-w-md mx-auto"
                >
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-4 border border-emerald-400/30">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="p-2 bg-white/20 rounded-full shrink-0">
                                <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-sm">
                                    🎉 Mise à jour disponible !
                                </h3>
                                <p className="text-emerald-100 text-xs mt-1">
                                    Une nouvelle version de Skyjo est prête.
                                </p>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={handleDismiss}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
                            >
                                <X className="w-4 h-4 text-white/70" />
                            </button>
                        </div>

                        {/* Action button */}
                        <button
                            onClick={handleUpdate}
                            className="w-full mt-3 py-2.5 bg-white text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
                        >
                            Mettre à jour maintenant
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, CheckCircle } from 'lucide-react';

// Context to share update functions across components
const UpdateContext = createContext(null);

/**
 * UpdateProvider - Wraps the app to provide update functionality
 */
export function UpdateProvider({ children }) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState(null); // 'up-to-date' | 'update-available' | null
    const [registration, setRegistration] = useState(null);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, reg) {
            console.log('[SW] Registered:', swUrl);
            setRegistration(reg);

            // Check for updates every 5 minutes
            if (reg) {
                setInterval(() => {
                    reg.update();
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
            setCheckResult('update-available');
            setIsChecking(false);
        }
    }, [needRefresh]);

    const handleUpdate = () => {
        updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setNeedRefresh(false);
    };

    // Use a ref to always have the latest state of needRefresh in the manual check
    const needRefreshRef = useRef(needRefresh);
    useEffect(() => {
        needRefreshRef.current = needRefresh;
    }, [needRefresh]);

    // Manual check for updates
    const checkForUpdates = useCallback(async () => {
        if (!registration) {
            console.warn('[SW] No registration found for manual check');
            setCheckResult('up-to-date');
            setTimeout(() => setCheckResult(null), 3000);
            return;
        }

        setIsChecking(true);
        setCheckResult(null);

        try {
            console.log('[SW] Manual update check initiated');
            await registration.update();

            // Wait longer (5s) to let the SW fetch the manifest and detect differences
            // The onRegisteredSW setRefresh(true) will be triggered if an update is found
            setTimeout(() => {
                // If we are still checking (meaning onRegisteredSW didn't trigger needRefresh)
                if (!needRefreshRef.current) {
                    console.log('[SW] No update found after manual check');
                    setCheckResult('up-to-date');
                    setTimeout(() => setCheckResult(null), 3000);
                }
                setIsChecking(false);
            }, 5000);
        } catch (error) {
            console.error('[SW] Manual update check failed:', error);
            setIsChecking(false);
            setCheckResult('up-to-date');
            setTimeout(() => setCheckResult(null), 3000);
        }
    }, [registration]);

    const value = {
        checkForUpdates,
        isChecking,
        checkResult,
        needRefresh,
    };

    return (
        <UpdateContext.Provider value={value}>
            {children}
            {/* Update Toast */}
            <AnimatePresence>
                {showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed bottom-24 left-4 right-4 z-[200] max-w-md mx-auto"
                    >
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-5">
                            {/* Glow effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative flex items-start gap-4">
                                {/* Icon */}
                                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 rounded-xl shrink-0 shadow-inner">
                                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="font-bold text-white text-base leading-none mb-1">
                                        Mise à jour disponible
                                    </h3>
                                    <p className="text-slate-400 text-xs">
                                        Une nouvelle version de Skyjo est prête à être installée.
                                    </p>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={handleDismiss}
                                    className="p-1 -mr-2 -mt-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors shrink-0"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Action button */}
                            <button
                                onClick={handleUpdate}
                                className="relative w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Mettre à jour maintenant
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </UpdateContext.Provider>
    );
}

/**
 * Hook to access update functions from any component
 */
export function useUpdateCheck() {
    const context = useContext(UpdateContext);
    if (!context) {
        // Return dummy functions if not wrapped in provider
        return {
            checkForUpdates: () => { },
            isChecking: false,
            checkResult: null,
            needRefresh: false,
        };
    }
    return context;
}

// Keep default export for backwards compatibility
export default function UpdatePrompt() {
    // This is now just a wrapper, actual logic is in UpdateProvider
    return null;
}

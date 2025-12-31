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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Toast notification component
 */
export function Toast({ notification, onDismiss }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (notification) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onDismiss, 300);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    if (!notification) return null;

    const icons = {
        info: Info,
        success: CheckCircle,
        warning: AlertTriangle,
        error: AlertTriangle
    };

    const colors = {
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    };

    const Icon = icons[notification.type] || Info;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
                >
                    <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm border border-white/20",
                        colors[notification.type]
                    )}>
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{notification.message}</span>
                        <button
                            onClick={() => {
                                setVisible(false);
                                setTimeout(onDismiss, 300);
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-black/10 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default Toast;

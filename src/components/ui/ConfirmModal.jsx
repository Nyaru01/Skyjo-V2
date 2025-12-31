import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmation",
    message = "Êtes-vous sûr ?",
    confirmText = "Confirmer",
    cancelText = "Annuler",
    variant = "danger"
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden z-10"
                    >
                        {/* Header Decoration */}
                        <div className={cn(
                            "h-2 w-full",
                            variant === 'danger' ? "bg-red-500" : "bg-emerald-500"
                        )} />

                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                    variant === 'danger' ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                                )}>
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{title}</h3>
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">{message}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="rounded-2xl h-12 text-slate-300 hover:bg-white/5 hover:text-white"
                                >
                                    {cancelText}
                                </Button>
                                <Button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={cn(
                                        "rounded-2xl h-12 font-bold shadow-lg",
                                        variant === 'danger'
                                            ? "bg-red-500 hover:bg-red-600 shadow-red-500/20"
                                            : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                    )}
                                >
                                    {confirmText}
                                </Button>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

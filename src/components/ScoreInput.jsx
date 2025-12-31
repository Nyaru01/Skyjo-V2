import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { cn } from '../lib/utils';
import { useFeedback } from '../hooks/useFeedback';
import { getAvatarPath } from '../lib/avatars';

export default function ScoreInput({ players, onSave, onCancel, isEmbedded = false, rounds = [] }) {
    const { playSuccess, playError, playClick } = useFeedback();
    const [scores, setScores] = useState(
        players.reduce((acc, p) => ({ ...acc, [p.id]: '' }), {})
    );
    const [finisher, setFinisher] = useState(null);
    const [error, setError] = useState('');

    const handleScoreChange = (pid, value) => {
        setScores(prev => ({ ...prev, [pid]: value }));
    };

    const handleSubmit = () => {
        if (!finisher) {
            setError('Veuillez sélectionner le joueur qui a fini la manche.');
            playError();
            return;
        }
        const rawScores = {};
        for (const p of players) {
            const val = scores[p.id];
            if (val === '' || val === undefined || isNaN(parseInt(val))) {
                setError(`Veuillez entrer le score pour ${p.name}.`);
                playError();
                return;
            }
            rawScores[p.id] = parseInt(val);
        }
        setError('');
        playSuccess();
        onSave(rawScores, finisher);
    };

    const content = (
        <Card className={cn("w-full transition-all border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden", !isEmbedded && "max-w-lg")}>
            <CardHeader className="border-b border-white/10 dark:border-white/5 pb-4 relative overflow-hidden">
                {/* Decorative header glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-skyjo-blue/30 blur-md" />

                <CardTitle className="text-center text-slate-900 dark:text-slate-100 font-black tracking-tight flex items-center justify-center gap-2">
                    <Check className="h-5 w-5 text-skyjo-blue" />
                    {isEmbedded ? "Nouvelle Manche" : "Fin de manche"}
                </CardTitle>
                <p className="text-center text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                    Entrez les scores des cartes restantes
                </p>
            </CardHeader>

            <CardContent className="space-y-4 pt-6 px-2 sm:px-4">
                {error && (
                    <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl flex items-center gap-2 text-sm font-bold animate-in zoom-in duration-300 border border-red-500/20">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="grid gap-3">
                    {players.map((p, index) => {
                        const isFinisher = finisher === p.id;
                        const currentScore = parseInt(scores[p.id]) || 0;
                        const previousTotal = p.score || 0;
                        const newTotal = previousTotal + currentScore;

                        return (
                            <div
                                key={p.id}
                                className={cn(
                                    "relative p-4 rounded-3xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 shadow-sm group",
                                    isFinisher
                                        ? "bg-skyjo-blue/10 border-skyjo-blue shadow-skyjo-blue/10 ring-1 ring-skyjo-blue/20"
                                        : "bg-white/40 dark:bg-slate-700/40 border-white/20 dark:border-white/5 hover:bg-white/60 dark:hover:bg-slate-700/60"
                                )}
                                style={{ animationDelay: `${index * 80}ms` }}
                                onClick={() => setFinisher(p.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Left Side: Avatar & Identity */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Avatar with Status Ring */}
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden border-2 transition-all duration-300 group-hover:scale-105",
                                            isFinisher ? "border-skyjo-blue bg-skyjo-blue/20 ring-4 ring-skyjo-blue/20 scale-110 z-10" : "border-white/30 dark:border-white/10 bg-slate-800"
                                        )}>
                                            <div className="absolute inset-0 bg-white">
                                                {p.avatarId ? (
                                                    <img
                                                        src={getAvatarPath(p.avatarId)}
                                                        alt="Avatar"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { e.target.src = '/avatars/cat.png' }}
                                                    />
                                                ) : (
                                                    <span className="text-xl">{p.emoji || '👤'}</span>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-white/10 to-white/0" />
                                            </div>

                                            {/* Selection Overlay */}
                                            {isFinisher && (
                                                <div className="absolute inset-0 bg-skyjo-blue/20 backdrop-blur-[0.5px] flex items-center justify-center">
                                                    <Check className="h-6 w-6 text-white drop-shadow-md" strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={cn(
                                                    "font-black text-sm sm:text-base leading-tight",
                                                    isFinisher ? "text-skyjo-blue" : "text-slate-900 dark:text-white"
                                                )}>
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-900/50">
                                                    Total: {newTotal}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Score Input */}
                                    <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                                        <div className="relative group/input">
                                            <Input
                                                type="tel"
                                                inputMode="numeric"
                                                pattern="[0-9-]*"
                                                value={scores[p.id]}
                                                onChange={(e) => handleScoreChange(p.id, e.target.value)}
                                                className={cn(
                                                    "w-16 sm:w-20 text-center font-black text-xl h-14 rounded-2xl shadow-inner transition-all",
                                                    scores[p.id] !== ''
                                                        ? "border-skyjo-blue bg-white dark:bg-slate-900 text-skyjo-blue ring-4 ring-skyjo-blue/10"
                                                        : "bg-slate-100/50 dark:bg-slate-900/50 border-transparent text-slate-400 focus:bg-white dark:focus:bg-slate-900"
                                                )}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Action Section */}
                <div className="pt-2">
                    <Button
                        onClick={handleSubmit}
                        className="w-full bg-skyjo-blue hover:bg-skyjo-blue/90 h-16 rounded-3xl font-black text-xl shadow-xl shadow-skyjo-blue/20 transition-all active:scale-95 group"
                    >
                        Valider la manche
                        <Check className="ml-2 h-6 w-6 group-hover:scale-110 transition-transform" strokeWidth={4} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    if (isEmbedded) {
        return (
            <div id="score-input-section" className="animate-in fade-in slide-in-from-bottom-8 duration-500 pb-8">
                {content}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="animate-in zoom-in-95 duration-200 w-full max-w-lg">
                {content}
            </div>
        </div>
    );
}

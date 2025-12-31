import { useState } from 'react';
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
        <Card className={cn("w-full transition-all border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-800/80 backdrop-blur-xl shadow-2xl", !isEmbedded && "max-w-lg")}>
            <CardHeader className="border-b border-white/20 dark:border-white/10 pb-4">
                <CardTitle className="text-center text-slate-900 dark:text-slate-100">
                    {isEmbedded ? "Nouvelle Manche" : "Fin de manche"}
                </CardTitle>
                <p className="text-center text-slate-600 dark:text-slate-300 font-medium text-sm">Entrez les scores des cartes restantes</p>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-1 border border-red-100 dark:border-red-800">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 px-4 uppercase tracking-wide">
                        <span>Joueur</span>
                        <div className="flex items-center gap-4 text-right">
                            <span className="w-20 text-center">Manche</span>
                            <span className="w-14 text-center">Total</span>
                        </div>
                    </div>

                    {players.map((p, index) => {
                        const isFinisher = finisher === p.id;
                        const currentScore = parseInt(scores[p.id]) || 0;
                        const previousTotal = p.score || 0;
                        const newTotal = previousTotal + currentScore;

                        return (
                            <div
                                key={p.id}
                                className={cn(
                                    "relative flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer duration-500 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards shadow-sm",
                                    isFinisher
                                        ? "border-skyjo-blue bg-sky-50/90 dark:bg-sky-900/40"
                                        : "border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-600/50 hover:border-white/40"
                                )}
                                style={{ animationDelay: `${index * 100}ms` }}
                                onClick={() => setFinisher(p.id)}
                            >
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                    {/* Finisher Selection */}
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                        isFinisher ? "border-skyjo-blue bg-skyjo-blue text-white" : "border-slate-400 dark:border-slate-500 bg-white/50 dark:bg-slate-600/50"
                                    )}>
                                        {isFinisher && <Check className="h-4 w-4" strokeWidth={3} />}
                                    </div>

                                    {/* Player Avatar */}
                                    <div className={cn(
                                        "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-md relative overflow-hidden group border-2",
                                        isFinisher ? "border-white/50 bg-skyjo-blue" : "border-white/20 bg-slate-800"
                                    )}>
                                        <div className="absolute inset-0 bg-white flex items-center justify-center">
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
                                            {/* Glossy Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-white/20 to-white/0 opacity-50" />
                                        </div>
                                    </div>

                                    {/* Player Name & Current Total */}
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={cn("font-bold text-base leading-tight", isFinisher ? "text-sky-900 dark:text-sky-300" : "text-slate-900 dark:text-slate-100")}>
                                            {p.name || 'Joueur'}
                                        </span>
                                        <span className={cn("text-xs font-semibold", isFinisher ? "text-sky-700 dark:text-sky-400" : "text-slate-500 dark:text-slate-400")}>
                                            Total: {previousTotal}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    {/* Score Input */}
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Input
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9-]*"
                                            value={scores[p.id]}
                                            onChange={(e) => handleScoreChange(p.id, e.target.value)}
                                            className={cn(
                                                "w-20 text-center font-mono text-xl h-12 shadow-sm transition-colors",
                                                scores[p.id] !== ''
                                                    ? "font-bold text-slate-900 dark:text-white border-skyjo-blue ring-2 ring-sky-100 dark:ring-sky-900 bg-white/80 dark:bg-slate-700"
                                                    : "bg-white/50 dark:bg-slate-600/50 border-white/30 dark:border-slate-500 dark:text-white focus:bg-white/80 dark:focus:bg-slate-600"
                                            )}
                                            placeholder="0"
                                        />
                                    </div>

                                    {/* Total Display */}
                                    <div className="w-14 text-center flex flex-col justify-center">
                                        <span className={cn("text-lg font-black tabular-nums drop-shadow-sm", isFinisher ? "text-skyjo-blue dark:text-sky-300" : "text-slate-800 dark:text-slate-200")}>
                                            {newTotal}
                                        </span>
                                    </div>
                                </div>

                                {/* Finisher Label Badge */}
                                {isFinisher && (
                                    <div className="absolute -top-2.5 left-4 bg-skyjo-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 transition-transform animate-in zoom-in spin-in-3">
                                        A FINI
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Round Summary */}
                    <div className="flex justify-between items-center px-4 py-2 mt-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Manche</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                            {Object.values(scores).reduce((sum, val) => sum + (parseInt(val) || 0), 0)} pts
                        </span>
                    </div>
                </div>

                <div className={cn("grid gap-3 pt-4", !isEmbedded ? "grid-cols-2" : "grid-cols-1")}>
                    {!isEmbedded && onCancel && (
                        <Button variant="secondary" onClick={onCancel} className="w-full">
                            Annuler
                        </Button>
                    )}
                    <Button onClick={handleSubmit} className="w-full bg-skyjo-blue hover:bg-skyjo-blue/90 h-14 text-lg shadow-xl shadow-skyjo-blue/20 border border-white/20 animate-pulse-glow">
                        Valider la manche
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

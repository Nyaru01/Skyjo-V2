import React from 'react';
import { Award, Star, Zap, Trophy } from 'lucide-react';
import { Card, CardContent } from './ui/Card';

const ACHIEVEMENTS = [
    { id: 1, title: 'Première Victoire', description: 'Gagner une partie contre l\'IA ou en ligne.', icon: Trophy, color: 'text-amber-500', achieved: true },
    { id: 2, title: 'Maître du Skyjo', description: 'Atteindre le niveau 10.', icon: Award, color: 'text-skyjo-blue', achieved: false },
    { id: 3, title: 'Inarrêtable', description: 'Gagner 3 parties d\'affilée.', icon: Zap, color: 'text-purple-500', achieved: false },
    { id: 4, title: 'Collectionneur', description: 'Débloquer 3 skins de cartes.', icon: Star, color: 'text-emerald-500', achieved: true },
];

export default function AchievementsList() {
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 px-1">
                <Award className="h-5 w-5 text-amber-500" />
                Succès & Défis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACHIEVEMENTS.map((ach) => {
                    const Icon = ach.icon;
                    return (
                        <Card key={ach.id} className={`glass-premium border-white/5 ${ach.achieved ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${ach.color}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-white">{ach.title}</h4>
                                    <p className="text-[10px] text-slate-400 leading-tight">{ach.description}</p>
                                </div>
                                {ach.achieved && (
                                    <div className="w-2 h-2 rounded-full bg-skyjo-blue shadow-[0_0_8px_rgba(26,72,105,0.8)]" />
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

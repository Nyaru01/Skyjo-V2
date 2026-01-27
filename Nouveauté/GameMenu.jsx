import React from 'react';
import { Bot, ChevronRight, Users, Wifi, HelpCircle, Palette, X, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import SkinCarousel from '../SkinCarousel';
import ExperienceBar from '../ExperienceBar';

export default function GameMenu({
    setScreen,
    setShowRulesModal,
    showRulesModal,
    playerCardSkin,
    playerLevel,
    setCardSkin
}) {
    return (
        <div className="max-w-md mx-auto p-4 space-y-4 animate-in fade-in zoom-in-95 duration-500 min-h-screen flex flex-col pt-8">
            {/* Header section can be even more minimal */}
            <div className="text-center mb-6 space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tighter">MODE VIRTUEL</h2>
                <div className="h-1 w-12 bg-skyjo-blue mx-auto rounded-full" />
            </div>

            <ExperienceBar className="mb-6" />

            <div className="grid gap-4">
                {/* AI Battle */}
                <button
                    onClick={() => setScreen('ai-battle')}
                    className="group flex items-center justify-between p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 transition-all active:scale-95 shadow-lg backdrop-blur-md relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-left relative z-10">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Jouer contre l'IA <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">Alpha</span>
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Mode rapide avec animations fluides</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 relative z-10">
                        <Bot className="h-6 w-6 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                </button>
                <button
                    onClick={() => setScreen('lobby')}
                    className="group flex items-center justify-between p-6 rounded-3xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 transition-all active:scale-95 shadow-lg backdrop-blur-md"
                >
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-white">Jouer en ligne</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Affrontez vos amis à distance</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-skyjo-blue/10 border border-skyjo-blue/20">
                        <Wifi className="h-6 w-6 text-skyjo-blue group-hover:scale-110 transition-transform" />
                    </div>
                </button>

                {/* Rules Button */}
                <button
                    onClick={() => setShowRulesModal(true)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-white/10 transition-colors group backdrop-blur-md"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                            <HelpCircle className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-slate-200">Règles du jeu</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Customization Card */}
            <Card className="glass-premium dark:glass-dark shadow-xl relative mt-6 overflow-hidden">
                <div className="absolute inset-0 bg-purple-500/20 blur-3xl opacity-50 pointer-events-none" />
                <CardHeader className="pb-0 relative z-10">
                    <div className="flex items-center justify-start gap-3 px-1">
                        <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                            <Palette className="h-4 w-4 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-wide">Personnaliser vos cartes</h3>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 pb-6 px-1">
                    <SkinCarousel
                        skins={[
                            { id: 'classic', name: 'Classique', img: '/card-back.png', level: 1 },
                            { id: 'papyrus', name: 'Papyrus', img: '/card-back-papyrus.jpg', level: 3 },
                            { id: 'neon', name: 'Neon', img: '/card-back-neon.png', level: 5 },
                            { id: 'gold', name: 'Gold', img: '/card-back-gold.png', level: 10 },
                            { id: 'galaxy', name: 'Galaxy', img: '/card-back-galaxy.png', level: 15 }
                        ]}
                        selectedSkinId={playerCardSkin}
                        onSelect={setCardSkin}
                        playerLevel={playerLevel}
                    />
                </CardContent>
            </Card>

            {/* Rules Modal */}
            {showRulesModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in" onClick={() => setShowRulesModal(false)} />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-[101] animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                                    <HelpCircle className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-black text-white tracking-tight">Règles du Skyjo</h2>
                            </div>
                            <button
                                onClick={() => setShowRulesModal(false)}
                                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300">
                            <section>
                                <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">🎯 Objectif</h3>
                                <p className="text-sm leading-relaxed">Avoir le <strong>moins de points possible</strong> à la fin de la partie. Le jeu se termine quand un joueur atteint 100 points.</p>
                            </section>

                            <section>
                                <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">🃏 Mise en place</h3>
                                <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed">
                                    <li>Chaque joueur reçoit <strong>12 cartes face cachée</strong> (grille 3×4)</li>
                                    <li>Retournez <strong>2 cartes</strong> de votre choix</li>
                                    <li>Le joueur avec la somme la plus élevée commence</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">🔄 Tour de jeu</h3>
                                <p className="text-sm leading-relaxed mb-3">Piochez une carte de la <strong>pioche</strong> ou de la <strong>défausse</strong> :</p>
                                <ul className="list-disc list-inside space-y-2 text-sm">
                                    <li><strong>Pioche</strong> : Gardez-la pour remplacer une carte OU défaussez-la et retournez une carte cachée</li>
                                    <li><strong>Défausse</strong> : Remplacez obligatoirement une de vos cartes</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">✨ Colonnes identiques</h3>
                                <p className="text-sm leading-relaxed mb-3">Si une colonne contient <strong>3 cartes identiques</strong> (face visible), elle est <strong>éliminée</strong> !</p>
                                <div className="p-3 bg-amber-900/20 rounded-2xl text-xs border border-amber-700/30 text-amber-200/80">
                                    <strong>⚠️ Ordre important :</strong> D'abord défausser la carte échangée, PUIS les 3 cartes identiques par-dessus.
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">🏁 Fin de manche</h3>
                                <ul className="list-disc list-inside space-y-2 text-sm">
                                    <li>La manche se termine quand un joueur retourne toutes ses cartes</li>
                                    <li>Les autres joueurs jouent <strong>un dernier tour</strong></li>
                                    <li><strong>Attention :</strong> Si le finisseur n'a pas le score le plus bas, ses points sont <strong>doublés</strong> !</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

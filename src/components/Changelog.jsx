import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, CheckCircle2, Zap, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { UPDATES } from '../data/updates';

export default function Changelog() {
    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-xl bg-skyjo-blue flex items-center justify-center shadow-lg shadow-skyjo-blue/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white leading-tight">Mises à jour</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Évolutions du projet</p>
                </div>
            </div>

            <div className="space-y-8 relative before:absolute before:left-[1.25rem] before:top-4 before:bottom-4 before:w-0.5 before:bg-white/5">
                {UPDATES.map((update, index) => (
                    <motion.div
                        key={update.version}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-12"
                    >
                        {/* Timeline Dot */}
                        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-slate-900 flex items-center justify-center shadow-xl transition-all duration-500 ${update.isNew ? 'bg-skyjo-blue scale-110 shadow-skyjo-blue/30' : 'bg-slate-800'}`}>
                            {update.isNew ? <Zap className="w-5 h-5 text-white animate-pulse" /> : <Calendar className="w-4 h-4 text-slate-500" />}
                        </div>

                        <Card className={`glass-premium transition-all duration-300 ${update.isNew ? 'border-skyjo-blue/30 shadow-lg shadow-skyjo-blue/10 bg-skyjo-blue/[0.03]' : 'border-white/5 opacity-80'}`}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider ${update.isNew ? 'bg-skyjo-blue text-white' : 'bg-white/10 text-slate-400'}`}>
                                                v{update.version}
                                            </span>
                                            {update.isNew && (
                                                <span className="flex h-2 w-2 rounded-full bg-skyjo-blue animate-ping" />
                                            )}
                                        </div>
                                        <h3 className="text-lg font-black text-white">{update.title}</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                                        {update.date}
                                    </p>
                                </div>

                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    {update.description}
                                </p>

                                <div className="space-y-3">
                                    {update.changes.map((change, cIdx) => (
                                        <div key={cIdx} className="flex gap-3 items-start group">
                                            <div className="mt-1">
                                                {change.type === 'feat' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                                {change.type === 'improve' && <Info className="w-3.5 h-3.5 text-skyjo-blue" />}
                                                {change.type === 'fix' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                            </div>
                                            <p className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                                {change.text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

import { useMemo, useRef, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Target, Award, Zap, Crown, Flame, Users, Download, Upload, Save, Star, Info, Share2, Medal } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore, selectGameHistory } from '../store/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import AchievementsList from './AchievementsList';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar } from 'recharts';

// Palette de couleurs pour les joueurs (forced dark theme)
const PLAYER_COLORS = [
    { bg: 'bg-emerald-500', light: 'bg-emerald-900/30', text: 'text-emerald-300', stroke: '#10b981' },
    { bg: 'bg-[#1A4869]', light: 'bg-[#1A4869]/30', text: 'text-sky-300', stroke: '#38bdf8' },
    { bg: 'bg-purple-500', light: 'bg-purple-900/30', text: 'text-purple-300', stroke: '#a855f7' },
    { bg: 'bg-amber-500', light: 'bg-amber-900/30', text: 'text-amber-300', stroke: '#f59e0b' },
    { bg: 'bg-rose-500', light: 'bg-rose-900/30', text: 'text-rose-300', stroke: '#f43f5e' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-900/30', text: 'text-cyan-300', stroke: '#06b6d4' },
    { bg: 'bg-orange-500', light: 'bg-orange-900/30', text: 'text-orange-300', stroke: '#f97316' },
    { bg: 'bg-pink-500', light: 'bg-pink-900/30', text: 'text-pink-300', stroke: '#ec4899' },
];

/**
 * Custom Glass Tooltip for Charts
 */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-xl">
                <p className="font-bold text-slate-200 mb-1 border-b border-white/10 pb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-300">{entry.name}:</span>
                        <span className="font-bold text-white">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
};

/**
 * Podium Component for Top 3
 */
const Podium = ({ players }) => {
    // Ensure we have at least 3 spots (filled with nulls if fewer players)
    const top3 = [players[1], players[0], players[2]]; // Silver, Gold, Bronze order
    const heights = ['h-32', 'h-48', 'h-24']; // Heights for pillars
    const gradients = [
        'from-slate-300 to-slate-400 border-t-4 border-slate-300', // Silver
        'from-amber-300 via-yellow-400 to-amber-500 border-t-4 border-yellow-300 shadow-glow-gold', // Gold
        'from-orange-700 to-orange-800 border-t-4 border-orange-600' // Bronze
    ];
    const delays = [0.2, 0, 0.4];

    return (
        <div className="flex items-end justify-center gap-2 sm:gap-4 h-64 mb-8 pt-6">
            {top3.map((player, index) => {
                if (!player) return <div key={index} className="w-24 sm:w-32" />; // Spacer

                return (
                    <motion.div
                        key={player.name}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: delays[index], type: "spring", stiffness: 100 }}
                        className="flex flex-col items-center w-24 sm:w-32 relative group"
                    >
                        {/* Avatar / Icon */}
                        <div className={cn(
                            "mb-2 p-1 rounded-full border-2 bg-slate-900 z-10 relative transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2",
                            index === 1 ? "w-20 h-20 border-yellow-400 shadow-glow-gold" :
                                index === 0 ? "w-16 h-16 border-slate-300" : "w-14 h-14 border-orange-600"
                        )}>
                            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center font-bold text-xl text-white overflow-hidden">
                                {player.name.substring(0, 2).toUpperCase()}
                            </div>
                            {index === 1 && (
                                <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400 drop-shadow-lg animate-bounce-slow" />
                            )}
                        </div>

                        {/* Pillar */}
                        <div className={cn(
                            "w-full rounded-t-lg bg-gradient-to-b flex flex-col items-center justify-start pt-4 relative overflow-hidden backdrop-blur-sm",
                            heights[index],
                            gradients[index]
                        )}>
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-3xl font-black text-white/90 drop-shadow-md">
                                {index === 1 ? '1' : index === 0 ? '2' : '3'}
                            </span>
                            <div className="mt-auto pb-2 w-full text-center px-1">
                                <p className="text-xs font-bold text-white truncate w-full px-1">{player.name}</p>
                                <p className="text-[10px] text-white/80 font-mono">{player.wins} wins</p>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

// Stat Card Component
function StatCard({ icon: Icon, title, value, subtitle, colorClass = 'text-skyjo-blue', index, className }) {
    return (
        <motion.div
            variants={itemVariants}
            className="h-full"
        >
            <div className={cn("glass-premium p-5 rounded-2xl h-full border border-white/5 hover:border-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg", className)}>
                <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                        "p-3 rounded-xl transition-colors group-hover:scale-110 duration-300",
                        colorClass === 'text-skyjo-blue' ? 'bg-blue-500/10 text-skyjo-blue' :
                            colorClass.replace('text-', 'bg-').replace('600', '500/10').replace('500', '500/10').replace('400', '500/10') + " " + colorClass
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>
                    {subtitle && (
                        <div className="px-2 py-1 rounded-full bg-white/5 text-[10px] font-medium text-slate-400 border border-white/5">
                            {subtitle}
                        </div>
                    )}
                </div>
                <div>
                    <div className="text-3xl font-black text-white tracking-tight mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                        {value}
                    </div>
                    <div className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                        {title}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Player Leaderboard Item
function LeaderboardItem({ player, rank, wins, avgScore, colorIndex }) {
    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];

    return (
        <motion.div
            variants={itemVariants}
            className="group relative flex items-center gap-4 p-4 rounded-xl bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 hover:border-white/10 transition-all"
        >
            {/* Rank Badge */}
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner",
                rank === 0 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900" :
                    rank === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800" :
                        rank === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900" :
                            "bg-slate-800 text-slate-500"
            )}>
                {rank + 1}
            </div>

            {/* Player Info */}
            <div className="flex-1">
                <div className={cn("font-bold text-lg", color.text)}>{player.name}</div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" /> Moy. {avgScore.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {player.gamesPlayed} parties
                    </span>
                </div>
            </div>

            {/* Wins */}
            <div className="text-right">
                <div className="text-xl font-black text-white">{wins}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Victoires</div>
            </div>

            {/* Progress Bar (Win Rate) */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-800 rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                    className={cn("h-full", color.bg)}
                    style={{ width: `${(wins / Math.max(1, player.gamesPlayed)) * 100}%` }}
                />
            </div>
        </motion.div>
    );
}

export default function Stats() {
    const gameHistory = useGameStore(selectGameHistory);
    const level = useGameStore(state => state.level);
    const currentXP = useGameStore(state => state.currentXP);
    const fileInputRef = useRef(null);



    // Export game history to JSON file
    const { playerStats, topScore, totalGames } = useMemo(() => {
        const stats = {};
        let highest = 0;

        gameHistory.forEach(game => {
            game.players.forEach(p => {
                if (!stats[p.name]) {
                    stats[p.name] = {
                        name: p.name,
                        wins: 0,
                        gamesPlayed: 0,
                        totalScore: 0,
                        scores: []
                    };
                }
                stats[p.name].gamesPlayed += 1;
                stats[p.name].totalScore += p.finalScore;
                stats[p.name].scores.push({
                    date: new Date(game.date).toLocaleDateString(),
                    score: p.finalScore
                });

                if (p.finalScore > highest) highest = p.finalScore;
                if (game.winner.name === p.name) {
                    stats[p.name].wins += 1;
                }
            });
        });

        // Convert to array and sort by wins
        const sortedStats = Object.values(stats).sort((a, b) => b.wins - a.wins);
        return { playerStats: sortedStats, topScore: highest, totalGames: gameHistory.length };
    }, [gameHistory]);

    const chartData = useMemo(() => {
        // Take last 10 games for the chart
        const recentGames = [...gameHistory].reverse().slice(0, 10).reverse();
        return recentGames.map((game, i) => {
            const dataPoint = { name: `G${i + 1}` };
            game.players.forEach(p => {
                dataPoint[p.name] = p.finalScore;
            });
            return dataPoint;
        });
    }, [gameHistory]);


    // Export game history to JSON file
    const handleExport = () => {
        const exportData = {
            version: 1,
            exportDate: new Date().toISOString(),
            gameHistory: gameHistory
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skyjo-stats-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import game history from JSON file
    const handleImport = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.gameHistory && Array.isArray(data.gameHistory)) {
                    const existingIds = new Set(gameHistory.map(g => g.id));
                    const newGames = data.gameHistory.filter(g => !existingIds.has(g.id));
                    if (newGames.length > 0) {
                        useGameStore.setState(state => ({
                            gameHistory: [...newGames, ...state.gameHistory].slice(0, 50)
                        }));
                        alert(`${newGames.length} partie(s) importée(s) !`);
                    } else {
                        alert('Toutes les parties sont déjà présentes.');
                    }
                } else {
                    alert('Format de fichier invalide.');
                }
            } catch (err) {
                alert('Erreur lors de la lecture du fichier.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in zoom-in-95 duration-700">
            {/* Hero Header */}
            <div className="relative text-center py-8">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
                <h1 className="relative text-4xl font-black text-white drop-shadow-lg tracking-tight flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500 animate-bounce-slow" />
                    STATISTIQUES
                </h1>
                <p className="relative text-sm text-purple-200/60 font-medium uppercase tracking-widest mt-2">
                    Hall of Fame & Analytiques
                </p>
            </div>

            {gameHistory.length === 0 ? (
                <Card className="glass-premium border-white/10 p-12 text-center">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="h-10 w-10 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Aucune donnée</h3>
                    <p className="text-slate-400">Jouez quelques parties pour voir apparaître les statistiques !</p>
                </Card>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    {/* PODIUM Section (Top 3) */}
                    {playerStats.length > 0 && (
                        <div className="relative">
                            <Podium players={playerStats.slice(0, 3)} />
                        </div>
                    )}

                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={Trophy}
                            title="Total Parties"
                            value={totalGames}
                            colorClass="text-yellow-400"
                            index={0}
                        />
                        <StatCard
                            icon={Users}
                            title="Joueurs Uniques"
                            value={playerStats.length}
                            colorClass="text-blue-400"
                            index={1}
                        />
                        <StatCard
                            icon={Flame}
                            title="Meneur"
                            value={playerStats[0]?.name || "-"}
                            subtitle={`${playerStats[0]?.wins || 0} victoires`}
                            colorClass="text-orange-500"
                            index={2}
                        />
                        <StatCard
                            icon={Target}
                            title="Meilleur Score"
                            value={Math.min(...gameHistory.flatMap(g => g.players.map(p => p.finalScore)))}
                            subtitle="Record absolu"
                            colorClass="text-emerald-400"
                            index={3}
                        />
                    </div>

                    {/* Leaderboard Details */}
                    <Card className="glass-premium border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <Medal className="h-5 w-5 text-yellow-500" />
                                Classement Détaillé
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {playerStats.map((player, index) => (
                                <LeaderboardItem
                                    key={player.name}
                                    player={player}
                                    rank={index}
                                    wins={player.wins}
                                    avgScore={player.totalScore / player.gamesPlayed}
                                    colorIndex={index}
                                />
                            ))}
                        </CardContent>
                    </Card>

                    {/* Charts Section */}
                    {totalGames >= 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Evolution Chart */}
                            <Card className="glass-premium border-white/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-white">
                                        <TrendingUp className="h-5 w-5 text-sky-400" />
                                        Évolution des Scores
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            {playerStats.slice(0, 5).map((player, index) => {
                                                const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
                                                return (
                                                    <Line
                                                        key={player.name}
                                                        type="monotone"
                                                        dataKey={player.name}
                                                        stroke={color.stroke}
                                                        strokeWidth={3}
                                                        dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }}
                                                        activeDot={{ r: 6, stroke: '#fff' }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Win Distribution */}
                            <Card className="glass-premium border-white/10">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-white">
                                        <PieChart className="h-5 w-5 text-purple-400" />
                                        Distribution des Victoires
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={playerStats.slice(0, 5)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 'bold' }} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-slate-900/90 backdrop-blur border border-white/10 p-2 rounded shadow text-xs">
                                                                <span className="text-white font-bold">{payload[0].payload.name}</span>
                                                                <span className="text-slate-400 ml-2">{payload[0].value} victoires</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="wins" radius={[0, 4, 4, 0]} barSize={20}>
                                                {playerStats.slice(0, 5).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PLAYER_COLORS[index % PLAYER_COLORS.length].stroke} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Data Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Importer JSON
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exporter JSON
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

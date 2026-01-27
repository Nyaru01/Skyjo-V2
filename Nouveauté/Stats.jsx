import { useMemo, useRef } from 'react';
import { Trophy, TrendingUp, TrendingDown, Target, Award, Zap, Crown, Flame, Users, Download, Upload, Save, Star, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGameStore, selectGameHistory } from '../store/gameStore';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import AchievementsList from './AchievementsList';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar } from 'recharts';

// Palette de couleurs pour les joueurs (forced dark theme)
const PLAYER_COLORS = [
    { bg: 'bg-emerald-500', light: 'bg-emerald-900/30', text: 'text-emerald-300' },
    { bg: 'bg-[#1A4869]', light: 'bg-[#1A4869]/30', text: 'text-sky-300' },
    { bg: 'bg-purple-500', light: 'bg-purple-900/30', text: 'text-purple-300' },
    { bg: 'bg-amber-500', light: 'bg-amber-900/30', text: 'text-amber-300' },
    { bg: 'bg-rose-500', light: 'bg-rose-900/30', text: 'text-rose-300' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-900/30', text: 'text-cyan-300' },
    { bg: 'bg-orange-500', light: 'bg-orange-900/30', text: 'text-orange-300' },
    { bg: 'bg-pink-500', light: 'bg-pink-900/30', text: 'text-pink-300' },
];

// Animation variants
const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    })
};

// Stat Card Component
function StatCard({ icon: Icon, title, value, subtitle, colorClass = 'text-skyjo-blue', index, className, imageSrc }) {
    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
        >
            <Card className={cn("glass-premium shadow-lg hover:shadow-xl transition-shadow h-full rounded-[20px]", className)}>
                <CardContent className="p-4 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        {imageSrc ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md border border-white/10 shrink-0">
                                <img src={imageSrc} alt="Icon" className="w-full h-full object-cover scale-110" />
                            </div>
                        ) : (
                            <div className={cn(
                                "p-2 rounded-xl",
                                colorClass === 'text-skyjo-blue'
                                    ? 'bg-skyjo-blue/10 dark:bg-sky-900/20'
                                    : colorClass.replace('text-', 'bg-').replace('600', '900/30').replace('500', '900/30')
                            )}>
                                <Icon className={cn("h-5 w-5", colorClass)} />
                            </div>
                        )}
                        <div className="text-right">
                            <div className="text-2xl font-black text-slate-100">{value}</div>
                            <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
                        </div>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-300">{title}</div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Player Leaderboard Item
function LeaderboardItem({ player, rank, wins, avgScore, colorIndex }) {
    const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rank * 0.1 }}
            className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                color.light
            )}
        >
            {/* Rank Badge */}
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm",
                rank === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-glow-gold" :
                    rank === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500" :
                        rank === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800" :
                            color.bg
            )}>
                {rank === 0 ? <Crown className="h-4 w-4" /> : rank + 1}
            </div>

            {/* Player Info */}
            <div className="flex-1">
                <div className={cn("font-bold", color.text)}>{player.name}</div>
                <div className="text-xs text-slate-400">
                    Moy. {avgScore.toFixed(1)} pts/manche
                </div>
            </div>

            {/* Wins */}
            <div className="text-right">
                <div className="text-lg font-black text-slate-100">{wins}</div>
                <div className="text-xs text-slate-400">victoire{wins > 1 ? 's' : ''}</div>
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

    // Calculer toutes les statistiques
    const stats = useMemo(() => {
        if (gameHistory.length === 0) {
            return null;
        }

        // Stats globales
        const totalGames = gameHistory.length;
        const totalRounds = gameHistory.reduce((sum, g) => sum + g.rounds.length, 0);

        // Stats par joueur (agrégées par nom)
        const playerStats = {};

        gameHistory.forEach(game => {
            game.players.forEach((player, idx) => {
                const name = player.name;
                if (!playerStats[name]) {
                    playerStats[name] = {
                        name,
                        emoji: player.emoji,
                        wins: 0,
                        gamesPlayed: 0,
                        totalScore: 0,
                        roundsPlayed: 0,
                        bestRound: Infinity,
                        worstRound: -Infinity,
                        finishes: 0,
                        doubledFinishes: 0,
                        negativeRounds: 0
                    };
                }

                const ps = playerStats[name];
                ps.gamesPlayed++;
                ps.totalScore += player.finalScore;

                // Est-ce le gagnant ?
                if (idx === 0) {
                    ps.wins++;
                }

                // Analyse des manches
                const gameRoundsCount = game.rounds ? game.rounds.length : 0;

                if (gameRoundsCount > 0) {
                    game.rounds.forEach(round => {
                        const score = round.scores[player.id];
                        const rawScore = round.rawScores[player.id];

                        if (score !== undefined) {
                            ps.roundsPlayed++;
                            ps.bestRound = Math.min(ps.bestRound, score);
                            ps.worstRound = Math.max(ps.worstRound, score);

                            if (score < 0) ps.negativeRounds++;

                            if (round.finisherId === player.id) {
                                ps.finishes++;
                                if (score !== rawScore) {
                                    ps.doubledFinishes++;
                                }
                            }
                        }
                    });
                } else if (game.roundsPlayed) {
                    // Fallback for online/virtual games without detailed round history
                    ps.roundsPlayed += game.roundsPlayed;
                }
            });
        });

        // Convertir en array et trier par victoires
        const playersArray = Object.values(playerStats)
            .map(p => ({
                ...p,
                avgScore: p.roundsPlayed > 0 ? p.totalScore / p.gamesPlayed : 0,
                avgPerRound: p.roundsPlayed > 0 ? p.totalScore / p.roundsPlayed : 0,
                winRate: p.gamesPlayed > 0 ? (p.wins / p.gamesPlayed * 100) : 0,
                finishSuccessRate: p.finishes > 0 ? ((p.finishes - p.doubledFinishes) / p.finishes * 100) : 0
            }))
            .sort((a, b) => b.wins - a.wins);

        // Records
        const bestRoundEver = Math.min(...playersArray.map(p => p.bestRound).filter(s => s !== Infinity));
        const bestRoundPlayer = playersArray.find(p => p.bestRound === bestRoundEver);

        const mostWins = playersArray[0];
        const bestAvg = [...playersArray].sort((a, b) => a.avgPerRound - b.avgPerRound)[0];
        const mostNegatives = [...playersArray].sort((a, b) => b.negativeRounds - a.negativeRounds)[0];

        // Data for victory pie chart
        const victoryData = playersArray
            .filter(p => p.wins > 0)
            .map((p, idx) => ({
                name: p.name,
                value: p.wins,
                color: PLAYER_COLORS[idx % PLAYER_COLORS.length].bg.replace('bg-', '#')
            }));

        // Data for game types pie chart
        const typeCounts = { ai: 0, local: 0, online: 0 };
        gameHistory.forEach(g => {
            const type = g.gameType || 'local';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        const gameTypeData = [
            { name: 'IA', value: typeCounts.ai, color: '#1A4869' },
            { name: 'Local', value: typeCounts.local, color: '#10b981' },
            { name: 'En Ligne', value: typeCounts.online, color: '#a855f7' }
        ].filter(d => d.value > 0);

        // Radar Data for current player
        const mainPlayer = playersArray.find(p => p.name === useGameStore.getState().userProfile.name) || playersArray[0];
        const radarData = mainPlayer ? [
            { subject: 'Victoires', A: mainPlayer.winRate, fullMark: 100 },
            { subject: 'Agressivité', A: mainPlayer.finishSuccessRate, fullMark: 100 },
            { subject: 'Précision', A: Math.max(0, 100 - mainPlayer.avgPerRound), fullMark: 100 },
            { subject: 'Sang-froid', A: (mainPlayer.negativeRounds / Math.max(1, mainPlayer.roundsPlayed)) * 200, fullMark: 100 },
            { subject: 'Expérience', A: Math.min(100, (mainPlayer.gamesPlayed / 20) * 100), fullMark: 100 },
        ] : [];

        // Data for score evolution chart (last 5 games)
        const evolutionData = gameHistory.slice(0, 5).reverse().map((game, gIdx) => {
            const dataPoint = { name: `Partie ${gIdx + 1}` };
            game.players.forEach(p => {
                dataPoint[p.name] = p.finalScore;
            });
            return dataPoint;
        });

        return {
            totalGames,
            totalRounds,
            avgRoundsPerGame: totalRounds / totalGames,
            players: playersArray,
            victoryData,
            gameTypeData,
            radarData,
            evolutionData,
            records: {
                bestRound: bestRoundEver !== Infinity ? bestRoundEver : null,
                bestRoundPlayer,
                mostWins,
                bestAvg,
                mostNegatives
            }
        };
    }, [gameHistory]);

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <TrendingUp className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-300 mb-2">
                    Pas encore de statistiques
                </h3>
                <p className="text-sm text-slate-400 max-w-xs">
                    Jouez quelques parties pour voir vos statistiques apparaître ici !
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-skyjo-blue shadow-[0_0_15px_rgba(26,72,105,0.4)]">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-100">Statistiques</h2>
                        <p className="text-sm text-slate-400">
                            {stats.totalGames} partie{stats.totalGames > 1 ? 's' : ''} jouée{stats.totalGames > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    icon={Trophy}
                    title="Parties jouées"
                    value={stats.totalGames}
                    subtitle="total"
                    colorClass="text-amber-600"
                    index={0}
                />
                <StatCard
                    icon={Target}
                    title="Manches jouées"
                    value={stats.totalRounds}
                    subtitle={`~${stats.avgRoundsPerGame.toFixed(1)}/partie`}
                    colorClass="text-skyjo-blue"
                    index={1}
                />
                {stats.records.bestRound !== null && (
                    <StatCard
                        icon={TrendingDown}
                        title="Meilleur score manche"
                        value={stats.records.bestRound}
                        subtitle={stats.records.bestRoundPlayer?.name}
                        colorClass="text-skyjo-blue"
                        index={2}
                        className="col-span-2"
                    />
                )}
                {stats.records.mostNegatives && stats.records.mostNegatives.negativeRounds > 0 && (
                    <StatCard
                        icon={Flame}
                        title="Manches négatives"
                        value={stats.records.mostNegatives.negativeRounds}
                        subtitle={stats.records.mostNegatives.name}
                        colorClass="text-rose-600"
                        index={3}
                    />
                )}
                {/* Sauvegarde Card */}
                <motion.div
                    variants={cardVariants}
                    custom={3}
                    initial="hidden"
                    animate="visible"
                >
                    <Card className="glass-premium shadow-lg hover:shadow-xl transition-shadow h-full">
                        <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-2 rounded-lg bg-skyjo-blue/10 dark:bg-sky-900/20 text-skyjo-blue dark:text-sky-400">
                                    <Save className="h-5 w-5" />
                                </div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Sauvegarde</div>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full justify-start gap-2 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                    <Upload className="h-4 w-4 text-skyjo-blue" />
                                    Importer
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                    className="w-full justify-start gap-2 border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                    <Download className="h-4 w-4 text-skyjo-blue" />
                                    Exporter
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Level / XP Card */}
                <motion.div
                    variants={cardVariants}
                    custom={4}
                    initial="hidden"
                    animate="visible"
                >
                    <Card className="glass-premium shadow-lg hover:shadow-xl transition-shadow h-full rounded-[24px] relative overflow-hidden group">
                        {/* Background subtle glow */}
                        <div className="absolute top-0 right-0 p-16 bg-purple-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-purple-500/20 transition-colors duration-500" />

                        <CardContent className="p-4 flex flex-col justify-between h-full relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    <Star className="h-5 w-5 fill-purple-500/20" />
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-slate-100 tabular-nums">{level}</div>
                                    <div className="text-xs text-purple-300 font-medium tracking-wide uppercase">Niveau</div>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-end text-xs">
                                    <span className="text-slate-400 font-medium">Progression XP</span>
                                    <span className="text-purple-300 font-bold">{currentXP} <span className="text-slate-500 font-normal">/ 10</span></span>
                                </div>
                                {/* Progress Bar Container */}
                                <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(168,85,247,0.4)] relative"
                                        style={{ width: `${(currentXP / 10) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', transform: 'skewX(-20deg)' }}></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Score Evolution Chart */}
                <Card className="glass-premium shadow-lg border-white/5 rounded-[24px]">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-skyjo-blue" />
                            Évolution des scores
                        </h3>
                    </div>
                    <CardContent className="p-4 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    reversed={true} // Lower is better in Skyjo
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '12px',
                                        border: '1px solid #ffffff20',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ fontWeight: 'black' }}
                                />
                                {stats.players.slice(0, 3).map((p, idx) => (
                                    <Line
                                        key={p.name}
                                        type="monotone"
                                        dataKey={p.name}
                                        stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length].bg.replace('bg-', '#').replace('emerald-500', '#10b981').replace('[#1A4869]', '#1A4869').replace('purple-500', '#a855f7')}
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Victory Distribution Chart */}
                <Card className="glass-premium shadow-lg border-white/5 rounded-[24px]">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            Répartition des victoires
                        </h3>
                    </div>
                    <CardContent className="p-4 h-[250px] flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.victoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationDuration={1500}
                                >
                                    {stats.victoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color.replace('emerald-500', '#10b981').replace('blue-500', '#3b82f6').replace('purple-500', '#a855f7')} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '12px',
                                        border: '1px solid #ffffff20',
                                        fontSize: '12px'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="center"
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Radar Profile Chart */}
                <Card className="glass-premium shadow-lg border-white/5 rounded-[24px]">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-purple-400" />
                            Profil de jeu
                        </h3>
                    </div>
                    <CardContent className="p-4 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.radarData}>
                                <PolarGrid stroke="#ffffff20" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Joueur"
                                    dataKey="A"
                                    stroke="#a855f7"
                                    fill="#a855f7"
                                    fillOpacity={0.5}
                                    animationDuration={1500}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '12px',
                                        border: '1px solid #ffffff20',
                                        fontSize: '12px'
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Game Modes Distribution */}
                <Card className="glass-premium shadow-lg border-white/5 rounded-[24px]">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <Users className="h-4 w-4 text-emerald-400" />
                            Modes de jeu favoris
                        </h3>
                    </div>
                    <CardContent className="p-4 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.gameTypeData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '12px',
                                        border: '1px solid #ffffff20',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {stats.gameTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Achievements Section */}
            <AchievementsList />

            {/* Leaderboard */}
            <Card className="glass-premium shadow-xl overflow-hidden rounded-[24px]">
                <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        Classement des joueurs
                    </h3>
                </div>
                <CardContent className="p-4 space-y-2">
                    {stats.players.map((player, idx) => (
                        <LeaderboardItem
                            key={player.name}
                            player={player}
                            rank={idx}
                            wins={player.wins}
                            avgScore={player.avgPerRound}
                            colorIndex={idx}
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Player Details */}
            {stats.players.length > 0 && (
                <Card className="glass-premium shadow-lg rounded-[24px]">
                    <div className="p-4 border-b border-white/10">
                        <h3 className="font-bold text-slate-100 flex items-center gap-2">
                            <Users className="h-5 w-5 text-skyjo-blue" />
                            Détails par joueur
                        </h3>
                    </div>
                    <CardContent className="p-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                        <th className="pb-2 font-semibold">Joueur</th>
                                        <th className="pb-2 font-semibold text-center">Parties</th>
                                        <th className="pb-2 font-semibold text-center">%Win</th>
                                        <th className="pb-2 font-semibold text-center">Moy.</th>
                                        <th className="pb-2 font-semibold text-center group cursor-help relative">
                                            <div className="flex items-center justify-center gap-1">
                                                Finish
                                                <Info className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                                % de manches fermées par le joueur
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stats.players.map((player, idx) => {
                                        const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                                        return (
                                            <tr key={player.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("w-2 h-2 rounded-full", color.bg)}></span>
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">{player.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 text-center text-slate-600 dark:text-slate-400">{player.gamesPlayed}</td>
                                                <td className="py-2 text-center">
                                                    <span className={cn(
                                                        "font-bold",
                                                        player.winRate >= 50 ? "text-skyjo-blue dark:text-sky-400" : "text-slate-600 dark:text-slate-400"
                                                    )}>
                                                        {player.winRate.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="py-2 text-center font-mono text-slate-700 dark:text-slate-300">
                                                    {player.avgPerRound.toFixed(1)}
                                                </td>
                                                <td className="py-2 text-center">
                                                    <span className={cn(
                                                        "text-xs px-2 py-0.5 rounded-full font-medium",
                                                        player.finishSuccessRate >= 70
                                                            ? "bg-sky-100 text-skyjo-blue dark:bg-sky-900 dark:text-sky-300"
                                                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                    )}>
                                                        {player.finishSuccessRate.toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

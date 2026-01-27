import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Wifi, WifiOff, Loader2, Check, Edit2, Trash2, Play, Copy, Send, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useSocialStore } from '../store/socialStore';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { AVATARS } from '../lib/avatars';
import AvatarSelector from './AvatarSelector';
import { useFeedback } from '../hooks/useFeedback';
import Leaderboard from './Leaderboard';
import { useOnlineGameStore } from '../store/onlineGameStore';

export default function SocialDashboard(props) {
    const { userProfile, updateUserProfile, generateSkyId } = useGameStore();
    const {
        friends, fetchFriends, searchResults, isSearching,
        searchUsers, sendFriendRequest, acceptFriendRequest,
        clearSearchResults, socialNotification, setSocialNotification,
        registerUser, inviteFriend, leaderboard, globalLeaderboard, fetchLeaderboard, fetchGlobalLeaderboard
    } = useSocialStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
    const [newName, setNewName] = useState(userProfile.name);
    const [copySuccess, setCopySuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('friends');
    const [leaderboardType, setLeaderboardType] = useState('friends'); // 'friends' or 'global'
    const { playClick, playSocialNotify, playSocialInvite } = useFeedback();

    useEffect(() => {
        const initSocial = async () => {
            if (!userProfile?.id) return;
            const profileId = String(userProfile.id);
            fetchFriends(profileId);
            fetchLeaderboard(profileId);
            fetchGlobalLeaderboard();
            setSocialNotification(false); // Reset when data is explicitly refreshed
        };

        // Also reset when mounting the component
        setSocialNotification(false);

        initSocial();

        const interval = setInterval(() => {
            if (userProfile?.id) {
                const profileId = String(userProfile.id);
                fetchFriends(profileId);
                fetchLeaderboard(profileId);
                fetchGlobalLeaderboard();
            }
        }, 30000);

        return () => {
            clearInterval(interval);
        };
    }, [userProfile.id]);

    const handleUpdateName = () => {
        if (!newName.trim()) {
            setNewName(userProfile.name);
            setIsEditingName(false);
            return;
        }
        updateUserProfile({ name: newName });
        setIsEditingName(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        searchUsers(searchQuery);
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(userProfile.vibeId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const getAvatarPath = (id) => {
        return AVATARS.find(a => a.id === id)?.path || '/avatars/cat.png';
    };

    return (
        <div className="space-y-6">
            {/* Profil Card */}
            <Card className="glass-premium border-white/20 overflow-hidden rounded-[24px]">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative cursor-pointer group" onClick={() => setIsAvatarSelectorOpen(true)}>
                                <div className="w-16 h-16 rounded-full border-2 border-skyjo-blue/50 overflow-hidden bg-slate-800 shadow-xl shadow-skyjo-blue/20 group-hover:border-skyjo-blue transition-colors">
                                    <img src={getAvatarPath(userProfile.avatarId)} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-800 rounded-full border border-skyjo-blue/30 flex items-center justify-center shadow-lg group-hover:bg-skyjo-blue transition-colors">
                                    <Edit2 className="w-3 h-3 text-skyjo-blue group-hover:text-white" />
                                </div>
                            </div>
                            <div>
                                {isEditingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            className="bg-white/10 border-none outline-none rounded-lg px-3 py-1 text-sm w-32 text-white focus:ring-1 focus:ring-skyjo-blue"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            onBlur={handleUpdateName}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                                        <h3 className="font-black text-xl text-white">{userProfile.name}</h3>
                                        <Edit2 className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-mono font-bold bg-skyjo-blue/20 text-skyjo-blue px-2 py-0.5 rounded-full tracking-wider border border-skyjo-blue/30">
                                        {userProfile.vibeId}
                                    </span>
                                    <button
                                        onClick={handleCopyId}
                                        className="text-slate-400 hover:text-white transition-colors"
                                    >
                                        {copySuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Niveau {useGameStore.getState().level || 1}</p>
                            <div className="w-20 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-skyjo-blue to-emerald-400"
                                    style={{ width: `${(useGameStore.getState().currentXP || 0) * 10}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Navigation */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
                <button
                    onClick={() => { setActiveTab('friends'); playClick(); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'friends' ? 'bg-skyjo-blue text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Users className="w-4 h-4" />
                    Amis
                </button>
                <button
                    onClick={() => { setActiveTab('leaderboard'); playClick(); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-skyjo-blue text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Trophy className="w-4 h-4" />
                    Classement
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'friends' ? (
                    <motion.div
                        key="friends"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-slate-500 group-focus-within:text-skyjo-blue transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Rechercher un VibeID ou un nom..."
                                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-skyjo-blue/30 transition-all backdrop-blur-md"
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-5 h-5 animate-spin text-skyjo-blue" />
                                </div>
                            )}
                        </form>

                        {/* Search Results */}
                        <AnimatePresence>
                            {searchResults.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center justify-between px-2">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Résultats</p>
                                        <button onClick={clearSearchResults} className="text-[10px] text-slate-400 hover:text-white underline">Fermer</button>
                                    </div>
                                    {searchResults.map(u => (
                                        <Card key={u.id} className="glass-premium border-white/10 p-4 rounded-[20px]">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                                        <img src={getAvatarPath(u.avatar_id)} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{u.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">@{u.vibe_id.replace('#', '')}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" className="border-skyjo-blue/30 text-skyjo-blue hover:bg-skyjo-blue/10 h-8 rounded-full text-xs font-bold" onClick={() => sendFriendRequest(userProfile.id, u.id)}>
                                                    AJOUTER
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Friends List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                                    <Users className="w-3 h-3" />
                                    Mes Amis ({friends.length})
                                </p>
                            </div>

                            <div className="space-y-3">
                                {friends.length === 0 ? (
                                    <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="w-8 h-8 text-slate-600 mb-2" />
                                            <p className="text-sm text-slate-400 font-medium">Pas encore d'amis à afficher.</p>
                                            <p className="text-[10px] text-slate-600 uppercase">Partagez votre VibeID pour commencer !</p>
                                        </div>
                                    </Card>
                                ) : (
                                    friends.map(f => (
                                        <motion.div
                                            key={f.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <Card className={`glass-premium border-white/10 p-4 group transition-all duration-300 rounded-[20px] ${f.status === 'PENDING' ? 'opacity-60 grayscale' : 'hover:border-skyjo-blue/30'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                                                                <img src={getAvatarPath(f.avatar_id)} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${f.currentStatus === 'IN_GAME' ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' :
                                                                f.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                                    'bg-slate-600'
                                                                } ${['ONLINE', 'IN_GAME'].includes(f.currentStatus || (f.isOnline ? 'ONLINE' : 'OFFLINE')) ? 'animate-pulse' : ''}`} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-black text-white text-sm">{f.name}</p>
                                                                {f.status === 'PENDING' && (
                                                                    <span className="text-[8px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-400 border border-white/5">
                                                                        EN ATTENTE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] font-bold flex items-center gap-1.5 ${f.currentStatus === 'IN_GAME' ? 'text-purple-400' :
                                                                f.isOnline ? 'text-green-500/80 shadow-green-500/10' :
                                                                    'text-slate-500'
                                                                }`}>
                                                                {f.currentStatus === 'IN_GAME' ? <><Play className="w-3 h-3" /> En jeu</> :
                                                                    f.isOnline ? <><Wifi className="w-3 h-3" /> En ligne</> :
                                                                        <><WifiOff className="w-3 h-3" /> Hors ligne</>}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {f.status === 'PENDING' && f.requester_id !== userProfile.id ? (
                                                            <Button size="sm" className="bg-skyjo-blue text-white font-black text-[10px] h-8 rounded-full shadow-lg shadow-skyjo-blue/20" onClick={() => {
                                                                acceptFriendRequest(userProfile.id, f.id);
                                                                playSocialNotify();
                                                            }}>
                                                                ACCEPTER
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                {f.isOnline && f.status === 'ACCEPTED' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-10 w-10 p-0 text-skyjo-blue hover:bg-skyjo-blue/10 bg-skyjo-blue/5 rounded-full"
                                                                        onClick={() => {
                                                                            const onlineRoomCode = useOnlineGameStore.getState().roomCode;
                                                                            if (onlineRoomCode) {
                                                                                inviteFriend(f.id, onlineRoomCode, userProfile.name);
                                                                                playSocialInvite();
                                                                            } else {
                                                                                // Auto-create room and invite
                                                                                useOnlineGameStore.getState().createRoomAndInvite(f.id);
                                                                                playSocialInvite();
                                                                            }
                                                                            // Switch to game tab and set it to lobby
                                                                            if (props?.setVirtualScreen) {
                                                                                props.setVirtualScreen('lobby');
                                                                            }
                                                                            if (props?.setActiveTab) {
                                                                                props.setActiveTab('virtual');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Send className="w-5 h-5" />
                                                                    </Button>
                                                                )}

                                                                {/* Delete Button */}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-10 w-10 p-0 text-slate-500 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-colors"
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('Supprimer cet ami ?')) {
                                                                            await useSocialStore.getState().deleteFriend(userProfile.id, f.id);
                                                                            playClick();
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="leaderboard"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Leaderboard
                            data={leaderboardType === 'friends' ? leaderboard : globalLeaderboard}
                            currentUserId={userProfile.id}
                            type={leaderboardType}
                            setType={(t) => { setLeaderboardType(t); playClick(); }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AvatarSelector
                isOpen={isAvatarSelectorOpen}
                onClose={() => setIsAvatarSelectorOpen(false)}
                selectedId={userProfile.avatarId}
                onSelect={(avatarId) => {
                    updateUserProfile({ avatarId });
                    setIsAvatarSelectorOpen(false);
                }}
            />

            {
                socialNotification && (
                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-skyjo-blue text-white text-[10px] font-black px-4 py-2 rounded-full shadow-2xl animate-bounce z-50">
                        SOCIAL : NOUVEAU !
                    </div>
                )
            }
        </div >
    );
}

import { create } from 'zustand';
import { useGameStore } from './gameStore';
import { socket } from './onlineGameStore';

// Removed separate socket initialization to avoid double connections
// const socket = io(window.location.origin);

export const useSocialStore = create((set, get) => ({
    friends: [],
    searchResults: [],
    isSearching: false,
    isLoading: false,
    pendingInvitations: [],
    socialNotification: false,
    leaderboard: [],
    globalLeaderboard: [],

    setSocialNotification: (val) => set({ socialNotification: val }),

    registerUser: (id, name, emoji, vibeId) => {
        socket.emit('register_user', { id, name, emoji, vibeId });
    },

    fetchFriends: async (userId) => {
        if (!userId) return;
        set({ isLoading: true });
        try {
            const res = await fetch(`/api/social/friends/${userId}`);
            if (res.ok) {
                const data = await res.json();
                set({ friends: data });
            }
        } catch (err) {
            console.error('[SOCIAL] Fetch friends error:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    searchUsers: async (query) => {
        if (!query.trim()) return;
        set({ isSearching: true });
        try {
            const res = await fetch(`/api/social/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                const currentUserId = useGameStore.getState().userProfile?.id;
                set({ searchResults: data.filter(u => u.id !== currentUserId) });
            }
        } catch (err) {
            console.error('[SOCIAL] Search error:', err);
        } finally {
            set({ isSearching: false });
        }
    },

    sendFriendRequest: async (userId, friendId) => {
        try {
            const res = await fetch('/api/social/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, friendId })
            });
            return res.ok;
        } catch (err) {
            console.error('[SOCIAL] Request error:', err);
            return false;
        }
    },

    acceptFriendRequest: async (userId, friendId) => {
        try {
            const res = await fetch('/api/social/friends/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, friendId })
            });
            if (res.ok) {
                get().fetchFriends(userId);
            }
            return res.ok;
        } catch (err) {
            console.error('[SOCIAL] Accept error:', err);
            return false;
        }
    },

    inviteFriend: (friendId, roomCode, fromName) => {
        socket.emit('invite_friend', { friendId, roomCode, fromName });
    },

    fetchLeaderboard: async (userId) => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/social/leaderboard/${userId}`);
            if (res.ok) {
                const data = await res.json();
                set({ leaderboard: data });
            }
        } catch (err) {
            console.error('[SOCIAL] Fetch leaderboard error:', err);
        }
    },

    fetchGlobalLeaderboard: async () => {
        try {
            const res = await fetch('/api/social/leaderboard/global');
            if (res.ok) {
                const data = await res.json();
                set({ globalLeaderboard: data });
            }
        } catch (err) {
            console.error('[SOCIAL] Fetch global leaderboard error:', err);
        }
    },

    clearSearchResults: () => set({ searchResults: [] }),

    updatePresence: (userId, status) => {
        set(state => ({
            friends: state.friends.map(f =>
                f.id === userId ? { ...f, isOnline: status !== 'OFFLINE', currentStatus: status } : f
            )
        }));
    }
}));

// Socket listeners
socket.on('friend_request', () => {
    useSocialStore.getState().setSocialNotification(true);
});

socket.on('game_invitation', (invitation) => {
    useSocialStore.getState().setSocialNotification(true);
});

socket.on('user_presence_update', ({ userId, status }) => {
    useSocialStore.getState().updatePresence(userId, status);
});

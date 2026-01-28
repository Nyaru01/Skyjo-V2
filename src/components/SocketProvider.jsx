import React, { createContext, useContext, useEffect, useRef } from 'react';
import { socket, useOnlineGameStore } from '../store/onlineGameStore';
import { useGameStore } from '../store/gameStore';
import { useSocialStore } from '../store/socialStore';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const setSocketId = useOnlineGameStore(state => state.setSocketId);
    // Use ref to track if we've set up the persistent listener
    const listenerSetupRef = useRef(false);

    useEffect(() => {
        // CRITICAL: Only set up listeners ONCE for the entire app lifecycle
        if (listenerSetupRef.current) return;
        listenerSetupRef.current = true;

        // Handler that registers user on EVERY connect event
        const handleConnectAndRegister = () => {
            console.log('[SOCKET] Global Connected:', socket.id);
            if (socket.id) setSocketId(socket.id);

            // Auto-register user for presence on EVERY reconnection
            const profile = useGameStore.getState().userProfile;
            const { registerUser } = useSocialStore.getState();

            if (profile?.id && socket?.connected) {
                console.log('[SOCKET] Auto-registering user on connect:', profile.name);
                registerUser(profile.id, profile.name, profile.emoji, profile.vibeId);
            }
        };

        const onDisconnect = (reason) => {
            console.warn('[SOCKET] Global Disconnected:', reason);
        };

        const onConnectError = (err) => {
            console.error('[SOCKET] Connection Error:', err);
        };

        socket.on('connect', handleConnectAndRegister);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // Connect if not already
        if (!socket.connected) {
            console.log('[SOCKET] Initiating Global Connection...');
            socket.connect();
        } else {
            // Already connected, trigger registration now
            handleConnectAndRegister();
        }

        // NO CLEANUP - these listeners must persist forever
        // We use the ref to ensure they're only added once
    }, [setSocketId]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext) || socket;
}

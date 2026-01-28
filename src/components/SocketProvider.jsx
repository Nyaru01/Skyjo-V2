import React, { createContext, useContext, useEffect, useRef } from 'react';
import { socket, useOnlineGameStore } from '../store/onlineGameStore';
import { useGameStore } from '../store/gameStore';
import { useSocialStore } from '../store/socialStore';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const setSocketId = useOnlineGameStore(state => state.setSocketId);
    const isConnected = useOnlineGameStore(state => state.isConnected);

    // Subscribe to profile changes
    const userProfile = useGameStore(state => state.userProfile);

    // Use ref to track if we've set up the persistent listener
    const listenerSetupRef = useRef(false);
    // Track if user has been registered this session
    const hasRegisteredRef = useRef(false);

    // Effect 1: Set up socket listeners ONCE
    useEffect(() => {
        if (listenerSetupRef.current) return;
        listenerSetupRef.current = true;

        const handleConnect = () => {
            console.log('[SOCKET] Global Connected:', socket.id);
            if (socket.id) setSocketId(socket.id);

            // Try to register immediately if profile exists
            const profile = useGameStore.getState().userProfile;
            if (profile?.id) {
                console.log('[SOCKET] Registering on connect:', profile.name);
                useSocialStore.getState().registerUser(profile.id, profile.name, profile.emoji, profile.vibeId);
                hasRegisteredRef.current = true;
            }
        };

        const onDisconnect = (reason) => {
            console.warn('[SOCKET] Global Disconnected:', reason);
            hasRegisteredRef.current = false; // Reset so we re-register on reconnect
        };

        const onConnectError = (err) => {
            console.error('[SOCKET] Connection Error:', err);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        if (!socket.connected) {
            console.log('[SOCKET] Initiating Global Connection...');
            socket.connect();
        } else {
            handleConnect();
        }
    }, [setSocketId]);

    // Effect 2: Register when profile becomes available (if not already registered)
    useEffect(() => {
        if (userProfile?.id && socket.connected && !hasRegisteredRef.current) {
            console.log('[SOCKET] Late registration (profile loaded):', userProfile.name);
            useSocialStore.getState().registerUser(
                userProfile.id,
                userProfile.name,
                userProfile.emoji,
                userProfile.vibeId
            );
            hasRegisteredRef.current = true;
        }
    }, [userProfile?.id, userProfile?.vibeId, isConnected]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext) || socket;
}

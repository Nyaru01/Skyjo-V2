import React, { createContext, useContext, useEffect } from 'react';
import { socket, useOnlineGameStore } from '../store/onlineGameStore';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const setSocketId = useOnlineGameStore(state => state.setSocketId);

    useEffect(() => {
        // Global listeners for debugging connection health
        const onConnect = () => {
            console.log('[SOCKET] Global Connected:', socket.id);
            // Sync ID to store immediately
            if (socket.id) setSocketId(socket.id);
        };

        const onDisconnect = (reason) => {
            console.warn('[SOCKET] Global Disconnected:', reason);
        };

        const onConnectError = (err) => {
            console.error('[SOCKET] Connection Error:', err);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);

        // Connect if not already
        if (!socket.connected) {
            console.log('[SOCKET] Initiating Global Connection...');
            socket.connect();
        }

        // CLEANUP: We DO NOT disconnect here on unmount
        // The goal is persistence across the entire session
        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
        };
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

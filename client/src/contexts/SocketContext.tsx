import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Call, Caller } from '../types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinRole: (role: 'screener' | 'host') => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  joinRole: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to Socket.io server
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to Socket.io server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from Socket.io server');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinRole = (role: 'screener' | 'host') => {
    if (socket) {
      socket.emit('join:role', role);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinRole }}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hooks for specific socket events
export const useCallEvents = (
  onCallCreated?: (call: Call) => void,
  onCallUpdated?: (call: Call) => void,
  onCallDeleted?: (callId: string) => void
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleCallCreated = (call: Call) => {
      console.log('Call created:', call);
      onCallCreated?.(call);
    };

    const handleCallUpdated = (call: Call) => {
      console.log('Call updated:', call);
      onCallUpdated?.(call);
    };

    const handleCallDeleted = (callId: string) => {
      console.log('Call deleted:', callId);
      onCallDeleted?.(callId);
    };

    socket.on('call:created', handleCallCreated);
    socket.on('call:updated', handleCallUpdated);
    socket.on('call:deleted', handleCallDeleted);

    return () => {
      socket.off('call:created', handleCallCreated);
      socket.off('call:updated', handleCallUpdated);
      socket.off('call:deleted', handleCallDeleted);
    };
  }, [socket, onCallCreated, onCallUpdated, onCallDeleted]);
};

export const useCallerEvents = (
  onCallerCreated?: (caller: Caller) => void,
  onCallerUpdated?: (caller: Caller) => void
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleCallerCreated = (caller: Caller) => {
      console.log('Caller created:', caller);
      onCallerCreated?.(caller);
    };

    const handleCallerUpdated = (caller: Caller) => {
      console.log('Caller updated:', caller);
      onCallerUpdated?.(caller);
    };

    socket.on('caller:created', handleCallerCreated);
    socket.on('caller:updated', handleCallerUpdated);

    return () => {
      socket.off('caller:created', handleCallerCreated);
      socket.off('caller:updated', handleCallerUpdated);
    };
  }, [socket, onCallerCreated, onCallerUpdated]);
};
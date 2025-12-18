import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SocketContext = createContext(null);

// Supabase client for realtime
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we should use Socket.IO (local dev) or Supabase Realtime (production)
const useSocketIO = window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [supabase, setSupabase] = useState(null);
  const [listeners, setListeners] = useState({});

  useEffect(() => {
    if (useSocketIO) {
      // Use Socket.IO for local development
      import('socket.io-client').then(({ io }) => {
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;
        const socketInstance = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect', () => {
          console.log('Socket connected:', socketInstance.id);
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        setSocket(socketInstance);
      });
    } else if (supabaseUrl && supabaseKey) {
      // Use Supabase Realtime for production
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      setIsConnected(true);

      // Subscribe to orders table changes
      const ordersChannel = client
        .channel('orders-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          console.log('Order change:', payload);
          // Trigger registered listeners
          if (payload.eventType === 'INSERT' && listeners['order:new']) {
            listeners['order:new'](payload.new);
          }
          if (payload.eventType === 'UPDATE' && listeners['order:status']) {
            listeners['order:status'](payload.new);
          }
        })
        .subscribe();

      // Subscribe to products table changes
      const productsChannel = client
        .channel('products-changes')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'products' 
        }, (payload) => {
          console.log('Product change:', payload);
          if (listeners['menu:update']) {
            listeners['menu:update'](payload.new);
          }
        })
        .subscribe();

      return () => {
        ordersChannel.unsubscribe();
        productsChannel.unsubscribe();
      };
    } else {
      // Fallback: polling mode
      console.log('Running in polling mode (no realtime)');
      setIsConnected(true);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Create a socket-like interface for compatibility
  const socketInterface = {
    on: useCallback((event, callback) => {
      if (socket) {
        socket.on(event, callback);
      } else {
        // Store listener for Supabase realtime
        setListeners(prev => ({ ...prev, [event]: callback }));
      }
    }, [socket]),
    off: useCallback((event) => {
      if (socket) {
        socket.off(event);
      } else {
        setListeners(prev => {
          const newListeners = { ...prev };
          delete newListeners[event];
          return newListeners;
        });
      }
    }, [socket]),
    emit: useCallback((event, data) => {
      if (socket) {
        socket.emit(event, data);
      }
      // Supabase doesn't need emit - changes are detected via realtime subscriptions
    }, [socket]),
  };

  return (
    <SocketContext.Provider value={{ socket: socketInterface, isConnected, supabase }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}


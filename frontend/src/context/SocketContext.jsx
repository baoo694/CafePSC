import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SocketContext = createContext(null);

// Supabase client for realtime
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we should use Socket.IO (local dev) or Supabase Realtime (production)
const useSocketIO = window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

// Create Supabase client outside component
const supabaseClient = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  // Fetch complete order with order_items
  const fetchCompleteOrder = async (orderId) => {
    if (!supabaseClient) return null;
    
    const { data, error } = await supabaseClient
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (*)
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (error) {
      console.error('Error fetching order:', error);
      return null;
    }
    return data;
  };

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
    } else if (supabaseClient) {
      // Use Supabase Realtime for production
      console.log('Setting up Supabase Realtime...');
      setIsConnected(true);

      // Subscribe to orders table changes
      const ordersChannel = supabaseClient
        .channel('db-orders')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        }, async (payload) => {
          console.log('New order:', payload);
          const completeOrder = await fetchCompleteOrder(payload.new.id);
          if (completeOrder && listenersRef.current['order:new']) {
            listenersRef.current['order:new'](completeOrder);
          }
        })
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders' 
        }, async (payload) => {
          console.log('Order updated:', payload);
          const completeOrder = await fetchCompleteOrder(payload.new.id);
          if (completeOrder) {
            if (payload.new.status === 'cancelled' && listenersRef.current['order:cancelled']) {
              listenersRef.current['order:cancelled'](completeOrder);
            } else if (listenersRef.current['order:status']) {
              listenersRef.current['order:status'](completeOrder);
            }
          }
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          console.log('Order deleted:', payload);
          if (listenersRef.current['orders:reset']) {
            listenersRef.current['orders:reset']();
          }
        })
        .subscribe((status) => {
          console.log('Orders channel status:', status);
        });

      // Subscribe to products table changes
      const productsChannel = supabaseClient
        .channel('db-products')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'products' 
        }, (payload) => {
          console.log('Product updated:', payload);
          if (listenersRef.current['menu:update']) {
            listenersRef.current['menu:update'](payload.new);
          }
        })
        .subscribe((status) => {
          console.log('Products channel status:', status);
        });

      return () => {
        console.log('Cleaning up Supabase channels...');
        supabaseClient.removeChannel(ordersChannel);
        supabaseClient.removeChannel(productsChannel);
      };
    } else {
      // Fallback: polling mode
      console.log('Running in polling mode (no realtime) - missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
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
        // Store listener for Supabase realtime using ref
        listenersRef.current[event] = callback;
      }
    }, [socket]),
    off: useCallback((event) => {
      if (socket) {
        socket.off(event);
      } else {
        delete listenersRef.current[event];
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
    <SocketContext.Provider value={{ socket: socketInterface, isConnected, supabase: supabaseClient }}>
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


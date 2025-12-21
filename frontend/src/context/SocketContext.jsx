import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SocketContext = createContext(null);

// Supabase client for realtime
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we should use Socket.IO (local dev) or Supabase Realtime (production)
const useSocketIO = window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

// Create Supabase client outside component với config tối ưu
const supabaseClient = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: {
        // Tối ưu Realtime connections
        params: {
          eventsPerSecond: 10, // Giới hạn events để giảm load
        },
      },
      global: {
        headers: {
          'x-client-info': 'cafepsc-frontend',
        },
      },
    }) 
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
      if (import.meta.env.DEV) {
        console.log('Setting up Supabase Realtime...');
      }
      setIsConnected(true);

      // Tối ưu: Sử dụng MỘT channel duy nhất thay vì 2 channels riêng biệt
      // Giúp giảm số lượng connections từ 2 xuống 1 per user
      const mainChannel = supabaseClient
        .channel('cafepsc-main', {
          config: {
            // Tối ưu broadcast và presence
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        // Orders: INSERT
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        }, async (payload) => {
          // Debug log chỉ trong development
          if (import.meta.env.DEV) {
            console.log('New order:', payload);
          }
          const completeOrder = await fetchCompleteOrder(payload.new.id);
          if (completeOrder && listenersRef.current['order:new']) {
            listenersRef.current['order:new'](completeOrder);
          }
        })
        // Orders: UPDATE
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders' 
        }, async (payload) => {
          // Debug log chỉ trong development
          if (import.meta.env.DEV) {
            console.log('Order updated:', payload);
          }
          const completeOrder = await fetchCompleteOrder(payload.new.id);
          if (completeOrder) {
            if (payload.new.status === 'cancelled' && listenersRef.current['order:cancelled']) {
              listenersRef.current['order:cancelled'](completeOrder);
            } else if (listenersRef.current['order:status']) {
              listenersRef.current['order:status'](completeOrder);
            }
          }
        })
        // Orders: DELETE
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          // Debug log chỉ trong development
          if (import.meta.env.DEV) {
            console.log('Order deleted:', payload);
          }
          if (listenersRef.current['order:deleted']) {
            listenersRef.current['order:deleted'](payload.old.id);
          }
        })
        // Products: UPDATE (chỉ cần UPDATE, không cần INSERT/DELETE)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'products' 
        }, (payload) => {
          // Debug log chỉ trong development
          if (import.meta.env.DEV) {
            console.log('Product updated:', payload);
          }
          if (listenersRef.current['menu:update']) {
            listenersRef.current['menu:update'](payload.new);
          }
        })
        .subscribe((status) => {
          if (import.meta.env.DEV) {
            console.log('Main channel status:', status);
          }
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });

      return () => {
        if (import.meta.env.DEV) {
          console.log('Cleaning up Supabase channel...');
        }
        if (mainChannel) {
          supabaseClient.removeChannel(mainChannel);
        }
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


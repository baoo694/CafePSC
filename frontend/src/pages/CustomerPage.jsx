import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { fetchProducts, fetchOrders, createOrder, cancelOrder } from '../api';
import toast from 'react-hot-toast';
import { 
  Coffee, ShoppingCart, X, Plus, Minus, Clock, 
  CheckCircle2, Loader2, ArrowLeft, Wifi, WifiOff,
  Bell, ClipboardList
} from 'lucide-react';
import MenuCard from '../components/MenuCard';
import CartDrawer from '../components/CartDrawer';
import CustomizeModal from '../components/CustomizeModal';
import OrderHistoryDrawer from '../components/OrderHistoryDrawer';
import ActiveOrderBanner from '../components/ActiveOrderBanner';
import CustomerInfoModal from '../components/CustomerInfoModal';
import styles from './CustomerPage.module.css';

export default function CustomerPage() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDeliveryAddress, setCustomerDeliveryAddress] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [pendingDirectOrder, setPendingDirectOrder] = useState(null); // { product, options, quantity }
  const [orderNote, setOrderNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Get customer info from localStorage (optional - can be empty initially)
  useEffect(() => {
    const name = localStorage.getItem('customerName') || '';
    const phone = localStorage.getItem('customerPhone') || '';
    const deliveryAddress = localStorage.getItem('customerDeliveryAddress') || '';
    
    setCustomerName(name);
    setCustomerPhone(phone);
    setCustomerDeliveryAddress(deliveryAddress);
  }, []);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, ordersData] = await Promise.all([
          fetchProducts(),
          fetchOrders(),
        ]);
        setProducts(productsData);
        setAllOrders(ordersData);
        // Filter orders by customer name AND phone to ensure uniqueness
        if (customerName && customerPhone) {
          setOrders(ordersData.filter(o => 
            o.customer_name === customerName && o.phone === customerPhone
          ));
        } else {
          setOrders([]);
        }
        setIsLoading(false);
      } catch (error) {
        toast.error('Không thể tải dữ liệu');
        setIsLoading(false);
      }
    }
    loadData();
  }, [customerName, customerPhone]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    if (customerName) {
      socket.emit('join:customer', customerName);
    }

    // Menu updates
    socket.on('menu:update', (product) => {
      setProducts(prev => prev.map(p => 
        p.id === product.id ? product : p
      ));
      if (!product.is_available) {
        // Remove unavailable items from cart
        setCart(prev => prev.filter(item => item.product.id !== product.id));
        toast(`${product.name} hiện không còn`, { icon: '⚠️' });
      }
    });

    // New order (for tracking)
    socket.on('order:new', (order) => {
      setAllOrders(prev => {
        // Check if order already exists to prevent duplicates
        const exists = prev.some(o => o.id === order.id);
        if (exists) return prev;
        return [order, ...prev];
      });
      if (order.customer_name === customerName && order.phone === customerPhone) {
        setOrders(prev => {
          // Check if order already exists to prevent duplicates
          const exists = prev.some(o => o.id === order.id);
          if (exists) return prev;
          return [order, ...prev];
        });
        toast.success('Đơn hàng đã được gửi!');
      }
    });

    // Order status updates
    socket.on('order:status', (order) => {
      setAllOrders(prev => prev.map(o => o.id === order.id ? order : o));
      // Only update if it's the current customer's order
      if (order.customer_name === customerName && order.phone === customerPhone) {
        setOrders(prev => prev.map(o => 
          o.id === order.id ? order : o
        ));
        const statusMessages = {
          making: '🔥 Đơn hàng đang được pha chế!',
          done: '✅ Đơn hàng đã xong! Mời bạn lấy đồ.',
        };
        if (statusMessages[order.status]) {
          toast(statusMessages[order.status], { duration: 5000 });
        }
      }
    });

    // Orders reset - keep completed orders
    socket.on('orders:reset', () => {
      setAllOrders(prev => prev.filter(o => o.status === 'done'));
      setOrders(prev => prev.filter(o => o.status === 'done'));
      toast('Đơn hàng đã được reset', { icon: '🔄' });
    });

    // Order cancelled
    socket.on('order:cancelled', (order) => {
      setAllOrders(prev => prev.map(o => o.id === order.id ? order : o));
      // Only update if it's the current customer's order
      if (order.customer_name === customerName && order.phone === customerPhone) {
        setOrders(prev => prev.map(o => 
          o.id === order.id ? order : o
        ));
        toast('Đơn hàng đã được hủy', { icon: '❌' });
      }
    });

    // Order deleted (admin action)
    socket.on('order:deleted', (data) => {
      const orderId = typeof data === 'object' ? data.id : data;
      setAllOrders(prev => prev.filter(o => o.id !== orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    });

    return () => {
      socket.off('menu:update');
      socket.off('order:new');
      socket.off('order:status');
      socket.off('orders:reset');
      socket.off('order:cancelled');
      socket.off('order:deleted');
    };
  }, [socket, customerName, customerPhone]);

  // Add to cart with customization
  const handleAddToCart = useCallback((product) => {
    setCustomizingItem(product);
  }, []);

  const handleConfirmCustomization = useCallback((product, options, quantity = 1) => {
    setCart(prev => {
      // Check if same product with same options exists
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id &&
        item.options.size === options.size &&
        item.options.sugar === options.sugar &&
        item.options.ice === options.ice
      );

      if (existingIndex !== -1) {
        // Update quantity of existing item
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      // Add new item
      return [...prev, { 
        product, 
        options,
        quantity,
        id: Date.now() + Math.random()
      }];
    });
    setCustomizingItem(null);
    toast.success(`Đã thêm ${quantity} ${product.name} vào giỏ`);
  }, []);

  // Remove from cart
  const handleRemoveFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Update cart item quantity
  const handleUpdateQuantity = useCallback((itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return null;
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(Boolean));
  }, []);

  // Handle customer info confirmation
  const handleCustomerInfoConfirm = async (info) => {
    setCustomerName(info.name);
    setCustomerPhone(info.phone);
    setCustomerDeliveryAddress(info.deliveryAddress);
    
    // Save to localStorage
    localStorage.setItem('customerName', info.name);
    localStorage.setItem('customerPhone', info.phone);
    localStorage.setItem('customerDeliveryAddress', info.deliveryAddress);
    
    setIsInfoModalOpen(false);
    
    // Check if this is a direct order from modal
    if (pendingDirectOrder) {
      // Place order directly with the product from modal
      const { product, options, quantity } = pendingDirectOrder;
      setPendingDirectOrder(null);
      
      setIsSubmitting(true);
      try {
        const orderData = {
          customer_name: info.name,
          phone: info.phone,
          delivery_address: info.deliveryAddress,
          note: '',
          items: [{
            product_id: product.id,
            quantity: quantity,
            options: options,
          }],
        };

        const newOrder = await createOrder(orderData);
        
        // Update orders state immediately
        setAllOrders(prev => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev;
          return [newOrder, ...prev];
        });
        
        // Update customer orders if it matches
        if (newOrder.customer_name === info.name && newOrder.phone === info.phone) {
          setOrders(prev => {
            const exists = prev.some(o => o.id === newOrder.id);
            if (exists) return prev;
            return [newOrder, ...prev];
          });
        }
        
        toast.success('Đơn hàng đã được gửi!');
      } catch (error) {
        toast.error('Không thể đặt hàng. Vui lòng thử lại.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Proceed with order from cart
      submitOrder(info);
    }
  };

  // Submit order (internal function)
  const submitOrder = async (customerInfo = null) => {
    if (cart.length === 0) return;

    const finalName = customerInfo?.name || customerName;
    const finalPhone = customerInfo?.phone || customerPhone;
    const finalAddress = customerInfo?.deliveryAddress || customerDeliveryAddress;

    if (!finalName || !finalPhone || !finalAddress) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: finalName,
        phone: finalPhone,
        delivery_address: finalAddress,
        note: orderNote,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          options: item.options,
        })),
      };

      const newOrder = await createOrder(orderData);
      
      // Update orders state immediately
      setAllOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
      
      // Update customer orders if it matches
      if (newOrder.customer_name === finalName && newOrder.phone === finalPhone) {
        setOrders(prev => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev;
          return [newOrder, ...prev];
        });
      }
      
      setCart([]);
      setOrderNote('');
      setIsCartOpen(false);
    } catch (error) {
      toast.error('Không thể đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Place order (check info first)
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    // Check if customer info is complete
    if (!customerName || !customerPhone || !customerDeliveryAddress) {
      // Show info modal
      setIsInfoModalOpen(true);
    } else {
      // Proceed directly
      submitOrder();
    }
  };

  // Place order directly from modal (without adding to cart)
  const handlePlaceOrderDirect = useCallback(async (product, options, quantity) => {
    // Check if customer info is complete
    if (!customerName || !customerPhone || !customerDeliveryAddress) {
      // Store product info temporarily to place order after info is confirmed
      setPendingDirectOrder({ product, options, quantity });
      setCustomizingItem(null); // Close customize modal
      setIsInfoModalOpen(true); // Open info modal
      return;
    }

    // Place order directly
    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: customerName,
        phone: customerPhone,
        delivery_address: customerDeliveryAddress,
        note: '',
        items: [{
          product_id: product.id,
          quantity: quantity,
          options: options,
        }],
      };

      const newOrder = await createOrder(orderData);
      setCustomizingItem(null);
      
      // Update orders state immediately
      setAllOrders(prev => {
        const exists = prev.some(o => o.id === newOrder.id);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
      
      // Update customer orders if it matches
      if (newOrder.customer_name === customerName && newOrder.phone === customerPhone) {
        setOrders(prev => {
          const exists = prev.some(o => o.id === newOrder.id);
          if (exists) return prev;
          return [newOrder, ...prev];
        });
      }
      
      toast.success('Đơn hàng đã được gửi!');
    } catch (error) {
      toast.error('Không thể đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [customerName, customerPhone, customerDeliveryAddress]);

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
    } catch (error) {
      toast.error(error.message || 'Không thể hủy đơn hàng');
    }
  };

  // Filter products by category
  const categories = ['all', ...new Set(products.map(p => p.category))];
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  // Calculate queue position
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'making');

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} />
        <p>Đang tải menu...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.greeting}>
              {customerName ? `Xin chào, ${customerName}!` : 'Xin chào!'}
            </h1>
            <p className={styles.subtext}>Hôm nay bạn muốn uống gì?</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </span>
          <button 
            className={styles.historyBtn}
            onClick={() => setIsHistoryOpen(true)}
          >
            <ClipboardList size={22} />
            {orders.length > 0 && (
              <span className={styles.historyBadge}>{orders.length}</span>
            )}
          </button>
          <button 
            className={styles.cartBtn}
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart size={22} />
            {cart.length > 0 && (
              <span className={styles.cartBadge}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Active Order Banner - shows below header when there's pending/making orders */}
      <ActiveOrderBanner orders={orders} allOrders={allOrders} />

      {/* Category Tabs */}
      <div className={styles.categories}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`${styles.categoryTab} ${activeCategory === cat ? styles.active : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'Tất cả' : 
             cat === 'coffee' ? '☕ Cà phê' :
             cat === 'tea' ? '🍵 Trà' :
             cat === 'smoothie' ? '🥤 Sinh tố' :
             cat === 'juice' ? '🍊 Nước ép' : cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className={styles.menuGrid}>
        {filteredProducts.map((product, index) => (
          <MenuCard
            key={product.id}
            product={product}
            onAdd={handleAddToCart}
            style={{ animationDelay: `${index * 0.05}s` }}
          />
        ))}
      </div>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemove={handleRemoveFromCart}
        onUpdateQuantity={handleUpdateQuantity}
        orderNote={orderNote}
        onNoteChange={setOrderNote}
        onPlaceOrder={handlePlaceOrder}
        isSubmitting={isSubmitting}
      />

      {/* Customization Modal */}
      {customizingItem && (
        <CustomizeModal
          product={customizingItem}
          onClose={() => {
            setCustomizingItem(null);
            setPendingDirectOrder(null); // Clear pending order if modal is closed
          }}
          onConfirm={handleConfirmCustomization}
          onPlaceOrder={handlePlaceOrderDirect}
        />
      )}

      {/* Order History Drawer */}
      <OrderHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={orders}
        onCancelOrder={handleCancelOrder}
      />

      {/* Customer Info Modal */}
      <CustomerInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => {
          setIsInfoModalOpen(false);
          setPendingDirectOrder(null); // Clear pending order if modal is closed without confirming
        }}
        onClose={() => setIsInfoModalOpen(false)}
        onConfirm={handleCustomerInfoConfirm}
        initialData={{
          name: customerName,
          phone: customerPhone,
          deliveryAddress: customerDeliveryAddress,
        }}
      />
    </div>
  );
}


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
  const [customizingItem, setCustomizingItem] = useState(null);
  const [orderNote, setOrderNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Get customer info from localStorage
  useEffect(() => {
    const name = localStorage.getItem('customerName');
    const phone = localStorage.getItem('customerPhone');
    const deliveryAddress = localStorage.getItem('customerDeliveryAddress');
    
    if (!name || !phone || !deliveryAddress) {
      navigate('/');
      return;
    }
    setCustomerName(name);
    setCustomerPhone(phone);
    setCustomerDeliveryAddress(deliveryAddress);
  }, [navigate]);

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
        setOrders(ordersData.filter(o => o.customer_name === customerName));
        setIsLoading(false);
      } catch (error) {
        toast.error('Không thể tải dữ liệu');
        setIsLoading(false);
      }
    }
    if (customerName) {
      loadData();
    }
  }, [customerName]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !customerName) return;

    socket.emit('join:customer', customerName);

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
      setAllOrders(prev => [order, ...prev]);
      if (order.customer_name === customerName) {
        setOrders(prev => [order, ...prev]);
        toast.success('Đơn hàng đã được gửi!');
      }
    });

    // Order status updates
    socket.on('order:status', (order) => {
      setAllOrders(prev => prev.map(o => o.id === order.id ? order : o));
      setOrders(prev => prev.map(o => 
        o.id === order.id ? order : o
      ));
      if (order.customer_name === customerName) {
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
      setOrders(prev => prev.map(o => 
        o.id === order.id ? order : o
      ));
      if (order.customer_name === customerName) {
        toast('Đơn hàng đã được hủy', { icon: '❌' });
      }
    });

    return () => {
      socket.off('menu:update');
      socket.off('order:new');
      socket.off('order:status');
      socket.off('orders:reset');
      socket.off('order:cancelled');
    };
  }, [socket, customerName]);

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

  // Place order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderData = {
        customer_name: customerName,
        phone: customerPhone,
        delivery_address: customerDeliveryAddress,
        note: orderNote,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          options: item.options,
        })),
      };

      await createOrder(orderData);
      setCart([]);
      setOrderNote('');
      setIsCartOpen(false);
    } catch (error) {
      toast.error('Không thể đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className={styles.greeting}>Xin chào, {customerName}!</h1>
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
          onClose={() => setCustomizingItem(null)}
          onConfirm={handleConfirmCustomization}
        />
      )}

      {/* Order History Drawer */}
      <OrderHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        orders={orders}
        onCancelOrder={handleCancelOrder}
      />
    </div>
  );
}


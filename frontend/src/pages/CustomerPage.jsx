import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { fetchProducts, fetchOrders, fetchCustomerOrders, createOrder, cancelOrder } from '../api';
import toast from 'react-hot-toast';
import { 
  Coffee, ShoppingCart, X, Plus, Minus, Clock, 
  CheckCircle2, Loader2, ArrowLeft, Wifi, WifiOff,
  Bell, ClipboardList, Edit2
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
  const [isEditInfoMode, setIsEditInfoMode] = useState(false); // true = chỉnh sửa, false = nhập để đặt hàng
  const [customizingItem, setCustomizingItem] = useState(null);
  const [pendingDirectOrder, setPendingDirectOrder] = useState(null); // { product, options, quantity }
  const [orderNote, setOrderNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const cartRestoredRef = useRef(false); // Track if cart has been restored from localStorage

  // Get customer info from localStorage (optional - can be empty initially)
  useEffect(() => {
    const name = localStorage.getItem('customerName') || '';
    const phone = localStorage.getItem('customerPhone') || '';
    const deliveryAddress = localStorage.getItem('customerDeliveryAddress') || '';
    
    setCustomerName(name);
    setCustomerPhone(phone);
    setCustomerDeliveryAddress(deliveryAddress);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    // Skip saving if cart is being restored (to avoid clearing it)
    if (cartRestoredRef.current === false && cart.length === 0) {
      // Don't clear localStorage during initial load
      return;
    }
    
    if (cart.length > 0) {
      // Only save product_id, options, quantity - not the full product object
      const cartData = cart
        .filter(item => item.product && item.product.id) // Only save valid items
        .map(item => {
          const productId = parseInt(item.product.id);
          if (isNaN(productId)) {
            console.warn('Invalid product_id when saving cart:', item.product.id);
            return null;
          }
          return {
            product_id: productId, // Ensure it's a number
            options: item.options || {},
            quantity: parseInt(item.quantity) || 1,
            id: item.id || Date.now() + Math.random()
          };
        })
        .filter(Boolean); // Remove null items
      
      if (cartData.length > 0) {
        console.log('Saving cart to localStorage:', cartData);
        localStorage.setItem('cart', JSON.stringify(cartData));
      } else {
        console.log('Cart is empty, removing from localStorage');
        localStorage.removeItem('cart');
      }
    } else {
      // Only clear if cart was already restored (to avoid clearing during restore)
      if (cartRestoredRef.current) {
        console.log('Cart is empty, clearing localStorage');
        localStorage.removeItem('cart');
      }
    }
  }, [cart]);

  // Restore cart from localStorage after products are loaded (only once)
  useEffect(() => {
    if (products.length === 0) return; // Wait for products to load
    if (cartRestoredRef.current) return; // Already restored
    if (cart.length > 0) return; // Don't restore if cart already has items
    
    cartRestoredRef.current = true; // Mark as restored
    
    try {
      const savedCart = localStorage.getItem('cart');
      if (!savedCart) {
        console.log('No saved cart found in localStorage');
        return;
      }
      
      console.log('Restoring cart from localStorage...');
      const cartData = JSON.parse(savedCart);
      console.log('Saved cart data:', cartData);
      
      // Map cart data to full cart items with product objects
      const restoredCart = cartData
        .map(item => {
          // Ensure product_id is valid
          const productId = parseInt(item.product_id);
          if (isNaN(productId)) {
            console.warn('Invalid product_id in saved cart:', item.product_id);
            return null;
          }
          
          // Find product by id (compare as numbers)
          const product = products.find(p => parseInt(p.id) === productId);
          if (!product) {
            console.warn('Product not found:', productId, 'Available products:', products.map(p => p.id));
            return null; // Product no longer exists
          }
          
          // Check if product is still available
          if (!product.is_available) {
            console.warn('Product unavailable:', product.name);
            return null; // Product is unavailable
          }
          
          return {
            product,
            options: item.options || {},
            quantity: parseInt(item.quantity) || 1,
            id: item.id || Date.now() + Math.random()
          };
        })
        .filter(Boolean); // Remove null items
      
      console.log('Restored cart:', restoredCart);
      
      if (restoredCart.length > 0) {
        setCart(restoredCart);
        console.log('Cart restored successfully with', restoredCart.length, 'items');
        // Show notification if some items were removed
        const removedCount = cartData.length - restoredCart.length;
        if (removedCount > 0) {
          toast(`Đã xóa ${removedCount} sản phẩm không còn sẵn từ giỏ hàng`, { icon: '⚠️' });
        }
      } else if (cartData.length > 0) {
        // All items were removed
        console.warn('All cart items were removed (products not found or unavailable)');
        localStorage.removeItem('cart');
      } else {
        console.log('Cart was empty in localStorage');
      }
    } catch (error) {
      console.error('Failed to restore cart from localStorage:', error);
      localStorage.removeItem('cart'); // Clear corrupted data
    }
  }, [products, cart.length]); // Run when products are loaded and cart is empty

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const productsData = await fetchProducts();
        setProducts(productsData);
        
        // Fetch customer orders if customer info is available
        if (customerName && customerPhone) {
          try {
            const customerOrders = await fetchCustomerOrders(customerName, customerPhone);
            setOrders(customerOrders);
            setAllOrders(customerOrders);
          } catch (error) {
            console.error('Failed to fetch customer orders:', error);
            // Don't show error to user, just start with empty orders
            // Orders will be populated via socket events
            setOrders([]);
            setAllOrders([]);
          }
        } else {
          setOrders([]);
          setAllOrders([]);
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
        // Note: Toast is already shown after createOrder success, so we don't show it here to avoid duplicate
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
    setIsEditInfoMode(false);
    
    // If in edit mode, just update info and show success
    if (isEditInfoMode) {
      toast.success('Đã cập nhật thông tin!');
      return;
    }
    
    // Check if this is a direct order from modal
    if (pendingDirectOrder) {
      // Place order directly with the product from modal
      const { product, options, quantity } = pendingDirectOrder;
      
      // Check if product is still available
      if (!product.is_available) {
        toast.error(`${product.name} hiện không có sẵn`);
        setPendingDirectOrder(null);
        setIsInfoModalOpen(false);
        setIsEditInfoMode(false);
        return;
      }
      
      setPendingDirectOrder(null);
      
      setIsSubmitting(true);
      try {
        // Validate product_id
        const productId = parseInt(product.id);
        if (isNaN(productId)) {
          toast.error('Sản phẩm không hợp lệ. Vui lòng thử lại.');
          setIsSubmitting(false);
          return;
        }
        
        const orderData = {
          customer_name: info.name,
          phone: info.phone,
          delivery_address: info.deliveryAddress,
          note: '',
          items: [{
            product_id: productId,
            quantity: parseInt(quantity) || 1,
            options: options || {},
          }],
        };

        console.log('Sending direct order data:', orderData); // Debug log
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
        toast.error(error.message || 'Không thể đặt hàng. Vui lòng thử lại.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Proceed with order from cart
      submitOrder(info);
    }
  };

  // Handle edit customer info
  const handleEditCustomerInfo = () => {
    setIsEditInfoMode(true);
    setIsInfoModalOpen(true);
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

    // Client-side validation để tránh lỗi 400
    // Validate tên: phải có ít nhất 2 ký tự chữ
    const nameWithoutNumbers = finalName.replace(/\d/g, '');
    if (nameWithoutNumbers.trim().length < 2) {
      toast.error('Tên khách hàng phải có ít nhất 2 ký tự chữ');
      return;
    }
    if (finalName.length > 100) {
      toast.error('Tên khách hàng không được vượt quá 100 ký tự');
      return;
    }

    // Validate số điện thoại
    if (finalPhone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
      const phoneClean = finalPhone.replace(/\s/g, '');
      if (!phoneRegex.test(phoneClean)) {
        toast.error('Số điện thoại không hợp lệ');
        return;
      }
      if (finalPhone.length > 20) {
        toast.error('Số điện thoại quá dài');
        return;
      }
    }

    // Validate địa chỉ
    if (finalAddress && finalAddress.length > 200) {
      toast.error('Địa chỉ giao hàng không được vượt quá 200 ký tự');
      return;
    }

    // Check if all products in cart are still available
    const unavailableItems = cart.filter(item => !item.product.is_available);
    if (unavailableItems.length > 0) {
      const productNames = unavailableItems.map(item => item.product.name).join(', ');
      toast.error(`Không thể đặt hàng. Các sản phẩm sau hiện không có sẵn: ${productNames}`);
      // Remove unavailable items from cart
      setCart(prev => prev.filter(item => item.product.is_available));
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate cart items before sending
      const validItems = cart
        .map(item => {
          // Ensure product exists and has valid id
          if (!item.product || !item.product.id) {
            console.error('Invalid cart item - missing product:', item);
            return null;
          }
          
          const productId = parseInt(item.product.id);
          if (isNaN(productId)) {
            console.error('Invalid product_id:', item.product.id);
            return null;
          }
          
          return {
            product_id: productId,
            quantity: parseInt(item.quantity) || 1,
            options: item.options || {},
          };
        })
        .filter(Boolean); // Remove null items
      
      if (validItems.length === 0) {
        toast.error('Giỏ hàng không hợp lệ. Vui lòng thử lại.');
        return;
      }
      
      if (validItems.length !== cart.length) {
        toast.error('Một số sản phẩm trong giỏ hàng không hợp lệ. Đã tự động loại bỏ.');
        // Update cart to remove invalid items
        setCart(prev => prev.filter(item => 
          item.product && item.product.id && !isNaN(parseInt(item.product.id))
        ));
        return;
      }

      const orderData = {
        customer_name: finalName,
        phone: finalPhone,
        delivery_address: finalAddress,
        note: orderNote,
        items: validItems,
      };

      // Debug log với chi tiết product_id
      console.log('Sending order data:', {
        customer_name: orderData.customer_name,
        items: orderData.items.map(item => ({
          product_id: item.product_id,
          product_id_type: typeof item.product_id,
          product_id_parsed: parseInt(item.product_id),
          quantity: item.quantity,
          options: item.options
        })),
        itemsCount: orderData.items.length
      });
      const newOrder = await createOrder(orderData);
      
      // Ensure order has order_items with product data
      if (!newOrder.order_items || !Array.isArray(newOrder.order_items) || newOrder.order_items.length === 0) {
        console.error('Order created but missing order_items:', newOrder);
        toast.error('Đơn hàng đã được tạo nhưng thiếu thông tin. Vui lòng reload trang.');
        return;
      }
      
      // Verify all items have product data
      const missingProducts = newOrder.order_items.filter(item => !item.product);
      if (missingProducts.length > 0) {
        console.error('Order items missing product data:', missingProducts);
        // Fetch complete order data
        const completeOrder = await fetchCustomerOrders(finalName, finalPhone);
        const foundOrder = completeOrder.find(o => o.id === newOrder.id);
        if (foundOrder && foundOrder.order_items) {
          newOrder.order_items = foundOrder.order_items;
        } else {
          toast.error('Đơn hàng đã được tạo nhưng thiếu thông tin sản phẩm. Vui lòng reload trang.');
          return;
        }
      }
      
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
      // Log chi tiết lỗi để debug
      console.error('Error placing order:', error);
      // Hiển thị message lỗi từ API hoặc message mặc định
      const errorMessage = error.message || 'Không thể đặt hàng. Vui lòng thử lại.';
      toast.error(errorMessage);
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
    // Check if product is still available
    if (!product.is_available) {
      toast.error(`${product.name} hiện không có sẵn`);
      setCustomizingItem(null);
      return;
    }

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
      toast.error(error.message || 'Không thể đặt hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  }, [customerName, customerPhone, customerDeliveryAddress]);

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    try {
      // Send customer info to verify ownership
      await cancelOrder(orderId, customerName, customerPhone);
      toast.success('Đã hủy đơn hàng');
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
          <div className={styles.greetingContainer}>
            <div>
              <h1 className={styles.greeting}>
                {customerName ? `Xin chào, ${customerName}!` : 'Xin chào!'}
              </h1>
              <p className={styles.subtext}>Hôm nay bạn muốn uống gì?</p>
            </div>
            {customerName && (
              <button 
                className={styles.editInfoBtn}
                onClick={handleEditCustomerInfo}
                title="Chỉnh sửa thông tin"
              >
                <Edit2 size={16} />
              </button>
            )}
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
          setIsEditInfoMode(false);
          setPendingDirectOrder(null); // Clear pending order if modal is closed without confirming
        }}
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


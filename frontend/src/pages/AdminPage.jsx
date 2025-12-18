import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { fetchProducts, fetchOrders, updateProductAvailability, updateOrderStatus, resetAllOrders, adminLogin } from '../api';
import toast from 'react-hot-toast';
import { 
  Coffee, ArrowLeft, RefreshCw, Wifi, WifiOff,
  Package, CheckCircle2, Clock, Loader2, AlertTriangle,
  Bell, ToggleLeft, ToggleRight, Trash2, BarChart3,
  DollarSign, TrendingUp, ShoppingBag, Lock, LogOut, Eye, EyeOff
} from 'lucide-react';
import OrderCard from '../components/OrderCard';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      const response = await adminLogin(password);
      if (response.success) {
        localStorage.setItem('adminToken', response.token);
        setIsAuthenticated(true);
        setIsLoading(true); // Reload data after login
        toast.success('Đăng nhập thành công!');
      }
    } catch (error) {
      setLoginError('Mật khẩu không đúng');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
    toast.success('Đã đăng xuất');
  };

  // Fetch initial data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    async function loadData() {
      try {
        const [productsData, ordersData] = await Promise.all([
          fetchProducts(),
          fetchOrders(),
        ]);
        setProducts(productsData);
        setOrders(ordersData);
        setIsLoading(false);
      } catch (error) {
        toast.error('Không thể tải dữ liệu');
        setIsLoading(false);
      }
    }
    loadData();
  }, [isAuthenticated]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit('join:admin');

    // New order notification
    socket.on('order:new', (order) => {
      setOrders(prev => [order, ...prev]);
      // Play notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWRYSoGVpZyLf3d3doKIhoF4bmhobnqEi4uGf3l1d36FiYmFgXt5e4KIiomFgXx6fYOJi4qGgX18foSKjIuHg358foWKjIuIhH59f4WLjYuJhYB+f4aMjoyKhoF/gIaMjoyKhoKAgYaNjoyKhoKBgYeNjoyKhoKBgoiOj42LiIOCgoiOj42LiIOCgoiPkI6MiYSDg4mQkI6MiYSEhImQkY+NioWEhYqRko+NioaFhYqSkpCOi4aFhYuSk5CPjIeGhouSlJGQjYiHh4yTlJKRjoiHiI2UlZOSj4mIiY6VlZSTkIqJiY+VlpWUkYuKio+Wl5aVkou');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      toast.success(`Đơn hàng mới từ ${order.customer_name}!`, {
        icon: '🔔',
        duration: 5000,
      });
    });

    // Order status updates
    socket.on('order:status', (order) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    // Menu updates
    socket.on('menu:update', (product) => {
      setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    });

    // Orders reset - keep completed orders for statistics
    socket.on('orders:reset', () => {
      setOrders(prev => prev.filter(o => o.status === 'done'));
      toast('Đã reset đơn hàng (giữ lại thống kê)', { icon: '🔄' });
    });

    // Order cancelled
    socket.on('order:cancelled', (order) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
      toast(`Đơn của ${order.customer_name} đã bị hủy`, { icon: '❌' });
    });

    return () => {
      socket.off('order:new');
      socket.off('order:status');
      socket.off('menu:update');
      socket.off('orders:reset');
      socket.off('order:cancelled');
    };
  }, [socket]);

  // Handle product toggle
  const handleToggleProduct = async (product) => {
    try {
      await updateProductAvailability(product.id, !product.is_available);
      toast.success(`${product.name} ${!product.is_available ? 'đã bật' : 'đã tắt'}`);
    } catch (error) {
      toast.error('Không thể cập nhật sản phẩm');
    }
  };

  // Handle order status update
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      toast.error('Không thể cập nhật đơn hàng');
    }
  };

  // Handle reset all orders
  const handleResetOrders = async () => {
    try {
      await resetAllOrders();
      setShowResetConfirm(false);
    } catch (error) {
      toast.error('Không thể reset đơn hàng');
    }
  };

  // Filter orders
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  // Count orders by status
  const orderCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    making: orders.filter(o => o.status === 'making').length,
    done: orders.filter(o => o.status === 'done').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <Coffee size={48} className={styles.loginLogo} />
            <h1>Admin CaféPSC</h1>
            <p>Nhập mật khẩu để tiếp tục</p>
          </div>
          
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.passwordInputWrapper}>
              <Lock size={20} className={styles.passwordIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu admin"
                className={styles.passwordInput}
                autoFocus
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {loginError && (
              <p className={styles.loginError}>{loginError}</p>
            )}
            
            <button
              type="submit"
              className={styles.loginBtn}
              disabled={!password || isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={20} className={styles.spinner} />
                  Đang xác thực...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
          
          <button
            className={styles.backToHome}
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} />
        <p>Đang tải...</p>
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
            <h1 className={styles.title}>
              <Coffee size={28} />
              Admin Dashboard
            </h1>
            <p className={styles.subtitle}>Quản lý đơn hàng & menu</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isConnected ? 'Đang kết nối' : 'Mất kết nối'}
          </span>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} />
          Đơn hàng
          {orderCounts.pending > 0 && (
            <span className={styles.badge}>{orderCounts.pending}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stats' ? styles.active : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={18} />
          Thống kê
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'menu' ? styles.active : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          <Coffee size={18} />
          Menu
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className={styles.ordersSection}>
          {/* Status Filter & Reset */}
          <div className={styles.orderControls}>
            <div className={styles.statusFilters}>
              <button
                className={`${styles.filterBtn} ${statusFilter === 'all' ? styles.active : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Tất cả ({orders.length})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.pending} ${statusFilter === 'pending' ? styles.active : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                <Clock size={14} />
                Chờ ({orderCounts.pending})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.making} ${statusFilter === 'making' ? styles.active : ''}`}
                onClick={() => setStatusFilter('making')}
              >
                <Loader2 size={14} />
                Đang pha ({orderCounts.making})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.done} ${statusFilter === 'done' ? styles.active : ''}`}
                onClick={() => setStatusFilter('done')}
              >
                <CheckCircle2 size={14} />
                Xong ({orderCounts.done})
              </button>
              <button
                className={`${styles.filterBtn} ${styles.cancelled} ${statusFilter === 'cancelled' ? styles.active : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                <AlertTriangle size={14} />
                Đã hủy ({orderCounts.cancelled})
              </button>
            </div>
            <button
              className={styles.resetBtn}
              onClick={() => setShowResetConfirm(true)}
            >
              <Trash2 size={16} />
              Reset phiên
            </button>
          </div>

          {/* Orders List */}
          <div className={styles.ordersList}>
            {filteredOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={48} strokeWidth={1.5} />
                <p>Chưa có đơn hàng nào</p>
              </div>
            ) : (
              filteredOrders.map((order, index) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  style={{ animationDelay: `${index * 0.05}s` }}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className={styles.statsSection}>
          {(() => {
            // Calculate statistics from completed orders only
            const completedOrders = orders.filter(o => o.status === 'done');
            
            // Total revenue
            const totalRevenue = completedOrders.reduce((sum, order) => {
              const orderTotal = order.order_items?.reduce((itemSum, item) => {
                return itemSum + (item.product?.price || 0) * item.quantity;
              }, 0) || 0;
              return sum + orderTotal;
            }, 0);

            // Total items sold
            const totalItems = completedOrders.reduce((sum, order) => {
              return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
            }, 0);

            // Sales by product
            const productSales = {};
            completedOrders.forEach(order => {
              order.order_items?.forEach(item => {
                const productName = item.product?.name || 'Unknown';
                const productPrice = item.product?.price || 0;
                if (!productSales[productName]) {
                  productSales[productName] = { quantity: 0, revenue: 0 };
                }
                productSales[productName].quantity += item.quantity;
                productSales[productName].revenue += productPrice * item.quantity;
              });
            });

            // Sales by category
            const categorySales = {};
            completedOrders.forEach(order => {
              order.order_items?.forEach(item => {
                const category = item.product?.category || 'other';
                const productPrice = item.product?.price || 0;
                if (!categorySales[category]) {
                  categorySales[category] = { quantity: 0, revenue: 0 };
                }
                categorySales[category].quantity += item.quantity;
                categorySales[category].revenue += productPrice * item.quantity;
              });
            });

            // Sort products by quantity sold
            const sortedProducts = Object.entries(productSales)
              .sort((a, b) => b[1].quantity - a[1].quantity);

            const categoryEmoji = {
              coffee: '☕',
              tea: '🍵',
              smoothie: '🥤',
              juice: '🍊',
              other: '📦'
            };

            return (
              <>
                {/* Summary Cards */}
                <div className={styles.statsCards}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <DollarSign size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Tổng doanh thu</p>
                      <h3 className={styles.statValue}>
                        {totalRevenue.toLocaleString('vi-VN')}đ
                      </h3>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <ShoppingBag size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Đơn hoàn thành</p>
                      <h3 className={styles.statValue}>{completedOrders.length}</h3>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>Sản phẩm đã bán</p>
                      <h3 className={styles.statValue}>{totalItems}</h3>
                    </div>
                  </div>
                </div>

                {/* Sales by Category */}
                <div className={styles.statsBlock}>
                  <h3 className={styles.statsBlockTitle}>📊 Theo danh mục</h3>
                  <div className={styles.categoryStats}>
                    {Object.entries(categorySales).map(([category, data]) => (
                      <div key={category} className={styles.categoryItem}>
                        <span className={styles.categoryEmoji}>
                          {categoryEmoji[category] || '📦'}
                        </span>
                        <div className={styles.categoryInfo}>
                          <span className={styles.categoryName}>
                            {category === 'coffee' ? 'Cà phê' :
                             category === 'tea' ? 'Trà' :
                             category === 'smoothie' ? 'Sinh tố' :
                             category === 'juice' ? 'Nước ép' : category}
                          </span>
                          <span className={styles.categoryQty}>{data.quantity} ly</span>
                        </div>
                        <span className={styles.categoryRevenue}>
                          {data.revenue.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales by Product */}
                <div className={styles.statsBlock}>
                  <h3 className={styles.statsBlockTitle}>🏆 Top sản phẩm bán chạy</h3>
                  <div className={styles.productStats}>
                    {sortedProducts.length === 0 ? (
                      <p className={styles.noData}>Chưa có dữ liệu bán hàng</p>
                    ) : (
                      sortedProducts.map(([name, data], index) => (
                        <div key={name} className={styles.productItem}>
                          <span className={styles.productRank}>#{index + 1}</span>
                          <div className={styles.productInfo}>
                            <span className={styles.productName}>{name}</span>
                            <div className={styles.productBar}>
                              <div 
                                className={styles.productBarFill}
                                style={{ 
                                  width: `${(data.quantity / (sortedProducts[0]?.[1]?.quantity || 1)) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                          <div className={styles.productNumbers}>
                            <span className={styles.productQty}>{data.quantity} ly</span>
                            <span className={styles.productRevenue}>
                              {data.revenue.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Menu Tab */}
      {activeTab === 'menu' && (
        <div className={styles.menuSection}>
          <div className={styles.menuGrid}>
            {products.map((product) => (
              <div 
                key={product.id} 
                className={`${styles.menuItem} ${!product.is_available ? styles.disabled : ''}`}
              >
                <div className={styles.menuItemInfo}>
                  <h3 className={styles.menuItemName}>{product.name}</h3>
                  <p className={styles.menuItemPrice}>
                    {product.price.toLocaleString('vi-VN')}đ
                  </p>
                  <span className={styles.menuItemCategory}>{product.category}</span>
                </div>
                <button
                  className={`${styles.toggleBtn} ${product.is_available ? styles.on : styles.off}`}
                  onClick={() => handleToggleProduct(product)}
                >
                  {product.is_available ? (
                    <ToggleRight size={32} />
                  ) : (
                    <ToggleLeft size={32} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowResetConfirm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <AlertTriangle size={48} className={styles.warningIcon} />
            <h3>Reset đơn hàng?</h3>
            <p>Xóa các đơn đang chờ, đang pha và đã hủy. <strong>Giữ lại đơn hoàn thành</strong> cho thống kê.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowResetConfirm(false)}
              >
                Hủy
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleResetOrders}
              >
                Xác nhận reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


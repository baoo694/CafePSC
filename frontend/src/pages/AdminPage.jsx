import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { fetchProducts, fetchOrders, updateProductAvailability, updateOrderStatus, resetAllOrders, adminLogin, adminLogout, deleteOrder, checkAdminAuth } from '../api';
import toast from 'react-hot-toast';
import { 
  Coffee, ArrowLeft, RefreshCw, Wifi, WifiOff,
  Package, CheckCircle2, Clock, Loader2, AlertTriangle,
  Bell, ToggleLeft, ToggleRight, Trash2, BarChart3,
  DollarSign, TrendingUp, ShoppingBag, Lock, LogOut, Eye, EyeOff, Calendar
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
  const [selectedDate, setSelectedDate] = useState('all'); // 'all' for total stats, or 'YYYY-MM-DD' for specific date
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if already authenticated (kiểm tra cookie httpOnly)
  useEffect(() => {
    async function checkAuth() {
      try {
        const isAuth = await checkAdminAuth();
        setIsAuthenticated(isAuth);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      const response = await adminLogin(password);
      if (response.success) {
        // Token được lưu trong httpOnly cookie tự động
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
  const handleLogout = async () => {
    try {
      await adminLogout();
      setIsAuthenticated(false);
      setPassword('');
      toast.success('Đã đăng xuất');
    } catch (error) {
      // Vẫn logout ở frontend dù API call fail
      setIsAuthenticated(false);
      setPassword('');
      toast.success('Đã đăng xuất');
    }
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

    // Order deleted (individual order deletion)
    socket.on('order:deleted', (data) => {
      const orderId = typeof data === 'object' ? data.id : data;
      setOrders(prev => prev.filter(o => o.id !== orderId));
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
      socket.off('order:deleted');
      socket.off('order:cancelled');
    };
  }, [socket]);

  // Handle product toggle
  const handleToggleProduct = async (product) => {
    try {
      await updateProductAvailability(product.id, !product.is_available);
      toast.success(`${product.name} ${!product.is_available ? 'đã bật' : 'đã tắt'}`);
    } catch (error) {
      // If authentication error, redirect to login
      if (error.message && (error.message.includes('Unauthorized') || error.message.includes('Authentication') || error.message.includes('login'))) {
        setIsAuthenticated(false);
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        toast.error(error.message || 'Không thể cập nhật sản phẩm');
      }
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

  // Handle delete order
  const handleDeleteOrder = async (orderId) => {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
      return;
    }
    
    try {
      await deleteOrder(orderId);
      // Remove the specific order from state
      // Socket event will also handle this, but we do it immediately for better UX
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Đã xóa đơn hàng');
    } catch (error) {
      toast.error(error.message || 'Không thể xóa đơn hàng');
    }
  };

  // Filter and sort orders - prioritize pending orders
  const getOrderPriority = (status) => {
    switch (status) {
      case 'pending': return 1;  // Highest priority
      case 'making': return 2;
      case 'done': return 3;
      case 'cancelled': return 4;
      default: return 5;
    }
  };

  const filteredOrders = (statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter)
  ).sort((a, b) => {
    // First sort by priority (pending first)
    const priorityDiff = getOrderPriority(a.status) - getOrderPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    
    // If same priority, sort by created_at (newest first)
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeB - timeA;
  });

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
                  onDelete={handleDeleteOrder}
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
            // Size price additions (must match CustomizeModal and CartDrawer)
            const SIZE_PRICES = {
              'M': 0,
              'L': 5000,
            };

            // Calculate unit price based on product price + size addition
            const calculateUnitPrice = (product, options) => {
              const basePrice = product?.price || 0;
              const sizeAdd = SIZE_PRICES[options?.size] || 0;
              return basePrice + sizeAdd;
            };

            // Filter completed orders by date if selected
            let completedOrders = orders.filter(o => o.status === 'done');
            
            if (selectedDate !== 'all') {
              completedOrders = completedOrders.filter(order => {
                const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                return orderDate === selectedDate;
              });
            }
            
            // Get all unique dates from completed orders for date selector
            const allDates = [...new Set(
              orders
                .filter(o => o.status === 'done')
                .map(o => new Date(o.created_at).toISOString().split('T')[0])
            )].sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)
            
            // Total revenue
            const totalRevenue = completedOrders.reduce((sum, order) => {
              const orderTotal = order.order_items?.reduce((itemSum, item) => {
                const unitPrice = calculateUnitPrice(item.product, item.options_json || {});
                return itemSum + unitPrice * item.quantity;
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
                const unitPrice = calculateUnitPrice(item.product, item.options_json || {});
                if (!productSales[productName]) {
                  productSales[productName] = { quantity: 0, revenue: 0 };
                }
                productSales[productName].quantity += item.quantity;
                productSales[productName].revenue += unitPrice * item.quantity;
              });
            });

            // Sales by category
            const categorySales = {};
            completedOrders.forEach(order => {
              order.order_items?.forEach(item => {
                const category = item.product?.category || 'other';
                const unitPrice = calculateUnitPrice(item.product, item.options_json || {});
                if (!categorySales[category]) {
                  categorySales[category] = { quantity: 0, revenue: 0 };
                }
                categorySales[category].quantity += item.quantity;
                categorySales[category].revenue += unitPrice * item.quantity;
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

            // Calculate total stats (all time)
            const allCompletedOrders = orders.filter(o => o.status === 'done');
            const totalRevenueAllTime = allCompletedOrders.reduce((sum, order) => {
              const orderTotal = order.order_items?.reduce((itemSum, item) => {
                const unitPrice = calculateUnitPrice(item.product, item.options_json || {});
                return itemSum + unitPrice * item.quantity;
              }, 0) || 0;
              return sum + orderTotal;
            }, 0);
            const totalOrdersAllTime = allCompletedOrders.length;
            const totalItemsAllTime = allCompletedOrders.reduce((sum, order) => {
              return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
            }, 0);

            return (
              <>
                {/* Date Filter */}
                <div className={styles.dateFilter}>
                  <div className={styles.dateFilterLabel}>
                    <Calendar size={18} />
                    <span>Chọn ngày:</span>
                  </div>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={styles.dateSelect}
                  >
                    <option value="all">Tổng số liệu (Tất cả)</option>
                    {allDates.map(date => {
                      const dateObj = new Date(date);
                      const formattedDate = dateObj.toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      return (
                        <option key={date} value={date}>
                          {formattedDate}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Total Stats Summary (when viewing specific date) */}
                {selectedDate !== 'all' && (
                  <div className={styles.totalStatsSummary}>
                    <h3 className={styles.totalStatsTitle}>📈 Tổng số liệu (Tất cả thời gian)</h3>
                    <div className={styles.totalStatsGrid}>
                      <div className={styles.totalStatItem}>
                        <span className={styles.totalStatLabel}>Tổng doanh thu:</span>
                        <span className={styles.totalStatValue}>
                          {totalRevenueAllTime.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className={styles.totalStatItem}>
                        <span className={styles.totalStatLabel}>Tổng đơn hàng:</span>
                        <span className={styles.totalStatValue}>{totalOrdersAllTime}</span>
                      </div>
                      <div className={styles.totalStatItem}>
                        <span className={styles.totalStatLabel}>Tổng sản phẩm:</span>
                        <span className={styles.totalStatValue}>{totalItemsAllTime}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className={styles.statsCards}>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <DollarSign size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>
                        {selectedDate === 'all' ? 'Tổng doanh thu' : 'Doanh thu ngày'}
                      </p>
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
                      <p className={styles.statLabel}>
                        {selectedDate === 'all' ? 'Đơn hoàn thành' : 'Đơn ngày'}
                      </p>
                      <h3 className={styles.statValue}>{completedOrders.length}</h3>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                      <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <p className={styles.statLabel}>
                        {selectedDate === 'all' ? 'Sản phẩm đã bán' : 'Sản phẩm ngày'}
                      </p>
                      <h3 className={styles.statValue}>{totalItems}</h3>
                    </div>
                  </div>
                </div>

                {/* Sales by Category */}
                <div className={styles.statsBlock}>
                  <h3 className={styles.statsBlockTitle}>
                    📊 Theo danh mục {selectedDate !== 'all' && `(${new Date(selectedDate).toLocaleDateString('vi-VN')})`}
                  </h3>
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
                  <h3 className={styles.statsBlockTitle}>
                    🏆 Top sản phẩm bán chạy {selectedDate !== 'all' && `(${new Date(selectedDate).toLocaleDateString('vi-VN')})`}
                  </h3>
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


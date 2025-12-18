import { Clock, Coffee, CheckCircle2 } from 'lucide-react';
import styles from './ActiveOrderBanner.module.css';

export default function ActiveOrderBanner({ orders, allOrders }) {
  // Only show pending and making orders
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'making');
  
  if (activeOrders.length === 0) return null;

  // Calculate queue position based on all orders
  const getQueuePosition = (orderId) => {
    const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.status === 'making');
    return pendingOrders.findIndex(o => o.id === orderId) + 1;
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Đang chờ xử lý',
          color: 'pending',
          message: 'Đơn hàng đang chờ được xác nhận'
        };
      case 'making':
        return {
          icon: Coffee,
          label: 'Đang pha chế',
          color: 'making',
          message: 'Đơn hàng đang được pha chế'
        };
      default:
        return {
          icon: Clock,
          label: status,
          color: 'pending',
          message: ''
        };
    }
  };

  // Show the most recent active order
  const latestOrder = activeOrders[0];
  const statusInfo = getStatusInfo(latestOrder.status);
  const StatusIcon = statusInfo.icon;
  const queuePos = getQueuePosition(latestOrder.id);

  const itemNames = latestOrder.order_items?.map(item => item.product?.name).join(', ') || '';

  return (
    <div className={`${styles.banner} ${styles[statusInfo.color]}`}>
      <div className={styles.statusSection}>
        <div className={`${styles.iconWrapper} ${styles[statusInfo.color]}`}>
          <StatusIcon size={24} />
        </div>
        <div className={styles.statusInfo}>
          <span className={styles.statusLabel}>{statusInfo.label}</span>
          <span className={styles.statusMessage}>{statusInfo.message}</span>
        </div>
      </div>

      <div className={styles.orderInfo}>
        <div className={styles.queueNumber}>
          <span className={styles.queueLabel}>Số thứ tự</span>
          <span className={styles.queueValue}>#{queuePos}</span>
        </div>
      </div>

      <div className={styles.orderItems}>
        <span className={styles.itemsLabel}>Đơn hàng:</span>
        <span className={styles.itemsText}>{itemNames}</span>
      </div>

      {activeOrders.length > 1 && (
        <div className={styles.moreOrders}>
          +{activeOrders.length - 1} đơn hàng khác đang chờ
        </div>
      )}

      {latestOrder.status === 'making' && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      )}
    </div>
  );
}


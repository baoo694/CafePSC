import { useState } from 'react';
import { Clock, Coffee, CheckCircle2, ChevronDown, ChevronUp, X, XCircle } from 'lucide-react';
import styles from './OrderTracker.module.css';

export default function OrderTracker({ orders, onCancelOrder }) {
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Đang chờ',
          color: 'pending',
        };
      case 'making':
        return {
          icon: Coffee,
          label: 'Đang pha',
          color: 'making',
        };
      case 'done':
        return {
          icon: CheckCircle2,
          label: 'Hoàn thành',
          color: 'done',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Đã hủy',
          color: 'cancelled',
        };
      default:
        return {
          icon: Clock,
          label: status,
          color: 'pending',
        };
    }
  };

  // Calculate queue position
  const getQueuePosition = (orderId) => {
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'making');
    return pendingOrders.findIndex(o => o.id === orderId) + 1;
  };

  const formatOptions = (optionsJson) => {
    if (!optionsJson || Object.keys(optionsJson).length === 0) return null;
    const parts = [];
    if (optionsJson.size) parts.push(`Size: ${optionsJson.size}`);
    if (optionsJson.sugar) parts.push(`Đường: ${optionsJson.sugar}`);
    if (optionsJson.ice) parts.push(`Đá: ${optionsJson.ice}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📋 Đơn hàng của bạn</h3>
      </div>
      <div className={styles.ordersList}>
        {orders.map((order) => {
          const statusInfo = getStatusInfo(order.status);
          const StatusIcon = statusInfo.icon;
          const queuePos = getQueuePosition(order.id);
          const isExpanded = expandedOrderId === order.id;

          return (
            <div key={order.id} className={`${styles.orderItem} ${styles[statusInfo.color]}`}>
              {/* Order Header - Clickable */}
              <div 
                className={styles.orderHeader}
                onClick={() => toggleExpand(order.id)}
              >
                <div className={styles.orderHeaderLeft}>
                  <div className={styles.statusBadge}>
                    <StatusIcon size={16} />
                    <span>{statusInfo.label}</span>
                  </div>
                  <div className={styles.orderSummary}>
                    {order.order_items?.slice(0, 2).map((item, idx) => (
                      <span key={item.id}>
                        {item.product?.name}
                        {idx < Math.min(order.order_items.length, 2) - 1 ? ', ' : ''}
                      </span>
                    ))}
                    {order.order_items?.length > 2 && (
                      <span className={styles.moreItems}>+{order.order_items.length - 2} món</span>
                    )}
                  </div>
                </div>
                <div className={styles.orderHeaderRight}>
                  {(order.status === 'pending' || order.status === 'making') && (
                    <span className={styles.queueBadge}>#{queuePos}</span>
                  )}
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className={styles.orderDetails}>
                  <div className={styles.itemsList}>
                    {order.order_items?.map((item) => (
                      <div key={item.id} className={styles.detailItem}>
                        <div className={styles.detailItemMain}>
                          <span className={styles.detailQty}>x{item.quantity}</span>
                          <span className={styles.detailName}>{item.product?.name}</span>
                          <span className={styles.detailPrice}>
                            {item.product?.price?.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        {formatOptions(item.options_json) && (
                          <p className={styles.detailOptions}>{formatOptions(item.options_json)}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.note && (
                    <div className={styles.orderNote}>
                      <strong>Ghi chú:</strong> {order.note}
                    </div>
                  )}

                  {/* Cancel Button - Only for pending orders */}
                  {order.status === 'pending' && (
                    <button
                      className={styles.cancelBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelOrder(order.id);
                      }}
                    >
                      <X size={16} />
                      Hủy đơn hàng
                    </button>
                  )}
                </div>
              )}

              {/* Progress bar for making status */}
              {order.status === 'making' && (
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

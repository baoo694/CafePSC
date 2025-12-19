import { Clock, Coffee, CheckCircle2, XCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import styles from './OrderHistoryDrawer.module.css';

export default function OrderHistoryDrawer({ isOpen, onClose, orders, onCancelOrder }) {
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, label: 'Đang chờ', color: 'pending' };
      case 'making':
        return { icon: Coffee, label: 'Đang pha', color: 'making' };
      case 'done':
        return { icon: CheckCircle2, label: 'Hoàn thành', color: 'done' };
      case 'cancelled':
        return { icon: XCircle, label: 'Đã hủy', color: 'cancelled' };
      default:
        return { icon: Clock, label: status, color: 'pending' };
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatOptions = (optionsJson) => {
    if (!optionsJson || Object.keys(optionsJson).length === 0) return null;
    const parts = [];
    if (optionsJson.size) parts.push(`Size: ${optionsJson.size}`);
    if (optionsJson.sugar) parts.push(`Đường: ${optionsJson.sugar}`);
    if (optionsJson.ice) parts.push(`Đá: ${optionsJson.ice}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  const calculateTotal = (orderItems) => {
    return orderItems?.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0) || 0;
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`${styles.backdrop} ${isOpen ? styles.open : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.open : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Clock size={24} />
            <h2>Lịch sử đơn hàng</h2>
            <span className={styles.count}>{orders.length} đơn</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Orders List */}
        <div className={styles.ordersList}>
          {orders.length === 0 ? (
            <div className={styles.empty}>
              <Clock size={48} strokeWidth={1.5} />
              <p>Chưa có đơn hàng</p>
              <span>Đơn hàng của bạn sẽ hiển thị ở đây</span>
            </div>
          ) : (
            orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedOrderId === order.id;

              return (
                <div key={order.id} className={`${styles.orderCard} ${styles[statusInfo.color]}`}>
                  {/* Order Header */}
                  <div 
                    className={styles.orderHeader}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <div className={styles.orderHeaderLeft}>
                      <div className={`${styles.statusBadge} ${styles[statusInfo.color]}`}>
                        <StatusIcon size={14} />
                        <span>{statusInfo.label}</span>
                      </div>
                      <span className={styles.orderTime}>{formatTime(order.created_at)}</span>
                    </div>
                    <div className={styles.orderHeaderRight}>
                      <span className={styles.orderTotal}>
                        {calculateTotal(order.order_items).toLocaleString('vi-VN')}đ
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Order Summary (always visible) */}
                  <div className={styles.orderSummary}>
                    {order.order_items?.map((item, idx) => (
                      <span key={item.id}>
                        {item.product?.name}
                        {idx < order.order_items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}



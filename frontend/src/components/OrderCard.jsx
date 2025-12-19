import { Clock, Coffee, CheckCircle2, User, MessageSquare, ArrowRight, XCircle, Phone, MapPin } from 'lucide-react';
import styles from './OrderCard.module.css';

export default function OrderCard({ order, onStatusUpdate, style }) {
  const { id, customer_name, phone, delivery_address, status, note, order_items, created_at } = order;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, label: 'Chờ xử lý', color: 'pending', nextStatus: 'making', nextLabel: 'Bắt đầu pha' };
      case 'making':
        return { icon: Coffee, label: 'Đang pha', color: 'making', nextStatus: 'done', nextLabel: 'Hoàn thành' };
      case 'done':
        return { icon: CheckCircle2, label: 'Hoàn thành', color: 'done', nextStatus: null, nextLabel: null };
      case 'cancelled':
        return { icon: XCircle, label: 'Đã hủy', color: 'cancelled', nextStatus: null, nextLabel: null };
      default:
        return { icon: Clock, label: status, color: 'pending', nextStatus: null, nextLabel: null };
    }
  };

  const statusInfo = getStatusInfo(status);
  const StatusIcon = statusInfo.icon;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatOptions = (optionsJson) => {
    if (!optionsJson || Object.keys(optionsJson).length === 0) return null;
    const parts = [];
    if (optionsJson.size) parts.push(optionsJson.size);
    if (optionsJson.sugar) parts.push(`Đường: ${optionsJson.sugar}`);
    if (optionsJson.ice) parts.push(`Đá: ${optionsJson.ice}`);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <div className={`${styles.card} ${styles[statusInfo.color]}`} style={style}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.customerInfo}>
          <User size={18} />
          <span className={styles.customerName}>{customer_name}</span>
          <span className={styles.orderTime}>{formatTime(created_at)}</span>
        </div>
        <div className={`${styles.statusBadge} ${styles[statusInfo.color]}`}>
          <StatusIcon size={14} />
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Customer Details */}
      <div className={styles.customerDetails}>
        {phone && (
          <span className={styles.detailTag}>
            <Phone size={12} />
            {phone}
          </span>
        )}
        {delivery_address && (
          <span className={styles.detailTag}>
            <MapPin size={12} />
            {delivery_address}
          </span>
        )}
      </div>

      {/* Order Items */}
      <div className={styles.items}>
        {order_items?.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.itemQty}>x{item.quantity}</span>
              <span className={styles.itemName}>{item.product?.name}</span>
            </div>
            {formatOptions(item.options_json) && (
              <p className={styles.itemOptions}>{formatOptions(item.options_json)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      {note && (
        <div className={styles.note}>
          <MessageSquare size={14} />
          <span>{note}</span>
        </div>
      )}

      {/* Actions */}
      {statusInfo.nextStatus && (
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${styles[statusInfo.nextStatus]}`}
            onClick={() => onStatusUpdate(id, statusInfo.nextStatus)}
          >
            <span>{statusInfo.nextLabel}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}


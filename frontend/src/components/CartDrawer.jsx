import { X, Trash2, ShoppingBag, Send, Loader2, Plus, Minus } from 'lucide-react';
import styles from './CartDrawer.module.css';

// Size price additions (must match CustomizeModal)
const SIZE_PRICES = {
  'S': 0,
  'M': 5000,
  'L': 10000,
};

// Calculate unit price based on product price + size addition
const calculateUnitPrice = (product, options) => {
  const basePrice = product.price || 0;
  const sizeAdd = SIZE_PRICES[options?.size] || 0;
  return basePrice + sizeAdd;
};

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  orderNote,
  onNoteChange,
  onPlaceOrder,
  isSubmitting,
}) {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => {
    const unitPrice = calculateUnitPrice(item.product, item.options);
    return sum + unitPrice * item.quantity;
  }, 0);

  const formatOptions = (options) => {
    const parts = [];
    if (options.size) parts.push(options.size);
    if (options.sugar) parts.push(`Đường: ${options.sugar}`);
    if (options.ice) parts.push(`Đá: ${options.ice}`);
    return parts.length > 0 ? parts.join(' • ') : 'Mặc định';
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
            <ShoppingBag size={24} />
            <h2>Giỏ hàng</h2>
            <span className={styles.count}>{totalItems} món</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Cart Items */}
        <div className={styles.items}>
          {cart.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag size={48} strokeWidth={1.5} />
              <p>Giỏ hàng trống</p>
              <span>Hãy thêm món vào giỏ để đặt hàng</span>
            </div>
          ) : (
            cart.map((item) => {
              const unitPrice = calculateUnitPrice(item.product, item.options);
              const itemTotal = unitPrice * item.quantity;
              
              return (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <h4 className={styles.itemName}>{item.product.name}</h4>
                  <p className={styles.itemOptions}>{formatOptions(item.options)}</p>
                  <p className={styles.itemPrice}>
                    {itemTotal.toLocaleString('vi-VN')}đ
                  </p>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.quantityControl}>
                    <button 
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQuantity(item.id, -1)}
                    >
                      <Minus size={16} />
                    </button>
                    <span className={styles.qtyValue}>{item.quantity}</span>
                    <button 
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button 
                    className={styles.removeBtn}
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>

        {/* Note Input */}
        {cart.length > 0 && (
          <div className={styles.noteSection}>
            <label htmlFor="note" className={styles.noteLabel}>
              Ghi chú đơn hàng
            </label>
            <textarea
              id="note"
              className={styles.noteInput}
              placeholder="VD: Ít đá, nhiều đường..."
              value={orderNote}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
            />
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.total}>
            <span>Tổng cộng ({totalItems} món)</span>
            <span className={styles.totalPrice}>
              {total.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <button
            className={styles.orderBtn}
            onClick={onPlaceOrder}
            disabled={cart.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className={styles.spinner} />
                <span>Đang gửi...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Đặt hàng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

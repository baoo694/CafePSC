import { useState } from 'react';
import { X, Phone, MapPin, User } from 'lucide-react';
import styles from './CustomerInfoModal.module.css';

export default function CustomerInfoModal({ isOpen, onClose, onConfirm, initialData = {} }) {
  const [name, setName] = useState(initialData.name || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(initialData.deliveryAddress || '');

  const isFormValid = name.trim() && phone.trim() && deliveryAddress.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onConfirm({
        name: name.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Thông tin giao hàng</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              <User size={14} />
              Họ và tên
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ tên của bạn..."
              className={styles.input}
              autoComplete="name"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="phone" className={styles.label}>
              <Phone size={14} />
              Số điện thoại
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901234567"
              className={styles.input}
              autoComplete="tel"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="deliveryAddress" className={styles.label}>
              <MapPin size={14} />
              Địa chỉ giao hàng
            </label>
            <input
              type="text"
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="VD: Phòng 101, Ký túc xá A"
              className={styles.input}
              autoComplete="street-address"
              required
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!isFormValid}
            >
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



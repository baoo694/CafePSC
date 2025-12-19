import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ArrowRight, Sparkles, Phone, MapPin } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const navigate = useNavigate();

  const isFormValid = name.trim() && phone.trim() && deliveryAddress.trim();

  const handleStartOrder = (e) => {
    e.preventDefault();
    if (isFormValid) {
      localStorage.setItem('customerName', name.trim());
      localStorage.setItem('customerPhone', phone.trim());
      localStorage.setItem('customerDeliveryAddress', deliveryAddress.trim());
      navigate('/order');
    }
  };

  return (
    <div className={styles.container}>
      {/* Decorative elements */}
      <div className={styles.decorTop}>
        <Sparkles className={styles.sparkle} />
      </div>
      
      <div className={styles.content}>
        {/* Logo & Title */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Coffee className={styles.logo} />
            <div className={styles.steam}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h1 className={styles.title}>CaféPSC</h1>
          <p className={styles.subtitle}>Cà phê ngon, đặt nhanh, nhận liền</p>
        </div>

        {/* Order Form */}
        <form className={styles.form} onSubmit={handleStartOrder}>
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>
              Họ và tên
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ tên của bạn..."
              className={styles.input}
              autoComplete="off"
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
              autoComplete="off"
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
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className={styles.orderBtn} disabled={!isFormValid}>
            <span>Bắt đầu đặt món</span>
            <ArrowRight className={styles.arrowIcon} />
          </button>
        </form>

      </div>

      {/* Bottom decoration */}
      <div className={styles.bottomDecor}>
        <div className={styles.beans}>☕ 🫘 ☕ 🫘 ☕</div>
      </div>
    </div>
  );
}

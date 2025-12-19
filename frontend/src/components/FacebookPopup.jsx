import { useState, useEffect } from 'react';
import { X, Facebook } from 'lucide-react';
import styles from './FacebookPopup.module.css';

const FACEBOOK_URL = 'https://www.facebook.com/PSC.PhenikaaUni';
const STORAGE_KEY = 'facebookPopupSeen';

export default function FacebookPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the popup before
    const hasSeenPopup = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenPopup) {
      // Show popup after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleFacebookClick = () => {
    window.open(FACEBOOK_URL, '_blank', 'noopener,noreferrer');
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose} aria-label="Đóng">
          <X size={24} />
        </button>
        
        <div className={styles.bannerWrapper}>
          <img 
            src="/images/phenikaa-banner.jpg" 
            alt="Liên chi đoàn Trường công nghệ thông tin Phenikaa"
            className={styles.bannerImage}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <Facebook className={styles.facebookIcon} />
          </div>
          
          <h2 className={styles.title}>Theo dõi chúng tôi trên Facebook!</h2>
          
          <p className={styles.description}>
            Cập nhật tin tức mới nhất và các hoạt động của Liên chi đoàn
          </p>
          
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.facebookButton}
            onClick={handleFacebookClick}
          >
            <Facebook size={20} />
            <span>Xem trang Facebook</span>
          </a>
          
          <button className={styles.skipBtn} onClick={handleClose}>
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
}


import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Sparkles } from 'lucide-react';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect immediately to order page
    navigate('/order');
  }, [navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <Coffee className={styles.logo} />
          <h1 className={styles.title}>CaféPSC</h1>
          <p className={styles.subtitle}>Đang chuyển hướng...</p>
        </div>
      </div>
    </div>
  );
}

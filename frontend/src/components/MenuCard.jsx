import { Coffee, Plus, Ban } from 'lucide-react';
import styles from './MenuCard.module.css';

export default function MenuCard({ product, onAdd, style }) {
  const { name, price, is_available, category } = product;

  const categoryEmoji = {
    coffee: '☕',
    tea: '🍵',
    smoothie: '🥤',
    juice: '🍊',
  };

  return (
    <div 
      className={`${styles.card} ${!is_available ? styles.unavailable : ''}`}
      style={style}
    >
      <div className={styles.cardTop}>
        <span className={styles.emoji}>
          {categoryEmoji[category] || '☕'}
        </span>
        <span className={styles.category}>{category}</span>
      </div>
      
      <div className={styles.cardBody}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.price}>
          {price.toLocaleString('vi-VN')}đ
        </p>
      </div>

      <div className={styles.cardFooter}>
        {is_available ? (
          <button 
            className={styles.addBtn}
            onClick={() => onAdd(product)}
          >
            <Plus size={18} />
            <span>Thêm</span>
          </button>
        ) : (
          <div className={styles.unavailableTag}>
            <Ban size={16} />
            <span>Hết hàng</span>
          </div>
        )}
      </div>

      {!is_available && <div className={styles.overlay} />}
    </div>
  );
}




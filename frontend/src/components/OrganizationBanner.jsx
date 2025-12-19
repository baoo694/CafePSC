import { Building2, GraduationCap } from 'lucide-react';
import styles from './OrganizationBanner.module.css';

export default function OrganizationBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <Building2 className={styles.icon} />
        </div>
        <div className={styles.text}>
          <h3 className={styles.title}>Liên chi đoàn Trường công nghệ thông tin Phenikaa</h3>
          <p className={styles.subtitle}>CaféPSC - Dịch vụ phục vụ sinh viên</p>
        </div>
        <GraduationCap className={styles.graduationIcon} />
      </div>
    </div>
  );
}


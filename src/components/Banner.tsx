import React from 'react';
import styles from './Banner.module.scss';
import { Button } from './Button';

interface BannerProps {
  status?: 'alert' | 'warning';
  children: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Banner({ status = 'alert', children, icon, onDismiss, className }: BannerProps) {
  const classes = [styles.banner, styles[status], className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.content}>{children}</span>
      {onDismiss && (
        <Button variant="ghost" size="sm" onClick={onDismiss} className={styles.dismiss}>
          ✕
        </Button>
      )}
    </div>
  );
}

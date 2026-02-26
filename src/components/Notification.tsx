import React, { useEffect, useRef, useState } from 'react';
import styles from './Notification.module.scss';

interface NotificationProps {
  status?: 'alert' | 'warning' | 'primary';
  shake?: boolean;
  shakeInterval?: number;
  children: React.ReactNode;
  className?: string;
}

export function Notification({
  status = 'primary',
  shake = false,
  shakeInterval = 30000,
  children,
  className,
}: NotificationProps) {
  const [isShaking, setIsShaking] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!shake) return;

    const triggerShake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    };

    const initialTimer = setTimeout(triggerShake, 3000);
    intervalRef.current = window.setInterval(triggerShake, shakeInterval);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [shake, shakeInterval]);

  const classes = [
    styles.notification,
    styles[`status-${status}`],
    isShaking ? styles.shaking : null,
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}

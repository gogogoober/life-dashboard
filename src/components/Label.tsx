import React from 'react';
import styles from './Label.module.scss';

interface LabelProps {
  variant?: 'emphasis' | 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export function Label({ variant = 'primary', children, className }: LabelProps) {
  const classes = [styles[variant], className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}

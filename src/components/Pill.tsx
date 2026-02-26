import React from 'react';
import styles from './Pill.module.scss';

interface PillProps {
  position?: 'overlay' | 'inline';
  status?: 'alert' | 'warning' | 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export function Pill({ position = 'inline', status = 'primary', children, className }: PillProps) {
  const classes = [
    styles.pill,
    styles[position],
    styles[`status-${status}`],
    className,
  ].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
}

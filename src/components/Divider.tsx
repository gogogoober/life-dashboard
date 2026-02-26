import React from 'react';
import styles from './Divider.module.scss';

interface DividerProps {
  variant?: 'primary' | 'secondary' | 'emphasis';
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Divider({ variant = 'secondary', spacing = 'sm', className }: DividerProps) {
  const classes = [styles[variant], styles[`spacing-${spacing}`], className].filter(Boolean).join(' ');
  return <div className={classes} />;
}

import React from 'react';
import styles from './Text.module.scss';

interface TextProps {
  variant?: 'emphasis' | 'primary' | 'secondary' | 'tertiary' | 'alert' | 'warning';
  as?: 'p' | 'span' | 'div';
  children: React.ReactNode;
  className?: string;
}

export function Text({ variant = 'primary', as: Tag = 'span', children, className }: TextProps) {
  const classes = [styles[variant], className].filter(Boolean).join(' ');
  return <Tag className={classes}>{children}</Tag>;
}

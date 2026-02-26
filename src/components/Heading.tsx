import React from 'react';
import styles from './Heading.module.scss';

interface HeadingProps {
  size?: 'lg' | 'md' | 'sm';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'div';
  children: React.ReactNode;
  className?: string;
}

export function Heading({ size = 'md', as: Tag = 'h2', children, className }: HeadingProps) {
  const classes = [styles[size], className].filter(Boolean).join(' ');
  return <Tag className={classes}>{children}</Tag>;
}

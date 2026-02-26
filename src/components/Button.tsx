import React from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  variant?: 'primary' | 'ghost';
  status?: 'alert' | 'warning' | 'primary';
  size?: 'sm' | 'md';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', status = 'primary', size = 'md', onClick, children, className, disabled }, ref) => {
    const classes = [
      styles.button,
      styles[variant],
      styles[`status-${status}`],
      styles[size],
      className,
    ].filter(Boolean).join(' ');

    return (
      <button ref={ref} className={classes} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

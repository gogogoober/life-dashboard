import React from 'react';
import styles from './Panel.module.scss';

interface PanelProps {
  status?: 'alert' | 'warning' | 'primary' | 'secondary' | 'none';
  divider?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ status = 'none', divider = false, children, className }, ref) => {
    const classes = [
      styles.panel,
      divider ? styles.divider : null,
      status !== 'none' ? styles[`status-${status}`] : null,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes}>
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

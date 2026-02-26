import React from 'react';
import styles from './Panel.module.scss';

interface PanelProps {
  status?: 'alert' | 'warning' | 'primary' | 'secondary' | 'none';
  divider?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ status = 'none', divider = false, children, className, style }, ref) => {
    const classes = [
      styles.panel,
      divider ? styles.divider : null,
      status !== 'none' ? styles[`status-${status}`] : null,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} style={style}>
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

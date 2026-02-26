import React from 'react';
import styles from './Section.module.scss';
import { Heading } from './Heading';

interface SectionProps {
  use?: 'base' | 'primary' | 'overlay' | 'ghost';
  flush?: 'top' | 'bottom' | 'none';
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const titleSizeMap: Record<NonNullable<SectionProps['use']>, 'lg' | 'md' | 'sm'> = {
  base: 'lg',
  primary: 'md',
  overlay: 'sm',
  ghost: 'sm',
};

export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ use = 'primary', flush = 'none', title, children, className, style }, ref) => {
    const classes = [
      styles.section,
      styles[use],
      flush !== 'none' ? styles[`flush-${flush}`] : null,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} style={style}>
        {title && (
          <Heading size={titleSizeMap[use]} className={styles.title}>
            {title}
          </Heading>
        )}
        {children}
      </div>
    );
  }
);

Section.displayName = 'Section';

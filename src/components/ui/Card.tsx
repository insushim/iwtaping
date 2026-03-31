'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'gradient' | 'glow' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, variant = 'default', className = '', children, style, ...props }, ref) => {
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
      },
      gradient: {
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))',
        boxShadow: 'var(--shadow-card)',
      },
      glow: {
        background: 'var(--bg-card)',
        boxShadow: '0 0 20px rgba(108, 92, 231, 0.15), var(--shadow-card)',
      },
      glass: {
        background: 'rgba(22, 22, 58, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-card)',
      },
    };

    const hoverClass = hoverable
      ? 'cursor-pointer transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(108,92,231,0.2),0_0_0_1px_rgba(108,92,231,0.3)]'
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-xl border border-[var(--key-border)] ${hoverClass} ${className}`}
        style={{
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

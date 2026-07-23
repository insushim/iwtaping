'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'gradient' | 'glow' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, variant = 'default', className = '', children, style, ...props }, ref) => {
    // 2026 트렌드: 반투명 표면 + 블러 + 상단 인셋 하이라이트(soft glass)
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: 'color-mix(in srgb, var(--bg-card) 78%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'var(--shadow-card)',
      },
      gradient: {
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))',
        boxShadow: 'var(--shadow-card)',
      },
      glow: {
        background: 'color-mix(in srgb, var(--bg-card) 78%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: '0 0 24px rgba(108, 92, 231, 0.18), var(--shadow-card)',
      },
      glass: {
        background: 'rgba(22, 22, 58, 0.6)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'var(--shadow-card)',
      },
    };

    const hoverClass = hoverable
      ? 'cursor-pointer transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_16px_48px_rgba(108,92,231,0.22),0_0_0_1px_rgba(108,92,231,0.35)]'
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-2xl border border-[var(--key-border)] ${hoverClass} ${className}`}
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

'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, className = '', children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl border border-[var(--key-border)] ${hoverable ? 'cursor-pointer transition-all hover:scale-[1.01]' : ''} ${className}`}
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-card)',
          ...(hoverable ? {} : {}),
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

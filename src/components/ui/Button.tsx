'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'text-white hover:opacity-90 active:scale-[0.98]',
      secondary: 'border hover:opacity-80 active:scale-[0.98]',
      ghost: 'hover:opacity-80',
      danger: 'text-white hover:opacity-90 active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const bgStyles = {
      primary: { background: 'var(--color-primary)' },
      secondary: { background: 'transparent', borderColor: 'var(--key-border)', color: 'var(--text-primary)' },
      ghost: { background: 'transparent', color: 'var(--text-secondary)' },
      danger: { background: 'var(--color-error)' },
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        style={bgStyles[variant]}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

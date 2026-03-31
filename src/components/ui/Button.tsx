'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';

    const variants = {
      primary: 'text-white hover:shadow-[0_4px_16px_rgba(108,92,231,0.4)] hover:scale-[1.02] active:scale-[0.98]',
      secondary: 'border hover:shadow-[0_4px_16px_rgba(108,92,231,0.15)] hover:scale-[1.02] active:scale-[0.98]',
      ghost: 'hover:opacity-80',
      danger: 'text-white hover:shadow-[0_4px_16px_rgba(255,107,107,0.4)] hover:scale-[1.02] active:scale-[0.98]',
      gradient: 'text-white hover:shadow-[0_4px_20px_rgba(108,92,231,0.5)] hover:scale-[1.02] active:scale-[0.98]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const bgStyles: Record<string, React.CSSProperties> = {
      primary: { background: 'var(--color-primary)' },
      secondary: { background: 'transparent', borderColor: 'var(--key-border)', color: 'var(--text-primary)' },
      ghost: { background: 'transparent', color: 'var(--text-secondary)' },
      danger: { background: 'var(--color-error)' },
      gradient: { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' },
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        style={bgStyles[variant]}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

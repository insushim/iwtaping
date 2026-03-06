'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const variantStyles = {
  default: { background: 'rgba(108,92,231,0.2)', color: 'var(--color-primary-light)' },
  success: { background: 'rgba(0,184,148,0.2)', color: 'var(--color-success)' },
  warning: { background: 'rgba(253,203,110,0.2)', color: 'var(--color-warning)' },
  error: { background: 'rgba(255,107,107,0.2)', color: 'var(--color-error)' },
  info: { background: 'rgba(0,210,211,0.2)', color: 'var(--color-secondary)' },
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </span>
  );
}

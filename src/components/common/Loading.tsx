'use client';

export function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative w-12 h-12">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: 'var(--color-primary)', borderRightColor: 'var(--color-secondary)' }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg animate-pulse ${className}`}
      style={{ background: 'var(--bg-tertiary)' }}
    />
  );
}

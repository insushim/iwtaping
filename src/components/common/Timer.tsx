'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatTime } from '@/lib/utils/helpers';

interface TimerProps {
  isRunning: boolean;
  mode?: 'countup' | 'countdown';
  initialSeconds?: number;
  onTick?: (seconds: number) => void;
  onComplete?: () => void;
  className?: string;
}

export function Timer({ isRunning, mode = 'countup', initialSeconds = 0, onTick, onComplete, className = '' }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = mode === 'countup' ? prev + 1 : prev - 1;
        onTick?.(next);
        if (mode === 'countdown' && next <= 0) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, mode, onTick, onComplete]);

  const isWarning = mode === 'countdown' && seconds <= 10;

  return (
    <span
      className={`font-mono font-bold ${className}`}
      style={{ color: isWarning ? 'var(--color-error)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
    >
      {formatTime(seconds)}
    </span>
  );
}

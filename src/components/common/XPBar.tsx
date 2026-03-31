'use client';

import { useProgressStore, xpToNextLevel } from '@/stores/useProgressStore';

export function XPBar() {
  const { progress } = useProgressStore();
  const { needed, progress: pct } = xpToNextLevel(progress.level, progress.xp);

  return (
    <div className="xp-bar-container w-full">
      <div className="xp-bar-fill" style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function XPBarDetailed({ className = '' }: { className?: string }) {
  const { progress } = useProgressStore();
  const { needed, progress: pct } = xpToNextLevel(progress.level, progress.xp);

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            Lv.{progress.level}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {progress.xp} / {needed} XP
          </span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Lv.{progress.level + 1}
        </span>
      </div>
      <div className="xp-bar-container rounded-full" style={{ height: 8 }}>
        <div
          className="xp-bar-fill rounded-full"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

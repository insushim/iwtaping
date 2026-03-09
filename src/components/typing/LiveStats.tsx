'use client';

import { SpeedUnit } from '@/types/typing';

interface LiveStatsProps {
  speed: number;
  accuracy: number;
  combo: number;
  progress: number;
  status: 'ready' | 'typing' | 'finished';
  speedUnit: SpeedUnit;
}

export function LiveStats({ speed, accuracy, combo, progress, status, speedUnit }: LiveStatsProps) {
  const unitLabel = speedUnit === 'kpm' ? '타/분' : speedUnit === 'wpm' ? 'WPM' : 'CPM';
  const displaySpeed = speedUnit === 'wpm' ? speed / 5 : speedUnit === 'cpm' ? speed * 0.8 : speed;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>속도</span>
        <span className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
          {Math.round(displaySpeed)}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unitLabel}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>정확도</span>
        <span className="text-2xl font-bold" style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: accuracy >= 95 ? 'var(--color-success)' : accuracy >= 80 ? 'var(--color-warning)' : 'var(--color-error)',
        }}>
          {accuracy.toFixed(1)}%
        </span>
      </div>

      {combo > 0 && (
        <div className="flex items-center gap-1 combo-pop">
          <span className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-combo)' }}>
            {combo}
          </span>
          <span className="text-xs font-bold" style={{ color: 'var(--color-combo)' }}>COMBO</span>
        </div>
      )}

      <div className="flex-1 min-w-[100px]">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}
          />
        </div>
        <div className="text-right mt-0.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

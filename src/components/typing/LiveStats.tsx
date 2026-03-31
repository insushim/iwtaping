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

function ComboFire() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="streak-fire">
      <path d="M8 1C8 1 3 6 3 9.5C3 12.5 5.2 14.5 8 14.5C10.8 14.5 13 12.5 13 9.5C13 6 8 1 8 1Z" fill="#FF6B6B"/>
      <path d="M8 5C8 5 5.5 8 5.5 10C5.5 11.7 6.6 12.5 8 12.5C9.4 12.5 10.5 11.7 10.5 10C10.5 8 8 5 8 5Z" fill="#FECA57"/>
    </svg>
  );
}

function getComboColor(combo: number): string {
  if (combo >= 50) return '#FFD700';
  if (combo >= 20) return '#FF6B6B';
  if (combo >= 10) return '#FD79A8';
  return 'var(--color-combo)';
}

function getComboLabel(combo: number): string {
  if (combo >= 50) return 'LEGENDARY!';
  if (combo >= 30) return 'AMAZING!';
  if (combo >= 20) return 'GREAT!';
  if (combo >= 10) return 'NICE!';
  return 'COMBO';
}

export function LiveStats({ speed, accuracy, combo, progress, status, speedUnit }: LiveStatsProps) {
  const unitLabel = speedUnit === 'kpm' ? '타/분' : speedUnit === 'wpm' ? 'WPM' : 'CPM';
  const displaySpeed = speedUnit === 'wpm' ? speed / 5 : speedUnit === 'cpm' ? speed * 0.8 : speed;
  const comboColor = getComboColor(combo);

  return (
    <div className="flex items-center gap-4 md:gap-6 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>속도</span>
        <span className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary)' }}>
          {Math.round(displaySpeed)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{unitLabel}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>정확도</span>
        <span className="text-2xl font-bold" style={{
          fontFamily: "'JetBrains Mono', monospace",
          color: accuracy >= 95 ? 'var(--color-success)' : accuracy >= 80 ? 'var(--color-warning)' : 'var(--color-error)',
        }}>
          {accuracy.toFixed(1)}%
        </span>
      </div>

      {combo > 0 && (
        <div className="flex items-center gap-1 combo-pop">
          {combo >= 10 && <ComboFire />}
          <span className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: comboColor }}>
            {combo}
          </span>
          <span
            className="text-[10px] font-bold"
            style={{
              color: comboColor,
              textShadow: combo >= 20 ? `0 0 8px ${comboColor}` : 'none',
            }}
          >
            {getComboLabel(combo)}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-[80px]">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: progress >= 90
                ? 'linear-gradient(90deg, var(--color-primary), var(--color-success))'
                : 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
            }}
          />
        </div>
        <div className="text-right mt-0.5">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

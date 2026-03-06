'use client';

import { TypingResult } from '@/types/typing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatTime } from '@/lib/utils/helpers';

interface ResultPanelProps {
  result: TypingResult;
  maxCombo: number;
  onRestart: () => void;
}

export function ResultPanel({ result, maxCombo, onRestart }: ResultPanelProps) {
  const stats = [
    { label: '타/분', value: result.kpm, color: 'var(--color-primary)' },
    { label: 'WPM', value: result.wpm, color: 'var(--color-secondary)' },
    { label: '정확도', value: `${result.accuracy.toFixed(1)}%`, color: result.accuracy >= 95 ? 'var(--color-success)' : 'var(--color-warning)' },
    { label: '일관성', value: `${result.consistency.toFixed(1)}%`, color: 'var(--color-primary-light)' },
    { label: '최고 속도', value: result.maxSpeed, color: 'var(--color-accent-warm)' },
    { label: '최대 콤보', value: maxCombo, color: 'var(--color-combo)' },
  ];

  return (
    <div className="w-full count-up">
      <h2 className="text-2xl font-bold text-center mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
        결과
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
            <div className="text-3xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: stat.color }}>
              {typeof stat.value === 'number' ? Math.round(stat.value) : stat.value}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span style={{ color: 'var(--text-muted)' }}>경과 시간</span>
            <div className="font-mono font-bold mt-1">{formatTime(result.elapsedTime)}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>총 키 입력</span>
            <div className="font-mono font-bold mt-1">{result.totalKeystrokes}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>정확 입력</span>
            <div className="font-mono font-bold mt-1" style={{ color: 'var(--color-success)' }}>{result.correctKeystrokes}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>오타</span>
            <div className="font-mono font-bold mt-1" style={{ color: 'var(--color-error)' }}>{result.errorKeystrokes}</div>
          </div>
        </div>
      </Card>

      {result.speedHistory.length > 1 && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>속도 변화</h3>
          <div className="h-32 flex items-end gap-[2px]">
            {result.speedHistory.map((speed, i) => {
              const max = Math.max(...result.speedHistory, 1);
              const height = (speed / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: `${height}%`,
                    background: `linear-gradient(to top, var(--color-primary), var(--color-secondary))`,
                    opacity: 0.4 + (height / 100) * 0.6,
                  }}
                  title={`${Math.round(speed)} 타/분`}
                />
              );
            })}
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-4">
        <Button onClick={onRestart} size="lg">
          다시 시도
        </Button>
      </div>
    </div>
  );
}

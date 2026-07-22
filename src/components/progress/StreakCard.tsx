'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { useProgressStore } from '@/stores/useProgressStore';
import { FREEZE_COST, MAX_FREEZES } from '@/lib/progress/streak';

/**
 * 스트릭 + 프리즈 구매.
 * 하루 못 했다고 수십 일이 통째로 사라지면 그 시점에 이탈한다.
 * 프리즈는 그 이탈 지점을 막는 장치이고, 코인의 첫 번째 실제 쓸모이기도 하다.
 */
export function StreakCard({ className = '' }: { className?: string }) {
  const { progress, buyFreeze } = useProgressStore();
  const [message, setMessage] = useState<string | null>(null);

  const canBuy = progress.coins >= FREEZE_COST && progress.freezes < MAX_FREEZES;

  const handleBuy = () => {
    if (buyFreeze()) {
      setMessage('프리즈를 하나 얻었어요');
    } else if (progress.freezes >= MAX_FREEZES) {
      setMessage(`프리즈는 최대 ${MAX_FREEZES}개까지 가질 수 있어요`);
    } else {
      setMessage(`코인이 ${FREEZE_COST - progress.coins}개 부족해요`);
    }
    setTimeout(() => setMessage(null), 2400);
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          연속 연습
        </h3>
        <span className="text-xs font-bold" style={{ color: 'var(--color-accent-warm)' }}>
          🪙 {progress.coins.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <div className="text-3xl font-black leading-none" style={{ fontFamily: "'JetBrains Mono'", color: '#FECA57' }}>
            🔥 {progress.streakDays}
          </div>
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            일 연속
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1.5">
            {Array.from({ length: MAX_FREEZES }, (_, i) => (
              <span
                key={i}
                className="text-base"
                style={{ opacity: i < progress.freezes ? 1 : 0.25 }}
                aria-hidden
              >
                🧊
              </span>
            ))}
            <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>
              프리즈 {progress.freezes}/{MAX_FREEZES}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBuy}
            disabled={!canBuy}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md transition-opacity disabled:opacity-40"
            style={{
              background: canBuy ? 'var(--color-primary)' : 'var(--bg-tertiary)',
              color: canBuy ? '#fff' : 'var(--text-muted)',
            }}
          >
            프리즈 구매 · {FREEZE_COST} 코인
          </button>
        </div>
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
        하루 쉬어도 프리즈가 있으면 연속 기록이 유지돼요.
      </p>

      {message && (
        <div className="mt-2 text-center text-[11px] font-bold" style={{ color: 'var(--color-secondary)' }} role="status">
          {message}
        </div>
      )}
    </Card>
  );
}

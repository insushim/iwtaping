'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import {
  LEAGUE_TIERS,
  getTier,
  BUCKET_SIZE,
  bucketQuota,
  msUntilWeeklyReset,
  formatCountdown,
} from '@/lib/progress/league';

interface LeagueCardProps {
  /** 현재 티어(0=브론즈). 서버 연동 전에는 레벨에서 추정한다. */
  tierId: number;
  /** 버킷 내 내 순위(1부터). 미확정이면 null */
  rank?: number | null;
  xpThisWeek?: number;
  /** 실제 버킷 인원. 서버 연동 전이거나 0명이면 정원(30)을 기준으로 그린다. */
  bucketSize?: number;
  className?: string;
}

export function LeagueCard({
  tierId,
  rank = null,
  xpThisWeek = 0,
  bucketSize = 0,
  className = '',
}: LeagueCardProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const tier = getTier(tierId);
  // 덜 찬 버킷은 승급/강등 정원이 줄어든다 — 화면의 선과 실제 정산이 같아야 한다.
  const size = bucketSize > 0 ? bucketSize : BUCKET_SIZE;
  const quota = bucketQuota(tierId, size);

  useEffect(() => {
    setRemaining(msUntilWeeklyReset());
    const timer = setInterval(() => setRemaining(msUntilWeeklyReset()), 60000);
    return () => clearInterval(timer);
  }, []);

  const promoteLine = quota.promote;
  const demoteLine = size - quota.demote;

  const zone =
    rank == null
      ? null
      : promoteLine > 0 && rank <= promoteLine
        ? 'promote'
        : quota.demote > 0 && rank > demoteLine
          ? 'demote'
          : 'safe';

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full grid place-items-center text-xs font-black"
            style={{ background: tier.color, color: '#1a1a2e' }}
            aria-hidden
          >
            {tierId + 1}
          </span>
          <div>
            <div className="text-sm font-bold">{tier.name} 리그</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {size}명 중 경쟁
            </div>
          </div>
        </div>
        {remaining !== null && (
          <div className="text-right">
            <div className="text-xs font-bold" style={{ color: 'var(--color-accent-warm)' }}>
              {formatCountdown(remaining)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              마감까지
            </div>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <div>
          <span className="text-2xl font-black" style={{ fontFamily: "'JetBrains Mono'" }}>
            {rank == null ? '—' : `#${rank}`}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
            내 순위
          </span>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          이번 주 {xpThisWeek.toLocaleString()} XP
        </div>
      </div>

      {/* 승급/강등 구간을 눈에 보이게 — "조금만 더 하면 올라간다"가 동기가 된다 */}
      <div className="flex h-2 rounded-full overflow-hidden mb-2" role="presentation">
        {promoteLine > 0 && (
          <div style={{ width: `${(promoteLine / size) * 100}%`, background: 'var(--color-success)' }} />
        )}
        <div style={{ flex: 1, background: 'var(--bg-tertiary)' }} />
        {quota.demote > 0 && (
          <div style={{ width: `${(quota.demote / size) * 100}%`, background: 'var(--color-error)' }} />
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {zone === 'promote' && '승급권이에요! 마감까지 유지하세요.'}
        {zone === 'safe' && promoteLine > 0 && `${promoteLine}위 안에 들면 승급해요.`}
        {zone === 'safe' && promoteLine === 0 && '이번 주 참가자가 아직 적어요. 마감까지 인원이 차면 승급 자리가 열립니다.'}
        {zone === 'demote' && '강등권이에요. 조금만 더 연습해볼까요?'}
        {zone == null &&
          (promoteLine > 0
            ? `상위 ${promoteLine}명이 ${LEAGUE_TIERS[Math.min(tierId + 1, LEAGUE_TIERS.length - 1)].name}로 올라갑니다.`
            : '최상위 리그입니다. 자리를 지키세요.')}
      </p>
    </Card>
  );
}

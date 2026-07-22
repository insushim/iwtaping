'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GameResult, GameType } from '@/types/game';
import { PracticeSession } from '@/types/typing';
import { LeagueCard } from '@/components/league/LeagueCard';
import { fetchLeaderboard, fetchLeague, LeaderboardEntry, LeagueState } from '@/lib/api/client';
import { useProgressStore } from '@/stores/useProgressStore';
import { useAccountStore } from '@/stores/useAccountStore';

type RankMode = 'speed' | 'accuracy' | 'game';

interface RankEntry {
  rank: number;
  label: string;
  primary: string;
  secondary: string;
  date: string;
}

const GAME_NAMES: Record<string, string> = {
  rain: '산성비',
  space: '우주 방어',
  race: '타이핑 레이스',
  defense: '킹덤 디펜스',
  zombie: '좀비 서바이벌',
  puzzle: '끝말잇기',
};

function readJSON<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ko-KR');
}

export default function RankingPage() {
  const [mode, setMode] = useState<RankMode>('speed');
  const [scope, setScope] = useState<'me' | 'national'>('me');
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [national, setNational] = useState<LeaderboardEntry[] | null>(null);
  const [league, setLeague] = useState<LeagueState | null>(null);
  const [nationalLoading, setNationalLoading] = useState(false);

  const { progress, loadProgress } = useProgressStore();
  const accountStatus = useAccountStore((s) => s.status);

  useEffect(() => {
    loadProgress();
    setSessions(readJSON<PracticeSession>('typingverse-sessions').filter((s) => s?.result));
    setGameResults(readJSON<GameResult>('typingverse-game-results').filter((g) => g?.gameType));
  }, [loadProgress]);

  // 전국 순위는 백엔드가 있을 때만 채워진다. 없으면 null → 안내 문구.
  useEffect(() => {
    if (scope !== 'national') return;
    let cancelled = false;
    setNationalLoading(true);
    const serverMode = mode === 'game' ? 'game:rain' : mode;
    fetchLeaderboard(serverMode, 'weekly').then((entries) => {
      if (cancelled) return;
      setNational(entries);
      setNationalLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [scope, mode]);

  // 서버가 진실원이다. 미배포·미등록이면 레벨로 티어를 추정한다(레벨 10마다 한 단계).
  useEffect(() => {
    let alive = true;
    fetchLeague().then((state) => {
      if (alive) setLeague(state);
    });
    return () => {
      alive = false;
    };
  }, [accountStatus]);

  const estimatedTier = league?.tier ?? Math.min(4, Math.floor((progress.level - 1) / 10));

  const rankings = useMemo<RankEntry[]>(() => {
    if (mode === 'game') {
      // 게임별 최고 점수 1개씩 → 점수 내림차순
      const best = new Map<GameType, GameResult>();
      for (const g of gameResults) {
        const prev = best.get(g.gameType);
        if (!prev || g.score > prev.score) best.set(g.gameType, g);
      }
      return [...best.values()]
        .sort((a, b) => b.score - a.score)
        .map((g, i) => ({
          rank: i + 1,
          label: GAME_NAMES[g.gameType] ?? g.gameType,
          primary: `${Math.round(g.score).toLocaleString()}점`,
          secondary: `${g.maxCombo} 콤보`,
          date: formatDate(g.timestamp),
        }));
    }

    const sorted = [...sessions].sort((a, b) =>
      mode === 'speed' ? b.result.kpm - a.result.kpm : b.result.accuracy - a.result.accuracy
    );

    return sorted.slice(0, 20).map((s, i) => ({
      rank: i + 1,
      label: s.text ? `${s.text.slice(0, 14)}${s.text.length > 14 ? '…' : ''}` : '연습 기록',
      primary:
        mode === 'speed'
          ? `${Math.round(s.result.kpm)} 타/분`
          : `${s.result.accuracy.toFixed(1)}%`,
      secondary:
        mode === 'speed'
          ? `${s.result.accuracy.toFixed(1)}%`
          : `${Math.round(s.result.kpm)} 타/분`,
      date: formatDate(s.timestamp),
    }));
  }, [mode, sessions, gameResults]);

  const columns =
    mode === 'game'
      ? { label: '게임', primary: '최고 점수', secondary: '최고 콤보' }
      : mode === 'speed'
        ? { label: '지문', primary: '속도', secondary: '정확도' }
        : { label: '지문', primary: '정확도', secondary: '속도' };

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 gradient-text" style={{ fontFamily: "'Outfit', sans-serif" }}>
        리그 &amp; 랭킹
      </h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        매주 같은 리그의 {league?.bucketSize || 30}명과 겨룹니다. 마감 때 순위에 따라 승급하거나 강등돼요.
      </p>

      <LeagueCard
        tierId={estimatedTier}
        rank={league?.rank ?? null}
        xpThisWeek={league?.xpEarned ?? progress.totalXpEarned}
        bucketSize={league?.bucketSize ?? 0}
        className="mb-6"
      />

      {league?.lastWeek?.outcome && (
        <Card className="p-3 mb-6 text-sm">
          <span className="font-bold">지난주 결과</span>{' '}
          {league.lastWeek.rank != null && `${league.lastWeek.rank}위 · `}
          {league.lastWeek.outcome === 'promoted'
            ? '승급했어요! 🎉'
            : league.lastWeek.outcome === 'demoted'
              ? '강등됐어요. 이번 주에 되찾아봐요.'
              : '자리를 지켰어요.'}
          {league.lastWeek.coins > 0 && ` (+${league.lastWeek.coins} 코인)`}
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        <Button variant={scope === 'me' ? 'primary' : 'secondary'} size="sm" onClick={() => setScope('me')}>
          내 기록
        </Button>
        <Button variant={scope === 'national' ? 'primary' : 'secondary'} size="sm" onClick={() => setScope('national')}>
          전국 순위
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={mode === 'speed' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('speed')}>
          속도
        </Button>
        <Button variant={mode === 'accuracy' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('accuracy')}>
          정확도
        </Button>
        <Button variant={mode === 'game' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('game')}>
          게임
        </Button>
      </div>

      {scope === 'national' ? (
        <Card className="overflow-hidden">
          {nationalLoading ? (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              불러오는 중…
            </p>
          ) : national && national.length ? (
            <ul className="divide-y divide-[var(--key-border)]">
              {national.map((entry) => (
                <li key={`${entry.rank}-${entry.nickname}`} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="w-8 text-sm font-bold"
                    style={{
                      color: entry.rank <= 3 ? 'var(--color-accent-warm)' : 'var(--text-secondary)',
                      fontFamily: "'JetBrains Mono'",
                    }}
                  >
                    {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                  </span>
                  <span className="flex-1 font-medium truncate">{entry.nickname}</span>
                  <span className="text-sm font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>
                    {entry.value.toLocaleString()}
                  </span>
                  <span className="text-xs w-14 text-right" style={{ color: 'var(--text-muted)' }}>
                    {entry.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12 px-6">
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                전국 순위를 불러올 수 없어요.
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {accountStatus === 'offline' || accountStatus === 'unregistered'
                  ? '오프라인 상태예요. 연습 기록은 이 기기에 안전하게 저장됩니다.'
                  : '아직 이번 주 기록이 없습니다.'}
              </p>
            </div>
          )}
        </Card>
      ) : (
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>순위</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{columns.label}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{columns.primary}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{columns.secondary}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>날짜</th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                    아직 기록이 없습니다. {mode === 'game' ? '게임을 플레이해보세요!' : '연습을 시작해보세요!'}
                  </td>
                </tr>
              ) : (
                rankings.map((entry) => (
                  <tr key={`${entry.rank}-${entry.label}`} className="border-t border-[var(--key-border)]">
                    <td className="px-4 py-3">
                      <span
                        className="font-bold"
                        style={{
                          color: entry.rank <= 3 ? 'var(--color-accent-warm)' : 'var(--text-secondary)',
                          fontFamily: "'JetBrains Mono'",
                        }}
                      >
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.label}</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>
                      {entry.primary}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--text-secondary)' }}>
                      {entry.secondary}
                    </td>
                    <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-muted)' }}>
                      {entry.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
}

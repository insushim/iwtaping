import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameResult, hitAccuracy } from '@/hooks/useGameResult';
import { useGameStore } from '@/stores/useGameStore';

/**
 * 6개 게임이 진행도 시스템과 끊겨 있던 회귀를 막는 래칫.
 * (일일 퀘스트 "게임 한 판"·게임 도전과제의 유일한 원천이 addResult다)
 */
describe('hitAccuracy', () => {
  it('시도가 없으면 NaN이 아니라 0', () => {
    expect(hitAccuracy(0, 0)).toBe(0);
    expect(Number.isNaN(hitAccuracy(3, 0))).toBe(false);
  });

  it('맞힌 비율을 소수 1자리로 반환한다', () => {
    expect(hitAccuracy(8, 10)).toBe(80);
    expect(hitAccuracy(1, 3)).toBe(33.3);
    expect(hitAccuracy(10, 10)).toBe(100);
  });

  it('100%를 넘지 않는다', () => {
    expect(hitAccuracy(12, 10)).toBe(100);
  });
});

describe('useGameResult', () => {
  beforeEach(() => {
    // addResult는 저장본을 기준으로 누적하므로 메모리와 저장소 둘 다 비워야 한다.
    useGameStore.setState({ results: [] });
    localStorage.removeItem('typingverse-game-results');
  });

  const sample = () => ({
    gameType: 'rain' as const,
    score: 120,
    level: 2,
    maxCombo: 5,
    accuracy: 90,
    wordsTyped: 9,
    elapsedTime: 30,
  });

  it('게임이 끝나지 않았으면 기록하지 않는다', () => {
    renderHook(() => useGameResult(false, sample));
    expect(useGameStore.getState().results).toHaveLength(0);
  });

  it('게임 종료 시 한 번 기록한다', () => {
    renderHook(() => useGameResult(true, sample));
    const { results } = useGameStore.getState();
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(120);
    expect(results[0].timestamp).toBeGreaterThan(0);
  });

  it('같은 판에서 리렌더가 반복돼도 중복 지급하지 않는다', () => {
    const { rerender } = renderHook(({ done }) => useGameResult(done, sample), {
      initialProps: { done: true },
    });
    rerender({ done: true });
    rerender({ done: true });
    expect(useGameStore.getState().results).toHaveLength(1);
  });

  it('다음 판이 시작되면 잠금이 풀려 다시 기록된다', () => {
    const { rerender } = renderHook(({ done }) => useGameResult(done, sample), {
      initialProps: { done: true },
    });
    rerender({ done: false }); // 재시작
    rerender({ done: true }); // 두 번째 판 종료
    expect(useGameStore.getState().results).toHaveLength(2);
  });

  it('게임 기록이 저장본 위에 누적된다(스토어가 비어 있어도)', () => {
    renderHook(() => useGameResult(true, sample));
    useGameStore.setState({ results: [] }); // 페이지 이동 흉내 — 저장소는 그대로
    renderHook(() => useGameResult(true, sample));
    const saved = JSON.parse(localStorage.getItem('typingverse-game-results') || '[]');
    expect(saved).toHaveLength(2);
  });

  it('build가 null이면 기록하지 않는다(한 번도 입력 안 한 판)', () => {
    renderHook(() => useGameResult(true, () => null));
    expect(useGameStore.getState().results).toHaveLength(0);
  });

  it('기록하면 일일 퀘스트 "게임" 진행도가 오른다', async () => {
    const { useQuestStore } = await import('@/stores/useQuestStore');
    useQuestStore.getState().load();
    const before = useQuestStore.getState().state.progress.games ?? 0;
    renderHook(() => useGameResult(true, sample));
    expect(useQuestStore.getState().state.progress.games).toBe(before + 1);
  });

  it('maxCombo가 콤보 퀘스트 진행도에 반영된다', async () => {
    const { useQuestStore } = await import('@/stores/useQuestStore');
    useQuestStore.getState().load();
    renderHook(() => useGameResult(true, () => ({ ...sample(), maxCombo: 42 })));
    expect(useQuestStore.getState().state.progress.combo).toBeGreaterThanOrEqual(42);
  });
});

describe('게임 페이지 배선', () => {
  it('6개 게임이 모두 useGameResult를 호출한다', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    for (const g of ['rain', 'zombie', 'defense', 'space', 'race', 'puzzle']) {
      const src = fs.readFileSync(
        path.resolve(__dirname, `../src/app/game/${g}/page.tsx`),
        'utf8'
      );
      expect(src, `${g}가 useGameResult를 호출하지 않습니다`).toContain('useGameResult(');
    }
  });
});

vi.mock('@/stores/useAchievementToast', () => ({ notifyAchievements: () => {} }));

describe('퍼펙트게임 도전과제 문턱', () => {
  it('한 단어만 맞히고 끝낸 판으로는 열리지 않는다', async () => {
    const { evaluateAchievements } = await import('@/lib/progress/achievements');
    const base = { gameType: 'rain' as const, score: 10, level: 1, maxCombo: 1, accuracy: 100, elapsedTime: 5, timestamp: 0 };
    const stats = { achievements: [] } as never;
    expect(evaluateAchievements({ stats, streakDays: 0, game: { ...base, wordsTyped: 1 } })).not.toContain('perfect_game');
    expect(evaluateAchievements({ stats, streakDays: 0, game: { ...base, wordsTyped: 12 } })).toContain('perfect_game');
  });
});

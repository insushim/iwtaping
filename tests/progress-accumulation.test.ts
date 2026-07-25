import { describe, it, expect, beforeEach } from 'vitest';
import { useQuestStore } from '@/stores/useQuestStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { loadProgress, saveProgress, emptyProgress } from '@/lib/progress/quests';
import type { TypingResult } from '@/types/typing';

/**
 * 진행도 스토어는 "저장본을 다시 읽고 그 위에 더한다"를 지켜야 한다.
 *
 * 지키지 않으면: load()가 호출되지 않은 페이지(연습·테스트·게임)에서 스토어가 0인 채로
 * 저장돼 이전 누적치를 통째로 덮어쓴다. 실측상 일일 퀘스트는 1~2에서 멈췄고
 * totalSessions는 영원히 1이었다(2026-07-25).
 */

const result = (): TypingResult => ({
  wpm: 60, cpm: 300, kpm: 300, accuracy: 98, maxSpeed: 320, consistency: 90,
  totalKeystrokes: 100, correctKeystrokes: 98, errorKeystrokes: 2, elapsedTime: 60,
  fingerAccuracy: {} as TypingResult['fingerAccuracy'],
  keyAccuracy: {}, speedHistory: [], problemKeys: [],
});

describe('일일 퀘스트 누적', () => {
  beforeEach(() => {
    saveProgress(emptyProgress());
    useQuestStore.setState({ state: emptyProgress() });
  });

  it('스토어가 비어 있어도 저장본 위에 누적된다', () => {
    const store = useQuestStore.getState();
    store.recordEvent({ kind: 'game' });
    // load()를 부르지 않은 새 페이지를 흉내낸다 — 메모리 상태만 초기화
    useQuestStore.setState({ state: emptyProgress() });
    store.recordEvent({ kind: 'game' });
    useQuestStore.setState({ state: emptyProgress() });
    store.recordEvent({ kind: 'game' });

    expect(loadProgress().progress.games).toBe(3);
  });

  it('연습 세션도 같은 방식으로 누적된다', () => {
    const store = useQuestStore.getState();
    for (let i = 0; i < 4; i++) {
      useQuestStore.setState({ state: emptyProgress() }); // 페이지 이동 흉내
      store.recordEvent({ kind: 'practice', keystrokes: 100, accuracy: 98, seconds: 60 });
    }
    const p = loadProgress().progress;
    expect(p.sessions).toBe(4);
    expect(p.keystrokes).toBe(400);
    expect(p.accuracy_sessions).toBe(4);
  });

  it('maxCombo는 누적이 아니라 최댓값이다', () => {
    const store = useQuestStore.getState();
    store.recordEvent({ kind: 'game', maxCombo: 30 });
    useQuestStore.setState({ state: emptyProgress() });
    store.recordEvent({ kind: 'game', maxCombo: 12 });
    expect(loadProgress().progress.combo).toBe(30);
  });
});

describe('손상된 저장본 방어', () => {
  it('통계 저장본의 배열 필드가 깨져도 세션 기록이 계속된다', () => {
    localStorage.setItem(
      'typingverse-stats',
      JSON.stringify({ dailyStats: null, achievements: null, keyStats: null, totalSessions: 7 })
    );
    expect(() => useStatsStore.getState().recordSession(result())).not.toThrow();
    const saved = JSON.parse(localStorage.getItem('typingverse-stats') || '{}');
    expect(Array.isArray(saved.dailyStats)).toBe(true);
    expect(saved.totalSessions).toBe(8); // 살아있는 숫자는 보존
  });

  it('저장본이 JSON이 아니어도 크래시하지 않는다', () => {
    localStorage.setItem('typingverse-stats', '{깨진 json');
    expect(() => useStatsStore.getState().recordSession(result())).not.toThrow();
  });
});

describe('세션 이중 기록 방지', () => {
  it('TypingArea를 쓰는 페이지는 recordSession을 직접 부르지 않는다', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = path.resolve(__dirname, '../src/app');

    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        return e.isDirectory() ? walk(full) : full.endsWith('.tsx') ? [full] : [];
      });

    const offenders = walk(root).filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      return /<TypingArea/.test(src) && /recordSession\s*\(/.test(src);
    });

    expect(
      offenders.map((f) => path.relative(root, f)),
      'TypingArea가 이미 세션을 기록한다 — 페이지에서 또 부르면 세션·타수·퀘스트가 2배가 된다'
    ).toEqual([]);
  });
});

describe('통계 누적', () => {
  beforeEach(() => {
    useStatsStore.getState().resetStats();
  });

  it('스토어가 초기값이어도 저장본 위에 누적된다', () => {
    const store = useStatsStore.getState();
    store.recordSession(result());
    useStatsStore.setState({ stats: { ...useStatsStore.getState().stats, totalSessions: 0, totalKeystrokes: 0 } });
    store.recordSession(result());
    useStatsStore.setState({ stats: { ...useStatsStore.getState().stats, totalSessions: 0, totalKeystrokes: 0 } });
    store.recordSession(result());

    const saved = JSON.parse(localStorage.getItem('typingverse-stats') || '{}');
    expect(saved.totalSessions).toBe(3);
    expect(saved.totalKeystrokes).toBe(300);
  });
});

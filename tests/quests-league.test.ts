import { describe, it, expect } from 'vitest';
import {
  getDailyQuests,
  emptyProgress,
  applyEvent,
  isComplete,
  claim,
  isClaimed,
  questRatio,
} from '@/lib/progress/quests';
import { settleRank, nextTier, LEAGUE_TIERS, MAX_TIER, BUCKET_SIZE, formatCountdown } from '@/lib/progress/league';

describe('일일 퀘스트', () => {
  it('하루 3개를, 서로 다른 종류로 낸다', () => {
    const quests = getDailyQuests('2026-07-22');
    expect(quests).toHaveLength(3);
    expect(new Set(quests.map((q) => q.metric)).size).toBe(3);
  });

  it('같은 날짜면 항상 같은 퀘스트가 나온다 (기기 무관)', () => {
    expect(getDailyQuests('2026-07-22')).toEqual(getDailyQuests('2026-07-22'));
  });

  it('날짜가 다르면 구성이 달라질 수 있다', () => {
    const week = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'];
    const signatures = new Set(week.map((d) => getDailyQuests(d).map((q) => `${q.metric}:${q.target}`).join('|')));
    expect(signatures.size).toBeGreaterThan(1);
  });

  it('연습 이벤트가 누적 진행도에 반영된다', () => {
    let state = emptyProgress('2026-07-22');
    state = applyEvent(state, { kind: 'practice', keystrokes: 200, accuracy: 97, seconds: 120 });
    state = applyEvent(state, { kind: 'practice', keystrokes: 150, accuracy: 90, seconds: 60 });
    expect(state.progress.sessions).toBe(2);
    expect(state.progress.keystrokes).toBe(350);
    expect(state.progress.accuracy_sessions).toBe(1); // 97%만 해당
    expect(state.progress.minutes).toBeCloseTo(3, 5);
  });

  it('콤보는 누적이 아니라 최댓값으로 기록된다', () => {
    let state = emptyProgress('2026-07-22');
    state = applyEvent(state, { kind: 'game', maxCombo: 30 });
    state = applyEvent(state, { kind: 'game', maxCombo: 12 });
    expect(state.progress.combo).toBe(30);
    expect(state.progress.games).toBe(2);
  });

  it('미완료 퀘스트는 수령할 수 없다', () => {
    const quest = getDailyQuests('2026-07-22')[0];
    const state = emptyProgress('2026-07-22');
    expect(isComplete(quest, state)).toBe(false);
    expect(claim(state, quest)).toBe(state);
  });

  it('한 번 수령한 퀘스트는 다시 수령되지 않는다 (중복 보상 차단)', () => {
    const quest = getDailyQuests('2026-07-22')[0];
    let state = emptyProgress('2026-07-22');
    state = { ...state, progress: { [quest.metric]: quest.target * 2 } };
    expect(isComplete(quest, state)).toBe(true);

    const claimed = claim(state, quest);
    expect(isClaimed(quest, claimed)).toBe(true);
    const again = claim(claimed, quest);
    expect(again.claimed).toHaveLength(1);
  });

  it('진행률은 1을 넘지 않는다', () => {
    const quest = getDailyQuests('2026-07-22')[0];
    const state = { ...emptyProgress('2026-07-22'), progress: { [quest.metric]: quest.target * 10 } };
    expect(questRatio(quest, state)).toBe(1);
  });
});

describe('리그 승강제', () => {
  it('브론즈 상위권은 승급한다', () => {
    expect(settleRank(0, 1, 500, BUCKET_SIZE)).toBe('promoted');
    expect(settleRank(0, LEAGUE_TIERS[0].promote, 500, BUCKET_SIZE)).toBe('promoted');
  });

  it('브론즈는 강등되지 않는다 (최하위 티어)', () => {
    expect(settleRank(0, BUCKET_SIZE, 100, BUCKET_SIZE)).toBe('stayed');
  });

  it('상위 티어일수록 승급이 좁다', () => {
    const promotes = LEAGUE_TIERS.map((t) => t.promote);
    for (let i = 1; i < promotes.length; i++) {
      expect(promotes[i]).toBeLessThan(promotes[i - 1]);
    }
  });

  it('최상위 티어에서는 승급하지 않는다', () => {
    expect(settleRank(MAX_TIER, 1, 9999, BUCKET_SIZE)).toBe('stayed');
    expect(nextTier(MAX_TIER, 'promoted')).toBe(MAX_TIER);
  });

  it('하위권은 강등된다', () => {
    expect(settleRank(2, BUCKET_SIZE, 100, BUCKET_SIZE)).toBe('demoted');
  });

  it('XP를 하나도 못 벌면 승급하지 않는다 (빈 계정 승급 방지)', () => {
    expect(settleRank(0, 1, 0, BUCKET_SIZE)).toBe('stayed');
    expect(settleRank(2, 1, 0, BUCKET_SIZE)).toBe('stayed');
  });

  it('XP 0이어도 강등은 정원 안에서만 일어난다 (대량 강등 방지)', () => {
    // 골드는 하위 5명(26~30위) 강등 — 25위는 안전, 26위부터 강등.
    expect(settleRank(2, 25, 0, BUCKET_SIZE)).toBe('stayed');
    expect(settleRank(2, 26, 0, BUCKET_SIZE)).toBe('demoted');
    expect(settleRank(2, BUCKET_SIZE, 0, BUCKET_SIZE)).toBe('demoted');
  });

  it('티어 이동은 경계를 벗어나지 않는다', () => {
    expect(nextTier(0, 'demoted')).toBe(0);
    expect(nextTier(1, 'promoted')).toBe(2);
    expect(nextTier(3, 'stayed')).toBe(3);
  });

  it('카운트다운 표기는 사람이 읽을 수 있다', () => {
    expect(formatCountdown(0)).toBe('곧 정산');
    expect(formatCountdown(90 * 60 * 1000)).toBe('1시간 30분');
    expect(formatCountdown(50 * 60 * 60 * 1000)).toContain('일');
  });
});

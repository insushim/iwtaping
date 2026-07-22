import { describe, it, expect } from 'vitest';
import { advanceStreak, expireStreakIfLapsed, streakMultiplier, FREEZE_COST, MAX_FREEZES } from '@/lib/progress/streak';
import { toDateKey, daysBetween, getToday } from '@/lib/utils/helpers';

describe('날짜 유틸 (로컬 기준)', () => {
  it('toDateKey는 로컬 타임존 기준 날짜를 낸다 (UTC 변환 금지)', () => {
    // KST 00:30 → UTC로는 전날 15:30. toISOString()을 쓰면 하루가 밀린다.
    const localMidnight = new Date(2026, 6, 22, 0, 30, 0);
    expect(toDateKey(localMidnight)).toBe('2026-07-22');
  });

  it('getToday는 오늘 로컬 날짜와 일치한다', () => {
    expect(getToday()).toBe(toDateKey(new Date()));
  });

  it('daysBetween은 월·연 경계를 넘어서도 정확하다', () => {
    expect(daysBetween('2026-07-22', '2026-07-23')).toBe(1);
    expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-07-22', '2026-07-22')).toBe(0);
    expect(daysBetween('2026-07-25', '2026-07-22')).toBe(-3);
  });
});

describe('스트릭 단일 원장', () => {
  it('첫 연습이면 1일부터 시작', () => {
    expect(advanceStreak({ streakDays: 0, lastPracticeDate: '' }, '2026-07-22')).toEqual({
      streakDays: 1,
      lastPracticeDate: '2026-07-22',
    });
  });

  it('연속된 다음 날 연습하면 +1', () => {
    expect(advanceStreak({ streakDays: 3, lastPracticeDate: '2026-07-21' }, '2026-07-22')).toEqual({
      streakDays: 4,
      lastPracticeDate: '2026-07-22',
    });
  });

  it('같은 날 여러 번 연습해도 중복 증가하지 않는다', () => {
    const once = advanceStreak({ streakDays: 3, lastPracticeDate: '2026-07-21' }, '2026-07-22');
    const twice = advanceStreak(once, '2026-07-22');
    expect(twice.streakDays).toBe(4);
  });

  it('하루를 건너뛰면 1로 재시작', () => {
    expect(advanceStreak({ streakDays: 9, lastPracticeDate: '2026-07-20' }, '2026-07-22').streakDays).toBe(1);
  });

  it('기기 시계를 되돌려도 음수 간격은 1로 재시작한다', () => {
    expect(advanceStreak({ streakDays: 5, lastPracticeDate: '2026-07-25' }, '2026-07-22').streakDays).toBe(1);
  });

  it('방문만으로는 스트릭이 오르지 않는다 (만료 확인 전용)', () => {
    const prev = { streakDays: 3, lastPracticeDate: '2026-07-21' };
    expect(expireStreakIfLapsed(prev, '2026-07-22')).toEqual(prev);
  });

  it('이틀 이상 비면 만료 시 0이 된다', () => {
    expect(expireStreakIfLapsed({ streakDays: 3, lastPracticeDate: '2026-07-19' }, '2026-07-22').streakDays).toBe(0);
  });

  it('프리즈가 있으면 하루 공백을 메운다', () => {
    const next = expireStreakIfLapsed(
      { streakDays: 12, lastPracticeDate: '2026-07-20', freezes: 1 },
      '2026-07-22'
    );
    expect(next.streakDays).toBe(12);
    expect(next.freezes).toBe(0);
    // 다음 연습이 이어지도록 마지막 활동일이 어제로 당겨진다
    expect(advanceStreak(next, '2026-07-22').streakDays).toBe(13);
  });

  it('프리즈가 모자라면 스트릭이 끊긴다', () => {
    const next = expireStreakIfLapsed(
      { streakDays: 12, lastPracticeDate: '2026-07-18', freezes: 1 },
      '2026-07-22'
    );
    expect(next.streakDays).toBe(0);
  });

  it('프리즈가 있어도 스트릭이 0이면 살릴 게 없다', () => {
    const next = expireStreakIfLapsed(
      { streakDays: 0, lastPracticeDate: '2026-07-20', freezes: 3 },
      '2026-07-22'
    );
    expect(next.streakDays).toBe(0);
  });

  it('프리즈 상수는 합리적 범위다', () => {
    expect(FREEZE_COST).toBeGreaterThan(0);
    expect(MAX_FREEZES).toBeGreaterThan(0);
    expect(MAX_FREEZES).toBeLessThanOrEqual(5);
  });

  it('XP 배수는 구간별로 적용된다', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.2);
    expect(streakMultiplier(7)).toBe(1.5);
    expect(streakMultiplier(30)).toBe(1.5);
  });
});

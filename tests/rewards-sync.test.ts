import { describe, it, expect } from 'vitest';
import { earnedXpFor as clientXp, earnedCoinsFor as clientCoins } from '@/lib/progress/rewards';
import { earnedXpFor as serverXp, earnedCoinsFor as serverCoins } from '../functions/lib/rewards';
import { migrateProgress, PROGRESS_SCHEMA_VERSION, xpWithinLevel, xpForLevel } from '@/stores/useProgressStore';
import { getToday, toDateKey } from '@/lib/utils/helpers';

/**
 * 보상 공식은 클라이언트와 서버 두 곳에 복제되어 있다(빌드 설정이 달라 공유 불가).
 * 두 값이 갈라지면 화면 XP와 서버 잔액이 어긋나므로 여기서 일치를 강제한다.
 */
describe('보상 공식 클라이언트/서버 동기화', () => {
  const cases: [number, number, number][] = [
    [0, 0, 0],
    [120, 88.5, 10],
    [320, 96, 45],
    [800, 100, 200],
    [1299, 99.9, 999],
  ];

  it.each(cases)('kpm=%s accuracy=%s combo=%s 에서 XP가 동일하다', (kpm, acc, combo) => {
    expect(clientXp(kpm, acc, combo)).toBe(serverXp(kpm, acc, combo));
  });

  it.each(cases)('kpm=%s accuracy=%s combo=%s 에서 코인이 동일하다', (kpm, acc, combo) => {
    const xp = clientXp(kpm, acc, combo);
    expect(clientCoins(xp)).toBe(serverCoins(xp));
  });

  it('비정상 입력(NaN·음수)에서도 두 구현이 같은 값을 낸다', () => {
    expect(clientXp(Number.NaN, -5, Number.POSITIVE_INFINITY)).toBe(
      serverXp(Number.NaN, -5, Number.POSITIVE_INFINITY)
    );
  });

  it('XP는 최소 1을 보장한다', () => {
    expect(clientXp(0, 0, 0)).toBe(1);
  });
});

describe('진행도 저장 스키마 마이그레이션', () => {
  it('구버전(방문 기준) 스트릭은 부풀린 값을 승계하지 않는다', () => {
    const migrated = migrateProgress({ streakDays: 57, lastActiveDate: getToday() });
    expect(migrated.streakDays).toBe(1);
    expect(migrated.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
  });

  it('오래 비운 계정은 0으로 되돌린다', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const migrated = migrateProgress({ streakDays: 30, lastActiveDate: toDateKey(old) });
    expect(migrated.streakDays).toBe(0);
  });

  it('이미 최신 스키마면 건드리지 않는다', () => {
    const migrated = migrateProgress({
      streakDays: 12,
      lastActiveDate: getToday(),
      schemaVersion: PROGRESS_SCHEMA_VERSION,
    });
    expect(migrated.streakDays).toBe(12);
  });

  it('저장값이 비어 있어도 기본값으로 복구된다', () => {
    const migrated = migrateProgress({});
    expect(migrated.level).toBe(1);
    expect(migrated.streakDays).toBe(0);
  });
});

describe('서버 누적 XP → 클라이언트 레벨 내 XP 변환', () => {
  it('레벨 1이면 누적값이 그대로다', () => {
    expect(xpWithinLevel(50, 1)).toBe(50);
  });

  it('레벨 2면 1레벨 요구치를 뺀 값이다', () => {
    expect(xpWithinLevel(xpForLevel(1) + 30, 2)).toBe(30);
  });

  it('음수가 나오지 않는다', () => {
    expect(xpWithinLevel(0, 5)).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { evaluateAchievements, RULED_KEYS } from '@/lib/progress/achievements';
import { ACHIEVEMENTS_LIST } from '@/lib/utils/constants';
import { UserStats } from '@/types/stats';
import { GameResult } from '@/types/game';

function baseStats(over: Partial<UserStats> = {}): UserStats {
  return {
    totalSessions: 0,
    totalPracticeTime: 0,
    totalKeystrokes: 0,
    bestKpm: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    avgKpm: 0,
    avgWpm: 0,
    avgAccuracy: 0,
    dailyStats: [],
    keyStats: {},
    fingerStats: {} as UserStats['fingerStats'],
    achievements: [],
    streakDays: 0,
    lastPracticeDate: '',
    gameHighScores: {} as UserStats['gameHighScores'],
    modeRecords: {} as UserStats['modeRecords'],
    ...over,
  };
}

describe('도전과제 해금', () => {
  it('첫 세션이면 첫 발걸음이 해금된다', () => {
    const unlocked = evaluateAchievements({ stats: baseStats({ totalSessions: 1 }), streakDays: 1 });
    expect(unlocked).toContain('first_step');
  });

  it('속도 구간이 누적으로 함께 해금된다', () => {
    const unlocked = evaluateAchievements({ stats: baseStats({ bestKpm: 320 }), streakDays: 0 });
    expect(unlocked).toEqual(expect.arrayContaining(['speed_100', 'speed_200', 'lightning']));
    expect(unlocked).not.toContain('speed_400');
    expect(unlocked).not.toContain('master');
  });

  it('이미 해금된 것은 다시 목록에 오르지 않는다', () => {
    const unlocked = evaluateAchievements({
      stats: baseStats({ bestKpm: 320, achievements: ['speed_100', 'speed_200'] }),
      streakDays: 0,
    });
    expect(unlocked).not.toContain('speed_100');
    expect(unlocked).toContain('lightning');
  });

  it('스트릭 과제는 연속 일수 기준으로 해금된다', () => {
    expect(evaluateAchievements({ stats: baseStats(), streakDays: 3 })).toContain('streak_3');
    expect(evaluateAchievements({ stats: baseStats(), streakDays: 7 })).toContain('fire_practice');
    expect(evaluateAchievements({ stats: baseStats(), streakDays: 2 })).not.toContain('streak_3');
  });

  it('콤보 과제는 이번 세션의 최대 콤보로 판정한다', () => {
    const unlocked = evaluateAchievements({ stats: baseStats(), streakDays: 0, maxCombo: 55 });
    expect(unlocked).toEqual(expect.arrayContaining(['combo_10', 'combo_50']));
    expect(unlocked).not.toContain('combo_100');
  });

  it('게임 과제는 해당 게임 결과가 있을 때만 해금된다', () => {
    const game: GameResult = {
      gameType: 'rain',
      score: 5000,
      level: 12,
      maxCombo: 20,
      accuracy: 100,
      wordsTyped: 80,
      elapsedTime: 120,
      timestamp: Date.now(),
    };
    const unlocked = evaluateAchievements({ stats: baseStats(), streakDays: 0, game });
    expect(unlocked).toEqual(expect.arrayContaining(['perfect_game', 'rain_clear']));
    expect(unlocked).not.toContain('space_clear');
  });

  it('연습 세션만으로는 게임 과제가 해금되지 않는다', () => {
    const unlocked = evaluateAchievements({ stats: baseStats({ totalSessions: 5 }), streakDays: 1 });
    expect(unlocked).not.toContain('perfect_game');
    expect(unlocked).not.toContain('rain_clear');
  });

  it('시간대 과제는 판정 시각으로 결정된다', () => {
    const night = new Date(2026, 6, 22, 1, 30);
    const morning = new Date(2026, 6, 22, 5, 30);
    const noon = new Date(2026, 6, 22, 12, 0);
    expect(evaluateAchievements({ stats: baseStats(), streakDays: 0, now: night })).toContain('night_owl');
    expect(evaluateAchievements({ stats: baseStats(), streakDays: 0, now: morning })).toContain('early_bird');
    const day = evaluateAchievements({ stats: baseStats(), streakDays: 0, now: noon });
    expect(day).not.toContain('night_owl');
    expect(day).not.toContain('early_bird');
  });

  it('누적 연습량 과제가 단계적으로 해금된다', () => {
    const unlocked = evaluateAchievements({
      stats: baseStats({ totalPracticeTime: 3600 * 11, totalKeystrokes: 12000 }),
      streakDays: 0,
    });
    expect(unlocked).toEqual(expect.arrayContaining(['practice_1h', 'practice_10h', 'word_1000', 'word_10000']));
    expect(unlocked).not.toContain('practice_100h');
  });
});

describe('도전과제 정의 정합성', () => {
  it('평가 규칙의 key는 전부 표시 목록에 존재한다 (오타로 영영 안 뜨는 것 방지)', () => {
    const listed = new Set(ACHIEVEMENTS_LIST.map((a) => a.key as string));
    const orphans = RULED_KEYS.filter((k) => !listed.has(k));
    expect(orphans).toEqual([]);
  });

  it('규칙이 없는 과제는 영원히 잠기므로 목록으로 추적한다', () => {
    const ruled = new Set(RULED_KEYS);
    const unruled = ACHIEVEMENTS_LIST.map((a) => a.key as string).filter((k) => !ruled.has(k));
    // 아직 판정 근거 데이터가 없는 과제들 — 늘어나면 안 된다
    expect(unruled.sort()).toEqual(
      ['all_positions', 'code_master', 'diamond', 'king'].sort()
    );
  });
});

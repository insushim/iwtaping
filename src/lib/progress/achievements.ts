import { UserStats } from '@/types/stats';
import { TypingResult } from '@/types/typing';
import { GameResult } from '@/types/game';

/**
 * 도전과제 평가.
 *
 * ACHIEVEMENTS_LIST는 화면에 표시만 되고 있었고 unlockAchievement를 호출하는
 * 코드가 없어 30종 전부가 영원히 잠긴 상태였다. 여기서 실제 조건을 판정한다.
 *
 * 순수 함수로 둬서(스토어에 의존하지 않음) 테스트로 조건을 고정한다.
 */

export interface AchievementContext {
  stats: UserStats;
  streakDays: number;
  /** 이번에 끝낸 연습 세션 (게임이면 없음) */
  result?: TypingResult;
  /** 이번에 끝낸 게임 (연습이면 없음) */
  game?: GameResult;
  maxCombo?: number;
  language?: 'ko' | 'en';
  /** 판정 시각(테스트에서 고정). 기본은 지금 */
  now?: Date;
}

type Rule = (ctx: AchievementContext) => boolean;

const HOUR_MS = 3600;

const RULES: Record<string, Rule> = {
  first_step: ({ stats }) => stats.totalSessions >= 1,

  speed_100: ({ stats }) => stats.bestKpm >= 100,
  speed_200: ({ stats }) => stats.bestKpm >= 200,
  lightning: ({ stats }) => stats.bestKpm >= 300,
  speed_400: ({ stats }) => stats.bestKpm >= 400,
  master: ({ stats }) => stats.bestKpm >= 500,
  speed_600: ({ stats }) => stats.bestKpm >= 600,

  accuracy_95: ({ stats }) => stats.bestAccuracy >= 95,
  sharpshooter: ({ stats }) => stats.bestAccuracy >= 99,

  combo_10: ({ maxCombo = 0 }) => maxCombo >= 10,
  combo_50: ({ maxCombo = 0 }) => maxCombo >= 50,
  combo_100: ({ maxCombo = 0 }) => maxCombo >= 100,

  practice_1h: ({ stats }) => stats.totalPracticeTime >= HOUR_MS,
  practice_10h: ({ stats }) => stats.totalPracticeTime >= HOUR_MS * 10,
  practice_100h: ({ stats }) => stats.totalPracticeTime >= HOUR_MS * 100,

  word_1000: ({ stats }) => stats.totalKeystrokes >= 1000,
  word_10000: ({ stats }) => stats.totalKeystrokes >= 10000,

  streak_3: ({ streakDays }) => streakDays >= 3,
  fire_practice: ({ streakDays }) => streakDays >= 7,
  streak_30: ({ streakDays }) => streakDays >= 30,

  veteran: ({ stats }) => stats.totalSessions >= 100,
  marathon: ({ stats }) => stats.totalPracticeTime >= HOUR_MS * 50,

  perfect_game: ({ game }) => !!game && game.accuracy >= 100,
  game_master: ({ game }) => !!game && game.score >= 1000,
  rain_clear: ({ game }) => !!game && game.gameType === 'rain' && game.level >= 10,
  space_clear: ({ game }) => !!game && game.gameType === 'space' && game.level >= 10,
  race_win: ({ game }) => !!game && game.gameType === 'race' && game.score > 0 && game.level >= 1,

  night_owl: ({ now = new Date() }) => now.getHours() >= 0 && now.getHours() < 4,
  early_bird: ({ now = new Date() }) => now.getHours() < 6 && now.getHours() >= 4,

  multilingual: ({ stats }) => {
    const modes = stats.modeRecords ?? {};
    return Object.keys(modes).length > 0 && stats.totalSessions >= 2;
  },
};

/**
 * 아직 잠겨 있으면서 조건을 만족한 도전과제 key 목록.
 * (조건 판정 중 예외가 나도 다른 과제 평가를 막지 않는다)
 */
export function evaluateAchievements(ctx: AchievementContext): string[] {
  const unlocked = new Set(ctx.stats.achievements ?? []);
  const newly: string[] = [];

  for (const [key, rule] of Object.entries(RULES)) {
    if (unlocked.has(key)) continue;
    try {
      if (rule(ctx)) newly.push(key);
    } catch {
      // 조건 판정 실패는 "미달성"으로 취급한다
    }
  }
  return newly;
}

/** 평가 규칙이 정의된 과제 key (표시 목록과의 누락 대조용) */
export const RULED_KEYS = Object.keys(RULES);

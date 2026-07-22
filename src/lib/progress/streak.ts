import { daysBetween } from '@/lib/utils/helpers';

/**
 * 스트릭 단일 진실원(single ledger).
 *
 * 정의: "연습 세션을 완료한 날"의 연속 일수. 단순 페이지 방문은 스트릭을 올리지 않는다.
 * (과거엔 useProgressStore(방문 기준)와 useStatsStore(세션 기준)가 각자 계산해
 *  같은 화면에 서로 다른 숫자가 나왔다 — 이 모듈로 일원화.)
 */

export interface StreakState {
  streakDays: number;
  lastPracticeDate: string; // YYYY-MM-DD (로컬 기준)
}

/** 연습을 완료했을 때의 새 스트릭. 같은 날 재연습은 그대로 유지한다. */
export function advanceStreak(prev: StreakState, today: string): StreakState {
  if (!prev.lastPracticeDate) {
    return { streakDays: 1, lastPracticeDate: today };
  }
  if (prev.lastPracticeDate === today) {
    // 오늘 이미 연습함 — 스트릭이 0이면 최소 1로 보정
    return { streakDays: Math.max(prev.streakDays, 1), lastPracticeDate: today };
  }
  const gap = daysBetween(prev.lastPracticeDate, today);
  if (Number.isNaN(gap) || gap < 0) {
    // 저장값 손상 또는 기기 시계 되돌림 — 오늘 기준으로 재시작
    return { streakDays: 1, lastPracticeDate: today };
  }
  const streakDays = gap === 1 ? prev.streakDays + 1 : 1;
  return { streakDays, lastPracticeDate: today };
}

/**
 * 앱 진입 시 만료 확인 전용. 스트릭을 올리지 않고, 끊긴 경우에만 0으로 만든다.
 * (방문만으로 스트릭이 오르던 버그의 수정 지점)
 */
export function expireStreakIfLapsed(prev: StreakState, today: string): StreakState {
  if (!prev.lastPracticeDate) return prev;
  const gap = daysBetween(prev.lastPracticeDate, today);
  if (Number.isNaN(gap)) return { streakDays: 0, lastPracticeDate: '' };
  if (gap >= 2) return { ...prev, streakDays: 0 };
  return prev;
}

/** XP 스트릭 보너스 배수 */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 7) return 1.5;
  if (streakDays >= 3) return 1.2;
  return 1;
}

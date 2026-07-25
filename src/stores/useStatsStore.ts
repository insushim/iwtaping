'use client';
import { create } from 'zustand';
import { UserStats, DailyStats } from '@/types/stats';
import { FingerType, TypingResult } from '@/types/typing';
import { getToday } from '@/lib/utils/helpers';
import { useProgressStore } from './useProgressStore';
import { useQuestStore } from './useQuestStore';
import { evaluateAchievements } from '@/lib/progress/achievements';
import { notifyAchievements } from './useAchievementToast';

const defaultUserStats: UserStats = {
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
  fingerStats: {} as Record<FingerType, { finger: FingerType; totalAttempts: number; correctAttempts: number; accuracy: number; avgSpeed: number }>,
  achievements: [],
  streakDays: 0,
  lastPracticeDate: '',
  gameHighScores: {} as UserStats['gameHighScores'],
  modeRecords: {} as UserStats['modeRecords'],
};

interface StatsStore {
  stats: UserStats;
  recordSession: (result: TypingResult, meta?: { maxCombo?: number; language?: 'ko' | 'en' }) => void;
  unlockAchievement: (key: string) => void;
  loadStats: () => void;
  resetStats: () => void;
}

const STATS_KEY = 'typingverse-stats';

/**
 * 저장된 통계를 진실원으로 읽는다.
 *
 * loadStats()는 홈·통계·게임목록·적응형연습 페이지에서만 호출된다. 정작 세션이 기록되는
 * 연습·테스트·게임 페이지에서는 스토어가 defaultUserStats(전부 0)인 채라, 그 0을 기준으로
 * 저장하면 누적 통계가 매 세션 통째로 리셋된다 — 실측상 totalSessions가 영원히 1이었다.
 * (useProgressStore는 Header·GlobalOverlays가 전역에서 load하므로 같은 문제가 없다.)
 */
function readStats(fallback: UserStats): UserStats {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return fallback;
    // 얕은 병합만 하면 저장본이 손상됐을 때(dailyStats: null 등) 이후 spread·includes가
    // 매번 예외를 던져 세션 기록이 영구히 마비된다. 구조가 깨진 필드는 기본값으로 되돌린다.
    const merged = { ...defaultUserStats, ...parsed } as UserStats;
    if (!Array.isArray(merged.dailyStats)) merged.dailyStats = [];
    if (!Array.isArray(merged.achievements)) merged.achievements = [];
    if (!merged.keyStats || typeof merged.keyStats !== 'object') merged.keyStats = {};
    if (!merged.fingerStats || typeof merged.fingerStats !== 'object') {
      merged.fingerStats = {} as UserStats['fingerStats'];
    }
    return merged;
  } catch { /* ignore */ }
  return fallback;
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  stats: defaultUserStats,

  recordSession: (result, meta) => {
    const prev = readStats(get().stats);
    const today = getToday();

    let dailyStats = [...prev.dailyStats];
    const todayIdx = dailyStats.findIndex(d => d.date === today);
    if (todayIdx >= 0) {
      const d = dailyStats[todayIdx];
      dailyStats[todayIdx] = {
        ...d,
        totalPracticeSeconds: d.totalPracticeSeconds + result.elapsedTime,
        totalKeystrokes: d.totalKeystrokes + result.totalKeystrokes,
        avgSpeed: (d.avgSpeed * d.sessionsCount + result.kpm) / (d.sessionsCount + 1),
        avgAccuracy: (d.avgAccuracy * d.sessionsCount + result.accuracy) / (d.sessionsCount + 1),
        sessionsCount: d.sessionsCount + 1,
      };
    } else {
      dailyStats.push({
        date: today,
        totalPracticeSeconds: result.elapsedTime,
        totalKeystrokes: result.totalKeystrokes,
        avgSpeed: result.kpm,
        avgAccuracy: result.accuracy,
        sessionsCount: 1,
      });
    }
    if (dailyStats.length > 365) dailyStats = dailyStats.slice(-365);

    // 스트릭은 useProgressStore가 단일 원장 — 여기선 갱신을 위임하고 값을 미러링만 한다.
    useProgressStore.getState().recordPracticeDay();
    const streak = useProgressStore.getState().progress.streakDays;

    // 일일 퀘스트 진행도 반영 (연습 세션 기준)
    useQuestStore.getState().recordEvent({
      kind: 'practice',
      keystrokes: result.totalKeystrokes,
      accuracy: result.accuracy,
      seconds: result.elapsedTime,
    });

    // 키·손가락 정확도 누적 (취약 키 드릴의 데이터 원천)
    const keyStats = { ...prev.keyStats };
    for (const [key, accuracy] of Object.entries(result.keyAccuracy ?? {})) {
      const entry = keyStats[key] ?? { key, totalAttempts: 0, correctAttempts: 0, accuracy: 100, avgResponseTime: 0 };
      // 세션 정확도를 1회 표본으로 누적한다(세션당 1건이라 표본이 천천히 쌓임)
      const totalAttempts = entry.totalAttempts + 1;
      const correctAttempts = entry.correctAttempts + accuracy / 100;
      keyStats[key] = {
        key,
        totalAttempts,
        correctAttempts,
        accuracy: (correctAttempts / totalAttempts) * 100,
        avgResponseTime: entry.avgResponseTime,
      };
    }

    const fingerStats = { ...prev.fingerStats };
    for (const [finger, accuracy] of Object.entries(result.fingerAccuracy ?? {}) as [FingerType, number][]) {
      const entry = fingerStats[finger] ?? { finger, totalAttempts: 0, correctAttempts: 0, accuracy: 100, avgSpeed: 0 };
      const totalAttempts = entry.totalAttempts + 1;
      const correctAttempts = entry.correctAttempts + accuracy / 100;
      fingerStats[finger] = {
        finger,
        totalAttempts,
        correctAttempts,
        accuracy: (correctAttempts / totalAttempts) * 100,
        avgSpeed: entry.avgSpeed,
      };
    }

    const totalSessions = prev.totalSessions + 1;
    const newStats: UserStats = {
      ...prev,
      totalSessions,
      totalPracticeTime: prev.totalPracticeTime + result.elapsedTime,
      totalKeystrokes: prev.totalKeystrokes + result.totalKeystrokes,
      bestKpm: Math.max(prev.bestKpm, result.kpm),
      bestWpm: Math.max(prev.bestWpm, result.wpm),
      bestAccuracy: Math.max(prev.bestAccuracy, result.accuracy),
      avgKpm: (prev.avgKpm * prev.totalSessions + result.kpm) / totalSessions,
      avgWpm: (prev.avgWpm * prev.totalSessions + result.wpm) / totalSessions,
      avgAccuracy: (prev.avgAccuracy * prev.totalSessions + result.accuracy) / totalSessions,
      dailyStats,
      keyStats,
      fingerStats,
      streakDays: streak,
      lastPracticeDate: today,
    };

    // 도전과제 평가 — 갱신된 통계 기준으로 판정한다(직전 값으로 하면 한 박자 늦는다)
    const newlyUnlocked = evaluateAchievements({
      stats: newStats,
      streakDays: streak,
      result,
      maxCombo: meta?.maxCombo,
      language: meta?.language,
    });

    const finalStats: UserStats = newlyUnlocked.length
      ? { ...newStats, achievements: [...newStats.achievements, ...newlyUnlocked] }
      : newStats;

    set({ stats: finalStats });
    if (typeof window !== 'undefined') {
      // unlockAchievement와 동일하게 저장 실패(시크릿 모드·용량 초과)를 삼킨다.
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(finalStats));
      } catch { /* ignore */ }
    }
    if (newlyUnlocked.length) notifyAchievements(newlyUnlocked);
  },

  unlockAchievement: (key) => {
    const prev = readStats(get().stats);
    if (prev.achievements.includes(key)) return;
    const newStats = { ...prev, achievements: [...prev.achievements, key] };
    set({ stats: newStats });
    if (typeof window !== 'undefined') {
      // 저장 실패(사파리 시크릿 모드·용량 초과)가 게임 종료 화면을 깨뜨리지 않도록 삼킨다.
      // 이 경로는 게임 6종의 결과 기록에서 호출된다.
      try {
        localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      } catch { /* ignore */ }
    }
  },

  loadStats: () => {
    if (typeof window === 'undefined') return;
    // 저장본이 없으면 set을 하지 않는다. 무조건 set하면 매번 새 객체가 들어가
    // 스토어 전체 구독자가 리렌더되고, 렌더 중에 loadStats를 부르는 화면에서는
    // 무한 렌더 루프(React #185)가 된다 — /game에서 실측으로 확인.
    if (!localStorage.getItem(STATS_KEY)) return;
    set({ stats: readStats(get().stats) });
  },

  resetStats: () => {
    set({ stats: defaultUserStats });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STATS_KEY);
    }
  },
}));

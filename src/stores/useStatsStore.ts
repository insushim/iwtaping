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

export const useStatsStore = create<StatsStore>((set, get) => ({
  stats: defaultUserStats,

  recordSession: (result, meta) => {
    const prev = get().stats;
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
      localStorage.setItem(STATS_KEY, JSON.stringify(finalStats));
    }
    if (newlyUnlocked.length) notifyAchievements(newlyUnlocked);
  },

  unlockAchievement: (key) => {
    const prev = get().stats;
    if (prev.achievements.includes(key)) return;
    const newStats = { ...prev, achievements: [...prev.achievements, key] };
    set({ stats: newStats });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    }
  },

  loadStats: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STATS_KEY);
        if (saved) {
          set({ stats: { ...defaultUserStats, ...JSON.parse(saved) } });
        }
      } catch { /* ignore */ }
    }
  },

  resetStats: () => {
    set({ stats: defaultUserStats });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STATS_KEY);
    }
  },
}));

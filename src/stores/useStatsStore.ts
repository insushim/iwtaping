'use client';
import { create } from 'zustand';
import { UserStats, DailyStats } from '@/types/stats';
import { FingerType, TypingResult } from '@/types/typing';
import { getToday } from '@/lib/utils/helpers';

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
  recordSession: (result: TypingResult) => void;
  unlockAchievement: (key: string) => void;
  loadStats: () => void;
  resetStats: () => void;
}

const STATS_KEY = 'typingverse-stats';

export const useStatsStore = create<StatsStore>((set, get) => ({
  stats: defaultUserStats,

  recordSession: (result) => {
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

    // Streak calculation
    let streak = prev.streakDays;
    if (prev.lastPracticeDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      streak = prev.lastPracticeDate === yesterdayStr ? streak + 1 : 1;
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
      streakDays: streak,
      lastPracticeDate: today,
    };

    set({ stats: newStats });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    }
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

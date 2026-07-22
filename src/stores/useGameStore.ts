'use client';
import { create } from 'zustand';
import { GameType, GameStatus, GameResult } from '@/types/game';
import { useQuestStore } from './useQuestStore';
import { useStatsStore } from './useStatsStore';
import { evaluateAchievements } from '@/lib/progress/achievements';
import { useProgressStore } from './useProgressStore';
import { notifyAchievements } from './useAchievementToast';

interface GameStore {
  gameType: GameType | null;
  status: GameStatus;
  score: number;
  level: number;
  combo: number;
  maxCombo: number;
  input: string;
  results: GameResult[];

  setGameType: (type: GameType) => void;
  setStatus: (status: GameStatus) => void;
  setScore: (score: number) => void;
  addScore: (points: number) => void;
  setLevel: (level: number) => void;
  setCombo: (combo: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  setInput: (input: string) => void;
  addResult: (result: GameResult) => void;
  reset: () => void;
  loadResults: () => void;
}

const RESULTS_KEY = 'typingverse-game-results';

export const useGameStore = create<GameStore>((set, get) => ({
  gameType: null,
  status: 'menu',
  score: 0,
  level: 1,
  combo: 0,
  maxCombo: 0,
  input: '',
  results: [],

  setGameType: (type) => set({ gameType: type }),
  setStatus: (status) => set({ status }),
  setScore: (score) => set({ score }),
  addScore: (points) => {
    const { combo } = get();
    const multiplier = combo >= 50 ? 5 : combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1;
    set((s) => ({ score: s.score + Math.round(points * multiplier) }));
  },
  setLevel: (level) => set({ level }),
  setCombo: (combo) => set({ combo }),
  incrementCombo: () => {
    const { combo, maxCombo } = get();
    const newCombo = combo + 1;
    set({ combo: newCombo, maxCombo: Math.max(maxCombo, newCombo) });
  },
  resetCombo: () => set({ combo: 0 }),
  setInput: (input) => set({ input }),
  addResult: (result) => {
    const results = [...get().results, result];
    set({ results });
    // 일일 퀘스트 진행도 (게임 판수·최대 콤보)
    useQuestStore.getState().recordEvent({ kind: 'game', maxCombo: result.maxCombo });

    // 게임 전용 도전과제 (퍼펙트게임·레벨 클리어·레이스 우승)
    const stats = useStatsStore.getState().stats;
    const unlocked = evaluateAchievements({
      stats,
      streakDays: useProgressStore.getState().progress.streakDays,
      game: result,
      maxCombo: result.maxCombo,
    });
    if (unlocked.length) {
      for (const key of unlocked) useStatsStore.getState().unlockAchievement(key);
      notifyAchievements(unlocked);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(-500)));
      } catch { /* ignore */ }
    }
  },
  reset: () => set({ status: 'menu', score: 0, level: 1, combo: 0, maxCombo: 0, input: '' }),
  loadResults: () => {
    if (typeof window !== 'undefined') {
      try {
        set({ results: JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]') });
      } catch { /* ignore */ }
    }
  },
}));

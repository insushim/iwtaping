'use client';
import { create } from 'zustand';

export interface ProgressState {
  xp: number;
  level: number;
  coins: number;
  streakDays: number;
  lastActiveDate: string;
  totalXpEarned: number;
  // Level-up tracking
  pendingLevelUp: number | null; // new level to celebrate
  pendingRewards: Reward[];
}

export interface Reward {
  type: 'theme' | 'accessory' | 'title' | 'coins';
  id: string;
  name: string;
  icon: string;
}

// XP needed for each level: level^1.5 * 100
export function xpForLevel(level: number): number {
  return Math.floor(Math.pow(level, 1.5) * 100);
}

export function xpToNextLevel(level: number, currentXp: number): { needed: number; progress: number } {
  const needed = xpForLevel(level);
  return { needed, progress: Math.min(currentXp / needed, 1) };
}

// Level rewards
const LEVEL_REWARDS: Record<number, Reward[]> = {
  2: [{ type: 'accessory', id: 'ribbon-red', name: '빨간 리본', icon: '🎀' }],
  3: [{ type: 'coins', id: 'coins-50', name: '50 코인', icon: '🪙' }],
  5: [{ type: 'accessory', id: 'hat-wizard', name: '마법사 모자', icon: '🧙' }],
  7: [{ type: 'coins', id: 'coins-100', name: '100 코인', icon: '💰' }],
  10: [{ type: 'accessory', id: 'glasses-star', name: '별 안경', icon: '⭐' }, { type: 'title', id: 'title-rookie', name: '타이핑 루키', icon: '🏅' }],
  15: [{ type: 'accessory', id: 'cape-purple', name: '보라색 망토', icon: '🦸' }],
  20: [{ type: 'accessory', id: 'crown-bronze', name: '브론즈 왕관', icon: '👑' }, { type: 'title', id: 'title-expert', name: '타이핑 전문가', icon: '🏆' }],
  25: [{ type: 'coins', id: 'coins-300', name: '300 코인', icon: '💎' }],
  30: [{ type: 'accessory', id: 'crown-silver', name: '실버 왕관', icon: '👑' }],
  40: [{ type: 'accessory', id: 'wings-angel', name: '천사 날개', icon: '😇' }],
  50: [{ type: 'accessory', id: 'crown-gold', name: '골드 왕관', icon: '👑' }, { type: 'title', id: 'title-master', name: '타이핑 마스터', icon: '🎖️' }],
};

const STORAGE_KEY = 'typingverse-progress';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

interface ProgressStore {
  progress: ProgressState;
  addXP: (amount: number, source?: string) => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  checkStreak: () => void;
  clearLevelUp: () => void;
  clearRewards: () => void;
  loadProgress: () => void;
  resetProgress: () => void;
}

const defaultProgress: ProgressState = {
  xp: 0,
  level: 1,
  coins: 0,
  streakDays: 0,
  lastActiveDate: '',
  totalXpEarned: 0,
  pendingLevelUp: null,
  pendingRewards: [],
};

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: defaultProgress,

  addXP: (amount: number) => {
    const prev = get().progress;
    let { xp, level, coins } = prev;
    const today = getToday();

    // Streak bonus
    let streakMultiplier = 1;
    if (prev.streakDays >= 7) streakMultiplier = 1.5;
    else if (prev.streakDays >= 3) streakMultiplier = 1.2;

    const actualXP = Math.floor(amount * streakMultiplier);
    xp += actualXP;

    // Check level up
    let newLevel = level;
    const rewards: Reward[] = [];
    while (xp >= xpForLevel(newLevel)) {
      xp -= xpForLevel(newLevel);
      newLevel++;
      // Coin bonus on level up
      coins += 20 + newLevel * 5;
      // Check for level rewards
      if (LEVEL_REWARDS[newLevel]) {
        rewards.push(...LEVEL_REWARDS[newLevel]);
      }
    }

    // Apply coin rewards
    for (const r of rewards) {
      if (r.type === 'coins') {
        const match = r.id.match(/coins-(\d+)/);
        if (match) coins += parseInt(match[1]);
      }
    }

    const newProgress: ProgressState = {
      ...prev,
      xp,
      level: newLevel,
      coins,
      totalXpEarned: prev.totalXpEarned + actualXP,
      lastActiveDate: today,
      pendingLevelUp: newLevel > level ? newLevel : prev.pendingLevelUp,
      pendingRewards: rewards.length > 0 ? [...prev.pendingRewards, ...rewards] : prev.pendingRewards,
    };

    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  addCoins: (amount: number) => {
    const prev = get().progress;
    const newProgress = { ...prev, coins: prev.coins + amount };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  spendCoins: (amount: number) => {
    const prev = get().progress;
    if (prev.coins < amount) return false;
    const newProgress = { ...prev, coins: prev.coins - amount };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
    return true;
  },

  checkStreak: () => {
    const prev = get().progress;
    const today = getToday();
    if (prev.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const streak = prev.lastActiveDate === yesterdayStr ? prev.streakDays + 1 : 1;
    const newProgress = { ...prev, streakDays: streak, lastActiveDate: today };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  clearLevelUp: () => {
    const prev = get().progress;
    const newProgress = { ...prev, pendingLevelUp: null };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  clearRewards: () => {
    const prev = get().progress;
    const newProgress = { ...prev, pendingRewards: [] };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  loadProgress: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          set({ progress: { ...defaultProgress, ...JSON.parse(saved) } });
        }
      } catch { /* ignore */ }
    }
  },

  resetProgress: () => {
    set({ progress: defaultProgress });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

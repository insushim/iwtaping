'use client';
import { create } from 'zustand';
import { getToday, daysBetween } from '@/lib/utils/helpers';
import { advanceStreak, expireStreakIfLapsed, streakMultiplier, FREEZE_COST, MAX_FREEZES } from '@/lib/progress/streak';

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
  /** 보유 스트릭 프리즈 */
  freezes: number;
  /** 저장 스키마 버전. 구버전 값 보정에 쓴다. */
  schemaVersion?: number;
}

/**
 * 2: 스트릭이 "방문 기준"에서 "연습 세션 기준"으로 바뀜.
 *    구버전은 페이지를 열기만 해도 스트릭이 올랐으므로 값이 부풀려져 있다.
 */
export const PROGRESS_SCHEMA_VERSION = 2;

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

/** 누적 XP에서 현재 레벨 진행분만 뽑아낸다(서버는 누적, 클라이언트는 레벨 내 잔여를 쓴다). */
export function xpWithinLevel(totalXp: number, level: number): number {
  let remaining = totalXp;
  for (let l = 1; l < level; l++) {
    remaining -= xpForLevel(l);
  }
  return Math.max(0, remaining);
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

interface ProgressStore {
  progress: ProgressState;
  addXP: (amount: number, source?: string) => void;
  /** 연습 세션 완료 시 호출 — 스트릭의 유일한 증가 지점 */
  recordPracticeDay: () => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  checkStreak: () => void;
  clearLevelUp: () => void;
  clearRewards: () => void;
  loadProgress: () => void;
  resetProgress: () => void;
  /** 서버 지갑을 진실원으로 채택한다(검증 통과분 반영). */
  syncFromServer: (wallet: { coins: number; xp: number; level: number }) => void;
  /** 스트릭 프리즈 구매 — 코인이 모자라면 false */
  buyFreeze: () => boolean;
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
  freezes: 0,
  schemaVersion: PROGRESS_SCHEMA_VERSION,
};

/**
 * 구버전 저장값 보정.
 * 방문만으로 쌓인 스트릭은 근거가 없으므로, 마지막 활동일을 기준으로
 * "오늘/어제면 1일, 그 밖이면 0일"로 되돌린다(과대계상 승계 방지).
 */
export function migrateProgress(saved: Partial<ProgressState>): ProgressState {
  // 버전은 반드시 "저장된 값"에서 읽어야 한다.
  // 병합 후에 읽으면 기본값의 최신 버전이 섞여 들어와 마이그레이션이 건너뛰어진다.
  const savedVersion = saved.schemaVersion ?? 1;
  const merged = { ...defaultProgress, ...saved };
  if (savedVersion >= PROGRESS_SCHEMA_VERSION) return merged;

  const today = getToday();
  const gap = merged.lastActiveDate ? daysBetween(merged.lastActiveDate, today) : Number.NaN;
  const streakDays = Number.isNaN(gap) ? 0 : gap <= 1 ? Math.min(merged.streakDays, 1) : 0;

  return { ...merged, streakDays, schemaVersion: PROGRESS_SCHEMA_VERSION };
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: defaultProgress,

  addXP: (amount: number) => {
    const prev = get().progress;
    let { xp, level, coins } = prev;

    const actualXP = Math.floor(amount * streakMultiplier(prev.streakDays));
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

  // 진입 시 만료 확인 전용 — 방문만으로는 스트릭이 오르지 않는다.
  checkStreak: () => {
    const prev = get().progress;
    const today = getToday();
    const next = expireStreakIfLapsed(
      { streakDays: prev.streakDays, lastPracticeDate: prev.lastActiveDate, freezes: prev.freezes },
      today
    );
    if (
      next.streakDays === prev.streakDays &&
      next.lastPracticeDate === prev.lastActiveDate &&
      (next.freezes ?? 0) === prev.freezes
    ) {
      return;
    }

    const newProgress = {
      ...prev,
      streakDays: next.streakDays,
      lastActiveDate: next.lastPracticeDate,
      freezes: next.freezes ?? prev.freezes,
    };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  // 연습 세션 완료 시에만 스트릭 증가 (단일 원장)
  recordPracticeDay: () => {
    const prev = get().progress;
    const today = getToday();
    const next = advanceStreak(
      { streakDays: prev.streakDays, lastPracticeDate: prev.lastActiveDate },
      today
    );
    if (next.streakDays === prev.streakDays && next.lastPracticeDate === prev.lastActiveDate) return;

    const newProgress = { ...prev, streakDays: next.streakDays, lastActiveDate: next.lastPracticeDate };
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
          const migrated = migrateProgress(JSON.parse(saved));
          set({ progress: migrated });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
      } catch { /* ignore */ }
    }
  },

  syncFromServer: (wallet) => {
    const prev = get().progress;
    if (
      !Number.isFinite(wallet.coins) ||
      !Number.isFinite(wallet.xp) ||
      !Number.isFinite(wallet.level)
    ) {
      return;
    }

    /*
     * 응답이 역순으로 도착할 수 있다(두 세션을 연달아 제출하면 늦게 보낸
     * 응답이 먼저 올 수 있음). 그때 옛 잔액을 그대로 쓰면 XP·레벨이 역행한다.
     * 재화는 단조 증가하므로, 이전에 반영한 누적값보다 작은 응답은 버린다.
     */
    if (wallet.xp < prev.totalXpEarned) return;
    // 레벨업 연출은 서버 레벨이 더 높을 때만 띄운다
    const leveledUp = wallet.level > prev.level;
    const newProgress: ProgressState = {
      ...prev,
      coins: wallet.coins,
      level: wallet.level,
      // 서버는 누적 XP를 들고 있고 클라이언트는 현재 레벨의 잔여 XP를 쓴다
      xp: xpWithinLevel(wallet.xp, wallet.level),
      totalXpEarned: Math.max(prev.totalXpEarned, wallet.xp),
      pendingLevelUp: leveledUp ? wallet.level : prev.pendingLevelUp,
    };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
  },

  buyFreeze: () => {
    const prev = get().progress;
    if (prev.freezes >= MAX_FREEZES) return false;
    if (prev.coins < FREEZE_COST) return false;

    const newProgress = {
      ...prev,
      coins: prev.coins - FREEZE_COST,
      freezes: prev.freezes + 1,
    };
    set({ progress: newProgress });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    }
    return true;
  },

  resetProgress: () => {
    set({ progress: defaultProgress });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

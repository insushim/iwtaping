'use client';
import { create } from 'zustand';
import { ACHIEVEMENTS_LIST } from '@/lib/utils/constants';

export interface AchievementToast {
  key: string;
  title: string;
  description: string;
  icon: string;
}

interface AchievementToastStore {
  queue: AchievementToast[];
  push: (keys: string[]) => void;
  shift: () => void;
}

const BY_KEY = new Map(ACHIEVEMENTS_LIST.map((a) => [a.key as string, a]));

export const useAchievementToast = create<AchievementToastStore>((set, get) => ({
  queue: [],

  push: (keys) => {
    const items = keys
      .map((key) => BY_KEY.get(key))
      .filter((a): a is (typeof ACHIEVEMENTS_LIST)[number] => !!a)
      .map((a) => ({ key: a.key, title: a.title, description: a.description, icon: a.icon }));
    if (!items.length) return;
    set({ queue: [...get().queue, ...items] });
  },

  shift: () => set({ queue: get().queue.slice(1) }),
}));

/** 스토어 간 순환 import를 피하기 위한 얇은 통지 함수 */
export function notifyAchievements(keys: string[]): void {
  useAchievementToast.getState().push(keys);
}

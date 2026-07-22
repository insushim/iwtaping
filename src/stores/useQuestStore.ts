'use client';
import { create } from 'zustand';
import {
  Quest,
  QuestProgress,
  SessionEvent,
  applyEvent,
  claim,
  emptyProgress,
  getDailyQuests,
  isComplete,
  isClaimed,
  loadProgress,
  saveProgress,
} from '@/lib/progress/quests';
import { useProgressStore } from './useProgressStore';

interface QuestStore {
  quests: Quest[];
  state: QuestProgress;
  load: () => void;
  recordEvent: (event: SessionEvent) => void;
  claimQuest: (questId: string) => { xp: number; coins: number } | null;
  completedCount: () => number;
}

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  state: emptyProgress(),

  load: () => {
    set({ quests: getDailyQuests(), state: loadProgress() });
  },

  recordEvent: (event) => {
    const next = applyEvent(get().state, event);
    set({ state: next });
    saveProgress(next);
  },

  claimQuest: (questId) => {
    const quest = get().quests.find((q) => q.id === questId);
    if (!quest) return null;
    const current = get().state;
    if (!isComplete(quest, current) || isClaimed(quest, current)) return null;

    const next = claim(current, quest);
    set({ state: next });
    saveProgress(next);

    // 보상 지급은 진행도 저장 이후에 — 중복 지급을 막기 위해 claimed가 먼저 확정돼야 한다
    useProgressStore.getState().addXP(quest.xpReward);
    useProgressStore.getState().addCoins(quest.coinReward);
    return { xp: quest.xpReward, coins: quest.coinReward };
  },

  completedCount: () => {
    const { quests, state } = get();
    return quests.filter((q) => isComplete(q, state)).length;
  },
}));

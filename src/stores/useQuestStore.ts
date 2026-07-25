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
    // 반드시 저장된 진행도를 다시 읽어서 그 위에 더한다.
    // load()는 DailyQuests 패널(홈)에서만 호출되므로, 게임·연습 페이지의 스토어 상태는
    // emptyProgress(0)인 채다. 그 0을 기준으로 저장하면 이전 진행도를 통째로 덮어써
    // 카운터가 1~2에서 영원히 멈춘다(브라우저 실측, 2026-07-25).
    const next = applyEvent(loadProgress(), event);
    set({ state: next });
    saveProgress(next);
  },

  claimQuest: (questId) => {
    const quest = get().quests.find((q) => q.id === questId);
    if (!quest) return null;
    // 수령 판정도 저장본 기준 — 다른 탭에서 이미 받았는지까지 여기서 걸러진다.
    const current = loadProgress();
    if (!isComplete(quest, current) || isClaimed(quest, current)) return null;

    const next = claim(current, quest);
    set({ state: next });
    saveProgress(next);

    // 저장 직후 다시 읽어 우리 수령 기록이 실제로 남았는지 확인한다.
    // 다른 탭이 같은 순간에 저장해 우리 기록을 덮었다면 지급하지 않는다
    // (localStorage에는 compare-and-set이 없어 이 재확인이 최선의 방어다).
    const confirmed = loadProgress();
    if (!isClaimed(quest, confirmed)) return null;

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

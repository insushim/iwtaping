'use client';
import { useEffect } from 'react';
import { useProgressStore } from '@/stores/useProgressStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { useStatsStore } from '@/stores/useStatsStore';

/**
 * 다른 탭이 진행도를 바꾸면 이 탭의 스토어를 다시 하이드레이트한다.
 *
 * 진행도는 localStorage가 진실원인데 zustand 스토어는 탭마다 따로 산다. 동기화가 없으면
 * A탭에서 퀘스트를 수령해도 B탭은 옛 코인·옛 진행도를 계속 보여주고, B탭에서 뭔가를
 * 기록하는 순간 그 낡은 화면 값이 기준이 된다.
 *
 * ⚠️ 이것으로 읽기-수정-쓰기 경합이 완전히 사라지지는 않는다. 두 탭이 같은 순간에
 * 기록하면 나중 쓰기가 이긴다(localStorage에는 원자적 CAS가 없다). 다만 각 스토어의
 * 쓰기 함수가 저장본을 즉시 다시 읽고 쓰므로 경합 창이 극히 좁고, 여기서 탭 간
 * 상태를 맞춰두면 "낡은 화면을 기준으로 덮어쓰는" 훨씬 넓은 창이 닫힌다.
 */
const WATCHED: Record<string, () => void> = {
  'typingverse-progress': () => useProgressStore.getState().loadProgress(),
  'typingverse-quests': () => useQuestStore.getState().load(),
  'typingverse-stats': () => useStatsStore.getState().loadStats(),
};

export function CrossTabSync(): null {
  useEffect(() => {
    // 하이드레이트 함수 중 일부(useProgressStore.loadProgress)는 마이그레이션 결과를
    // 다시 저장한다. 그 쓰기가 상대 탭의 storage 이벤트를 깨우고, 상대도 다시 저장하면
    // 두 탭이 무한히 주고받는다. 값이 실제로 바뀐 이벤트만 처리해 이 고리를 끊는다
    // (마이그레이션이 값을 바꾸는 첫 1회만 왕복하고 그 다음 이벤트는 old===new라 멈춘다).
    const applied = new Map<string, string | null>();

    const onStorage = (e: StorageEvent) => {
      // key가 null이면 clear() — 전부 다시 읽는다.
      if (e.key === null) {
        applied.clear();
        for (const reload of Object.values(WATCHED)) reload();
        return;
      }
      const reload = WATCHED[e.key];
      if (!reload) return;
      if (e.newValue === e.oldValue) return; // 같은 값 재저장 — 반영할 것이 없다
      if (applied.get(e.key) === e.newValue) return; // 이미 반영한 값
      applied.set(e.key, e.newValue);
      reload();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}

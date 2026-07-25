'use client';
import { useEffect } from 'react';
import { useProgressStore } from '@/stores/useProgressStore';
import { useQuestStore } from '@/stores/useQuestStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { useShopStore } from '@/stores/useShopStore';

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
/** key → [저장본 반영, 저장본이 사라졌을 때 초기화] */
const WATCHED: Record<string, [reload: () => void, reset?: () => void]> = {
  'typingverse-progress': [
    () => useProgressStore.getState().loadProgress(),
    () => useProgressStore.getState().resetProgress(),
  ],
  'typingverse-quests': [() => useQuestStore.getState().load()],
  'typingverse-stats': [
    () => useStatsStore.getState().loadStats(),
    () => useStatsStore.getState().resetStats(),
  ],
  // 상점은 "누적 지출(spent)"을 들고 있고 사용 가능 코인 = 코인 - spent다.
  // 여기를 빼먹으면 두 탭이 서로의 지출을 못 봐 같은 코인으로 이중 구매가 된다.
  'typingverse-shop': [() => useShopStore.getState().load()],
};

export function CrossTabSync(): null {
  useEffect(() => {
    // 하이드레이트 함수 중 loadProgress는 마이그레이션 결과가 달라졌을 때만 되쓴다.
    // 그 쓰기가 상대 탭의 storage 이벤트를 깨우더라도, 마이그레이션은 같은 빌드에서
    // 결정론적이라 두 번째 적용은 값이 그대로여서 되쓰지 않는다 → 최대 1왕복 후 수렴.
    // `newValue === oldValue`는 그 마지막 이벤트까지 걸러낸다.
    const onStorage = (e: StorageEvent) => {
      // key가 null이면 clear() — 전부 초기화하거나 다시 읽는다.
      if (e.key === null) {
        for (const [reload, reset] of Object.values(WATCHED)) (reset ?? reload)();
        return;
      }
      const entry = WATCHED[e.key];
      if (!entry) return;
      if (e.newValue === e.oldValue) return; // 값이 그대로면 반영할 것이 없다
      const [reload, reset] = entry;
      // 다른 탭이 항목을 지웠다(초기화). 다시 읽어봐야 없으므로 초기 상태로 되돌린다.
      if (e.newValue === null) (reset ?? reload)();
      else reload();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return null;
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CrossTabSync } from '@/components/common/CrossTabSync';
import { useProgressStore } from '@/stores/useProgressStore';
import { useQuestStore } from '@/stores/useQuestStore';

/**
 * 다른 탭의 진행도 변경을 이 탭이 따라오는지, 그리고 재하이드레이트가
 * 저장을 동반해도 탭 간 무한 왕복이 되지 않는지 감시한다.
 */
function fireStorage(key: string, oldValue: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue }));
}

const progressJson = (coins: number) =>
  JSON.stringify({ xp: 0, level: 1, coins, streakDays: 0, lastActiveDate: '', totalXpEarned: 0, pendingLevelUp: null, pendingRewards: [], freezes: 0, schemaVersion: 99 });

describe('CrossTabSync', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useProgressStore.getState().resetProgress();
  });

  it('다른 탭의 코인 변경을 이 탭 스토어에 반영한다', () => {
    render(<CrossTabSync />);
    localStorage.setItem('typingverse-progress', progressJson(500));
    fireStorage('typingverse-progress', progressJson(0), progressJson(500));
    expect(useProgressStore.getState().progress.coins).toBe(500);
  });

  it('값이 바뀌지 않은 이벤트는 무시한다(탭 간 왕복 차단)', () => {
    render(<CrossTabSync />);
    const spy = vi.spyOn(useProgressStore.getState(), 'loadProgress');
    const same = progressJson(10);
    fireStorage('typingverse-progress', same, same);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('저장본이 진실원 — 같은 값이 다시 와도 저장본 기준으로 맞춘다', () => {
    render(<CrossTabSync />);
    localStorage.setItem('typingverse-progress', progressJson(70));
    fireStorage('typingverse-progress', progressJson(0), progressJson(70));
    expect(useProgressStore.getState().progress.coins).toBe(70);

    // 메모리만 어긋난 상태에서 같은 이벤트가 또 오면 저장본으로 되맞춘다.
    // (이전 구현은 "이미 반영한 값"이라며 건너뛰어 메모리와 저장본이 갈라졌다)
    useProgressStore.setState({ progress: { ...useProgressStore.getState().progress, coins: 999 } });
    fireStorage('typingverse-progress', progressJson(0), progressJson(70));
    expect(useProgressStore.getState().progress.coins).toBe(70);
  });

  it('감시하지 않는 키는 무시한다', () => {
    render(<CrossTabSync />);
    const spy = vi.spyOn(useProgressStore.getState(), 'loadProgress');
    fireStorage('some-other-key', 'a', 'b');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('clear()(key=null)면 초기 상태로 되돌린다', () => {
    render(<CrossTabSync />);
    useProgressStore.setState({ progress: { ...useProgressStore.getState().progress, coins: 42 } });
    fireStorage(null as unknown as string, null, null);
    expect(useProgressStore.getState().progress.coins).toBe(0);
  });

  it('다른 탭이 항목을 지우면(newValue=null) 초기화한다', () => {
    render(<CrossTabSync />);
    useProgressStore.setState({ progress: { ...useProgressStore.getState().progress, coins: 88 } });
    fireStorage('typingverse-progress', progressJson(88), null);
    expect(useProgressStore.getState().progress.coins).toBe(0);
  });

  it('상점 지출(spent)도 따라온다 — 빠지면 탭 간 이중 구매가 된다', async () => {
    const { useShopStore } = await import('@/stores/useShopStore');
    render(<CrossTabSync />);
    const shop = JSON.stringify({ owned: ['default', 'skin-default'], equippedSound: 'default', equippedSkin: 'skin-default', spent: 150 });
    localStorage.setItem('typingverse-shop', shop);
    fireStorage('typingverse-shop', null, shop);
    expect(useShopStore.getState().shop.spent).toBe(150);
  });

  it('언마운트하면 리스너가 제거된다', () => {
    const { unmount } = render(<CrossTabSync />);
    unmount();
    localStorage.setItem('typingverse-progress', progressJson(300));
    fireStorage('typingverse-progress', progressJson(0), progressJson(300));
    expect(useProgressStore.getState().progress.coins).not.toBe(300);
  });

  it('퀘스트 진행도도 따라온다', () => {
    render(<CrossTabSync />);
    const today = new Date().toISOString().slice(0, 10);
    const q = JSON.stringify({ date: today, progress: { games: 2 }, claimed: [] });
    localStorage.setItem('typingverse-quests', q);
    fireStorage('typingverse-quests', null, q);
    expect(useQuestStore.getState().state.progress.games).toBe(2);
  });
});

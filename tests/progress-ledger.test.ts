import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore, migrateProgress, PROGRESS_SCHEMA_VERSION } from '@/stores/useProgressStore';
import { useShopStore } from '@/stores/useShopStore';

/**
 * 코인·XP 원장은 여러 탭이 같은 localStorage를 공유한다.
 * 메모리 상태만 보고 저장하면 다른 탭의 적립을 통째로 되돌린다(lost update).
 * 손상·조작된 저장본이 무한 루프나 렌더 예외를 만들어서도 안 된다.
 */
const KEY = 'typingverse-progress';

describe('진행도 원장 — 저장본 기준 누적', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetProgress();
  });

  it('메모리가 낡아도 저장본 위에 코인을 더한다', () => {
    useProgressStore.getState().addCoins(100);
    // 다른 탭이 코인을 더 올린 상황: 저장본만 앞서 있고 이 탭 메모리는 낡음
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    localStorage.setItem(KEY, JSON.stringify({ ...saved, coins: 500 }));

    useProgressStore.getState().addCoins(30);
    expect(JSON.parse(localStorage.getItem(KEY)!).coins).toBe(530);
  });

  it('메모리가 낡아도 저장본 위에 XP를 더한다', () => {
    useProgressStore.getState().addXP(50);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    localStorage.setItem(KEY, JSON.stringify({ ...saved, totalXpEarned: 1000, xp: 40 }));

    useProgressStore.getState().addXP(10);
    expect(JSON.parse(localStorage.getItem(KEY)!).totalXpEarned).toBe(1010);
  });

  it('저장본보다 적은 코인으로 되돌리지 않는다(구매도 저장본 기준)', () => {
    useProgressStore.getState().addCoins(100);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    localStorage.setItem(KEY, JSON.stringify({ ...saved, coins: 300 }));

    expect(useProgressStore.getState().spendCoins(50)).toBe(true);
    expect(JSON.parse(localStorage.getItem(KEY)!).coins).toBe(250);
  });
});

describe('손상·조작된 저장본 방어', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetProgress();
  });

  it('xp가 Infinity여도 레벨업 루프가 멈춘다', () => {
    localStorage.setItem(KEY, JSON.stringify({ xp: 1e400, level: 1, coins: 0, schemaVersion: PROGRESS_SCHEMA_VERSION }));
    const start = Date.now();
    useProgressStore.getState().addXP(1);
    expect(Date.now() - start).toBeLessThan(2000); // 무한 루프면 여기서 못 온다
    expect(Number.isFinite(useProgressStore.getState().progress.xp)).toBe(true);
  });

  it('숫자 자리에 문자열이 있어도 기본값으로 되돌린다', () => {
    const bad = migrateProgress({ coins: 'lots', xp: null, level: 0, pendingRewards: 'nope' } as never);
    expect(bad.coins).toBe(0);
    expect(bad.xp).toBe(0);
    expect(bad.level).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(bad.pendingRewards)).toBe(true);
  });

  it('음수 코인은 0으로 막는다', () => {
    expect(migrateProgress({ coins: -999 } as never).coins).toBe(0);
  });
});

describe('상점 이중지출 방어', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.getState().resetProgress();
    useProgressStore.getState().addCoins(200);
    useShopStore.setState({
      shop: { owned: ['default', 'skin-default'], equippedSound: 'default', equippedSkin: 'skin-default', spent: 0 },
    });
  });

  it('다른 탭이 먼저 쓴 지출을 반영해 구매를 거절한다', () => {
    // 다른 탭이 150을 이미 썼다 — 이 탭의 메모리(spent=0)는 그 사실을 모른다
    localStorage.setItem(
      'typingverse-shop',
      JSON.stringify({ owned: ['default', 'skin-default'], equippedSound: 'default', equippedSkin: 'skin-default', spent: 150 })
    );
    // 보유 200 - 다른 탭 지출 150 = 남은 50. 가장 싼 아이템(120)도 살 수 없어야 한다.
    const results = ['mechanical', 'typewriter', 'soft', 'retro'].map((id) =>
      useShopStore.getState().buy(id)
    );
    expect(results.every((r) => r === 'insufficient'), `구매 결과: ${results.join(',')}`).toBe(true);
    expect(useShopStore.getState().shop.spent).toBe(150); // 추가 지출 없음
  });

  it('다른 탭 지출이 없으면 정상 구매된다(가드가 과하지 않은지)', () => {
    localStorage.setItem(
      'typingverse-shop',
      JSON.stringify({ owned: ['default', 'skin-default'], equippedSound: 'default', equippedSkin: 'skin-default', spent: 0 })
    );
    expect(useShopStore.getState().buy('soft')).toBe('ok'); // 120 ≤ 200
    expect(useShopStore.getState().shop.spent).toBe(120);
  });
});

'use client';
import { create } from 'zustand';
import { KeyTheme, soundManager } from '@/lib/sound/sound-manager';
import { findItem } from '@/lib/shop/catalog';
import { useProgressStore } from './useProgressStore';

/*
 * 상점은 코스메틱(사운드 팩·캐럿 스킨) 전용이며 완전히 로컬이다.
 * 코인 잔액의 진실원은 서버 지갑(useProgressStore.progress.coins)이라
 * 타이핑 제출마다 syncFromServer가 클라 코인을 덮어쓴다.
 * 따라서 여기서 코인을 직접 차감하지 않고, 누적 지출(spent)만 로컬에 적립해
 * 사용 가능 코인 = 서버코인 - spent 로 계산한다(구매가 되돌려지지 않음).
 */
export interface ShopState {
  owned: string[];
  equippedSound: KeyTheme;
  equippedSkin: string;
  spent: number;
}

const STORAGE_KEY = 'typingverse-shop';

const defaultState: ShopState = {
  owned: ['default', 'skin-default'],
  equippedSound: 'default',
  equippedSkin: 'skin-default',
  spent: 0,
};

function persist(s: ShopState) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export type BuyResult = 'ok' | 'owned' | 'insufficient' | 'invalid';

interface ShopStore {
  shop: ShopState;
  /** 사용 가능 코인 = 서버 잔액 - 누적 지출(0 미만이면 0). */
  availableCoins: () => number;
  load: () => void;
  buy: (id: string) => BuyResult;
  equipSound: (id: KeyTheme) => void;
  equipSkin: (id: string) => void;
}

export const useShopStore = create<ShopStore>((set, get) => ({
  shop: defaultState,

  availableCoins: () => {
    const coins = useProgressStore.getState().progress.coins;
    return Math.max(0, coins - get().shop.spent);
  },

  load: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ShopState>;
        const merged: ShopState = { ...defaultState, ...parsed };
        // 기본 아이템은 항상 보유
        merged.owned = Array.from(new Set([...defaultState.owned, ...(merged.owned ?? [])]));
        set({ shop: merged });
      }
    } catch { /* ignore */ }
    // 장착된 사운드 팩을 사운드 매니저에 반영
    soundManager?.setKeyTheme(get().shop.equippedSound);
  },

  buy: (id: string) => {
    const def = findItem(id);
    if (!def) return 'invalid';
    const { shop } = get();
    if (shop.owned.includes(id)) return 'owned';
    if (get().availableCoins() < def.price) return 'insufficient';
    const next: ShopState = { ...shop, owned: [...shop.owned, id], spent: shop.spent + def.price };
    set({ shop: next });
    persist(next);
    return 'ok';
  },

  equipSound: (id: KeyTheme) => {
    const { shop } = get();
    if (!shop.owned.includes(id)) return;
    const next = { ...shop, equippedSound: id };
    set({ shop: next });
    persist(next);
    soundManager?.setKeyTheme(id);
  },

  equipSkin: (id: string) => {
    const { shop } = get();
    if (!shop.owned.includes(id)) return;
    const next = { ...shop, equippedSkin: id };
    set({ shop: next });
    persist(next);
  },
}));

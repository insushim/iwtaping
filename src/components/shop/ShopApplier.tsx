'use client';

import { useEffect } from 'react';
import { useShopStore } from '@/stores/useShopStore';
import { CARET_SKINS } from '@/lib/shop/catalog';

/** 장착된 상점 아이템(사운드 팩·캐럿 스킨)을 앱 전역에 적용한다. */
export function ShopApplier() {
  const load = useShopStore((s) => s.load);
  const equippedSkin = useShopStore((s) => s.shop.equippedSkin);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const skin = CARET_SKINS.find((s) => s.id === equippedSkin) ?? CARET_SKINS[0];
    const root = document.documentElement;
    root.style.setProperty('--typing-caret', skin.caret);
    root.style.setProperty('--typing-current', skin.current);
  }, [equippedSkin]);

  return null;
}

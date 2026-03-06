'use client';

import { KeyboardLayoutData } from '@/types/keyboard';

// Dynamic keyboard layout loader
let layoutCache: Record<string, KeyboardLayoutData | null> = {};

export async function loadKeyboardLayout(id: string): Promise<KeyboardLayoutData | null> {
  if (layoutCache[id]) return layoutCache[id];

  try {
    let mod;
    switch (id) {
      case 'qwerty-ko':
        mod = await import('@/data/keyboard/qwerty-ko');
        break;
      case 'qwerty-en':
        mod = await import('@/data/keyboard/qwerty-en');
        break;
      case 'dvorak':
        mod = await import('@/data/keyboard/dvorak');
        break;
      case 'sebeol-390':
        mod = await import('@/data/keyboard/sebeol-390');
        break;
      default:
        mod = await import('@/data/keyboard/qwerty-ko');
    }
    const layout = mod.layout;
    layoutCache[id] = layout;
    return layout;
  } catch {
    return null;
  }
}

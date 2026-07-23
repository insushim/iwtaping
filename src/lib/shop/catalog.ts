import { KeyTheme, KEY_THEMES } from '@/lib/sound/sound-manager';

/** 타이핑 음 팩 — 가격(코인). default는 0(기본 보유). */
export interface SoundPackItem {
  id: KeyTheme;
  label: string;
  desc: string;
  price: number;
}

const SOUND_PRICES: Record<KeyTheme, number> = {
  default: 0,
  mechanical: 150,
  typewriter: 200,
  soft: 120,
  retro: 180,
};

export const SOUND_PACKS: SoundPackItem[] = KEY_THEMES.map((t) => ({
  id: t.id,
  label: t.label,
  desc: t.desc,
  price: SOUND_PRICES[t.id],
}));

/** 커서(캐럿) 스킨 — 타이핑 화면의 캐럿·현재 글자 색을 바꾼다. */
export interface CaretSkinItem {
  id: string;
  label: string;
  desc: string;
  price: number;
  caret: string;
  current: string;
}

export const CARET_SKINS: CaretSkinItem[] = [
  { id: 'skin-default', label: '기본', desc: '시안 캐럿', price: 0, caret: '#00D2D3', current: '#6C5CE7' },
  { id: 'skin-neon', label: '네온 퍼플', desc: '보라 네온', price: 120, caret: '#A29BFE', current: '#8B5CF6' },
  { id: 'skin-mint', label: '민트', desc: '상큼한 민트', price: 120, caret: '#00E5A0', current: '#00B894' },
  { id: 'skin-sunset', label: '선셋', desc: '노을 오렌지', price: 150, caret: '#FF9F43', current: '#FF6B6B' },
  { id: 'skin-gold', label: '골드', desc: '반짝이는 골드', price: 250, caret: '#FECA57', current: '#F0932B' },
];

/** id로 가격/정의 조회 (구매 검증에 사용). */
export function findItem(id: string): { price: number } | null {
  const s = SOUND_PACKS.find((x) => x.id === id);
  if (s) return { price: s.price };
  const c = CARET_SKINS.find((x) => x.id === id);
  if (c) return { price: c.price };
  return null;
}

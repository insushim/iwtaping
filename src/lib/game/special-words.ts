/**
 * 타이핑 게임 공통: 특수단어(어려운 단어) → 특수능력.
 * 우주/좀비/디펜스가 공유한다. (산성비는 자체 인라인 구현 유지)
 *
 * 능력 3종:
 *  - freeze: 적 이동 일시정지(FREEZE_MS)
 *  - clear : 화면의 모든 적 제거(+보너스)
 *  - heal  : 게임별 생명 자원 회복(방어막/HP/성 체력) — 회복량은 각 게임에서 결정
 */
export type Ability = 'freeze' | 'clear' | 'heal';

export const ABILITY_META: Record<Ability, { icon: string; label: string; color: string }> = {
  freeze: { icon: '❄️', label: '일시정지', color: '#48DBFB' },
  clear: { icon: '💥', label: '전체 제거', color: '#FD79A8' },
  heal: { icon: '💚', label: '회복', color: '#00E5A0' },
};

export const ABILITIES: Ability[] = ['freeze', 'clear', 'heal'];
export const FREEZE_MS = 4000;

/** 특수단어를 이번에 스폰할지 결정 — 레벨 2+부터 화면당 1개, 확률 14%. */
export function rollSpecial(level: number, hasSpecialOnScreen: boolean): boolean {
  return level >= 2 && !hasSpecialOnScreen && Math.random() < 0.14;
}

/** 무작위 능력 1종. */
export function pickAbility(): Ability {
  return ABILITIES[Math.floor(Math.random() * ABILITIES.length)];
}

/**
 * 캔버스에 특수단어 강조(금빛 후광 링 + 능력 아이콘/라벨)를 그린다.
 * 각 게임의 적 좌표/시간을 넘겨 호출한다.
 */
export function drawSpecialMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ability: Ability,
  time: number,
  seed: number,
): void {
  const meta = ABILITY_META[ability];
  ctx.save();
  const pulse = 0.6 + Math.sin(time * 0.006 + seed) * 0.4;
  ctx.strokeStyle = `rgba(254,202,87,${0.35 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FECA57';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 20, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = "bold 10px 'Noto Sans KR', sans-serif";
  ctx.fillStyle = meta.color;
  ctx.textAlign = 'center';
  ctx.fillText(`${meta.icon} ${meta.label}`, x, y - 30);
  ctx.restore();
}

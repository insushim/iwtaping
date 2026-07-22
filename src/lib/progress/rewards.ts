/**
 * 보상 공식 — 서버(functions/lib/rewards.ts)와 반드시 동일해야 한다.
 *
 * 클라이언트가 화면에 보여주는 XP와 서버가 지갑에 적립하는 XP가 다르면
 * 사용자는 "받았다는 값"과 "가진 값"이 다른 상태를 보게 된다.
 * 한쪽을 고치면 반드시 다른 쪽도 고칠 것 — 테스트가 두 값의 일치를 검사한다.
 */
export function earnedXpFor(kpm: number, accuracy: number, maxCombo: number): number {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  return Math.max(1, Math.floor(safe(kpm) * 0.3 + safe(accuracy) * 0.5 + safe(maxCombo) * 0.2));
}

export function earnedCoinsFor(xp: number): number {
  return Math.floor(xp * 0.15);
}

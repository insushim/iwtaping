/**
 * 보상 공식 — 클라이언트와 서버가 **같은 값**을 내야 한다.
 *
 * 두 곳에 서로 다른 공식이 있으면 화면에 보이는 XP와 서버 잔액이 갈라지고,
 * 나중에 어느 쪽이 진실인지 판단할 수 없게 된다.
 * (같은 내용이 src/lib/progress/rewards.ts에도 있다 — functions/는 별도
 *  타입 설정으로 컴파일되므로 src를 import할 수 없어 부득이 복제한다.
 *  한쪽을 고치면 반드시 다른 쪽도 고칠 것. 테스트가 두 값의 일치를 검사한다.)
 */
export function earnedXpFor(kpm: number, accuracy: number, maxCombo: number): number {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  return Math.max(1, Math.floor(safe(kpm) * 0.3 + safe(accuracy) * 0.5 + safe(maxCombo) * 0.2));
}

export function earnedCoinsFor(xp: number): number {
  return Math.floor(xp * 0.15);
}

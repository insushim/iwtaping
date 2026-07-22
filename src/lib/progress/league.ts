/**
 * 리그 승강제 (주간 버킷).
 *
 * Duolingo 모델을 참고한 설계: 절대 순위 하나가 아니라 30명짜리 버킷 안에서
 * 경쟁하게 해서, 상위권이 아닌 사용자도 "이길 수 있는 상대"를 갖게 한다.
 * 티어가 올라갈수록 승급 인원이 줄어 상위 티어의 희소성이 유지된다.
 */

export const BUCKET_SIZE = 30;

export interface LeagueTier {
  id: number;
  name: string;
  color: string;
  /** 이 티어에서 승급하는 인원 */
  promote: number;
  /** 강등되는 인원 (최하위 티어는 0) */
  demote: number;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 0, name: '브론즈', color: '#CD7F32', promote: 10, demote: 0 },
  { id: 1, name: '실버', color: '#C0C0C0', promote: 8, demote: 4 },
  { id: 2, name: '골드', color: '#FFD700', promote: 6, demote: 5 },
  { id: 3, name: '다이아', color: '#48DBFB', promote: 4, demote: 6 },
  { id: 4, name: '챌린저', color: '#FD79A8', promote: 0, demote: 7 },
];

export const MAX_TIER = LEAGUE_TIERS.length - 1;

export function getTier(tierId: number): LeagueTier {
  return LEAGUE_TIERS[Math.max(0, Math.min(MAX_TIER, Math.trunc(tierId) || 0))];
}

export type LeagueOutcome = 'promoted' | 'demoted' | 'stayed';

/** 강등을 적용하기 위한 최소 버킷 인원 */
export const MIN_BUCKET_FOR_DEMOTION = 10;

export interface BucketQuota {
  promote: number;
  demote: number;
}

/**
 * 실제 버킷 인원에 맞춘 승급/강등 정원.
 *
 * 정원(30명) 기준 숫자를 덜 찬 버킷에 그대로 쓰면 6명 버킷에서 1등 빼고 전원
 * 강등되는 참사가 난다. 인원 비율만큼 줄이고, 10명 미만이면 강등을 적용하지 않으며,
 * 승급선과 강등선이 겹치면 강등을 포기한다.
 *
 * ⚠️ 서버(functions/lib/league.ts)에 같은 구현이 있다. 한쪽을 고치면 반드시
 *    다른 쪽도 고칠 것 — 화면의 승급선과 실제 정산이 갈라지면 사기로 읽힌다.
 *    테스트가 두 구현의 일치를 강제한다.
 */
export function bucketQuota(tierId: number, bucketSize: number): BucketQuota {
  const tier = getTier(tierId);
  const size = Math.max(0, Math.trunc(bucketSize) || 0);
  if (size <= 1) return { promote: 0, demote: 0 };

  let promote = 0;
  if (tier.promote > 0 && tierId < MAX_TIER) {
    promote = Math.min(tier.promote, Math.floor((size * tier.promote) / BUCKET_SIZE));
    if (promote < 1 && size >= 3) promote = 1;
  }

  let demote = 0;
  if (tier.demote > 0 && tierId > 0 && size >= MIN_BUCKET_FOR_DEMOTION) {
    demote = Math.min(tier.demote, Math.floor((size * tier.demote) / BUCKET_SIZE));
  }

  if (promote + demote >= size) demote = Math.max(0, size - promote - 1);

  return { promote, demote };
}

/**
 * 주간 정산 결과. rank는 1부터 시작하며 버킷 내 순위다.
 * XP가 0이면 승급 대상이라도 승급시키지 않는다(빈 계정 승급 방지).
 */
export function settleRank(tierId: number, rank: number, xpEarned: number, bucketSize: number): LeagueOutcome {
  const quota = bucketQuota(tierId, bucketSize);
  const inDemoteZone = quota.demote > 0 && rank > bucketSize - quota.demote;
  if (xpEarned <= 0) {
    // 승급만 막고 강등은 정원을 따른다 — 다 같이 쉬어 간 주에 대량 강등이 나지 않게.
    return inDemoteZone ? 'demoted' : 'stayed';
  }
  if (quota.promote > 0 && rank <= quota.promote) return 'promoted';
  if (inDemoteZone) return 'demoted';
  return 'stayed';
}

export function nextTier(tierId: number, outcome: LeagueOutcome): number {
  const base = Math.max(0, Math.min(MAX_TIER, Math.trunc(tierId) || 0));
  if (outcome === 'promoted') return Math.min(MAX_TIER, base + 1);
  if (outcome === 'demoted') return Math.max(0, base - 1);
  return base;
}

/**
 * 정산 보상 코인 — 서버가 실제 지급하는 값과 같아야 한다(화면 예고 = 실지급).
 * ⚠️ functions/lib/league.ts와 동기화 대상.
 */
export function settlementCoins(
  tierId: number,
  rank: number,
  outcome: LeagueOutcome,
  xpEarned: number
): number {
  if (xpEarned <= 0) return 0;
  let coins = 0;
  if (rank === 1) coins += 100;
  else if (rank === 2) coins += 60;
  else if (rank === 3) coins += 40;
  if (outcome === 'promoted') coins += 50 * (Math.max(0, Math.min(MAX_TIER, tierId)) + 1);
  return coins;
}

/** KST 기준 이번 주 마감(일요일 24:00 KST)까지 남은 밀리초 */
export function msUntilWeeklyReset(now: number = Date.now()): number {
  const kst = new Date(now + 9 * 3600 * 1000);
  const day = kst.getUTCDay(); // 0=일
  const daysUntilMonday = (8 - day) % 7 || 7;
  const reset = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate() + daysUntilMonday,
    0,
    0,
    0
  );
  return reset - kst.getTime();
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '곧 정산';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

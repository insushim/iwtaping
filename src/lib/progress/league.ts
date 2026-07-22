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
  return LEAGUE_TIERS[Math.max(0, Math.min(MAX_TIER, tierId))];
}

export type LeagueOutcome = 'promoted' | 'demoted' | 'stayed';

/**
 * 주간 정산 결과. rank는 1부터 시작하며 버킷 내 순위다.
 * XP가 0이면 승급 대상이라도 승급시키지 않는다(빈 계정 승급 방지).
 */
export function settleRank(tierId: number, rank: number, xpEarned: number, bucketSize: number): LeagueOutcome {
  const tier = getTier(tierId);
  if (xpEarned <= 0) {
    return tier.demote > 0 ? 'demoted' : 'stayed';
  }
  if (tier.promote > 0 && rank <= tier.promote && tierId < MAX_TIER) return 'promoted';
  if (tier.demote > 0 && rank > bucketSize - tier.demote) return 'demoted';
  return 'stayed';
}

export function nextTier(tierId: number, outcome: LeagueOutcome): number {
  if (outcome === 'promoted') return Math.min(MAX_TIER, tierId + 1);
  if (outcome === 'demoted') return Math.max(0, tierId - 1);
  return tierId;
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

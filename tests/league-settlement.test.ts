import { describe, it, expect } from 'vitest';
import {
  bucketQuota as clientQuota,
  settleRank as clientSettle,
  nextTier as clientNext,
  settlementCoins as clientCoins,
  LEAGUE_TIERS as CLIENT_TIERS,
  BUCKET_SIZE,
  MAX_TIER,
} from '@/lib/progress/league';
import {
  bucketQuota,
  settleRank,
  nextTier,
  settlementCoins,
  planSettlement,
  tierDelta,
  LEAGUE_TIERS,
  LeagueMemberRow,
} from '../functions/lib/league';

const TIER_IDS = [0, 1, 2, 3, 4];
const SIZES = [0, 1, 2, 3, 5, 9, 10, 15, 29, 30];

/**
 * 리그 규칙은 화면(src)과 정산(functions) 두 곳에 복제되어 있다.
 * 갈라지면 "승급선 안이라 보였는데 강등당했다"가 되므로 여기서 일치를 강제한다.
 */
describe('리그 규칙 클라이언트/서버 동기화', () => {
  it('티어표가 동일하다', () => {
    expect(LEAGUE_TIERS).toEqual(CLIENT_TIERS);
  });

  it.each(TIER_IDS)('티어 %s의 버킷 정원이 모든 인원수에서 동일하다', (tier) => {
    for (const size of SIZES) {
      expect(bucketQuota(tier, size)).toEqual(clientQuota(tier, size));
    }
  });

  it.each(TIER_IDS)('티어 %s의 승강 판정이 동일하다', (tier) => {
    for (const size of SIZES) {
      for (let rank = 1; rank <= Math.max(size, 1); rank++) {
        for (const xp of [0, 1, 500]) {
          expect(settleRank(tier, rank, xp, size)).toBe(clientSettle(tier, rank, xp, size));
        }
      }
    }
  });

  it('티어 이동과 보상 코인이 동일하다', () => {
    for (const tier of TIER_IDS) {
      for (const outcome of ['promoted', 'demoted', 'stayed'] as const) {
        expect(nextTier(tier, outcome)).toBe(clientNext(tier, outcome));
        for (const rank of [1, 2, 3, 4, 30]) {
          expect(settlementCoins(tier, rank, outcome, 500)).toBe(
            clientCoins(tier, rank, outcome, 500)
          );
        }
      }
    }
  });
});

describe('버킷 정원 축소', () => {
  it('정원이 다 찬 버킷은 티어표 값을 그대로 쓴다', () => {
    for (const tier of TIER_IDS) {
      expect(bucketQuota(tier, BUCKET_SIZE)).toEqual({
        promote: LEAGUE_TIERS[tier].promote,
        demote: LEAGUE_TIERS[tier].demote,
      });
    }
  });

  it('인원이 적은 버킷은 강등하지 않는다 (6명 버킷에서 1등 빼고 전원 강등 방지)', () => {
    const quota = bucketQuota(2, 6);
    expect(quota.demote).toBe(0);
    expect(quota.promote).toBeGreaterThanOrEqual(1);
  });

  it('승급선과 강등선이 절대 겹치지 않는다', () => {
    for (const tier of TIER_IDS) {
      for (let size = 0; size <= BUCKET_SIZE; size++) {
        const { promote, demote } = bucketQuota(tier, size);
        expect(promote + demote).toBeLessThan(Math.max(size, 1));
      }
    }
  });

  it('최하위 티어는 어떤 인원수에서도 강등이 없다', () => {
    for (let size = 0; size <= BUCKET_SIZE; size++) {
      expect(bucketQuota(0, size).demote).toBe(0);
    }
  });

  it('최상위 티어는 어떤 인원수에서도 승급이 없다', () => {
    for (let size = 0; size <= BUCKET_SIZE; size++) {
      expect(bucketQuota(MAX_TIER, size).promote).toBe(0);
    }
  });
});

function member(userId: string, xpEarned: number, over: Partial<LeagueMemberRow> = {}): LeagueMemberRow {
  return { userId, tier: 1, bucket: 0, xpEarned, ...over };
}

describe('주간 정산 계획', () => {
  const full = Array.from({ length: BUCKET_SIZE }, (_, i) =>
    member(`u${String(i).padStart(2, '0')}`, (BUCKET_SIZE - i) * 100)
  );

  it('XP 내림차순으로 1위부터 등수를 매긴다', () => {
    const plan = planSettlement(full);
    expect(plan).toHaveLength(BUCKET_SIZE);
    expect(plan[0]).toMatchObject({ userId: 'u00', rank: 1, outcome: 'promoted' });
    expect(plan[BUCKET_SIZE - 1]).toMatchObject({ rank: BUCKET_SIZE, outcome: 'demoted' });
  });

  it('동점이면 userId로 결정론적으로 가른다 (재실행해도 같은 결과)', () => {
    const tied = [member('zeta', 500), member('alpha', 500), member('mike', 500)];
    const first = planSettlement(tied);
    const second = planSettlement([...tied].reverse());
    expect(first.map((e) => e.userId)).toEqual(['alpha', 'mike', 'zeta']);
    expect(second).toEqual(first);
  });

  it('버킷별로 따로 등수를 매긴다', () => {
    const rows = [
      member('a', 100, { bucket: 0 }),
      member('b', 50, { bucket: 0 }),
      member('c', 10, { bucket: 1 }),
      member('d', 5, { bucket: 1 }),
    ];
    const plan = planSettlement(rows);
    expect(plan.filter((e) => e.bucket === 0).map((e) => e.rank)).toEqual([1, 2]);
    expect(plan.filter((e) => e.bucket === 1).map((e) => e.rank)).toEqual([1, 2]);
  });

  it('티어가 다르면 같은 bucket 번호라도 섞이지 않는다', () => {
    const rows = [
      member('a', 100, { tier: 0, bucket: 0 }),
      member('b', 900, { tier: 3, bucket: 0 }),
    ];
    const plan = planSettlement(rows);
    expect(plan.every((e) => e.rank === 1)).toBe(true);
    expect(plan.every((e) => e.bucketSize === 1)).toBe(true);
  });

  it('이미 정산된 행은 다시 처리하지 않되 등수 계산에는 포함한다', () => {
    const rows = full.map((m, i) => (i === 0 ? { ...m, outcome: 'promoted' as const } : m));
    const plan = planSettlement(rows);
    expect(plan).toHaveLength(BUCKET_SIZE - 1);
    // 1위가 빠져도 2위는 여전히 2위다 (재개 시 등수가 흔들리면 안 된다)
    expect(plan[0]).toMatchObject({ userId: 'u01', rank: 2 });
  });

  it('XP 0인 계정은 승급하지 않고 보상도 없다', () => {
    const rows = [member('idle', 0, { tier: 0 }), member('idle2', 0, { tier: 0 })];
    const plan = planSettlement(rows);
    expect(plan.every((e) => e.outcome === 'stayed')).toBe(true);
    expect(plan.every((e) => e.coins === 0)).toBe(true);
  });

  it('티어 이동이 판정과 일치한다', () => {
    const plan = planSettlement(full);
    for (const entry of plan) {
      if (entry.outcome === 'promoted') expect(entry.nextTier).toBe(entry.tier + 1);
      if (entry.outcome === 'demoted') expect(entry.nextTier).toBe(entry.tier - 1);
      if (entry.outcome === 'stayed') expect(entry.nextTier).toBe(entry.tier);
    }
  });

  it('승급자 수가 정원을 넘지 않는다', () => {
    const plan = planSettlement(full);
    const promoted = plan.filter((e) => e.outcome === 'promoted').length;
    const demoted = plan.filter((e) => e.outcome === 'demoted').length;
    expect(promoted).toBe(LEAGUE_TIERS[1].promote);
    expect(demoted).toBe(LEAGUE_TIERS[1].demote);
  });

  it('빈 입력에서도 터지지 않는다', () => {
    expect(planSettlement([])).toEqual([]);
  });
});

/**
 * 교차검증(FULL)에서 확정된 결함들의 회귀 방지.
 * 각 케이스는 실제로 발견됐던 실패 시나리오를 그대로 고정한다.
 */
describe('교차검증 확정 결함 회귀', () => {
  it('비활동 계정이 많아도 강등은 정원을 넘지 않는다', () => {
    // 10명 버킷의 골드(정원 기준 5명 강등 → 10명 버킷에선 1명)에서
    // 9명이 XP 0이어도 강등은 정원만큼만 일어나야 한다.
    const rows = [
      member('active', 500, { tier: 2 }),
      ...Array.from({ length: 9 }, (_, i) => member(`idle${i}`, 0, { tier: 2 })),
    ];
    const demoted = planSettlement(rows).filter((e) => e.outcome === 'demoted');
    expect(demoted.length).toBe(bucketQuota(2, 10).demote);
    expect(demoted.length).toBeLessThanOrEqual(1);
  });

  it('티어 증감은 어떤 결과에서도 한 단계를 넘지 않는다', () => {
    // 승강 확정 SQL이 이 증감값을 현재 티어에 더한다 —
    // 주 경계 레이스로 스냅샷 티어가 낡아도 두 단계가 뛰지 않는 근거.
    for (const outcome of ['promoted', 'demoted', 'stayed'] as const) {
      expect(Math.abs(tierDelta(outcome))).toBeLessThanOrEqual(1);
    }
    expect(tierDelta('promoted')).toBe(1);
    expect(tierDelta('demoted')).toBe(-1);
    expect(tierDelta('stayed')).toBe(0);
  });

  it('증감은 판정 결과(nextTier)와 방향이 일치한다', () => {
    for (const tier of TIER_IDS) {
      for (const outcome of ['promoted', 'demoted', 'stayed'] as const) {
        const moved = nextTier(tier, outcome);
        const byDelta = Math.max(0, Math.min(MAX_TIER, tier + tierDelta(outcome)));
        expect(moved).toBe(byDelta);
      }
    }
  });
});

describe('정산 보상', () => {
  it('상위 3명에게만 등수 보상이 있다', () => {
    expect(settlementCoins(0, 1, 'stayed', 100)).toBe(100);
    expect(settlementCoins(0, 3, 'stayed', 100)).toBe(40);
    expect(settlementCoins(0, 4, 'stayed', 100)).toBe(0);
  });

  it('상위 티어일수록 승급 보상이 크다', () => {
    const bronze = settlementCoins(0, 5, 'promoted', 100);
    const diamond = settlementCoins(3, 5, 'promoted', 100);
    expect(diamond).toBeGreaterThan(bronze);
  });

  it('XP를 못 벌었으면 어떤 보상도 없다', () => {
    expect(settlementCoins(3, 1, 'promoted', 0)).toBe(0);
  });

  it('보상은 절대 음수가 아니다', () => {
    for (const tier of TIER_IDS) {
      for (const rank of [1, 5, 30]) {
        for (const outcome of ['promoted', 'demoted', 'stayed'] as const) {
          expect(settlementCoins(tier, rank, outcome, 100)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

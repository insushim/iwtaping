/**
 * 리그 승강제 — 서버 측 진실원.
 *
 * 클라이언트(src/lib/progress/league.ts)에도 같은 티어표·판정 규칙이 있다.
 * 화면에 그린 "승급선/강등선"과 실제 정산 결과가 갈라지면 사용자는 즉시
 * 사기라고 느끼므로, 두 구현의 일치를 테스트로 강제한다.
 * (functions/는 별도 tsconfig로 컴파일되어 src를 import할 수 없다 — rewards.ts와 같은 사정)
 *
 * 이 파일은 두 층으로 나뉜다.
 *   1) 순수 계층: 순위·승강·보상 계산. D1 없이 단위 테스트한다.
 *   2) D1 계층 : 원장 갱신. 모든 쓰기가 멱등이라 잡을 여러 번 돌려도 안전하다.
 */

import { Env } from './common';
import { kstWeekKey } from './verify';
import { creditWallet } from './wallet';

export const BUCKET_SIZE = 30;

export interface LeagueTier {
  id: number;
  name: string;
  color: string;
  /** 정원(30명) 기준 승급 인원 */
  promote: number;
  /** 정원 기준 강등 인원 (최하위 티어는 0) */
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
 * 정원(30명) 기준 숫자를 덜 찬 버킷에 그대로 쓰면 참사가 난다 — 6명짜리
 * 버킷에 "하위 5명 강등"을 적용하면 1등 빼고 전원 강등된다. 그래서
 *  · 인원 비율만큼 정원을 축소하고
 *  · 인원이 너무 적은 버킷(10명 미만)은 강등을 아예 적용하지 않으며
 *  · 승급선과 강등선이 겹치면 강등을 포기한다(승급이 우선).
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

  // 승급선과 강등선이 겹치면(작은 버킷) 강등을 줄인다 — 같은 사람이 둘 다일 수 없다.
  if (promote + demote >= size) demote = Math.max(0, size - promote - 1);

  return { promote, demote };
}

/**
 * 버킷 내 순위(1부터)를 승강 결과로 바꾼다.
 * XP가 0이면 승급 대상이라도 승급시키지 않는다(빈 계정 승급 방지).
 */
export function settleRank(
  tierId: number,
  rank: number,
  xpEarned: number,
  bucketSize: number
): LeagueOutcome {
  const quota = bucketQuota(tierId, bucketSize);
  const inDemoteZone = quota.demote > 0 && rank > bucketSize - quota.demote;
  if (xpEarned <= 0) {
    /*
     * 승급만 막고 강등은 정원 규칙을 그대로 따른다.
     * 예전엔 XP 0이면 무조건 강등이었는데, 그러면 10명 중 9명이 쉬어 간 주에
     * 정원(1명)을 무시하고 9명이 통째로 강등된다. XP 0인 계정은 어차피
     * 순위 맨 아래로 정렬되므로, 강등 정원 안에 들면 그때 강등된다.
     */
    return inDemoteZone ? 'demoted' : 'stayed';
  }
  if (quota.promote > 0 && rank <= quota.promote) return 'promoted';
  if (inDemoteZone) return 'demoted';
  return 'stayed';
}

/** 승강이 티어를 몇 단계 움직이는가 (-1 · 0 · +1) */
export function tierDelta(outcome: LeagueOutcome): number {
  if (outcome === 'promoted') return 1;
  if (outcome === 'demoted') return -1;
  return 0;
}

export function nextTier(tierId: number, outcome: LeagueOutcome): number {
  const base = Math.max(0, Math.min(MAX_TIER, Math.trunc(tierId) || 0));
  if (outcome === 'promoted') return Math.min(MAX_TIER, base + 1);
  if (outcome === 'demoted') return Math.max(0, base - 1);
  return base;
}

/**
 * 정산 보상 코인. 상위 티어일수록 승급 보상이 크다.
 * XP를 한 톨도 안 벌었으면 보상도 없다(부팅만 해두는 계정 차단).
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

// ─────────────────────────── 순수 계층: 정산 계획 ───────────────────────────

export interface LeagueMemberRow {
  userId: string;
  tier: number;
  bucket: number;
  xpEarned: number;
  /** 이미 정산된 행이면 채워져 있다 — 순위 계산에는 쓰되 다시 쓰지는 않는다. */
  outcome?: LeagueOutcome | null;
}

export interface SettlementEntry {
  userId: string;
  tier: number;
  bucket: number;
  rank: number;
  bucketSize: number;
  outcome: LeagueOutcome;
  nextTier: number;
  coins: number;
}

function bucketKey(tier: number, bucket: number): string {
  return `${tier}:${bucket}`;
}

/**
 * 한 주의 리그 멤버 전원을 받아 버킷별 순위와 승강 결과를 계산한다.
 *
 * 정렬 기준: XP 내림차순 → userId 오름차순.
 * userId 타이브레이크가 없으면 같은 XP일 때 순서가 실행마다 달라져,
 * 재실행 시 누구는 승급하고 누구는 강등되는 비결정적 정산이 된다.
 *
 * 이미 정산된 행(outcome != null)도 순위 계산에는 포함하되 결과에서는 뺀다
 * (잡이 중간에 끊겨 재개될 때 순위가 흔들리지 않게 하기 위함).
 */
export function planSettlement(rows: LeagueMemberRow[]): SettlementEntry[] {
  const buckets = new Map<string, LeagueMemberRow[]>();
  for (const row of rows) {
    const key = bucketKey(row.tier, row.bucket);
    const list = buckets.get(key);
    if (list) list.push(row);
    else buckets.set(key, [row]);
  }

  const out: SettlementEntry[] = [];
  for (const list of buckets.values()) {
    const sorted = [...list].sort(
      (a, b) => b.xpEarned - a.xpEarned || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
    );
    const size = sorted.length;
    sorted.forEach((row, index) => {
      if (row.outcome) return; // 이미 정산됨
      const rank = index + 1;
      const outcome = settleRank(row.tier, rank, row.xpEarned, size);
      out.push({
        userId: row.userId,
        tier: row.tier,
        bucket: row.bucket,
        rank,
        bucketSize: size,
        outcome,
        nextTier: nextTier(row.tier, outcome),
        coins: settlementCoins(row.tier, rank, outcome, row.xpEarned),
      });
    });
  }
  return out;
}

// ─────────────────────────── D1 계층 ───────────────────────────

/** 한 번의 정산 호출이 처리할 최대 버킷 수 — 워커 실행시간 상한을 넘지 않게 자른다. */
export const MAX_BUCKETS_PER_RUN = 40;
/** 'running'으로 남은 정산을 죽은 것으로 보고 인계하는 시간 */
const STALE_CLAIM_MS = 5 * 60 * 1000;
/** D1 batch 한 덩어리의 문장 수 */
const BATCH_SIZE = 40;

/**
 * 이번 주 리그에 XP를 적립한다(없으면 참가시킨다).
 *
 * 정상 경로는 UPDATE 한 방이다. 첫 참가일 때만 티어·버킷을 조회한다.
 * 버킷 배정은 원자적이지 않아 동시 가입이 몰리면 31명짜리 버킷이 생길 수 있는데,
 * 정산이 "실제 인원" 기준으로 순위를 매기므로(planSettlement) 정합성 문제는 없다.
 */
export async function enrollWeeklyXp(
  env: Env,
  userId: string,
  weekKey: string,
  xp: number
): Promise<void> {
  const amount = Math.floor(xp);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const bumped = await env.DB.prepare(
    `UPDATE league_members SET xp_earned = xp_earned + ?3
      WHERE week_key = ?1 AND user_id = ?2`
  )
    .bind(weekKey, userId, amount)
    .run();
  if (bumped.meta.changes) return;

  const standing = await env.DB.prepare(`SELECT tier FROM league_standings WHERE user_id = ?1`)
    .bind(userId)
    .first<{ tier: number }>();
  const tier = Math.max(0, Math.min(MAX_TIER, standing?.tier ?? 0));

  // 정원이 덜 찬 가장 낮은 버킷에 넣고, 없으면 새 버킷을 연다.
  const open = await env.DB.prepare(
    `SELECT bucket FROM league_members
      WHERE week_key = ?1 AND tier = ?2
      GROUP BY bucket HAVING COUNT(*) < ?3
      ORDER BY bucket LIMIT 1`
  )
    .bind(weekKey, tier, BUCKET_SIZE)
    .first<{ bucket: number }>();

  let bucket = open?.bucket;
  if (bucket == null) {
    const last = await env.DB.prepare(
      `SELECT COALESCE(MAX(bucket), -1) AS b FROM league_members WHERE week_key = ?1 AND tier = ?2`
    )
      .bind(weekKey, tier)
      .first<{ b: number }>();
    bucket = (last?.b ?? -1) + 1;
  }

  await env.DB.prepare(
    `INSERT INTO league_members (week_key, user_id, tier, bucket, xp_earned)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(week_key, user_id) DO UPDATE SET xp_earned = xp_earned + ?5`
  )
    .bind(weekKey, userId, tier, bucket, amount)
    .run();
}

export interface SettlementResult {
  weekKey: string;
  claimed: boolean;
  skipped?: 'already_settled' | 'in_progress' | 'nothing_to_settle';
  buckets: number;
  members: number;
  promoted: number;
  demoted: number;
  /** 남은 버킷이 있으면 false — 호출자가 다시 부르면 이어서 처리한다. */
  done: boolean;
}

/**
 * 정산 실행권을 잡는다.
 *
 * 여러 곳(크론·지연 정산·수동 호출)에서 동시에 들어와도 한 번만 돌게 하려는 장치다.
 * 다만 이 잠금은 "최적화"일 뿐 정합성의 근거가 아니다 — 실제 안전성은
 * 모든 쓰기가 멱등하다는 데서 온다(outcome IS NULL 조건 · updated_week 단조 · 지갑 idempotency key).
 */
async function claimSettlement(env: Env, weekKey: string, now: number): Promise<boolean> {
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO league_settlements (week_key, status, started_at)
     VALUES (?1, 'running', ?2)`
  )
    .bind(weekKey, now)
    .run();
  if (inserted.meta.changes) return true;

  // 이미 행이 있다 — 끝났거나, 돌고 있거나, 죽은 채 남아 있거나.
  const taken = await env.DB.prepare(
    `UPDATE league_settlements SET started_at = ?2
      WHERE week_key = ?1 AND status = 'running' AND started_at < ?3`
  )
    .bind(weekKey, now, now - STALE_CLAIM_MS)
    .run();
  return Boolean(taken.meta.changes);
}

export async function settleWeek(env: Env, weekKey: string, now = Date.now()): Promise<SettlementResult> {
  const empty: SettlementResult = {
    weekKey,
    claimed: false,
    buckets: 0,
    members: 0,
    promoted: 0,
    demoted: 0,
    done: false,
  };

  const status = await env.DB.prepare(`SELECT status FROM league_settlements WHERE week_key = ?1`)
    .bind(weekKey)
    .first<{ status: string }>();
  if (status?.status === 'done') return { ...empty, skipped: 'already_settled', done: true };

  if (!(await claimSettlement(env, weekKey, now))) {
    return { ...empty, skipped: 'in_progress' };
  }

  // 아직 정산되지 않은 버킷만 골라 이번 실행분을 자른다.
  /*
   * 밴·신규(provisional) 계정은 순위에서 제외한다.
   * 전국 순위(/api/leaderboard)와 같은 신뢰경계여야 한다 — 리그만 열어 두면
   * 계정을 대량 생성해 브론즈 버킷 1위 보상(코인)을 파밍할 수 있다.
   * 리그 화면(/api/league)의 집계 기준과도 같아야 등수가 어긋나지 않는다.
   */
  const pending = await env.DB.prepare(
    `SELECT m.tier AS tier, m.bucket AS bucket
       FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.week_key = ?1 AND m.outcome IS NULL AND u.banned = 0 AND u.provisional = 0
      GROUP BY m.tier, m.bucket ORDER BY m.tier, m.bucket LIMIT ?2`
  )
    .bind(weekKey, MAX_BUCKETS_PER_RUN + 1)
    .all<{ tier: number; bucket: number }>();

  const allPending = pending.results ?? [];
  if (!allPending.length) {
    await finishSettlement(env, weekKey, now);
    return { ...empty, claimed: true, skipped: 'nothing_to_settle', done: true };
  }

  const hasMore = allPending.length > MAX_BUCKETS_PER_RUN;
  const targets = allPending.slice(0, MAX_BUCKETS_PER_RUN);

  let members = 0;
  let promoted = 0;
  let demoted = 0;
  let failedBuckets = 0;

  for (const target of targets) {
    // 순위는 버킷 전원 기준이어야 한다 — 이미 정산된 행도 함께 읽는다.
    const rows = await env.DB.prepare(
      `SELECT m.user_id AS userId, m.tier AS tier, m.bucket AS bucket,
              m.xp_earned AS xpEarned, m.outcome AS outcome
         FROM league_members m JOIN users u ON u.id = m.user_id
        WHERE m.week_key = ?1 AND m.tier = ?2 AND m.bucket = ?3
          AND u.banned = 0 AND u.provisional = 0`
    )
      .bind(weekKey, target.tier, target.bucket)
      .all<LeagueMemberRow>();

    const plan = planSettlement(rows.results ?? []);
    if (!plan.length) continue;

    try {
      /*
       * ① 보상 먼저, ② 승강 확정 나중. 이 순서가 뒤집히면 안 된다.
       *
       * outcome이 커밋되는 순간 그 버킷은 재정산 조회(outcome IS NULL)에서
       * 영구히 빠진다. 확정을 먼저 하면 그 뒤 지급이 실패했을 때 재실행이
       * 그 사람을 다시 보지 못해 코인이 영영 지급되지 않는다.
       * 반대 순서면 지급 후 확정 전에 죽어도 재실행이 이어서 처리하고,
       * 이미 지급된 몫은 idempotency key(league:{week}:{uid})가 막는다.
       * (wallet.ts의 "차감 먼저·기록 나중"과 같은 원칙의 거울상)
       */
      for (const entry of plan) {
        if (entry.coins <= 0) continue;
        await creditWallet(env, {
          userId: entry.userId,
          currency: 'coins',
          amount: entry.coins,
          description: `league:${weekKey}:${entry.outcome}`,
          idempotencyKey: `league:${weekKey}:${entry.userId}`,
        });
      }

      await commitBucket(env, weekKey, plan, now);
    } catch {
      /*
       * 이 버킷은 미정산으로 남는다(outcome이 아직 NULL). 다음 실행이 다시 집는다.
       * 여기서 던지면 남은 버킷까지 통째로 멈추므로 버킷 단위로 격리한다.
       */
      failedBuckets += 1;
      continue;
    }

    for (const entry of plan) {
      members += 1;
      if (entry.outcome === 'promoted') promoted += 1;
      if (entry.outcome === 'demoted') demoted += 1;
    }
  }

  // 실패한 버킷이 하나라도 있으면 이 주는 아직 끝난 게 아니다 — done으로 닫으면
  // 그 버킷은 'already_settled'에 막혀 영구 미정산이 된다.
  const remaining = hasMore || failedBuckets > 0;

  if (remaining) {
    /*
     * 이번 호출분만 끝냈다 — 남은 버킷을 다른 호출이 이어받을 수 있게 잠금을 푼다.
     * 풀지 않으면 바로 뒤이은 재호출이 STALE_CLAIM_MS 동안 'in_progress'로 튕겨
     * 정산이 그 시간만큼 멈춘다(크론 루프가 헛돈다).
     */
    await env.DB.prepare(
      `UPDATE league_settlements SET started_at = 0 WHERE week_key = ?1 AND status = 'running'`
    )
      .bind(weekKey)
      .run();
  } else {
    await finishSettlement(env, weekKey, now);
  }

  return {
    weekKey,
    claimed: true,
    buckets: targets.length - failedBuckets,
    members,
    promoted,
    demoted,
    done: !remaining,
  };
}

/** 한 버킷의 승강 확정 — 순위 기록과 티어 반영을 한 트랜잭션 단위로 묶는다. */
async function commitBucket(
  env: Env,
  weekKey: string,
  plan: SettlementEntry[],
  now: number
): Promise<void> {
  const statements: D1PreparedStatement[] = [];
  for (const entry of plan) {
    statements.push(
        env.DB.prepare(
          `UPDATE league_members
              SET final_rank = ?3, outcome = ?4, settled_at = ?5
            WHERE week_key = ?1 AND user_id = ?2 AND outcome IS NULL`
        ).bind(weekKey, entry.userId, entry.rank, entry.outcome, now),
      /*
       * 티어 확정.
       *
       * 기존 사용자는 **현재 티어에 증감(-1·0·+1)을 더한다**. 스냅샷된
       * entry.nextTier를 그대로 덮으면 이중 이동이 난다 — 실측 시나리오:
       * 실버 사용자가 새 주 시작 직후(지난주 정산 전)에 점수를 내면 새 주 참가
       * 기록이 "실버"로 굳는다. 그 뒤 지난주 정산이 그를 브론즈로 강등해도
       * 새 주는 여전히 실버 버킷이라, 새 주 정산이 골드로 올려 버린다
       * (브론즈 → 골드, 한 번에 두 단계).
       * 증감으로 쓰면 어떤 순서로 정산되든 한 정산당 최대 1단계만 움직인다.
       *
       * updated_week 조건은 그대로 남는다 — 같은 주 재실행 시 증감이 두 번
       * 적용되는 것을 막는 방어선이다(주 키는 YYYY-Www 제로패딩이라
       * 문자열 비교가 곧 시간 순서, 연말 경계도 안전).
       */
      env.DB.prepare(
        `INSERT INTO league_standings (user_id, tier, updated_week, last_rank, last_outcome)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE
            SET tier = MAX(0, MIN(?6, league_standings.tier + ?7)),
                updated_week = excluded.updated_week,
                last_rank = excluded.last_rank,
                last_outcome = excluded.last_outcome
          WHERE league_standings.updated_week < excluded.updated_week`
      ).bind(
        entry.userId,
        entry.nextTier,
        weekKey,
        entry.rank,
        entry.outcome,
        MAX_TIER,
        tierDelta(entry.outcome)
      )
    );
  }

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await env.DB.batch(statements.slice(i, i + BATCH_SIZE));
  }
}

async function finishSettlement(env: Env, weekKey: string, now: number): Promise<void> {
  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS members,
            SUM(CASE WHEN outcome = 'promoted' THEN 1 ELSE 0 END) AS promoted,
            SUM(CASE WHEN outcome = 'demoted'  THEN 1 ELSE 0 END) AS demoted
       FROM league_members WHERE week_key = ?1`
  )
    .bind(weekKey)
    .first<{ members: number; promoted: number; demoted: number }>();

  await env.DB.prepare(
    `UPDATE league_settlements
        SET status = 'done', settled_at = ?2, members = ?3, promoted = ?4, demoted = ?5
      WHERE week_key = ?1`
  )
    .bind(weekKey, now, totals?.members ?? 0, totals?.promoted ?? 0, totals?.demoted ?? 0)
    .run();
}

/** KST 기준 지난주 키. 같은 계산이 여러 곳에 흩어지지 않도록 여기 하나만 둔다. */
export function previousWeekKey(now = Date.now()): string {
  return kstWeekKey(now - 7 * 24 * 60 * 60 * 1000);
}

/**
 * 아직 정산되지 않은 가장 오래된 주. 없으면 null.
 *
 * 지연 정산이 "바로 지난주"만 보면 크론이 2주 넘게 죽어 있었을 때
 * 그보다 오래된 주가 영영 정산되지 않는다. 밀린 것부터 하나씩 따라잡는다.
 */
export async function oldestUnsettledWeek(env: Env, now = Date.now()): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT MIN(m.week_key) AS week_key
       FROM league_members m JOIN users u ON u.id = m.user_id
      WHERE m.outcome IS NULL AND m.week_key < ?1
        AND u.banned = 0 AND u.provisional = 0`
  )
    .bind(kstWeekKey(now))
    .first<{ week_key: string | null }>();
  return row?.week_key ?? null;
}

import { Env } from './common';

/**
 * 재화 원장.
 *
 * 안전망 (financial-saas 4단계):
 *  1. 모든 변경은 wallet_transactions에 audit log를 남긴다.
 *  2. 절대값 덮어쓰기 금지 — 항상 증분(coins = coins + ?)으로 갱신한다.
 *  3. idempotency_key로 중복 지급/차감을 차단한다(네트워크 재시도·두 탭).
 *  4. 잔액이 모자라면 차감을 거부한다(음수 잔액 금지).
 */

export type Currency = 'coins' | 'xp';

export interface WalletState {
  coins: number;
  xp: number;
  level: number;
}

export interface CreditInput {
  userId: string;
  currency: Currency;
  amount: number; // 양수
  description: string;
  idempotencyKey: string;
}

/** level^1.5 * 100 — 클라이언트(useProgressStore)와 동일한 곡선 */
export function xpForLevel(level: number): number {
  return Math.floor(Math.pow(level, 1.5) * 100);
}

export function levelForTotalXp(totalXp: number): number {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level) && level < 999) {
    remaining -= xpForLevel(level);
    level++;
  }
  return level;
}

async function readWallet(env: Env, userId: string): Promise<WalletState | null> {
  return env.DB.prepare(`SELECT coins, xp, level FROM wallets WHERE user_id = ?1`)
    .bind(userId)
    .first<WalletState>();
}

export async function creditWallet(env: Env, input: CreditInput): Promise<WalletState | null> {
  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return readWallet(env, input.userId);

  /*
   * 원장 기록과 잔액 갱신은 반드시 한 덩어리여야 한다.
   * D1은 개별 호출이 각각 커밋되므로, 따로 실행하면 INSERT 직후 실패 시
   * "거래 내역은 있는데 잔액은 그대로"인 영구 불일치가 남는다.
   * batch()는 하나의 트랜잭션으로 처리된다.
   */
  const column = input.currency === 'coins' ? 'coins' : 'xp';

  /*
   * 두 문장 모두 "같은 idempotency_key의 거래가 아직 없다"는 동일 조건에
   * 걸어 둔다. 잔액 갱신을 먼저 하고 원장을 나중에 남기므로,
   * 중복 요청이면 UPDATE는 조건에서 걸리고 INSERT는 유니크 인덱스로 무시된다.
   * (changes()에 의존하지 않는 형태 — 실사용 경로라 가정을 최소화한다)
   */
  const [updated] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE wallets
          SET ${column} = ${column} + ?2
        WHERE user_id = ?1
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions
             WHERE user_id = ?1 AND idempotency_key = ?3
          )`
    ).bind(input.userId, amount, input.idempotencyKey),
    env.DB.prepare(
      `INSERT OR IGNORE INTO wallet_transactions
         (id, user_id, kind, currency, amount, description, idempotency_key, created_at)
       VALUES (?1, ?2, 'earn', ?3, ?4, ?5, ?6, ?7)`
    ).bind(
      crypto.randomUUID(),
      input.userId,
      input.currency,
      amount,
      input.description.slice(0, 120),
      input.idempotencyKey,
      Date.now()
    ),
  ]);

  // 이미 처리된 요청이면 잔액이 변하지 않았다 — 현재 잔액만 돌려준다.
  if (!updated.meta.changes) return readWallet(env, input.userId);

  if (input.currency === 'xp') {
    const w = await readWallet(env, input.userId);
    if (w) {
      const level = levelForTotalXp(w.xp);
      // 동시 적립 시 낮은 값으로 역행하지 않도록 증가 방향으로만 갱신한다
      if (level > w.level) {
        await env.DB.prepare(`UPDATE wallets SET level = ?2 WHERE user_id = ?1 AND level < ?2`)
          .bind(input.userId, level)
          .run();
      }
    }
  }

  return readWallet(env, input.userId);
}

export interface SpendInput {
  userId: string;
  amount: number; // 양수
  description: string;
  idempotencyKey: string;
}

export type SpendResult =
  | { ok: true; wallet: WalletState }
  | { ok: false; error: 'insufficient_funds' | 'not_found' };

export async function spendCoins(env: Env, input: SpendInput): Promise<SpendResult> {
  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'insufficient_funds' };

  /*
   * 차감을 먼저 하고, 차감이 실제로 일어났을 때만 원장을 남긴다.
   * 순서가 반대면(원장 먼저) 잔액 부족 시 보상 삭제가 필요해지고,
   * 그 사이에 다른 요청이 끼어들면 원장과 잔액이 어긋난다.
   *
   * 조건 두 가지가 한 문장 안에서 동시에 성립해야 차감된다:
   *   1) 잔액이 충분하다            → 음수 잔액 방지
   *   2) 같은 키의 거래가 아직 없다  → 중복 차감 방지(동시 요청 포함)
   *
   * 원장 INSERT는 `changes() = 1`로 "방금 차감이 실제로 일어났을 때"만 실행한다.
   * 잔액 부족으로 차감이 안 됐는데 원장만 남으면 정합이 깨지기 때문이다.
   * 근거: D1의 batch()는 문장들을 단일 트랜잭션에서 순차·비동시 실행하므로
   * changes()가 직전 문장의 결과를 가리킨다(Cloudflare D1 문서 확인).
   *
   * ⚠️ 아직 이 함수를 호출하는 API가 없다(상점 구현 시 추가 예정).
   *    호출부를 만들 때 동시 요청 테스트로 위 가정을 실제로 확인할 것.
   */
  const [deducted] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE wallets
          SET coins = coins - ?2
        WHERE user_id = ?1
          AND coins >= ?2
          AND NOT EXISTS (
            SELECT 1 FROM wallet_transactions
             WHERE user_id = ?1 AND idempotency_key = ?3
          )`
    ).bind(input.userId, amount, input.idempotencyKey),
    env.DB.prepare(
      `INSERT INTO wallet_transactions
         (id, user_id, kind, currency, amount, description, idempotency_key, created_at)
       SELECT ?1, ?2, 'spend', 'coins', ?3, ?4, ?5, ?6
        WHERE changes() = 1`
    ).bind(
      crypto.randomUUID(),
      input.userId,
      -amount,
      input.description.slice(0, 120),
      input.idempotencyKey,
      Date.now()
    ),
  ]);

  const wallet = await readWallet(env, input.userId);
  if (!wallet) return { ok: false, error: 'not_found' };

  if (!deducted.meta.changes) {
    // 차감이 안 됐다 — 이미 처리된 요청이거나 잔액 부족.
    const already = await env.DB.prepare(
      `SELECT 1 AS ok FROM wallet_transactions WHERE user_id = ?1 AND idempotency_key = ?2`
    )
      .bind(input.userId, input.idempotencyKey)
      .first<{ ok: number }>();
    // 이미 처리된 요청이면 성공으로 응답한다(재시도 안전). 아니면 잔액 부족.
    return already ? { ok: true, wallet } : { ok: false, error: 'insufficient_funds' };
  }

  return { ok: true, wallet };
}

export { readWallet };

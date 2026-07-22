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

  // idempotency: 이미 처리된 키면 아무것도 하지 않는다.
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO wallet_transactions
       (id, user_id, kind, currency, amount, description, idempotency_key, created_at)
     VALUES (?1, ?2, 'earn', ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      crypto.randomUUID(),
      input.userId,
      input.currency,
      amount,
      input.description.slice(0, 120),
      input.idempotencyKey,
      Date.now()
    )
    .run();

  if (!inserted.meta.changes) return readWallet(env, input.userId);

  if (input.currency === 'coins') {
    await env.DB.prepare(`UPDATE wallets SET coins = coins + ?2 WHERE user_id = ?1`)
      .bind(input.userId, amount)
      .run();
  } else {
    await env.DB.prepare(`UPDATE wallets SET xp = xp + ?2 WHERE user_id = ?1`)
      .bind(input.userId, amount)
      .run();
    const w = await readWallet(env, input.userId);
    if (w) {
      const level = levelForTotalXp(w.xp);
      if (level !== w.level) {
        await env.DB.prepare(`UPDATE wallets SET level = ?2 WHERE user_id = ?1`)
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

  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO wallet_transactions
       (id, user_id, kind, currency, amount, description, idempotency_key, created_at)
     VALUES (?1, ?2, 'spend', 'coins', ?3, ?4, ?5, ?6)`
  )
    .bind(
      crypto.randomUUID(),
      input.userId,
      -amount,
      input.description.slice(0, 120),
      input.idempotencyKey,
      Date.now()
    )
    .run();

  // 이미 처리된 요청 — 잔액만 반환(중복 차감 금지)
  if (!inserted.meta.changes) {
    const wallet = await readWallet(env, input.userId);
    return wallet ? { ok: true, wallet } : { ok: false, error: 'not_found' };
  }

  // 조건부 증분 — 잔액이 충분할 때만 차감된다(음수 잔액·경합 차단)
  const updated = await env.DB.prepare(
    `UPDATE wallets SET coins = coins - ?2 WHERE user_id = ?1 AND coins >= ?2`
  )
    .bind(input.userId, amount)
    .run();

  if (!updated.meta.changes) {
    // 차감 실패 → 남긴 거래 로그를 되돌린다(원장과 잔액의 정합 유지)
    await env.DB.prepare(
      `DELETE FROM wallet_transactions WHERE user_id = ?1 AND idempotency_key = ?2`
    )
      .bind(input.userId, input.idempotencyKey)
      .run();
    return { ok: false, error: 'insufficient_funds' };
  }

  const wallet = await readWallet(env, input.userId);
  return wallet ? { ok: true, wallet } : { ok: false, error: 'not_found' };
}

export { readWallet };

import { Env, json, badRequest, requireUser, readJson, isRateLimited } from '../lib/common';
import { ScoreSubmission, verifySubmission, kstDayKey, kstWeekKey } from '../lib/verify';
import { creditWallet } from '../lib/wallet';

interface Body extends ScoreSubmission {
  nonce?: string;
}

/** 제출 빈도 상한: 10분에 30회 */
const RATE_MAX = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** provisional 해제 기준: 검증 통과 세션 5회 */
const PROVISIONAL_THRESHOLD = 5;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return badRequest('unauthorized', 401);

  const body = await readJson<Body>(request);
  if (!body?.nonce) return badRequest('nonce_required');
  if (typeof body.mode !== 'string' || !body.mode) return badRequest('mode_required');

  if (await isRateLimited(env, user.uid, 'score', RATE_MAX, RATE_WINDOW_MS)) {
    return badRequest('rate_limited', 429);
  }

  // nonce는 1회용 — 소모에 실패하면(없음/타인 것/이미 사용) 제출을 거부한다.
  const consumed = await env.DB.prepare(
    `UPDATE challenges SET used_at = ?1
      WHERE nonce = ?2 AND user_id = ?3 AND used_at IS NULL AND issued_at > ?4`
  )
    .bind(Date.now(), body.nonce, user.uid, Date.now() - 1000 * 60 * 60 * 2)
    .run();

  if (!consumed.meta.changes) return badRequest('invalid_or_used_nonce', 409);

  const verdict = verifySubmission(body);
  const now = Date.now();
  const scoreId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO scores
       (id, user_id, mode, language, kpm, accuracy, score, elapsed_ms, text_hash, text_version,
        nonce, verify_status, hold_reason, day_key, week_key, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`
  )
    .bind(
      scoreId,
      user.uid,
      body.mode.slice(0, 32),
      (body.language ?? 'ko').slice(0, 8),
      body.kpm,
      body.accuracy,
      Math.round(body.score ?? 0),
      Math.round(body.elapsedMs),
      body.textHash?.slice(0, 64) ?? null,
      body.textVersion?.slice(0, 32) ?? null,
      body.nonce,
      verdict.status,
      verdict.reason ?? null,
      kstDayKey(now),
      kstWeekKey(now),
      now
    )
    .run();

  if (verdict.status === 'rejected') {
    return json({ ok: false, scoreId, status: verdict.status, reason: verdict.reason }, 422);
  }

  // 검증 통과분만 재화를 지급한다 (서버 원장 + audit log)
  let wallet = null;
  if (verdict.status === 'ok') {
    const earnedXp = Math.max(1, Math.round(body.kpm / 10 + body.accuracy / 10));
    wallet = await creditWallet(env, {
      userId: user.uid,
      currency: 'xp',
      amount: earnedXp,
      description: `session:${body.mode}`,
      idempotencyKey: `score:${scoreId}`,
    });

    await env.DB.prepare(
      `UPDATE users SET provisional = 0, last_seen_at = ?2
        WHERE id = ?1 AND provisional = 1
          AND (SELECT COUNT(*) FROM scores WHERE user_id = ?1 AND verify_status = 'ok') >= ?3`
    )
      .bind(user.uid, now, PROVISIONAL_THRESHOLD)
      .run();
  }

  return json({ ok: true, scoreId, status: verdict.status, reason: verdict.reason ?? null, wallet });
};

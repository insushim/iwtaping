import { Env, json, badRequest, requireUser, readJson, isRateLimited } from '../lib/common';
import { ScoreSubmission, verifySubmission, kstDayKey, kstWeekKey } from '../lib/verify';
import { creditWallet } from '../lib/wallet';
import { earnedXpFor, earnedCoinsFor } from '../lib/rewards';
import { enrollWeeklyXp } from '../lib/league';

interface Body extends ScoreSubmission {
  nonce?: string;
}

/** 제출 빈도 상한: 10분에 30회 */
const RATE_MAX = 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/**
 * provisional 해제 기준: 검증 통과 세션 1회.
 * (교실 사용 — 학생이 한 판만 해도 전국 순위에 잡히도록. Sybil 방어는
 *  verify_status='ok'(치팅 로그 거부)가 담당하고, 이 문턱은 가시성 지연만 준다.)
 */
const PROVISIONAL_THRESHOLD = 1;

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
    // 게임 점수는 순위 전용 — 지갑/리그 XP를 지급하지 않는다.
    // (게임은 타건 검증이 없어 XP 파밍이 쉽고, 리그는 타이핑 실력 지표로 유지한다.
    //  게임은 game:* 리더보드에서 점수로 순위만 매긴다.)
    const isGame = body.mode.startsWith('game:');

    if (!isGame) {
    // 클라이언트(ResultPanel)와 같은 공식을 쓴다 — 두 값이 다르면
    // 화면에 보이는 XP와 서버 잔액이 갈라진다.
    const earnedXp = earnedXpFor(body.kpm, body.accuracy, body.maxCombo ?? 0);
    const earnedCoins = earnedCoinsFor(earnedXp);

    wallet = await creditWallet(env, {
      userId: user.uid,
      currency: 'xp',
      amount: earnedXp,
      description: `session:${body.mode}`,
      idempotencyKey: `score:${scoreId}`,
    });

    if (earnedCoins > 0) {
      wallet = await creditWallet(env, {
        userId: user.uid,
        currency: 'coins',
        amount: earnedCoins,
        description: `session:${body.mode}`,
        idempotencyKey: `score-coins:${scoreId}`,
      });
    }

    /*
     * 리그 주간 XP 적립. 지갑과 달리 "이번 주에 번 XP"만 따로 센다
     * (지갑 XP는 누적이라 주간 경쟁 지표로 쓸 수 없다).
     * 실패해도 점수 제출 자체는 성공으로 처리한다 — 리그는 부가 기능이고,
     * 여기서 던지면 이미 지급된 지갑 거래가 응답 없이 묻힌다.
     */
    try {
      await enrollWeeklyXp(env, user.uid, kstWeekKey(now), earnedXp);
    } catch {
      // 재시도는 없다 — 이번 세션의 주간 XP는 유실되고, 다음 세션분부터 정상 적립된다.
      // (리그는 부가 기능이라 점수 제출·지갑 지급까지 막지 않는 쪽을 택했다)
    }
    } // end !isGame

    // provisional 해제는 게임/타이핑 모두의 'ok' 세션을 센다 (한 판이면 순위 노출)
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

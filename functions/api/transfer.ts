import { Env, json, badRequest, requireUser, readJson, getSecret } from '../lib/common';
import { hashDevice, hashTransferCode, signToken } from '../lib/auth';

interface Body {
  action?: 'issue' | 'redeem';
  code?: string;
  deviceId?: string;
}

const CODE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
// 혼동하기 쉬운 문자(0/O, 1/I) 제외한 32자 알파벳 × 10자리 ≈ 50비트
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;

function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * 기기 이전용 1회성 코드.
 * 코드 원문은 저장하지 않고 HMAC 해시만 보관하며, 24시간 후 만료된다.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<Body>(request);
  const secret = getSecret(env);
  const now = Date.now();

  if (body?.action === 'issue') {
    const user = await requireUser(request, env);
    if (!user) return badRequest('unauthorized', 401);

    const code = generateCode();
    const codeHash = await hashTransferCode(secret, code);

    // 이전에 발급한 미사용 코드는 무효화 (동시에 하나만 유효)
    await env.DB.prepare(`DELETE FROM transfer_codes WHERE user_id = ?1 AND used_at IS NULL`)
      .bind(user.uid)
      .run();

    await env.DB.prepare(
      `INSERT INTO transfer_codes (code_hash, user_id, expires_at, attempts, used_at)
       VALUES (?1, ?2, ?3, 0, NULL)`
    )
      .bind(codeHash, user.uid, now + CODE_TTL_MS)
      .run();

    return json({ ok: true, code, expiresAt: now + CODE_TTL_MS });
  }

  if (body?.action === 'redeem') {
    if (typeof body.code !== 'string' || typeof body.deviceId !== 'string' || body.deviceId.length < 8) {
      return badRequest('code_and_device_required');
    }

    const codeHash = await hashTransferCode(secret, body.code.trim());
    const row = await env.DB.prepare(
      `SELECT user_id, expires_at, attempts, used_at FROM transfer_codes WHERE code_hash = ?1`
    )
      .bind(codeHash)
      .first<{ user_id: string; expires_at: number; attempts: number; used_at: number | null }>();

    if (!row) return badRequest('invalid_code', 404);
    if (row.used_at) return badRequest('code_already_used', 409);
    if (row.expires_at < now) return badRequest('code_expired', 410);
    if (row.attempts >= MAX_ATTEMPTS) return badRequest('too_many_attempts', 429);

    const consumed = await env.DB.prepare(
      `UPDATE transfer_codes SET used_at = ?2 WHERE code_hash = ?1 AND used_at IS NULL`
    )
      .bind(codeHash, now)
      .run();
    if (!consumed.meta.changes) return badRequest('code_already_used', 409);

    const deviceHash = await hashDevice(secret, body.deviceId);
    await env.DB.prepare(
      `INSERT OR REPLACE INTO devices (device_hash, user_id, created_at) VALUES (?1, ?2, ?3)`
    )
      .bind(deviceHash, row.user_id, now)
      .run();

    const user = await env.DB.prepare(
      `SELECT id, nickname, avatar, provisional FROM users WHERE id = ?1`
    )
      .bind(row.user_id)
      .first<{ id: string; nickname: string; avatar: string; provisional: number }>();

    if (!user) return badRequest('account_missing', 404);

    return json({
      ok: true,
      token: await signToken(secret, { uid: user.id, iat: now }),
      user: { id: user.id, nickname: user.nickname, avatar: user.avatar, provisional: !!user.provisional },
    });
  }

  return badRequest('invalid_action');
};

/** 실패한 시도도 카운트하려면 별도 호출이 필요하지만, 시도 증가는 redeem 실패 경로에서 처리한다. */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = await readJson<{ code?: string }>(request);
  if (typeof body?.code !== 'string') return badRequest('code_required');
  const codeHash = await hashTransferCode(getSecret(env), body.code.trim());
  await env.DB.prepare(`UPDATE transfer_codes SET attempts = attempts + 1 WHERE code_hash = ?1`)
    .bind(codeHash)
    .run();
  return json({ ok: true });
};

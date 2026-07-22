import { Env, json, badRequest, requireUser, readJson } from '../lib/common';

interface Body {
  mode?: string;
}

/**
 * 점수 제출 전에 nonce를 선발급한다.
 * 제출은 이 nonce를 소모해야만 유효 — 같은 세션 결과를 반복 제출할 수 없다.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return badRequest('unauthorized', 401);

  const body = await readJson<Body>(request);
  const mode = typeof body?.mode === 'string' ? body.mode.slice(0, 32) : '';
  if (!mode) return badRequest('mode_required');

  const nonce = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO challenges (nonce, user_id, mode, issued_at, used_at) VALUES (?1, ?2, ?3, ?4, NULL)`
  )
    .bind(nonce, user.uid, mode, now)
    .run();

  // 오래된 미사용 챌린지 정리 (D1 write 쿼터를 아끼려 확률적으로만 실행)
  if (Math.random() < 0.02) {
    await env.DB.prepare(`DELETE FROM challenges WHERE issued_at < ?1`)
      .bind(now - 1000 * 60 * 60 * 6)
      .run();
  }

  return json({ ok: true, nonce, issuedAt: now });
};

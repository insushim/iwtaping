import { Env, json, badRequest } from '../lib/common';
import { kstDayKey, kstWeekKey } from '../lib/verify';

/**
 * 전국 순위.
 *
 * 캐시는 KV가 아니라 Cache API를 쓴다 — KV 무료 쓰기가 하루 1,000회뿐이라
 * 분 단위 갱신 × 기간 × 모드 × 급 조합이면 즉시 쿼터를 넘긴다.
 * Cache API는 쓰기 쿼터가 없고 엣지 로컬이라 이 용도에 맞는다.
 */

const CACHE_SECONDS = 60;
const PERIODS = new Set(['daily', 'weekly', 'all']);
const LIMIT = 50;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') ?? 'speed').slice(0, 32);
  const period = url.searchParams.get('period') ?? 'weekly';
  const gradeBand = url.searchParams.get('grade');

  if (!PERIODS.has(period)) return badRequest('invalid_period');

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(
    `${url.origin}/api/leaderboard?mode=${mode}&period=${period}&grade=${gradeBand ?? 'all'}`,
    { method: 'GET' }
  );

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const filters: string[] = [
    `s.mode = ?1`,
    `s.verify_status = 'ok'`,
    `u.banned = 0`,
    // 신규 계정(provisional)은 순위에서 제외 — Sybil 어뷰징 완화
    `u.provisional = 0`,
  ];
  const binds: unknown[] = [mode];

  if (period === 'daily') {
    binds.push(kstDayKey());
    filters.push(`s.day_key = ?${binds.length}`);
  } else if (period === 'weekly') {
    binds.push(kstWeekKey());
    filters.push(`s.week_key = ?${binds.length}`);
  }

  if (gradeBand) {
    binds.push(gradeBand.slice(0, 8));
    filters.push(`u.grade_band = ?${binds.length}`);
  }

  const orderBy = mode.startsWith('game:') ? 's.score DESC' : 's.kpm DESC';

  // 사용자별 최고 기록 1건씩만 순위에 올린다.
  const sql = `
    SELECT u.nickname AS nickname, u.avatar AS avatar,
           MAX(${mode.startsWith('game:') ? 's.score' : 's.kpm'}) AS best,
           s.accuracy AS accuracy, s.created_at AS created_at
      FROM scores s
      JOIN users u ON u.id = s.user_id
     WHERE ${filters.join(' AND ')}
     GROUP BY s.user_id
     ORDER BY best DESC, ${orderBy}
     LIMIT ${LIMIT}`;

  const { results } = await env.DB.prepare(sql)
    .bind(...binds)
    .all<{ nickname: string; avatar: string; best: number; accuracy: number; created_at: number }>();

  const entries = (results ?? []).map((r, i) => ({
    rank: i + 1,
    nickname: r.nickname,
    avatar: r.avatar,
    value: Math.round(r.best),
    accuracy: Math.round(r.accuracy * 10) / 10,
    at: r.created_at,
  }));

  const response = json(
    { ok: true, mode, period, entries, updatedAt: Date.now() },
    200,
    // 브라우저는 캐시하지 않고(no-store) 엣지에서만 60초 재사용
    { 'cdn-cache-control': `max-age=${CACHE_SECONDS}` }
  );

  await cache.put(cacheKey, new Response(response.clone().body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `max-age=${CACHE_SECONDS}`,
    },
  }));

  return response;
};

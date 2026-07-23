import { Env, json, badRequest, requireUser } from '../lib/common';
import { kstDayKey, kstWeekKey, kstMonthStartMs } from '../lib/verify';

/**
 * 요청자 본인의 전국 순위. 리더보드(GET /api/leaderboard)는 엣지 캐시라
 * 사용자별 값을 담을 수 없어(캐시 오염) 별도 인증 엔드포인트로 분리한다.
 *
 * 순위 = 같은 모드/기간에서 나보다 높은 최고기록을 가진 (비-provisional) 유저 수 + 1.
 */

const PERIODS = new Set(['daily', 'weekly', 'monthly', 'all']);
const MODES: Record<string, { column: 'kpm' | 'score' }> = {
  speed: { column: 'kpm' },
  accuracy: { column: 'kpm' },
  'game:rain': { column: 'score' },
  'game:space': { column: 'score' },
  'game:race': { column: 'score' },
  'game:defense': { column: 'score' },
  'game:zombie': { column: 'score' },
  'game:puzzle': { column: 'score' },
};
const GRADE_BANDS = new Set(['elem', 'middle', 'high', 'adult']);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await requireUser(request, env);
  if (!user) return badRequest('unauthorized', 401);

  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') ?? 'speed').slice(0, 32);
  const period = url.searchParams.get('period') ?? 'weekly';
  const gradeParam = url.searchParams.get('grade');

  if (!PERIODS.has(period)) return badRequest('invalid_period');
  const modeSpec = MODES[mode];
  if (!modeSpec) return badRequest('invalid_mode');
  const gradeBand = gradeParam && GRADE_BANDS.has(gradeParam) ? gradeParam : null;
  // 화이트리스트 값만 보간 (사용자 입력 아님)
  const col = modeSpec.column === 'score' ? 's.score' : 's.kpm';

  const noStore = { 'cache-control': 'no-store' };

  // 1) 내 최고 기록 (검증 통과분)
  const myBinds: unknown[] = [user.uid, mode];
  let myPeriod = '';
  if (period === 'daily') { myBinds.push(kstDayKey()); myPeriod = `AND s.day_key = ?${myBinds.length}`; }
  else if (period === 'weekly') { myBinds.push(kstWeekKey()); myPeriod = `AND s.week_key = ?${myBinds.length}`; }
  else if (period === 'monthly') { myBinds.push(kstMonthStartMs()); myPeriod = `AND s.created_at >= ?${myBinds.length}`; }

  const mine = await env.DB.prepare(
    `SELECT MAX(${col}) AS best FROM scores s
      WHERE s.user_id = ?1 AND s.mode = ?2 AND s.verify_status = 'ok' ${myPeriod}`
  ).bind(...myBinds).first<{ best: number | null }>();

  const myBest = mine?.best;
  if (myBest == null) {
    // 아직 검증 통과 기록이 없음 → 순위 미집계 (오류 아님)
    return json({ ok: true, mode, period, ranked: false }, 200, noStore);
  }

  // 2) 나보다 높은 최고기록 유저 수(above) + 전체 인원(total)
  const binds: unknown[] = [mode];
  const filters = [`s.mode = ?1`, `s.verify_status = 'ok'`, `u.banned = 0`, `u.provisional = 0`];
  if (period === 'daily') { binds.push(kstDayKey()); filters.push(`s.day_key = ?${binds.length}`); }
  else if (period === 'weekly') { binds.push(kstWeekKey()); filters.push(`s.week_key = ?${binds.length}`); }
  else if (period === 'monthly') { binds.push(kstMonthStartMs()); filters.push(`s.created_at >= ?${binds.length}`); }
  if (gradeBand) { binds.push(gradeBand); filters.push(`u.grade_band = ?${binds.length}`); }

  const grouped = `
    SELECT s.user_id AS uid, MAX(${col}) AS best
      FROM scores s JOIN users u ON u.id = s.user_id
     WHERE ${filters.join(' AND ')}
     GROUP BY s.user_id`;

  binds.push(myBest);
  const myBestIdx = binds.length;

  const row = await env.DB.prepare(
    `SELECT
        (SELECT COUNT(*) FROM (${grouped}) g) AS total,
        (SELECT COUNT(*) FROM (${grouped}) g WHERE g.best > ?${myBestIdx}) AS above`
  ).bind(...binds).first<{ total: number; above: number }>();

  const total = row?.total ?? 0;
  const above = row?.above ?? 0;

  return json(
    { ok: true, mode, period, ranked: true, rank: above + 1, total, value: Math.round(myBest) },
    200,
    noStore
  );
};

import { Env, json, badRequest, readJson, isCronAuthorized } from '../../lib/common';
import { kstWeekKey } from '../../lib/verify';
import { settleWeek, previousWeekKey } from '../../lib/league';

interface Body {
  /** 생략하면 지난주를 정산한다. */
  weekKey?: string;
  /** 현재 진행 중인 주를 강제로 정산할 때만 true (운영/테스트용) */
  force?: boolean;
}

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

/**
 * 주간 리그 정산 잡.
 *
 * Cloudflare Pages Functions에는 Cron Trigger(scheduled 핸들러)가 없다 —
 * 크론은 Workers 전용 기능이다(Cloudflare 문서 확인). 그래서 정산을 HTTP
 * 엔드포인트로 두고 외부 스케줄러가 두드리게 한다. 설정 방법은 docs/DEPLOYMENT.md 참조.
 *
 * 스케줄러가 죽어도 리그는 멈추지 않는다 — GET /api/league가 미정산 주를
 * 발견하면 뒤에서 같은 함수를 돌린다(지연 정산).
 *
 * 재실행 안전: 모든 쓰기가 멱등이다.
 *   · 승강 확정은 outcome IS NULL인 행만 갱신
 *   · 티어 반영은 updated_week가 앞설 때만 (이중 승급 차단)
 *   · 코인 지급은 idempotency_key `league:{week}:{uid}` 하나뿐
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isCronAuthorized(request, env)) return badRequest('unauthorized', 401);

  const body = (await readJson<Body>(request)) ?? {};
  const now = Date.now();
  const currentWeek = kstWeekKey(now);
  const weekKey = body.weekKey ?? previousWeekKey(now);

  if (!WEEK_KEY_RE.test(weekKey)) return badRequest('invalid_week_key');

  // 아직 안 끝난 주를 정산하면 사용자가 남은 시간을 보고 있는 동안 등수가
  // 확정돼 버린다. 운영자가 명시적으로 force를 넣을 때만 허용한다.
  if (weekKey >= currentWeek && !body.force) return badRequest('week_not_finished', 409);

  const result = await settleWeek(env, weekKey, now);
  return json({ ok: true, ...result });
};

import { verifyToken } from './auth';

export interface Env {
  DB: D1Database;
  /** wrangler secret put AUTH_SECRET */
  AUTH_SECRET: string;
  /**
   * 주간 정산 잡 호출용 공유 비밀 (wrangler pages secret put CRON_SECRET).
   * 미설정이면 정산 엔드포인트는 항상 거부한다 — 빈 값으로 열려 버리는 사고 방지.
   */
  CRON_SECRET?: string;
}

/**
 * 상수 시간 문자열 비교. 비밀 비교에 `===`를 쓰면 앞자리부터 맞춰 가는
 * 타이밍 공격 여지가 생긴다(엔드포인트가 공개돼 있으므로 실측 가능한 표면이다).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** 정산 잡 인증 — Authorization: Bearer <CRON_SECRET> */
export function isCronAuthorized(request: Request, env: Env): boolean {
  const secret = env.CRON_SECRET ?? '';
  if (secret.length < 16) return false;
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return false;
  return safeEqual(header.slice(7), secret);
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // API 응답은 절대 공유 캐시에 남기지 않는다 (사용자별·시간민감)
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function badRequest(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

export function getSecret(env: Env): string {
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return secret;
}

/**
 * 인증된 사용자를 돌려준다.
 *
 * 서명 검증만으로는 부족하다 — 계정이 삭제됐거나 밴된 뒤에도 기존 토큰이
 * 만료 전까지 계속 통과하기 때문이다. 매 요청마다 계정 상태를 확인한다.
 */
export async function requireUser(request: Request, env: Env): Promise<{ uid: string } | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  const payload = await verifyToken(getSecret(env), token);
  if (!payload) return null;

  const row = await env.DB.prepare(`SELECT banned FROM users WHERE id = ?1`)
    .bind(payload.uid)
    .first<{ banned: number }>();

  if (!row || row.banned) return null;
  return { uid: payload.uid };
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * 단순 rate limit — D1 기반. 같은 사용자의 같은 액션 호출 빈도를 제한한다.
 * (KV 무료 쓰기 쿼터가 낮아 D1으로 처리)
 */
export async function isRateLimited(
  env: Env,
  userId: string,
  action: 'score',
  maxPerWindow: number,
  windowMs: number
): Promise<boolean> {
  if (action !== 'score') return false;
  const since = Date.now() - windowMs;
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM scores WHERE user_id = ?1 AND created_at > ?2`
  )
    .bind(userId, since)
    .first<{ n: number }>();
  return (row?.n ?? 0) >= maxPerWindow;
}

const NICKNAME_RE = /^[가-힣a-zA-Z0-9_]{2,12}$/;

// 최소 금칙어 셋 — 운영 시 사전 확장 (P6 운영 항목)
const BANNED_WORDS = ['시발', '씨발', '병신', '좆', '섹스', 'fuck', 'shit', 'bitch', '관리자', 'admin'];

export function validateNickname(nickname: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof nickname !== 'string') return { ok: false, error: 'nickname_required' };
  const value = nickname.trim();
  if (!NICKNAME_RE.test(value)) return { ok: false, error: 'nickname_format' };
  const lowered = value.toLowerCase();
  if (BANNED_WORDS.some((w) => lowered.includes(w))) return { ok: false, error: 'nickname_banned' };
  return { ok: true, value };
}

import { describe, it, expect } from 'vitest';
import { verifySubmission, kstDayKey, kstWeekKey, MAX_KPM } from '../functions/lib/verify';
import { signToken, verifyToken, hashDevice } from '../functions/lib/auth';
import { xpForLevel, levelForTotalXp } from '../functions/lib/wallet';

// 테스트 전용 더미 키 — 실제 시크릿이 아니다(운영 키는 wrangler secret으로만 주입)
const SECRET = 'test-secret-at-least-16-chars-long'; // gitleaks:allow

/** 사람처럼 흔들리는 타건 간격 */
function humanIntervals(n: number, base = 180): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // 결정론적이면서도 변동이 큰 패턴
    out.push(Math.round(base + Math.sin(i * 1.7) * 70 + (i % 5) * 18));
  }
  return out;
}

function baseSubmission(over: Partial<Parameters<typeof verifySubmission>[0]> = {}) {
  return {
    mode: 'speed',
    kpm: 320,
    accuracy: (310 / 320) * 100,
    elapsedMs: 60000,
    totalKeystrokes: 320,
    correctKeystrokes: 310,
    intervals: humanIntervals(120),
    ...over,
  };
}

describe('점수 검증 — 정상 제출', () => {
  it('사람다운 제출은 통과한다', () => {
    expect(verifySubmission(baseSubmission()).status).toBe('ok');
  });
});

describe('점수 검증 — 거부', () => {
  it('물리 한계를 넘는 속도는 거부', () => {
    const r = verifySubmission(baseSubmission({ kpm: MAX_KPM + 1 }));
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('kpm_above_human_limit');
  });

  it('정확도 100 초과는 거부', () => {
    expect(verifySubmission(baseSubmission({ accuracy: 101 })).status).toBe('rejected');
  });

  it('맞은 타수가 전체 타수를 넘으면 거부', () => {
    const r = verifySubmission(baseSubmission({ totalKeystrokes: 10, correctKeystrokes: 50 }));
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('correct_exceeds_total');
  });

  it('신고 속도와 타수·시간이 모순되면 거부', () => {
    // 60초에 10타인데 900타/분을 주장
    const r = verifySubmission(
      baseSubmission({
        kpm: 900,
        accuracy: 100,
        totalKeystrokes: 10,
        correctKeystrokes: 10,
        intervals: humanIntervals(30),
      })
    );
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('kpm_inconsistent_with_keystrokes');
  });

  it('간격이 완전히 균일한 봇 입력은 거부', () => {
    const r = verifySubmission(baseSubmission({ intervals: new Array(120).fill(150) }));
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('interval_variance_too_low');
  });

  it('물리적으로 불가능한 연타는 거부', () => {
    const r = verifySubmission(baseSubmission({ intervals: new Array(120).fill(0).map((_, i) => (i % 3 ? 200 : 2)) }));
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('impossible_burst');
  });

  it('너무 짧은 세션은 거부', () => {
    expect(verifySubmission(baseSubmission({ elapsedMs: 1000 })).status).toBe('rejected');
  });

  it('음수·NaN 값은 거부', () => {
    expect(verifySubmission(baseSubmission({ kpm: -5 })).status).toBe('rejected');
    expect(verifySubmission(baseSubmission({ kpm: Number.NaN })).status).toBe('rejected');
  });
});

describe('점수 검증 — 교차검증에서 발견된 공격 경로', () => {
  it('임의의 거대 게임 점수는 거부된다 (리더보드 1위 조작)', () => {
    const r = verifySubmission(
      baseSubmission({ mode: 'game:rain', score: Number.MAX_SAFE_INTEGER })
    );
    expect(r.status).toBe('rejected');
    expect(['score_above_limit', 'malformed_score']).toContain(r.reason);
  });

  it('시간 대비 불가능한 점수 획득률은 거부된다', () => {
    // 60초 세션에 초당 500점 상한 → 3만점 초과는 불가능
    const r = verifySubmission(baseSubmission({ mode: 'game:rain', score: 50_000 }));
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('score_rate_impossible');
  });

  it('정상 범위의 게임 점수는 통과한다', () => {
    expect(verifySubmission(baseSubmission({ mode: 'game:rain', score: 8_000 })).status).toBe('ok');
  });

  it('정확도만 100으로 올린 조작은 거부된다 (XP·순위 부풀리기)', () => {
    const r = verifySubmission(
      baseSubmission({ accuracy: 100, totalKeystrokes: 320, correctKeystrokes: 200 })
    );
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('accuracy_inconsistent_with_keystrokes');
  });

  it('타건 로그 총합이 세션 길이를 넘으면 거부된다 (다른 세션 로그 붙여넣기)', () => {
    const r = verifySubmission(
      baseSubmission({ elapsedMs: 10_000, intervals: humanIntervals(300, 900) })
    );
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('intervals_exceed_session');
  });

  it('로그가 세션의 극히 일부만 덮으면 보류된다', () => {
    // 60초 세션인데 로그는 약 1.4초어치
    const r = verifySubmission(baseSubmission({ intervals: new Array(40).fill(0).map((_, i) => 30 + (i % 7) * 9) }));
    expect(r.status).toBe('pending');
    expect(r.reason).toBe('intervals_do_not_cover_session');
  });
});

describe('점수 검증 — 보류', () => {
  it('타건 로그 없는 고득점은 자동 승인하지 않는다', () => {
    const r = verifySubmission(
      baseSubmission({
        kpm: 900,
        accuracy: (890 / 900) * 100,
        totalKeystrokes: 900,
        correctKeystrokes: 890,
        intervals: [],
      })
    );
    expect(r.status).toBe('pending');
    expect(r.reason).toBe('high_score_without_keylog');
  });

  it('규칙성이 의심스러우면 보류', () => {
    // 변동계수가 0.05~0.12 구간
    const intervals = new Array(120).fill(0).map((_, i) => 200 + (i % 2 ? 16 : -16));
    expect(verifySubmission(baseSubmission({ intervals })).status).toBe('pending');
  });
});

describe('토큰 서명', () => {
  it('발급한 토큰은 검증된다', async () => {
    const token = await signToken(SECRET, { uid: 'user-1', iat: Date.now() });
    expect(await verifyToken(SECRET, token)).toMatchObject({ uid: 'user-1' });
  });

  it('다른 비밀키로는 검증되지 않는다', async () => {
    const token = await signToken(SECRET, { uid: 'user-1', iat: Date.now() });
    expect(await verifyToken('another-secret-16-chars-min!!', token)).toBeNull();
  });

  it('서명을 변조하면 거부된다', async () => {
    const token = await signToken(SECRET, { uid: 'user-1', iat: Date.now() });
    const [body] = token.split('.');
    expect(await verifyToken(SECRET, `${body}.AAAA`)).toBeNull();
  });

  it('본문(uid)을 바꿔치기하면 거부된다', async () => {
    const token = await signToken(SECRET, { uid: 'user-1', iat: Date.now() });
    const [, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ uid: 'admin', iat: Date.now() }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(await verifyToken(SECRET, `${forged}.${sig}`)).toBeNull();
  });

  it('만료된 토큰은 거부된다', async () => {
    const old = Date.now() - 1000 * 60 * 60 * 24 * 200;
    const token = await signToken(SECRET, { uid: 'user-1', iat: old });
    expect(await verifyToken(SECRET, token)).toBeNull();
  });

  it('deviceId는 해시로만 다뤄진다(원문 복원 불가)', async () => {
    const hash = await hashDevice(SECRET, 'device-abc-123');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('device-abc-123');
  });
});

describe('레벨 곡선 (클라이언트와 동일해야 함)', () => {
  it('xpForLevel은 level^1.5 * 100', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(4)).toBe(800);
  });

  it('누적 XP로 레벨을 역산한다', () => {
    expect(levelForTotalXp(0)).toBe(1);
    expect(levelForTotalXp(99)).toBe(1);
    expect(levelForTotalXp(100)).toBe(2);
    expect(levelForTotalXp(100 + 282)).toBe(3);
  });
});

describe('KST 집계 키', () => {
  it('UTC 자정 직후도 KST 기준 날짜로 묶인다', () => {
    // 2026-07-22 00:30 UTC = 2026-07-22 09:30 KST
    expect(kstDayKey(Date.UTC(2026, 6, 22, 0, 30))).toBe('2026-07-22');
    // 2026-07-21 16:00 UTC = 2026-07-22 01:00 KST → KST 기준 22일
    expect(kstDayKey(Date.UTC(2026, 6, 21, 16, 0))).toBe('2026-07-22');
  });

  it('주차 키는 ISO 형식이다', () => {
    expect(kstWeekKey(Date.UTC(2026, 6, 22, 3, 0))).toMatch(/^\d{4}-W\d{2}$/);
  });
});

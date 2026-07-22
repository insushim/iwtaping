# 배포 가이드 (백엔드 포함)

프런트엔드는 정적 export(`out/`), 백엔드는 같은 도메인의 Pages Functions(`functions/`)로 동작한다.
백엔드가 없어도 앱은 **로컬 전용 모드**로 정상 동작한다(모든 API 호출이 실패 시 조용히 무시됨).

## 1. D1 데이터베이스 준비

```bash
npx wrangler d1 create typingverse
# 출력된 database_id를 wrangler.toml의 REPLACE_WITH_D1_DATABASE_ID에 넣는다

npx wrangler d1 execute typingverse --file=./schema.sql --remote
```

> **기존 DB가 이미 있다면** 스키마 갱신은 `schema.sql` 재적용만으로 되지 않는다
> (`CREATE TABLE IF NOT EXISTS`는 기존 테이블에 컬럼을 추가하지 않는다).
> 주간 리그 정산 도입분은 마이그레이션을 한 번 적용할 것:
>
> ```bash
> npx wrangler d1 execute typingverse --file=./migrations/0001_league_settlement.sql --remote
> ```
>
> `duplicate column name` 오류 = 이미 적용됨(정상).

## 2. 시크릿 설정

```bash
# 32바이트 이상 랜덤 문자열
openssl rand -base64 48

npx wrangler pages secret put AUTH_SECRET

# 주간 리그 정산 잡 호출용 (별도 값 — AUTH_SECRET을 재사용하지 말 것)
openssl rand -base64 48
npx wrangler pages secret put CRON_SECRET
```

> `AUTH_SECRET`이 바뀌면 기존 토큰이 전부 무효가 되어 사용자가 재등록된다.
> 로테이션이 필요하면 이전 키로도 검증하는 이중 키 기간을 먼저 두어야 한다.
>
> `CRON_SECRET`이 없거나 16자 미만이면 `/api/league/settle`은 **항상 401**을 낸다.
> (미설정 상태가 "인증 없음"으로 열려 버리는 사고를 막기 위한 의도된 동작)

## 3. 배포

```bash
npm run build          # next build + RSC flatten
npx wrangler pages deploy out
```

## 4. 로컬에서 백엔드까지 돌려보기

```bash
npm run build
npx wrangler pages dev out --d1 DB=typingverse
```

## 4.5 주간 리그 정산 스케줄

**Cloudflare Pages Functions에는 Cron Trigger(`scheduled` 핸들러)가 없다** — 크론은
Workers 전용 기능이다. 그래서 정산은 HTTP 엔드포인트로 두고 외부 스케줄러가 두드린다.

```
POST https://<도메인>/api/league/settle
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json

{}                          # 지난주 정산 (기본)
{"weekKey":"2026-W29"}      # 특정 주 재정산 (멱등 — 안전하게 여러 번 호출 가능)
{"force":true}              # 진행 중인 주를 강제 마감 (운영/테스트 전용)
```

응답의 `done: false`는 처리할 버킷이 더 남았다는 뜻이다 (한 번에 최대
`MAX_BUCKETS_PER_RUN`개). **`done: true`가 나올 때까지 반복 호출**할 것.

스케줄 방법 (택1):

| 방법 | 설정 | 비고 |
|---|---|---|
| **GitHub Actions** | `.github/workflows/league-settle.yml` (동봉) | 무료·설정 간단. 리포지토리 시크릿 `CRON_SECRET`·`SITE_URL` 필요 |
| Cloudflare Worker | 별도 Worker에 `[triggers] crons = ["5 15 * * SUN"]` + 위 엔드포인트 fetch | Pages와 배포 단위가 갈린다 |
| 외부 크론(cron-job.org 등) | 위 요청을 등록 | 시크릿을 제3자에 맡기게 됨 — 권장하지 않음 |

> KST 월요일 00:05 = UTC 일요일 15:05.

**스케줄러가 죽어도 리그는 멈추지 않는다.** 사용자가 리그 화면(`GET /api/league`)을
열 때 **가장 오래된 미정산 주**를 백그라운드로 정산한다(지연 정산). 크론이 몇 주
쉬어도 접속이 있을 때마다 한 주씩 밀린 것을 따라잡는다. 크론은 "모두가 접속하기
전에 결과를 확정해 두는" 최적화이지 정합성의 근거가 아니다.

정산 결과 확인:

```bash
npx wrangler d1 execute typingverse --remote \
  --command "SELECT * FROM league_settlements ORDER BY week_key DESC LIMIT 5"
```

## 5. 배포 전 체크리스트

- [ ] `npm run typecheck` (앱 + functions 양쪽)
- [ ] `npm test` 전부 green
- [ ] `npm run build` 성공
- [ ] `~/.claude/bin/preflight-gate.sh .` 통과
- [ ] Service Worker 캐시 버전(`public/sw.js`의 `CACHE_NAME`)을 올렸는가
      — 안 올리면 사용자가 구버전 화면에 고착된다
- [ ] `/api/*`가 SW 캐시에서 제외되어 있는가 (v3부터 적용됨)

## 6. 무료 티어에서 주의할 쿼터

| 자원 | 한도 | 실제 병목 |
|---|---|---|
| Workers 요청 | 10만/일 | 초당 약 1.16req — 트래픽 모델링 필요 |
| D1 저장 | 500MB/DB (계정 총 5GB) | 점수 로그가 커지면 보존기간 정책 필요 |
| **D1 쓰기** | **10만 rows/일** | **실질적 첫 병목** — 인덱스 갱신도 포함해 카운트된다 |
| KV 쓰기 | 1,000/일 | 그래서 리더보드 캐시에 KV를 쓰지 않는다(Cache API 사용) |

점수 1건 제출 = challenges INSERT + UPDATE + scores INSERT + wallet 2건 ≈ 5 rows written.
즉 하루 약 2만 세션이 무료 티어 한계선이다. 그 이상은 유료 전환($5/월)로 해결된다.

## 7. 운영 시 확인

```bash
# 보류(pending) 상태로 쌓인 의심 기록 확인
npx wrangler d1 execute typingverse --remote \
  --command "SELECT hold_reason, COUNT(*) FROM scores WHERE verify_status='pending' GROUP BY hold_reason"

# 재화 원장과 잔액 정합성 점검
npx wrangler d1 execute typingverse --remote \
  --command "SELECT w.user_id, w.coins, COALESCE(SUM(t.amount),0) AS ledger
             FROM wallets w LEFT JOIN wallet_transactions t
               ON t.user_id = w.user_id AND t.currency='coins'
             GROUP BY w.user_id HAVING w.coins != ledger LIMIT 20"
```

# 배포 가이드 (백엔드 포함)

프런트엔드는 정적 export(`out/`), 백엔드는 같은 도메인의 Pages Functions(`functions/`)로 동작한다.
백엔드가 없어도 앱은 **로컬 전용 모드**로 정상 동작한다(모든 API 호출이 실패 시 조용히 무시됨).

## 1. D1 데이터베이스 준비

```bash
npx wrangler d1 create typingverse
# 출력된 database_id를 wrangler.toml의 REPLACE_WITH_D1_DATABASE_ID에 넣는다

npx wrangler d1 execute typingverse --file=./schema.sql --remote
```

## 2. 시크릿 설정

```bash
# 32바이트 이상 랜덤 문자열
openssl rand -base64 48

npx wrangler pages secret put AUTH_SECRET
```

> `AUTH_SECRET`이 바뀌면 기존 토큰이 전부 무효가 되어 사용자가 재등록된다.
> 로테이션이 필요하면 이전 키로도 검증하는 이중 키 기간을 먼저 두어야 한다.

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

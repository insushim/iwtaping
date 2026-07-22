# TypingVerse — 손끝으로 여는 무한한 세계

한글·영문 타자 연습 웹앱. 연습·테스트·게임에 성장 요소(XP·레벨·스트릭·퀘스트·리그)를 얹었다.

## 빠르게 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 정적 export(`out/`) + RSC 경로 평탄화 |
| `npm test` | Vitest 전체 실행 |
| `npm run typecheck` | 앱(`src/`)과 서버(`functions/`) 타입체크 |
| `npm run lint` | ESLint |

## 구조

```
src/
  app/            페이지 (연습 6종 · 테스트 3종 · 게임 6종 · 통계 · 랭킹 · 설정)
  components/     UI · 타이핑 영역 · 마스코트 · 퀘스트
  hooks/          useTypingEngine — 타이핑 상태기계(실사용 경로)
  lib/
    typing/       한글 오토마타 · 손가락 매핑 · 정확도 추적
    progress/     스트릭 · 리그 · 일일 퀘스트
    content/      지문 생성 · 취약 키 맞춤 드릴
    game/         캔버스 렌더러
  stores/         zustand 스토어
functions/        Cloudflare Pages Functions (/api/*)
  lib/            토큰 서명 · 점수 검증 · 재화 원장
schema.sql        D1 스키마
tests/            Vitest
```

## 백엔드

`functions/`가 배포되지 않아도 앱은 **로컬 전용 모드**로 완전히 동작한다.
백엔드를 붙이면 전국 순위·리그·계정 이관이 활성화된다. → [배포 가이드](docs/DEPLOYMENT.md)

## 설계 노트

- **정확도는 시도 단위로 센다.** 오타를 지우고 다시 쳐도 분모가 줄지 않는다
  (과거엔 정정하면 최종 정확도가 100%로 세탁됐다).
- **날짜는 항상 로컬 기준.** `toISOString()`은 UTC라 KST 자정~09시 활동이 전날로 밀린다.
  `lib/utils/helpers.ts`의 `getToday()`/`toDateKey()`만 쓸 것.
- **스트릭 원장은 하나.** `lib/progress/streak.ts`가 단일 진실원이며,
  스트릭은 **연습 세션 완료**로만 오른다(페이지 방문으로는 오르지 않는다).
- **순위 점수는 서버가 검증한다.** 물리 한계·타건 간격 분산·nonce 1회성으로
  자동 입력을 걸러내고, 애매한 건 거부 대신 보류(pending)로 둔다.
- **재화는 증분 연산만.** 절대값 덮어쓰기 금지, 모든 변경은 감사 로그와
  idempotency key를 남긴다.

## 문서

- [상용화 업그레이드 계획](docs/UPGRADE_PLAN.md)
- [배포 가이드](docs/DEPLOYMENT.md)
- [개인정보 처리방침 초안](docs/PRIVACY.md)

## 콘텐츠 라이선스

연습 지문은 **퍼블릭 도메인**(저작권 만료 작품·공문서)이거나 **자체 창작**만 사용한다.
보호 기간이 남은 작품은 출처를 표기하더라도 넣지 않는다(필사 목적은 인용의 정당한 범위로 보기 어렵다).

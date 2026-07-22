-- 주간 리그 정산 도입 마이그레이션
--
-- schema.sql은 `CREATE TABLE IF NOT EXISTS`라, **이미 league_members가 있는 DB에는
-- 새 컬럼을 추가해 주지 않는다**. 그 상태로 정산을 돌리면 `no such column: outcome`
-- 으로 기능 전체가 죽는다. 기존 DB에는 반드시 이 파일을 한 번 적용할 것.
--
--   npx wrangler d1 execute typingverse --file=./migrations/0001_league_settlement.sql --remote
--
-- 신규 DB(schema.sql을 이번 버전으로 처음 적용)에는 필요 없다.
-- SQLite의 ADD COLUMN에는 IF NOT EXISTS가 없어 이미 적용된 DB에 다시 돌리면
-- "duplicate column name" 오류가 난다 — 그 오류는 "이미 적용됨"이라는 뜻이다.

ALTER TABLE league_members ADD COLUMN final_rank INTEGER;
ALTER TABLE league_members ADD COLUMN outcome    TEXT;
ALTER TABLE league_members ADD COLUMN settled_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_league_unsettled ON league_members (week_key, outcome, tier, bucket);

CREATE TABLE IF NOT EXISTS league_standings (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier         INTEGER NOT NULL DEFAULT 0,
  updated_week TEXT NOT NULL,
  last_rank    INTEGER,
  last_outcome TEXT
);

CREATE TABLE IF NOT EXISTS league_settlements (
  week_key   TEXT PRIMARY KEY,
  status     TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  settled_at INTEGER,
  members    INTEGER NOT NULL DEFAULT 0,
  promoted   INTEGER NOT NULL DEFAULT 0,
  demoted    INTEGER NOT NULL DEFAULT 0
);

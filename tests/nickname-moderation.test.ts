import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkNickname,
  normalizeNickname,
  BANNED_SUBSTRINGS,
  BANNED_SHORT,
} from '../functions/lib/nickname';
import { looksLikeRealName } from '@/lib/moderation/nickname';

/**
 * 닉네임은 전국 순위·리그에 그대로 걸리는 유일한 사용자 입력이다.
 * 초등학생이 쓰는 서비스라, 여기가 뚫리면 욕설이 공개 순위표에 박힌다.
 */

describe('닉네임 — 막아야 하는 것', () => {
  const shouldBlock = [
    // 노골적인 욕설
    '씨발', '시발놈', '개새끼', '병신아', '좆같아', '지랄맨', '엠창인생', '느금마',
    // 숫자·밑줄로 우회
    '시1발', '병_신', '개1새1끼', 'sh1t', 'b1tch', 'f0ck',
    // 성적 표현
    '섹스킹', '야동대장', '자위왕', '보지', '변태왕', 'sexy걸',
    // 비하
    '깜둥이', '쪽바리', '저능아', '벙어리', '정신병자',
    // 사칭
    '관리자', '운영자님', 'admin', 'ADMIN', 'official', '타이핑버스',
    // 영어 욕설
    'fuck', 'FuckYou', 'bitch', 'asshole', 'nigger',
    // 짧은 금칙어가 다른 글자에 붙은 형태 — 낱말경계 정규식이 무력해 뚫렸던 자리
    // (교차검증 3계열이 독립적으로 같은 구멍을 지적했다)
    'sex킹', '강아지sex', 'assking', 'ass왕', 'gay머신', 'cock대장',
    // 한글 한 글자 금칙어끼리 붙인 형태
    '씹년', '년놈', '놈년', '개씹', '섹년', '씹놈',
  ];

  for (const n of shouldBlock) {
    it(`"${n}" 을 거절한다`, () => {
      expect(checkNickname(n)).toEqual({ ok: false, error: 'nickname_banned' });
    });
  }
});

describe('닉네임 — 통과해야 하는 것(오차단 감시)', () => {
  const shouldPass = [
    '타자왕', '번개손가락', '초코송이', '달리는햄스터', 'TypingHero', 'speed_99',
    '홍길동전', '민트초코', '별똥별', 'password', 'classic', 'glasses',
    '수학왕', '독서왕', '1등하자', '화이팅', 'Sunny2024',
  ];

  for (const n of shouldPass) {
    it(`"${n}" 을 통과시킨다`, () => {
      expect(checkNickname(n).ok, `${n} 이 잘못 차단됨`).toBe(true);
    });
  }
});

describe('닉네임 — 형식', () => {
  it('한 글자·13자·특수문자는 형식 오류', () => {
    expect(checkNickname('가')).toEqual({ ok: false, error: 'nickname_format' });
    expect(checkNickname('가'.repeat(13))).toEqual({ ok: false, error: 'nickname_format' });
    expect(checkNickname('타자왕!')).toEqual({ ok: false, error: 'nickname_format' });
    expect(checkNickname('ㅅㅂ')).toEqual({ ok: false, error: 'nickname_format' }); // 자모는 애초에 불가
  });

  it('문자열이 아니면 거절', () => {
    expect(checkNickname(null)).toEqual({ ok: false, error: 'nickname_required' });
    expect(checkNickname(123)).toEqual({ ok: false, error: 'nickname_required' });
  });
});

describe('우회 정규화', () => {
  it('숫자·밑줄을 걷어낸 형태와 leet 치환 형태를 모두 본다', () => {
    const f = normalizeNickname('Sh1T_99');
    expect(f.stripped).toBe('sht');
    // leet은 매핑에 있는 숫자만 바꾼다(9는 그대로) — 부분일치라 'shit'을 품으면 걸린다.
    expect(f.leet).toBe('shit99');
    expect(checkNickname('Sh1T_99')).toEqual({ ok: false, error: 'nickname_banned' });
  });
});

describe('실명 감지(경고용, 차단 아님)', () => {
  it('성씨 + 두 글자는 실명으로 본다', () => {
    for (const n of ['김민수', '이서연', '박지훈']) expect(looksLikeRealName(n)).toBe(true);
  });

  it('성씨로 시작해도 별명이면 통과 — 3글자가 아니면 보지 않는다', () => {
    for (const n of ['강아지왕', '문어킹덤', '타자왕', 'TypingKing']) {
      expect(looksLikeRealName(n)).toBe(false);
    }
  });

  it('실명처럼 보여도 checkNickname은 막지 않는다(경고만)', () => {
    expect(checkNickname('김민수').ok).toBe(true);
  });
});

describe('금칙어 목록은 서버에만 있다', () => {
  /**
   * 목록이 클라이언트 번들에 실리면 아이들 앱 소스에 욕설 목록이 그대로 박힌다.
   * src/ 어디에서도 이 목록을 import하지 않는지 감시한다.
   */
  const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

  it('클라이언트 모듈에는 금칙어가 없다', () => {
    const client = read('src/lib/moderation/nickname.ts');
    expect(client).not.toContain('BANNED_SUBSTRINGS');
    for (const w of ['씨발', 'fuck', '섹스']) expect(client).not.toContain(w);
  });

  it('src의 어떤 파일도 서버 금칙어 모듈을 가져오지 않는다', () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(path.resolve(__dirname, '..', dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
      );
    const offenders = walk('src')
      .filter((f) => /\.(ts|tsx)$/.test(f))
      // 주석에 경로를 적는 건 괜찮다 — 실제 import 문만 본다.
      .filter((f) => /(from|import|require)\s*\(?\s*['"][^'"]*functions\/lib\/nickname['"]/.test(read(f)));
    expect(offenders, `서버 금칙어 모듈을 import하는 파일: ${offenders.join(', ')}`).toEqual([]);
  });

  it('목록에 중복이 없다', () => {
    expect(new Set(BANNED_SUBSTRINGS).size).toBe(BANNED_SUBSTRINGS.length);
    expect(new Set(BANNED_SHORT).size).toBe(BANNED_SHORT.length);
    expect(BANNED_SUBSTRINGS.length).toBeGreaterThan(100);
    // 두 목록에 같은 말이 있으면 뒤쪽(SHORT)은 영원히 도달하지 못하는 죽은 코드가 된다.
    const cross = BANNED_SHORT.filter((w) => (BANNED_SUBSTRINGS as readonly string[]).includes(w));
    expect(cross, `두 목록에 겹치는 말: ${cross.join(', ')}`).toEqual([]);
  });
});

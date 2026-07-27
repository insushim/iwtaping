import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  selectWeakKeys,
  buildKoreanDrill,
  buildEnglishDrill,
  buildDrill,
  weakestFinger,
  fingersForKeys,
  DRILL_WORD_POOLS,
} from '@/lib/content/adaptive-drill';
import { FingerType } from '@/types/typing';

describe('취약 키 선별', () => {
  it('정확도가 낮은 키를 먼저 고른다', () => {
    const weak = selectWeakKeys({ ㄱ: 99, ㄴ: 60, ㄷ: 75, ㄹ: 100 }, []);
    expect(weak[0]).toBe('ㄴ');
    expect(weak).toContain('ㄷ');
    expect(weak).not.toContain('ㄹ'); // 100%는 제외
  });

  it('problemKeys를 우선 반영한다', () => {
    const weak = selectWeakKeys({ ㅁ: 92 }, ['ㅋ']);
    expect(weak[0]).toBe('ㅋ');
  });

  it('중복 없이 상한만큼만 돌려준다', () => {
    const acc: Record<string, number> = {};
    for (const k of 'abcdefghij') acc[k] = 50;
    const weak = selectWeakKeys(acc, ['a', 'a', 'b'], 4);
    expect(weak).toHaveLength(4);
    expect(new Set(weak).size).toBe(4);
  });

  it('빈 키(공백만)는 무시한다', () => {
    expect(selectWeakKeys({ '': 10 }, [''])).toHaveLength(0);
  });
});

describe('한글 드릴 생성', () => {
  it('생성된 지문은 전부 완성형 한글이거나 공백이다', () => {
    const drill = buildKoreanDrill(['ㄱ', 'ㅏ'], 10);
    expect(drill.length).toBeGreaterThan(0);
    for (const ch of drill) {
      if (ch === ' ') continue;
      const code = ch.charCodeAt(0);
      expect(code).toBeGreaterThanOrEqual(0xac00);
      expect(code).toBeLessThanOrEqual(0xd7a3);
    }
  });

  it('취약 키가 지문에 실제로 더 자주 등장한다', () => {
    const targeted = buildKoreanDrill(['ㅋ'], 40);
    const generic = buildKoreanDrill([], 40);
    const countCho = (text: string) =>
      [...text].filter((ch) => {
        const code = ch.charCodeAt(0);
        if (code < 0xac00 || code > 0xd7a3) return false;
        return Math.floor((code - 0xac00) / (21 * 28)) === 15; // ㅋ의 초성 인덱스
      }).length;
    expect(countCho(targeted)).toBeGreaterThan(countCho(generic));
  });

  it('데이터가 없어도 지문을 만든다', () => {
    expect(buildKoreanDrill([], 5).split(' ')).toHaveLength(5);
  });

  it('새 지문을 받으면 실제로 다른 지문이 나온다', () => {
    // salt를 인자로 넘기지 않던 시절엔 '새 지문 받기'가 같은 지문을 다시 만들었다.
    expect(buildDrill(['ㅋ'], 'ko', 12, 0)).not.toBe(buildDrill(['ㅋ'], 'ko', 12, 1));
  });
});

/**
 * 자모를 무작위 조합하던 시절엔 받침 없는 2~3음절이 실제 낱말이 될 수 있어
 * '체위'·'에로'·'야매' 같은 부적절어가 우연히 만들어졌다(4만 회 시뮬레이션 실측).
 * 지금은 검수된 낱말 목록에서만 고른다 — 그 계약을 지키는 래칫이다.
 */
describe('드릴 지문 안전성', () => {
  // 차단목록의 마지막 절(6차)은 끝말잇기 사전에서 걷어낸 '조각·방언 표제어'로,
  // 안전 문제가 아니라 품질 정리다('한과'·'보라'처럼 멀쩡한 낱말이 들어 있다).
  // 여기서 보는 것은 안전 목록뿐이므로 그 절 앞까지만 읽는다.
  const lines = fs
    .readFileSync(path.resolve(__dirname, '../scripts/dictionary-blocklist.txt'), 'utf8')
    .split('\n');
  const cut = lines.findIndex((l) => l.includes('조각·방언'));
  const blocklist = new Set(
    lines
      .slice(0, cut < 0 ? lines.length : cut)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  );

  it('낱말 목록 자체에 차단어가 없다', () => {
    const leaked = [...DRILL_WORD_POOLS.ko, ...DRILL_WORD_POOLS.en].filter((w) => blocklist.has(w));
    expect(leaked, `드릴 낱말 목록에 차단어: ${leaked.join(' ')}`).toEqual([]);
  });

  it('어떤 취약 키 조합으로도 목록 밖 문자열은 나오지 않는다', () => {
    const ko = new Set(DRILL_WORD_POOLS.ko);
    const en = new Set(DRILL_WORD_POOLS.en);
    const jamo = [...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅓㅔㅕㅗㅛㅜㅠㅡㅣ'];
    const letters = [...'abcdefghijklmnopqrstuvwxyz'];
    for (let salt = 0; salt < 20; salt++) {
      for (const k of jamo) {
        for (const w of buildKoreanDrill([k], 24, salt).split(' ')) {
          expect(ko.has(w), `목록에 없는 한글 낱말: ${w}`).toBe(true);
        }
      }
      for (const k of letters) {
        for (const w of buildEnglishDrill([k], 24, salt).split(' ')) {
          expect(en.has(w), `목록에 없는 영어 낱말: ${w}`).toBe(true);
        }
      }
    }
  });
});

describe('영문 드릴 생성', () => {
  it('취약 키가 더 자주 등장한다', () => {
    const targeted = buildEnglishDrill(['z'], 40);
    const generic = buildEnglishDrill([], 40);
    const countZ = (t: string) => [...t].filter((c) => c === 'z').length;
    expect(countZ(targeted)).toBeGreaterThan(countZ(generic));
  });

  it('영문 소문자와 공백만 포함한다', () => {
    expect(buildEnglishDrill(['a'], 12)).toMatch(/^[a-z ]+$/);
  });
});

describe('손가락 분석', () => {
  it('가장 약한 손가락을 찾는다', () => {
    const acc = { 'left-pinky': 80, 'right-index': 95, thumb: 100 } as Record<FingerType, number>;
    expect(weakestFinger(acc)).toBe('left-pinky');
  });

  it('전부 100%면 지목하지 않는다', () => {
    expect(weakestFinger({ 'left-pinky': 100, thumb: 100 } as Record<FingerType, number>)).toBeNull();
  });

  it('취약 키가 속한 손가락을 매핑한다', () => {
    expect(fingersForKeys(['ㄱ'])).toContain('left-index'); // KeyR
    expect(fingersForKeys(['ㅏ'])).toContain('right-middle'); // KeyK
  });
});

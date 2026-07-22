import { describe, it, expect } from 'vitest';
import {
  selectWeakKeys,
  buildKoreanDrill,
  buildEnglishDrill,
  composeSyllable,
  weakestFinger,
  fingersForKeys,
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
  it('초성+중성으로 올바른 음절을 조합한다', () => {
    expect(composeSyllable('ㄱ', 'ㅏ')).toBe('가');
    expect(composeSyllable('ㅎ', 'ㅣ')).toBe('히');
    expect(composeSyllable('X', 'ㅏ')).toBe('');
  });

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

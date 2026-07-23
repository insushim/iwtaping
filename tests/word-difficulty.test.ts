import { describe, it, expect } from 'vitest';
import { wordGenerator } from '@/lib/content/word-generator';

/**
 * 난이도 점진 강화의 핵심: 레벨이 오르면 더 긴(어려운) 단어가 나와야 한다.
 * getUniqueWord(pool, minLen)이 길이 편향을 실제로 적용하는지, 그리고
 * 긴 단어가 없을 때 안전하게 폴백하는지(크래시 0)를 고정한다.
 */
describe('getUniqueWord 길이 편향(난이도 램프)', () => {
  const mixed = ['가', 'ab', '나다', 'abc', '라마바', 'abcde', '가나다라', 'abcdef'];

  it('minLen 이상 단어를 우선 선택한다', () => {
    wordGenerator.reset();
    for (let i = 0; i < 80; i++) {
      const w = wordGenerator.getUniqueWord(mixed, 5);
      expect(w.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('레벨이 오를수록 선택 단어의 평균 길이가 길어진다', () => {
    const avg = (minLen: number) => {
      wordGenerator.reset();
      let sum = 0;
      const n = 200;
      for (let i = 0; i < n; i++) sum += wordGenerator.getUniqueWord(mixed, minLen).length;
      return sum / n;
    };
    expect(avg(4)).toBeGreaterThan(avg(0)); // 후반(floor↑)이 초반(floor 0)보다 길다
  });

  it('충분히 긴 단어가 없으면 폴백한다(크래시 없이 단어 반환)', () => {
    wordGenerator.reset();
    const w = wordGenerator.getUniqueWord(['ab', 'abc'], 10);
    expect(typeof w).toBe('string');
    expect(w.length).toBeGreaterThan(0);
  });

  it('minLen 0이면 기존 동작을 유지한다', () => {
    wordGenerator.reset();
    expect(wordGenerator.getUniqueWord(['only'], 0)).toBe('only');
  });
});

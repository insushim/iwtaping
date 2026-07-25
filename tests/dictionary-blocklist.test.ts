import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { koreanDictionary } from '@/data/korean/words-dictionary';

/**
 * 사전을 재생성하면 원본(표준국어대사전 표제어)의 부적절어가 되돌아온다.
 * 이 테스트가 그 회귀를 잡는 래칫이다 — 실패하면
 * `node scripts/filter-dictionary.mjs`를 재생성 파이프라인 마지막에 태울 것.
 */
const blocklist = fs
  .readFileSync(path.resolve(__dirname, '../scripts/dictionary-blocklist.txt'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

describe('끝말잇기 사전 부적절어 차단', () => {
  it('blocklist가 비어 있지 않다', () => {
    expect(blocklist.length).toBeGreaterThan(50);
    expect(new Set(blocklist).size).toBe(blocklist.length); // 중복 없음
  });

  it('사전에 차단어가 하나도 없다', () => {
    const dict = new Set(koreanDictionary);
    const leaked = blocklist.filter((w) => dict.has(w));
    expect(leaked, `차단어가 사전에 남아 있습니다: ${leaked.join(' ')}`).toEqual([]);
  });

  it('정확일치로만 걸러 멀쩡한 단어는 살아 있다', () => {
    // 부분일치 필터로 바꾸면 전부 사라지는 단어들 — 회귀 감시용
    const dict = new Set(koreanDictionary);
    for (const w of ['설거지', '별똥별', '대변인', '유니섹스', '정사각형', '본거지']) {
      expect(dict.has(w), `${w}가 사라졌습니다 — 부분일치 필터를 쓴 것은 아닌지 확인`).toBe(true);
    }
  });

  it('막다른 단어 비율이 1% 미만이다', () => {
    const firsts = new Set(koreanDictionary.map((w) => w[0]));
    const dead = koreanDictionary.filter((w) => !firsts.has(w[w.length - 1]));
    expect(dead.length / koreanDictionary.length).toBeLessThan(0.01);
  });
});

import { FingerType } from '@/types/typing';
import { getCodeForChar, getFingerForKey } from '@/lib/typing/finger-mapper';
import { getJamoSequence } from '@/lib/typing/korean-automata';
import { koreanWordsBeginner } from '@/data/korean/words-beginner';
import { koreanWordsIntermediate } from '@/data/korean/words-intermediate';
import { koreanWordsAdvanced } from '@/data/korean/words-advanced';
import { englishCommon1000 } from '@/data/english/words-common1000';

/**
 * 취약 키 맞춤 드릴 (Keybr식 적응형 연습).
 *
 * P0에서 AccuracyTracker를 실사용 경로에 배선하면서 keyAccuracy/problemKeys가
 * 실제로 쌓이기 시작했다. 이 모듈은 그 데이터를 받아 "못 치는 키가 자주 나오는"
 * 연습 지문을 만든다. 무작위 연습보다 교정 속도가 빠르다.
 *
 * **드릴 단어는 검수된 낱말 목록에서만 고른다.** 예전에는 자모를 무작위로 조합해
 * 없는 낱말을 만들었는데(keybr 방식), 받침 없는 2~3음절은 실제 낱말이 될 수 있어
 * 부적절어가 우연히 만들어졌다(무작위 4만 회 시뮬레이션에서 '체위'·'에로'·'야매'
 * 등 적중, '새끼'도 이 방식으로 만들어진다). 초등학생이 쓰는 서비스라 "뜻 없는
 * 글자를 자유롭게 조합하는" 편의보다 안전을 택한다. 뜻이 있는 낱말이라 읽으면서
 * 치게 되는 부수 효과도 있다.
 */

/** 검수를 마친 낱말만 — 여기 없는 문자열은 지문에 나올 수 없다. */
const KOREAN_POOL: readonly string[] = [
  ...koreanWordsBeginner,
  ...koreanWordsIntermediate,
  ...koreanWordsAdvanced,
];
const ENGLISH_POOL: readonly string[] = englishCommon1000
  .map((w) => w.toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w));

export interface KeyStat {
  key: string;
  accuracy: number;
}

/**
 * 정확도가 낮은 키를 골라낸다.
 * 표본이 적은 키의 우연한 실수를 붙잡지 않도록 threshold를 넉넉히 둔다.
 */
export function selectWeakKeys(
  keyAccuracy: Record<string, number>,
  problemKeys: string[],
  limit = 6
): string[] {
  const fromProblems = problemKeys.filter((k) => k.trim().length > 0);
  const ranked = Object.entries(keyAccuracy)
    .filter(([key, acc]) => key.trim().length > 0 && acc < 95)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key);

  const merged: string[] = [];
  for (const key of [...fromProblems, ...ranked]) {
    if (!merged.includes(key)) merged.push(key);
    if (merged.length >= limit) break;
  }
  return merged;
}

/**
 * 회차(salt)마다 다른 순서로 낱말을 꺼낸다.
 * 고정 stride로 뽑으면 목록 길이와 맞물려 같은 낱말만 되풀이된다 — 결정론적
 * 셔플이면 회차마다 순서가 바뀌면서도 같은 회차는 항상 같은 지문이 된다.
 */
function drawWords(pool: readonly string[], count: number, salt: number): string[] {
  if (!pool.length) return [];
  const order = pool.map((_, i) => i);
  let seed = ((salt + 1) * 2654435761) % 2147483647;
  for (let i = order.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(pool[order[i % order.length]]);
  return out;
}

/**
 * 취약 자모가 밀도 높게 든 낱말을 앞에서부터 고른다.
 * 상위권만 쓰면 매번 같은 낱말이 나오므로 후보를 넉넉히 잡고 회차별로 섞는다.
 */
function targetedPool(
  pool: readonly string[],
  weak: Set<string>,
  unitsOf: (word: string) => string[],
  count: number
): readonly string[] {
  if (!weak.size) return pool;
  const scored = pool
    .map((word) => {
      const units = unitsOf(word);
      const hits = units.filter((u) => weak.has(u)).length;
      return { word, ratio: units.length ? hits / units.length : 0, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.ratio - a.ratio || b.hits - a.hits);
  if (!scored.length) return pool; // 취약 키가 든 낱말이 없으면 일반 연습으로
  return scored.slice(0, Math.max(count * 3, 45)).map((s) => s.word);
}

/** 취약 키가 자주 나오는 한글 낱말 드릴 */
export function buildKoreanDrill(weakKeys: string[], wordCount = 24, salt = 0): string {
  const weak = new Set(weakKeys.filter((k) => /[ㄱ-ㅎㅏ-ㅣ]/.test(k)));
  return drawWords(targetedPool(KOREAN_POOL, weak, getJamoSequence, wordCount), wordCount, salt).join(' ');
}

/** 취약 키가 자주 나오는 영어 낱말 드릴 */
export function buildEnglishDrill(weakKeys: string[], wordCount = 24, salt = 0): string {
  const weak = new Set(
    weakKeys.filter((k) => /^[a-zA-Z]$/.test(k)).map((k) => k.toLowerCase())
  );
  return drawWords(targetedPool(ENGLISH_POOL, weak, (w) => [...w], wordCount), wordCount, salt).join(' ');
}

export function buildDrill(
  weakKeys: string[],
  language: 'ko' | 'en' = 'ko',
  wordCount = 24,
  salt = 0
): string {
  return language === 'ko'
    ? buildKoreanDrill(weakKeys, wordCount, salt)
    : buildEnglishDrill(weakKeys, wordCount, salt);
}

/** 손가락별 정확도에서 가장 약한 손가락을 찾는다(히트맵 요약용) */
export function weakestFinger(fingerAccuracy: Record<FingerType, number>): FingerType | null {
  const entries = Object.entries(fingerAccuracy) as [FingerType, number][];
  const scored = entries.filter(([, acc]) => acc < 100);
  if (!scored.length) return null;
  return scored.sort((a, b) => a[1] - b[1])[0][0];
}

/** 취약 키들이 어느 손가락에 몰려 있는지 — "왼손 약지가 약해요" 같은 피드백용 */
export function fingersForKeys(keys: string[]): FingerType[] {
  const fingers = new Set<FingerType>();
  for (const key of keys) {
    const code = getCodeForChar(key);
    if (code) fingers.add(getFingerForKey(code));
  }
  return [...fingers];
}

export const FINGER_LABELS: Record<FingerType, string> = {
  'left-pinky': '왼손 새끼손가락',
  'left-ring': '왼손 약지',
  'left-middle': '왼손 중지',
  'left-index': '왼손 검지',
  'right-index': '오른손 검지',
  'right-middle': '오른손 중지',
  'right-ring': '오른손 약지',
  'right-pinky': '오른손 새끼손가락',
  thumb: '엄지',
};

/** 지문에 쓰이는 낱말 목록(테스트·검증용) */
export const DRILL_WORD_POOLS = { ko: KOREAN_POOL, en: ENGLISH_POOL };

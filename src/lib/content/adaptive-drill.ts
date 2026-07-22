import { FingerType } from '@/types/typing';
import { getCodeForChar, getFingerForKey } from '@/lib/typing/finger-mapper';

/**
 * 취약 키 맞춤 드릴 (Keybr식 적응형 연습).
 *
 * P0에서 AccuracyTracker를 실사용 경로에 배선하면서 keyAccuracy/problemKeys가
 * 실제로 쌓이기 시작했다. 이 모듈은 그 데이터를 받아 "못 치는 키가 자주 나오는"
 * 연습 지문을 만든다. 무작위 연습보다 교정 속도가 빠르다.
 */

const KOREAN_JAMO = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const KOREAN_VOWELS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];

/** 초성+중성으로 한글 음절 조합 */
export function composeSyllable(cho: string, jung: string): string {
  const ci = CHO.indexOf(cho);
  const ji = JUNG.indexOf(jung);
  if (ci < 0 || ji < 0) return '';
  return String.fromCharCode(0xac00 + (ci * 21 + ji) * 28);
}

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
 * 취약 문자를 "보장된 비율"로 배치한다.
 *
 * 풀에 취약 키를 여러 번 넣고 modulo로 뽑는 방식은, 결정론적 stride와
 * 풀 길이가 맞물리면 취약 키를 계속 건너뛸 수 있다(테스트로 실측 확인).
 * 그래서 자리마다 취약/일반을 명시적으로 번갈아 고른다.
 */
const WEAK_RATIO = 2; // 2자리마다 1자리는 반드시 취약 키

function pickAt(weak: string[], generic: string[], index: number, salt: number): string {
  if (weak.length && index % WEAK_RATIO === 0) {
    return weak[(index / WEAK_RATIO + salt) % weak.length | 0];
  }
  return generic[(index * 7 + salt * 3) % generic.length];
}

/** 취약 키가 섞인 한글 음절 드릴을 만든다. */
export function buildKoreanDrill(weakKeys: string[], wordCount = 24): string {
  const weakCho = weakKeys.filter((k) => CHO.includes(k));
  const weakJung = weakKeys.filter((k) => JUNG.includes(k));

  const words: string[] = [];
  let syllableIndex = 0;

  for (let i = 0; i < wordCount; i++) {
    const length = 2 + (i % 2);
    let word = '';
    for (let j = 0; j < length; j++) {
      const cho = pickAt(weakCho, KOREAN_JAMO, syllableIndex, i);
      const jung = pickAt(weakJung, KOREAN_VOWELS, syllableIndex, i + 1);
      word += composeSyllable(cho, jung) || composeSyllable('ㄱ', 'ㅏ');
      syllableIndex++;
    }
    words.push(word);
  }
  return words.join(' ');
}

/** 취약 키가 섞인 영문 드릴 */
export function buildEnglishDrill(weakKeys: string[], wordCount = 24): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const weak = weakKeys.filter((k) => /^[a-z]$/i.test(k)).map((k) => k.toLowerCase());

  const words: string[] = [];
  let letterIndex = 0;

  for (let i = 0; i < wordCount; i++) {
    const length = 3 + (i % 3);
    let word = '';
    for (let j = 0; j < length; j++) {
      word += pickAt(weak, letters, letterIndex, i);
      letterIndex++;
    }
    words.push(word);
  }
  return words.join(' ');
}

export function buildDrill(
  weakKeys: string[],
  language: 'ko' | 'en' = 'ko',
  wordCount = 24
): string {
  return language === 'ko' ? buildKoreanDrill(weakKeys, wordCount) : buildEnglishDrill(weakKeys, wordCount);
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
  'left-pinky': '왼손 새끼',
  'left-ring': '왼손 약지',
  'left-middle': '왼손 중지',
  'left-index': '왼손 검지',
  'right-index': '오른손 검지',
  'right-middle': '오른손 중지',
  'right-ring': '오른손 약지',
  'right-pinky': '오른손 새끼',
  thumb: '엄지',
};

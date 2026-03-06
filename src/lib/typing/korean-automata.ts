// Korean Dubeolsik (두벌식) Automata Engine
// Handles jamo composition/decomposition for real-time typing comparison

const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// Compound jongseong split table: compound -> [first, second]
const COMPOUND_JONG: Record<string, [string, string]> = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

// Compound vowel composition table
const COMPOUND_JUNG: Record<string, Record<string, string>> = {
  'ㅗ': { 'ㅏ': 'ㅘ', 'ㅐ': 'ㅙ', 'ㅣ': 'ㅚ' },
  'ㅜ': { 'ㅓ': 'ㅝ', 'ㅔ': 'ㅞ', 'ㅣ': 'ㅟ' },
  'ㅡ': { 'ㅣ': 'ㅢ' },
};

// Compound jongseong composition table
const COMPOUND_JONG_COMPOSE: Record<string, Record<string, string>> = {
  'ㄱ': { 'ㅅ': 'ㄳ' },
  'ㄴ': { 'ㅈ': 'ㄵ', 'ㅎ': 'ㄶ' },
  'ㄹ': { 'ㄱ': 'ㄺ', 'ㅁ': 'ㄻ', 'ㅂ': 'ㄼ', 'ㅅ': 'ㄽ', 'ㅌ': 'ㄾ', 'ㅍ': 'ㄿ', 'ㅎ': 'ㅀ' },
  'ㅂ': { 'ㅅ': 'ㅄ' },
};

export function isChoseong(ch: string): boolean {
  return CHO_LIST.includes(ch);
}

export function isJungseong(ch: string): boolean {
  return JUNG_LIST.includes(ch);
}

export function isJongseong(ch: string): boolean {
  return JONG_LIST.includes(ch) && ch !== '';
}

export function composeHangul(cho: number, jung: number, jong: number = 0): string {
  return String.fromCharCode(0xAC00 + cho * 21 * 28 + jung * 28 + jong);
}

export function decomposeHangul(char: string): { cho: number; jung: number; jong: number } | null {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const offset = code - 0xAC00;
  return {
    cho: Math.floor(offset / (21 * 28)),
    jung: Math.floor((offset % (21 * 28)) / 28),
    jong: offset % 28,
  };
}

export function getJamoSequence(text: string): string[] {
  const result: string[] = [];
  for (const char of text) {
    const decomposed = decomposeHangul(char);
    if (decomposed) {
      result.push(CHO_LIST[decomposed.cho]);
      result.push(JUNG_LIST[decomposed.jung]);
      if (decomposed.jong > 0) {
        const jongChar = JONG_LIST[decomposed.jong];
        if (COMPOUND_JONG[jongChar]) {
          result.push(...COMPOUND_JONG[jongChar]);
        } else {
          result.push(jongChar);
        }
      }
    } else {
      const code = char.charCodeAt(0);
      if (code >= 0x3131 && code <= 0x3163) {
        result.push(char);
      } else {
        result.push(char);
      }
    }
  }
  return result;
}

// Compare partial Korean input with target
export function compareKoreanPartial(target: string, input: string): {
  correctCount: number;
  isPartialMatch: boolean;
  isComplete: boolean;
} {
  const targetJamo = getJamoSequence(target);
  const inputJamo = getJamoSequence(input);

  let correctCount = 0;
  let isPartialMatch = true;

  for (let i = 0; i < inputJamo.length; i++) {
    if (i >= targetJamo.length) {
      isPartialMatch = false;
      break;
    }
    if (inputJamo[i] === targetJamo[i]) {
      correctCount++;
    } else {
      isPartialMatch = false;
      break;
    }
  }

  return {
    correctCount,
    isPartialMatch,
    isComplete: isPartialMatch && inputJamo.length === targetJamo.length,
  };
}

// Get intermediate composition states for a Korean character
export function getCompositionStates(char: string): string[] {
  const decomposed = decomposeHangul(char);
  if (!decomposed) return [char];

  const states: string[] = [];
  const cho = decomposed.cho;
  const jung = decomposed.jung;
  const jong = decomposed.jong;

  // State 1: Just cho (shown as standalone jamo)
  states.push(CHO_LIST[cho]);

  // State 2: cho + jung (complete syllable without jongseong)
  states.push(composeHangul(cho, jung, 0));

  // State 3: if jongseong exists, cho + jung + jong
  if (jong > 0) {
    const jongChar = JONG_LIST[jong];
    if (COMPOUND_JONG[jongChar]) {
      // First part of compound jongseong
      const [first] = COMPOUND_JONG[jongChar];
      const firstIdx = JONG_LIST.indexOf(first);
      if (firstIdx > 0) {
        states.push(composeHangul(cho, jung, firstIdx));
      }
    }
    states.push(composeHangul(cho, jung, jong));
  }

  return states;
}

// Check if current composing input matches the target at position
export function isComposingMatch(
  targetText: string,
  completedInput: string,
  composingText: string,
  currentIndex: number
): { isCorrect: boolean; isPartial: boolean } {
  if (currentIndex >= targetText.length) {
    return { isCorrect: false, isPartial: false };
  }

  const targetChar = targetText[currentIndex];
  const targetDecomposed = decomposeHangul(targetChar);
  const inputDecomposed = decomposeHangul(composingText);

  if (!targetDecomposed || !inputDecomposed) {
    return { isCorrect: composingText === targetChar, isPartial: false };
  }

  // Check if composing text matches the beginning of the target character
  const targetJamo = getJamoSequence(targetChar);
  const inputJamo = getJamoSequence(composingText);

  let matches = true;
  for (let i = 0; i < inputJamo.length; i++) {
    if (i >= targetJamo.length || inputJamo[i] !== targetJamo[i]) {
      matches = false;
      break;
    }
  }

  return {
    isCorrect: matches && inputJamo.length === targetJamo.length,
    isPartial: matches && inputJamo.length < targetJamo.length,
  };
}

export { CHO_LIST, JUNG_LIST, JONG_LIST, COMPOUND_JONG };

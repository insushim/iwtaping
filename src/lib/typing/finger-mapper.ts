import { FingerType } from '@/types/typing';

// QWERTY finger mapping (physical key codes)
const FINGER_MAP: Record<string, FingerType> = {
  // Number row
  'Backquote': 'left-pinky', 'Digit1': 'left-pinky', 'Digit2': 'left-ring',
  'Digit3': 'left-middle', 'Digit4': 'left-index', 'Digit5': 'left-index',
  'Digit6': 'right-index', 'Digit7': 'right-index', 'Digit8': 'right-middle',
  'Digit9': 'right-ring', 'Digit0': 'right-pinky', 'Minus': 'right-pinky',
  'Equal': 'right-pinky',

  // Top row
  'Tab': 'left-pinky', 'KeyQ': 'left-pinky', 'KeyW': 'left-ring',
  'KeyE': 'left-middle', 'KeyR': 'left-index', 'KeyT': 'left-index',
  'KeyY': 'right-index', 'KeyU': 'right-index', 'KeyI': 'right-middle',
  'KeyO': 'right-ring', 'KeyP': 'right-pinky', 'BracketLeft': 'right-pinky',
  'BracketRight': 'right-pinky', 'Backslash': 'right-pinky',

  // Home row
  'CapsLock': 'left-pinky', 'KeyA': 'left-pinky', 'KeyS': 'left-ring',
  'KeyD': 'left-middle', 'KeyF': 'left-index', 'KeyG': 'left-index',
  'KeyH': 'right-index', 'KeyJ': 'right-index', 'KeyK': 'right-middle',
  'KeyL': 'right-ring', 'Semicolon': 'right-pinky', 'Quote': 'right-pinky',

  // Bottom row
  'ShiftLeft': 'left-pinky', 'KeyZ': 'left-pinky', 'KeyX': 'left-ring',
  'KeyC': 'left-middle', 'KeyV': 'left-index', 'KeyB': 'left-index',
  'KeyN': 'right-index', 'KeyM': 'right-index', 'Comma': 'right-middle',
  'Period': 'right-ring', 'Slash': 'right-pinky', 'ShiftRight': 'right-pinky',

  // Space and modifiers
  'Space': 'thumb',
  'Enter': 'right-pinky',
  'Backspace': 'right-pinky',
};

export function getFingerForKey(code: string): FingerType {
  return FINGER_MAP[code] || 'right-index';
}

// 두벌식 자모 → 물리 키코드 (역매핑). 손가락 통계 수집용.
const JAMO_TO_CODE: Record<string, string> = {
  ㅂ: 'KeyQ', ㅈ: 'KeyW', ㄷ: 'KeyE', ㄱ: 'KeyR', ㅅ: 'KeyT',
  ㅛ: 'KeyY', ㅕ: 'KeyU', ㅑ: 'KeyI', ㅐ: 'KeyO', ㅔ: 'KeyP',
  ㅁ: 'KeyA', ㄴ: 'KeyS', ㅇ: 'KeyD', ㄹ: 'KeyF', ㅎ: 'KeyG',
  ㅗ: 'KeyH', ㅓ: 'KeyJ', ㅏ: 'KeyK', ㅣ: 'KeyL',
  ㅋ: 'KeyZ', ㅌ: 'KeyX', ㅊ: 'KeyC', ㅍ: 'KeyV',
  ㅠ: 'KeyB', ㅜ: 'KeyN', ㅡ: 'KeyM',
  // 겹자음/겹모음은 기본 자모 키 기준으로 귀속
  ㅃ: 'KeyQ', ㅉ: 'KeyW', ㄸ: 'KeyE', ㄲ: 'KeyR', ㅆ: 'KeyT',
  ㅒ: 'KeyO', ㅖ: 'KeyP',
};

const PUNCT_TO_CODE: Record<string, string> = {
  ' ': 'Space', ',': 'Comma', '.': 'Period', '/': 'Slash', ';': 'Semicolon',
  "'": 'Quote', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash',
  '-': 'Minus', '=': 'Equal', '`': 'Backquote', '\n': 'Enter',
};

/**
 * 실제로 눌렀을 물리 키코드를 문자로부터 추정한다.
 * 한글 완성자는 자모 분해가 선행되어야 하므로 자모 단위로 호출할 것.
 */
export function getCodeForChar(char: string): string | null {
  if (!char) return null;
  if (PUNCT_TO_CODE[char]) return PUNCT_TO_CODE[char];
  if (JAMO_TO_CODE[char]) return JAMO_TO_CODE[char];
  if (/^[a-zA-Z]$/.test(char)) return `Key${char.toUpperCase()}`;
  if (/^[0-9]$/.test(char)) return `Digit${char}`;
  return null;
}

/** 문자(자모 또는 영문/숫자)에 대응하는 손가락. 매핑 불가 시 null. */
export function getFingerForChar(char: string): FingerType | null {
  const code = getCodeForChar(char);
  return code ? getFingerForKey(code) : null;
}

export function getFingerColor(finger: FingerType): string {
  const colors: Record<FingerType, string> = {
    'left-pinky': 'var(--key-finger-left-pinky)',
    'left-ring': 'var(--key-finger-left-ring)',
    'left-middle': 'var(--key-finger-left-middle)',
    'left-index': 'var(--key-finger-left-index)',
    'right-index': 'var(--key-finger-right-index)',
    'right-middle': 'var(--key-finger-right-middle)',
    'right-ring': 'var(--key-finger-right-ring)',
    'right-pinky': 'var(--key-finger-right-pinky)',
    'thumb': '#888888',
  };
  return colors[finger];
}

export function getFingerName(finger: FingerType): string {
  const names: Record<FingerType, string> = {
    'left-pinky': '왼손 새끼',
    'left-ring': '왼손 약지',
    'left-middle': '왼손 중지',
    'left-index': '왼손 검지',
    'right-index': '오른손 검지',
    'right-middle': '오른손 중지',
    'right-ring': '오른손 약지',
    'right-pinky': '오른손 새끼',
    'thumb': '엄지',
  };
  return names[finger];
}

export { FINGER_MAP };

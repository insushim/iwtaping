export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function decomposeKorean(char: string): string[] {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return [char];
  const offset = code - 0xAC00;
  const cho = Math.floor(offset / (21 * 28));
  const jung = Math.floor((offset % (21 * 28)) / 28);
  const jong = offset % 28;

  const choList = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const jungList = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const jongList = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  const result = [choList[cho], jungList[jung]];
  if (jong > 0) result.push(jongList[jong]);
  return result;
}

export function countKoreanStrokes(text: string): number {
  let count = 0;
  for (const char of text) {
    const decomposed = decomposeKorean(char);
    if (decomposed.length === 1 && decomposed[0] === char) {
      // Not a composed Korean char, each jamo or other char counts as 1
      const code = char.charCodeAt(0);
      if (code >= 0x3131 && code <= 0x3163) {
        // Standalone jamo
        count += 1;
      } else {
        count += 1;
      }
    } else {
      // Count each jamo component, expand compound jamo
      for (const jamo of decomposed) {
        const compoundCount = getCompoundJamoCount(jamo);
        count += compoundCount;
      }
    }
  }
  return count;
}

function getCompoundJamoCount(jamo: string): number {
  const compounds: Record<string, number> = {
    'ㄳ': 2, 'ㄵ': 2, 'ㄶ': 2, 'ㄺ': 2, 'ㄻ': 2, 'ㄼ': 2,
    'ㄽ': 2, 'ㄾ': 2, 'ㄿ': 2, 'ㅀ': 2, 'ㅄ': 2,
    'ㄲ': 2, 'ㄸ': 2, 'ㅃ': 2, 'ㅆ': 2, 'ㅉ': 2,
    'ㅘ': 2, 'ㅙ': 2, 'ㅚ': 2, 'ㅝ': 2, 'ㅞ': 2, 'ㅟ': 2, 'ㅢ': 2,
  };
  return compounds[jamo] || 1;
}

export function isKoreanChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x3163);
}

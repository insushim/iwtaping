/**
 * 끝말잇기 두음법칙 — 게임과 사전 검사가 같은 규칙을 쓰도록 한 곳에 둔다.
 *
 * 여기 없으면 사전 테스트가 "막다른 단어"를 게임보다 후하게 세서,
 * 실제로는 이어갈 수 있는 단어(년→연구, 락→낙원)를 막다름으로 오판한다.
 */
function hangulParts(ch: string): { cho: number; jung: number; jong: number } | null {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
}

function composeHangul(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jong);
}

const YA_GROUP = [2, 3, 6, 7, 12, 17, 20]; // ㅑㅒㅕㅖㅛㅠㅣ
const A_GROUP = [0, 1, 8, 11, 13, 18]; //     ㅏㅐㅗㅚㅜㅡ

/** 끝글자로 이을 수 있는 시작 글자 집합(두음법칙 포함, 관대하게 양방향). 영문/비한글은 자기 자신만. */
export function allowedStarts(ch: string): Set<string> {
  const set = new Set<string>([ch]);
  const p = hangulParts(ch);
  if (!p) return set;
  const { cho, jung, jong } = p;
  if (cho === 5 && YA_GROUP.includes(jung)) set.add(composeHangul(11, jung, jong)); // 려→여·료→요·리→이
  if (cho === 5 && A_GROUP.includes(jung)) set.add(composeHangul(2, jung, jong)); //   라→나·로→노
  if (cho === 2 && YA_GROUP.includes(jung)) set.add(composeHangul(11, jung, jong)); // 녀→여·뇨→요
  // 역방향도 허용(여→려/녀, 나→라)
  if (cho === 11 && YA_GROUP.includes(jung)) { set.add(composeHangul(5, jung, jong)); set.add(composeHangul(2, jung, jong)); }
  if (cho === 2 && A_GROUP.includes(jung)) set.add(composeHangul(5, jung, jong));
  return set;
}

/** 끝글자로 이어갈 단어가 사전에 하나도 없는 단어 = 막다름. 게임의 answerable과 같은 판정. */
export function deadEndWords(words: readonly string[]): string[] {
  const firsts = new Set(words.map((w) => w[0]));
  return words.filter((w) => {
    for (const s of allowedStarts(w[w.length - 1])) if (firsts.has(s)) return false;
    return true;
  });
}

/**
 * 닉네임 검열 — 전국 순위·리그·고스트에 그대로 노출되는 유일한 사용자 입력이다.
 * 초등학생이 쓰는 서비스라 욕설·성적 표현·비하어·사칭을 여기서 막는다.
 *
 * 목록은 서버에만 둔다 — 클라이언트 번들에 실으면 아이들 앱 소스에 욕설 목록이
 * 그대로 박힌다. 클라이언트는 형식만 보고, 금칙어 판정은 이 응답을 받아 표시한다.
 */
export const NICKNAME_RE = /^[가-힣a-zA-Z0-9_]{2,12}$/;

/**
 * 어디에 끼어 있든 걸러야 하는 말. 한국어는 조각만 봐도 뜻이 분명해 부분일치로 본다.
 * 영어는 긴 단어만 넣는다 — 짧은 말(ass·sex)은 password·unisex를 오차단해서 EXACT로 뺐다.
 */
export const BANNED_SUBSTRINGS = [
  // 욕설·비속어
  '시발','씨발','씨팔','시팔','씨빨','시빨','싀발','쒸발','쓰발','ㅆㅂ',
  '개새','새끼','병신','븅신','빙신','등신','머저리','또라이','돌아이',
  '좆','존나','졸라','지랄','염병','닥쳐','꺼져','뒈져','뒤져라','디져',
  '엠창','느금','니애미','니미','애미','애비','창녀','창놈','걸레년','걸레짓',
  '쌍년','쌍놈','개년','개놈','미친놈','미친년','미친새','찐따','급식충','틀딱',
  '한남충','김치녀','된장녀','맘충','벌레같','좇','조까','씹할','씹새','씹덕',
  '개소리','개수작','개차반','호로','후레','싸가지','화냥','잡놈','잡년','양아치',
  // 한 글자짜리 '년·놈'은 소년·청년·뛰는놈까지 막아 조합형으로만 거른다.
  '씹','섹','년놈','놈년','년아','놈아','씨년','썅년','썅놈','새년','미친',
  // 성적 표현
  '섹스','섹시','야동','야설','포르노','자위','보지','자지','불알','정액',
  '음경','음란','노출증','알몸','나체','누드','변태','19금','딸딸','콘돔',
  '오르가','성기','성관계','강간','성폭행','성추행','성희롱','원조교제','조건만남',
  // 차별·비하
  '깜둥','짱깨','쪽바리','쪽발이','조센징','흑형','양키','튀기','혼혈아',
  '앉은뱅이','절름발이','벙어리','귀머거리','애꾸','저능아','정신지체','장애인새',
  '문둥','꼽추','난쟁이','정신병자','미치광이','천치','백치','애자',
  // 폭력·약물·자해
  '살인마','살인범','자살','자해','폭탄테러','마약','필로폰','대마초','헤로인',
  '죽여버','죽일놈','죽일년','때려죽',
  // 사칭·혼동 유발
  '관리자','운영자','운영진','개발자','선생님','교장','타이핑버스','공식계정',
  'admin','administrator','moderator','official','support','staff',
  'typingverse','fuck','fuk','fck','shit','bitch','bastard','asshole',
  'dickhead','pussy','cunt','slut','whore','porn','nigger','nigga','faggot',
  'rape','suicide','sexy',
] as const;

/**
 * 짧아서 멀쩡한 낱말에 섞여 드는 말. 이것도 결국 부분일치로 보되,
 * 아래 ALLOW의 정상 낱말을 먼저 지워 낸 잔여 문자열에서만 찾는다.
 *
 * 낱말 경계 정규식(`[^a-z0-9가-힣]`)으로 풀려던 첫 시도는 **무력했다** —
 * 정규화를 거치면 문자열에 영숫자·한글 말고는 남는 게 없어서 경계가 문자열
 * 양 끝에서만 성립했고, 그 결과 `sex킹`·`assking`이 전부 통과했다(교차검증 실측).
 */
export const BANNED_SHORT = [
  'ass','sex','cum','tit','dick','cock','gay','fag','wtf','stfu',
] as const;

/** BANNED_SHORT 조각을 품고 있지만 정상인 낱말 — 검사 전에 지워 낸다. */
const SHORT_ALLOW = [
  'password','classic','class','glasses','glass','grass','passion','passport','pass',
  'assist','assemble','assembly','asset','brass','massive','mass','bass','compass','embassy',
  'unisex','essex','sussex','middlesex','cocktail','peacock','hancock','dickens',
  'titan','title','tito','titanic','gaya','magazine','fragment','cocoa',
] as const;

/** 사칭 위험이 큰 말 — 닉네임 전체가 이것이면 무조건 거절한다. */
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' } as const;

/**
 * 우회 입력을 펴 준다. 두 가지 형태를 모두 만들어 둘 중 하나라도 걸리면 차단한다.
 *  - stripped: 숫자·밑줄 제거 → "시1발", "병_신" 을 잡는다
 *  - leet:     숫자를 알파벳으로 → "sh1t", "b1tch" 를 잡는다
 */
export function normalizeNickname(value: string): { stripped: string; leet: string } {
  const lower = value.toLowerCase();
  return {
    stripped: lower.replace(/[0-9_]/g, ''),
    leet: lower.replace(/[0134579@$]/g, (c) => LEET[c as keyof typeof LEET] ?? c).replace(/_/g, ''),
  };
}

export type NicknameError = 'nickname_required' | 'nickname_format' | 'nickname_banned';

export function checkNickname(nickname: unknown): { ok: true; value: string } | { ok: false; error: NicknameError } {
  if (typeof nickname !== 'string') return { ok: false, error: 'nickname_required' };
  const value = nickname.trim();
  if (!NICKNAME_RE.test(value)) return { ok: false, error: 'nickname_format' };

  const forms = normalizeNickname(value);
  for (const form of [forms.stripped, forms.leet]) {
    if (BANNED_SUBSTRINGS.some((w) => form.includes(w))) return { ok: false, error: 'nickname_banned' };
    // 정상 낱말을 먼저 지운 잔여물에서 짧은 금칙어를 찾는다 — password는 살고 assking은 걸린다.
    let residue = form;
    for (const allow of SHORT_ALLOW) residue = residue.split(allow).join('');
    if (BANNED_SHORT.some((w) => residue.includes(w))) return { ok: false, error: 'nickname_banned' };
  }
  return { ok: true, value };
}

const SURNAMES = [
  '김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍',
  '유','고','문','양','손','배','백','허','남','심','노','하','곽','성','차','주','우','구','민','류',
  '나','진','지','엄','채','원','천','방','공','현','함','변','염','여','추','도','소','석','선','설',
];

/**
 * "김민수"처럼 실명으로 보이는지. **차단이 아니라 경고용**이다 —
 * 3글자 한글 닉네임 중에는 강아지·문어킹처럼 멀쩡한 것도 많아 막으면 오차단이 크다.
 * 아이가 무심코 실명을 넣는 것만 한 번 되묻는다.
 */
export function looksLikeRealName(value: string): boolean {
  return /^[가-힣]{3}$/.test(value) && SURNAMES.includes(value[0]);
}

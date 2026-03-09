/**
 * Procedural Word Generator - 무한 콘텐츠 생성 시스템
 *
 * 한국어: 초성+중성+종성 조합, 카테고리별 대규모 단어 은행
 * 영어: 접두사+어근+접미사 조합, 난이도별 확장
 * 게임 테마별 컨텍스트 단어 생성
 */

// ===== KOREAN SYLLABLE SYSTEM =====
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function composeKoreanChar(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xAC00 + cho * 21 * 28 + jung * 28 + jong);
}

// ===== MASSIVE KOREAN WORD BANKS (카테고리별) =====
const KOREAN_BANKS: Record<string, string[]> = {
  // 우주/과학
  space: [
    '은하수','혜성','소행성','블랙홀','초신성','적색거성','중성자별','백색왜성','퀘이사','성단',
    '성운','암흑물질','암흑에너지','중력파','우주먼지','행성계','위성','궤도','발사체','추진력',
    '우주정거장','탐사선','착륙선','화성','목성','토성','천왕성','해왕성','명왕성','수성',
    '금성','은하','별자리','북극성','오리온','카시오페아','안드로메다','시리우스','베텔게우스',
    '스펙트럼','전파망원경','허블','제임스웹','궤도역학','대기권','성층권','열권','외기권',
    '태양풍','코로나','흑점','플레어','자기장','방사선','진공','무중력','광년','파섹',
    '적색편이','도플러효과','상대성이론','양자역학','핵융합','핵분열','반물질','우주선',
    '발사대','관제센터','비행사','우주복','산소탱크','태양전지','안테나','통신위성',
  ],
  // 판타지/전투
  fantasy: [
    '마법사','전사','궁수','기사','용사','암살자','성기사','사제','주술사','소환사',
    '드래곤','유니콘','피닉스','그리핀','가고일','골렘','오크','고블린','트롤','미노타우로스',
    '바실리스크','키메라','하이드라','세이렌','켄타우로스','워프','요정','엘프','드워프','노움',
    '마나','스펠','인챈트','룬','주문','결계','마법진','포션','비약','엘릭서',
    '성검','마검','활','석궁','창','도끼','방패','갑옷','투구','장화',
    '던전','미궁','탑','보물상자','함정','열쇠','문장','왕관','보석','유물',
    '퀘스트','모험','원정','수호자','파수꾼','여왕','마왕','마신','천사','악마',
    '봉인','해방','부활','강화','합성','제련','각성','진화','변신','소멸',
  ],
  // 좀비/공포
  horror: [
    '좀비','감염','바이러스','백신','항체','면역','격리','봉쇄','탈출','구조',
    '생존자','피난처','바리케이드','무기','탄약','식량','의약품','통조림','라디오','손전등',
    '두뇌','변이','돌연변이','포자','독소','해독','증상','발열','출혈','괴사',
    '어둠','안개','폐허','지하실','지하벙커','병원','연구소','실험실','군사기지','경찰서',
    '화염병','산탄총','저격총','기관총','수류탄','도끼','야구방망이','쇠파이프','전기톱','십자가',
    '묘지','관','해골','유령','늑대인간','뱀파이어','마녀','저주','부적','성수',
    '포위','습격','매복','기습','저항','반격','돌파','철수','합류','기지',
  ],
  // 레이싱/속도
  racing: [
    '가속','브레이크','핸들','기어','클러치','터보','부스터','니트로','드리프트','오버테이크',
    '서킷','직선주로','커브','헤어핀','시케인','피트스톱','체커기','폴포지션','결승선','랩타임',
    '엔진','실린더','피스톤','크랭크','캠샤프트','배기구','머플러','서스펜션','쇼크업소버','스프링',
    '타이어','브레이크패드','디스크','캘리퍼','유압','냉각수','엔진오일','연료','옥탄가','분사',
    '스피드건','텔레메트리','다운포스','공기역학','슬립스트림','견인력','그립','언더스티어','오버스티어',
    '레이서','드라이버','메카닉','팀장','엔지니어','스튜어드','마샬','깃발','옐로카드','페널티',
  ],
  // 음식/요리 (확장)
  food: [
    '비빔밥','불고기','갈비찜','삼겹살','떡볶이','순두부찌개','김치찌개','된장찌개','잡채','냉면',
    '칼국수','해물파전','삼계탕','족발','보쌈','감자탕','부대찌개','호떡','붕어빵','팥빙수',
    '초밥','라멘','텐푸라','돈까스','카레','우동','소바','오니기리','교자','타코야키',
    '파스타','피자','리조또','라자냐','카르보나라','볼로네제','티라미수','판나코타','젤라또','카프레제',
    '햄버거','스테이크','바비큐','타코','부리또','나초','치즈케이크','팬케이크','와플','베이글',
    '짜장면','짬뽕','탕수육','마파두부','깐풍기','유린기','볶음밥','만두','춘권','덴심',
    '쌀국수','파인','분짜','반미','팟타이','똠양궁','그린커리','레드커리','사테','나시고랭',
    '커피','에스프레소','라떼','카푸치노','모카','아메리카노','아포가토','스무디','밀크셰이크','버블티',
  ],
  // 과학기술
  tech: [
    '인공지능','머신러닝','딥러닝','신경망','자연어처리','컴퓨터비전','강화학습','지도학습','비지도학습',
    '알고리즘','데이터구조','해시맵','이진트리','그래프','스택','큐','정렬','탐색','재귀',
    '프레임워크','라이브러리','컴파일러','인터프리터','가상머신','컨테이너','마이크로서비스','서버리스',
    '클라우드','데이터센터','네트워크','프로토콜','라우터','스위치','방화벽','프록시','로드밸런서',
    '블록체인','암호화폐','스마트계약','분산원장','합의알고리즘','채굴','토큰','디파이','메타버스',
    '사물인터넷','센서','액추에이터','임베디드','마이크로컨트롤러','프로세서','메모리','저장장치',
    '양자컴퓨터','양자비트','중첩','얽힘','양자게이트','양자오류보정','큐비트','초전도체',
    '로봇공학','자율주행','드론','웨어러블','증강현실','가상현실','혼합현실','홀로그램',
  ],
  // 자연/생태
  nature: [
    '열대우림','침엽수림','활엽수림','맹그로브','사바나','스텝','툰드라','타이가','사막','오아시스',
    '산호초','해저','심해','해류','조류','파도','태풍','허리케인','토네이도','몬순',
    '화산','용암','마그마','지진','단층','지각','맨틀','핵','판구조론','대륙이동',
    '빙하','빙산','빙하기','간빙기','기후변화','지구온난화','온실효과','오존층','산성비','미세먼지',
    '광합성','엽록소','기공','증산작용','뿌리','줄기','잎','꽃받침','꽃잎','수술',
    '생태계','먹이사슬','먹이그물','분해자','생산자','소비자','공생','기생','포식','경쟁',
    '멸종위기','보호종','천연기념물','국립공원','생태보전','복원','재도입','서식지','이동경로',
  ],
  // 역사/문화
  history: [
    '삼국시대','고구려','백제','신라','가야','고려','조선','대한제국','일제강점기','광복',
    '석기시대','청동기','철기','농업혁명','산업혁명','정보혁명','르네상스','계몽주의','낭만주의',
    '피라미드','만리장성','콜로세움','파르테논','앙코르와트','마추픽추','스톤헨지','타지마할',
    '활자','나침반','화약','종이','측우기','거북선','한글','해시계','수레','물레방아',
    '세종대왕','이순신','광개토대왕','율곡이이','퇴계이황','정약용','안중근','유관순','김구',
    '민주주의','공화국','헌법','국회','대통령','선거','투표','정당','외교','조약',
  ],
  // 예술/문화
  art: [
    '수채화','유화','아크릴화','파스텔화','목탄화','벽화','판화','조각','조소','설치미술',
    '인상주의','표현주의','초현실주의','큐비즘','팝아트','미니멀리즘','추상주의','사실주의','바로크','로코코',
    '교향곡','협주곡','소나타','오페라','발레','왈츠','재즈','블루스','록','힙합',
    '소설','시','수필','희곡','단편','장편','서사시','서정시','하이쿠','소네트',
    '서예','도예','칠기','자수','매듭','직조','염색','도자기','백자','청자',
    '사진','영화','애니메이션','다큐멘터리','뮤지컬','연극','마임','서커스','마술','무용',
  ],
  // 스포츠 (확장)
  sports: [
    '마라톤','트라이애슬론','철인경기','크로스핏','복싱','무에타이','주짓수','레슬링','펜싱','양궁',
    '사이클링','산악자전거','크리켓','럭비','미식축구','아이스하키','컬링','쇼트트랙','피겨스케이팅',
    '체조','리듬체조','트램폴린','다이빙','수구','조정','카누','카약','요트','서핑',
    '스케이트보드','클라이밍','봅슬레이','루지','스켈레톤','바이애슬론','노르딕','점프','활강',
    '배드민턴','스쿼시','핸드볼','수영','접영','배영','평영','자유형','계영','개인혼영',
    '역도','유도','씨름','태권도','검도','합기도','쿵푸','공수도','사격','승마',
  ],
  // 감정/심리
  emotion: [
    '희열','환희','감동','감격','황홀','도취','열정','열광','흥분','기대',
    '평온','안도','만족','감사','행복','사랑','우정','동정','연민','공감',
    '불안','초조','걱정','두려움','공포','공황','긴장','스트레스','번아웃','우울',
    '분노','격분','짜증','좌절','절망','허무','허탈','무력감','상실감','고독',
    '후회','자책','수치심','창피','당혹','혼란','갈등','딜레마','고뇌','방황',
    '호기심','설렘','기대감','흥미','매력','매혹','경외','존경','동경','선망',
    '자신감','용기','결단력','인내심','끈기','의지력','집중력','창의력','직관','영감',
  ],
  // 의학/건강
  medical: [
    '진료','진단','처방','수술','입원','퇴원','응급','외래','검진','내시경',
    '혈압','맥박','체온','혈당','콜레스테롤','헤모글로빈','백혈구','적혈구','혈소판','항체',
    '심장','폐','간','위장','신장','뇌','척추','관절','근육','인대',
    '감기','독감','폐렴','기관지염','천식','당뇨','고혈압','심근경색','뇌졸중','암',
    '항생제','진통제','소화제','해열제','소염제','수면제','항히스타민','스테로이드','인슐린','백신',
    '물리치료','재활','침술','한방','요가','명상','마사지','아로마','영양제','프로바이오틱스',
  ],
  // 경제/비즈니스
  business: [
    '투자','주식','채권','펀드','선물','옵션','외환','부동산','금리','배당',
    '매출','영업이익','순이익','시가총액','주가수익률','배당수익률','자기자본수익률','부채비율',
    '스타트업','벤처','유니콘','기업공개','인수합병','구조조정','아웃소싱','프랜차이즈','라이선스',
    '마케팅','브랜딩','광고','홍보','세일즈','고객관리','시장조사','경쟁분석','벤치마킹','포지셔닝',
    '예산','결산','감사','세금','부가세','소득세','법인세','관세','면세','환급',
    '계약','협상','제안','입찰','낙찰','납품','검수','인수','인도','보증',
  ],
};

// ===== MASSIVE ENGLISH WORD BANKS =====
const ENGLISH_BANKS: Record<string, string[]> = {
  space: [
    'galaxy','nebula','asteroid','comet','meteor','satellite','orbit','cosmos','pulsar','quasar',
    'supernova','constellation','eclipse','atmosphere','gravity','telescope','astronaut','spacecraft','rocket','launchpad',
    'starlight','moonbeam','sunspot','solar','lunar','martian','jupiter','saturn','mercury','venus',
    'neptune','uranus','pluto','milkyway','andromeda','lightyear','parsec','wormhole','blackhole','singularity',
    'photon','neutron','proton','electron','quantum','fusion','fission','plasma','radiation','spectrum',
    'altitude','velocity','thrust','propulsion','trajectory','capsule','module','airlock','antenna','beacon',
  ],
  fantasy: [
    'wizard','warrior','knight','archer','rogue','paladin','sorcerer','druid','ranger','cleric',
    'dragon','phoenix','griffin','unicorn','minotaur','basilisk','chimera','hydra','gargoyle','golem',
    'enchant','spellcast','conjure','summon','banish','resurrect','transmute','alchemy','potion','elixir',
    'dungeon','labyrinth','fortress','citadel','castle','tower','crypt','cavern','portal','realm',
    'mithril','adamant','obsidian','crystal','emerald','sapphire','ruby','diamond','amethyst','topaz',
    'quest','adventure','expedition','crusade','pilgrimage','prophecy','destiny','legend','myth','saga',
  ],
  horror: [
    'zombie','undead','infected','survivor','quarantine','outbreak','pandemic','mutation','antidote','vaccine',
    'barricade','bunker','shelter','fortress','safehouse','hideout','evacuation','rescue','supply','ration',
    'darkness','shadow','phantom','specter','wraith','banshee','revenant','ghoul','vampire','werewolf',
    'shotgun','rifle','machete','crossbow','grenade','molotov','flamethrower','chainsaw','crowbar','hatchet',
    'cemetery','catacombs','morgue','asylum','laboratory','hospital','warehouse','sewer','tunnel','basement',
    'nightmare','dread','terror','horror','panic','paranoia','hallucinate','delirium','madness','sanity',
  ],
  racing: [
    'accelerate','velocity','throttle','turbo','nitrous','boost','drift','overtake','slipstream','downforce',
    'circuit','straightaway','hairpin','chicane','pitlane','checkered','podium','qualifying','practice','warmup',
    'engine','cylinder','piston','crankshaft','camshaft','exhaust','suspension','gearbox','clutch','differential',
    'aerodynamic','traction','understeer','oversteer','braking','cornering','apex','racing','champion','trophy',
  ],
  tech: [
    'algorithm','database','framework','compiler','debugger','terminal','protocol','bandwidth','firewall','encryption',
    'blockchain','cryptocurrency','smartcontract','decentralized','tokenize','mining','consensus','validator','oracle',
    'artificial','intelligence','neural','network','machine','learning','deepfake','autonomous','robotic','sensor',
    'quantum','computing','superposition','entanglement','processor','transistor','silicon','circuit','motherboard',
    'cloud','serverless','container','kubernetes','docker','microservice','pipeline','deployment','scaling','monitoring',
  ],
  nature: [
    'rainforest','savanna','tundra','glacier','volcano','earthquake','tsunami','hurricane','tornado','avalanche',
    'ecosystem','biodiversity','photosynthesis','pollination','migration','hibernation','symbiosis','adaptation','evolution',
    'coral','mangrove','wetland','estuary','peninsula','archipelago','plateau','canyon','delta','fjord',
    'atmosphere','stratosphere','troposphere','thermosphere','ozone','nitrogen','oxygen','carbon','methane','hydrogen',
  ],
  science: [
    'hypothesis','experiment','variable','constant','catalyst','reaction','molecule','compound','element','isotope',
    'mitosis','meiosis','chromosome','genome','protein','enzyme','ribosome','nucleus','membrane','organelle',
    'thermodynamics','entropy','kinetics','potential','friction','momentum','wavelength','frequency','amplitude','resonance',
    'telescope','microscope','spectrometer','oscilloscope','centrifuge','pipette','beaker','crucible','reagent','solvent',
  ],
  food: [
    'spaghetti','lasagna','risotto','tiramisu','bruschetta','prosciutto','gnocchi','ravioli','pesto','carbonara',
    'croissant','baguette','macaron','eclair','souffle','crepe','quiche','ratatouille','bouillabaisse','gratin',
    'sushi','ramen','tempura','teriyaki','wasabi','edamame','miso','matcha','gyoza','tonkatsu',
    'hamburger','barbecue','pancake','waffle','brownie','cheesecake','milkshake','smoothie','espresso','cappuccino',
    'guacamole','quesadilla','burrito','enchilada','salsa','chimichanga','empanada','ceviche','paella','gazpacho',
  ],
  emotion: [
    'euphoria','serenity','nostalgia','melancholy','anxiety','courage','compassion','gratitude','curiosity','wonder',
    'resilience','determination','patience','perseverance','confidence','humble','empathy','sympathy','affection','devotion',
    'frustration','overwhelm','vulnerable','hesitate','conflicted','ambivalent','perplexed','bewildered','astonish','captivate',
  ],
};

// ===== ENGLISH WORD PARTS FOR PROCEDURAL GENERATION =====
const EN_PREFIXES = ['re','un','pre','dis','mis','over','under','out','super','mega','ultra','anti','counter','inter','trans','multi','semi','micro','macro','hyper'];
const EN_ROOTS = ['act','build','cap','duct','form','gen','graph','ject','log','man','morph','pend','port','scrib','spec','struct','tact','vent','vers','voc'];
const EN_SUFFIXES = ['able','tion','ment','ness','ful','less','ive','ous','ing','ize','ify','ward','wise','like','ship','dom','hood','ling','ette','ism'];
const EN_SYLLABLES = ['star','moon','sun','fire','ice','storm','blade','stone','shield','light','dark','wind','wave','thunder','shadow','crystal','iron','steel','silver','gold','dragon','wolf','hawk','lion','bear','tiger','eagle','flame','frost','spark','flash','bolt','strike','blast','surge','pulse','drift','swift','brave','fierce','noble','grand','prime','rapid','silent','phantom','vortex','nexus','zenith','apex','omega','alpha','delta','sigma','nova','quantum','cyber','plasma','cosmic','stellar','astral','lunar','solar','terra','aqua','pyro','cryo','electro','aero','hydro','techno','nano','giga','mega','tera','peta','infra','ultra'];

// ===== PROCEDURAL GENERATION =====

/** Seeded random number generator for reproducibility */
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** Generate a procedural English word */
function generateEnglishWord(seed: number): string {
  const rng = new SeededRandom(seed);
  const type = rng.next();
  if (type < 0.4) {
    // Compound syllable word
    const count = rng.next() < 0.6 ? 2 : 3;
    let word = '';
    for (let i = 0; i < count; i++) {
      word += rng.pick(EN_SYLLABLES);
    }
    return word.toLowerCase();
  } else if (type < 0.7) {
    // Prefix + root
    return (rng.pick(EN_PREFIXES) + rng.pick(EN_ROOTS)).toLowerCase();
  } else {
    // Root + suffix
    return (rng.pick(EN_ROOTS) + rng.pick(EN_SUFFIXES)).toLowerCase();
  }
}

/** Generate a procedural Korean word from syllable combination */
function generateKoreanWord(seed: number): string {
  const rng = new SeededRandom(seed);
  const length = rng.next() < 0.5 ? 2 : rng.next() < 0.7 ? 3 : 4;
  let word = '';
  // Use common/natural sounding combinations
  const COMMON_CHO = [0,2,3,5,6,7,9,11,12,14,15,16,17,18]; // ㄱ,ㄴ,ㄷ,ㄹ,ㅁ,ㅂ,ㅅ,ㅇ,ㅈ,ㅊ,ㅋ,ㅌ,ㅍ,ㅎ
  const COMMON_JUNG = [0,4,8,13,18,20]; // ㅏ,ㅓ,ㅗ,ㅜ,ㅡ,ㅣ
  const COMMON_JONG = [0,0,0,1,4,8,16,21]; // 종성 없음이 자주, ㄱ,ㄴ,ㄹ,ㅁ,ㅇ

  for (let i = 0; i < length; i++) {
    const cho = rng.pick(COMMON_CHO);
    const jung = rng.pick(COMMON_JUNG);
    const jong = rng.pick(COMMON_JONG);
    word += composeKoreanChar(cho, jung, jong);
  }
  return word;
}

// ===== MAIN GENERATOR CLASS =====
export class WordGenerator {
  private usedWords: Set<string> = new Set();
  private proceduralSeed = 1;

  /** Get words for a specific game theme and difficulty */
  getWords(config: {
    language: 'ko' | 'en';
    theme?: string;
    difficulty?: number; // 1-10
    count?: number;
    minLength?: number;
    maxLength?: number;
  }): string[] {
    const { language, theme, difficulty = 1, count = 50, minLength = 2, maxLength = 20 } = config;

    let pool: string[] = [];

    // 1. Gather themed words
    if (theme) {
      const bank = language === 'ko' ? KOREAN_BANKS[theme] : ENGLISH_BANKS[theme];
      if (bank) pool.push(...bank);
    }

    // 2. Add difficulty-appropriate base words
    if (language === 'ko') {
      // For Korean, add from all categories based on difficulty
      const categories = Object.keys(KOREAN_BANKS);
      const numCategories = Math.min(categories.length, Math.floor(difficulty * 1.5) + 2);
      for (let i = 0; i < numCategories; i++) {
        const cat = categories[i % categories.length];
        const words = KOREAN_BANKS[cat];
        const portion = Math.min(words.length, Math.floor(words.length * (difficulty / 10 + 0.3)));
        pool.push(...words.slice(0, portion));
      }
    } else {
      const categories = Object.keys(ENGLISH_BANKS);
      const numCategories = Math.min(categories.length, Math.floor(difficulty * 1.5) + 2);
      for (let i = 0; i < numCategories; i++) {
        const cat = categories[i % categories.length];
        const words = ENGLISH_BANKS[cat];
        const portion = Math.min(words.length, Math.floor(words.length * (difficulty / 10 + 0.3)));
        pool.push(...words.slice(0, portion));
      }
    }

    // 3. Generate procedural words to fill up
    while (pool.length < count * 3) {
      this.proceduralSeed++;
      const word = language === 'ko'
        ? generateKoreanWord(this.proceduralSeed)
        : generateEnglishWord(this.proceduralSeed);
      pool.push(word);
    }

    // 4. Filter by length
    pool = pool.filter(w => w.length >= minLength && w.length <= maxLength);

    // 5. Remove duplicates
    pool = [...new Set(pool)];

    // 6. Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }

  /** Get a single random word not recently used */
  getUniqueWord(pool: string[]): string {
    const available = pool.filter(w => !this.usedWords.has(w));
    if (available.length === 0) {
      this.usedWords.clear();
      return pool[Math.floor(Math.random() * pool.length)] || 'word';
    }
    const word = available[Math.floor(Math.random() * available.length)];
    this.usedWords.add(word);
    // Keep used set manageable
    if (this.usedWords.size > 500) {
      const arr = [...this.usedWords];
      this.usedWords = new Set(arr.slice(-200));
    }
    return word;
  }

  /** Reset used words tracking */
  reset() {
    this.usedWords.clear();
    this.proceduralSeed = Math.floor(Math.random() * 100000);
  }

  /** Get all available themes */
  static getThemes(): string[] {
    return Object.keys(KOREAN_BANKS);
  }

  /** Get word count for a theme */
  static getThemeWordCount(theme: string, language: 'ko' | 'en'): number {
    const bank = language === 'ko' ? KOREAN_BANKS[theme] : ENGLISH_BANKS[theme];
    return bank?.length || 0;
  }

  /** Get total available curated words */
  static getTotalWordCount(language: 'ko' | 'en'): number {
    const banks = language === 'ko' ? KOREAN_BANKS : ENGLISH_BANKS;
    return Object.values(banks).reduce((sum, arr) => sum + arr.length, 0);
  }
}

// ===== SENTENCE GENERATOR =====
const KO_SENTENCE_TEMPLATES = [
  '{noun}이/가 {adj} {noun}을/를 {verb}.',
  '{adv} {verb}는 {noun}은/는 {adj}다.',
  '{noun}에서 {noun}을/를 {verb}고 있다.',
  '오늘은 {adj} 날씨에 {noun}을/를 {verb}기로 했다.',
  '{noun}이/가 {noun}과/와 함께 {adv} {verb}.',
  '{adj} {noun}이/가 {noun} 위에서 {verb}고 있었다.',
  '우리는 {noun}을/를 위해 {adv} {verb}해야 한다.',
  '{noun}의 {adj} {noun}이/가 세상을 {verb}했다.',
];

const KO_NOUNS = ['바다','하늘','세상','사람','마음','시간','음악','여행','꿈','미래','별','달','태양','바람','숲','강','산','꽃','나무','구름','도시','마을','학교','집','공원','광장','거리'];
const KO_ADJS = ['아름다운','거대한','작은','빛나는','조용한','활기찬','따뜻한','시원한','깊은','넓은','높은','맑은','흐린','밝은','어두운','신비로운','평화로운','강렬한'];
const KO_VERBS = ['바라보다','걸어가다','만들다','찾아가다','시작하다','변화하다','성장하다','빛나다','흐르다','펼치다','담아내다','노래하다','춤추다','발견하다'];
const KO_ADVS = ['조용히','빠르게','천천히','힘차게','가볍게','무겁게','끊임없이','열심히','자유롭게','즐겁게','평화롭게','신나게'];

export function generateKoreanSentence(): string {
  const template = KO_SENTENCE_TEMPLATES[Math.floor(Math.random() * KO_SENTENCE_TEMPLATES.length)];
  return template
    .replace(/\{noun\}/g, () => KO_NOUNS[Math.floor(Math.random() * KO_NOUNS.length)])
    .replace(/\{adj\}/g, () => KO_ADJS[Math.floor(Math.random() * KO_ADJS.length)])
    .replace(/\{verb\}/g, () => KO_VERBS[Math.floor(Math.random() * KO_VERBS.length)])
    .replace(/\{adv\}/g, () => KO_ADVS[Math.floor(Math.random() * KO_ADVS.length)]);
}

const EN_SENTENCE_TEMPLATES = [
  'The {adj} {noun} {verb} across the {adj} {noun}.',
  '{adv}, the {noun} {verb} with great {noun}.',
  'Every {noun} has a {adj} {noun} inside.',
  'She {verb} the {adj} {noun} {adv}.',
  'In the {adj} {noun}, they found a {adj} {noun}.',
  'The {noun} of {noun} will {verb} everything.',
  'Without {noun}, the {adj} {noun} cannot {verb}.',
];

const EN_NOUNS = ['ocean','mountain','forest','river','city','garden','tower','bridge','castle','temple','horizon','shadow','crystal','phoenix','warrior','kingdom','universe','destiny','thunder','whisper','journey','secret','legend','dream'];
const EN_ADJS = ['ancient','mighty','silent','golden','silver','crystal','dark','bright','eternal','fierce','gentle','noble','sacred','wild','mysterious','enchanted','majestic','humble'];
const EN_VERBS = ['shines','flows','grows','rises','falls','dances','whispers','echoes','blazes','soars','drifts','glows','transforms','awakens','reveals','protects','creates','destroys'];
const EN_ADVS = ['silently','swiftly','bravely','gently','fiercely','gracefully','suddenly','eternally','carefully','boldly','proudly','quietly','endlessly','peacefully'];

export function generateEnglishSentence(): string {
  const template = EN_SENTENCE_TEMPLATES[Math.floor(Math.random() * EN_SENTENCE_TEMPLATES.length)];
  return template
    .replace(/\{noun\}/g, () => EN_NOUNS[Math.floor(Math.random() * EN_NOUNS.length)])
    .replace(/\{adj\}/g, () => EN_ADJS[Math.floor(Math.random() * EN_ADJS.length)])
    .replace(/\{verb\}/g, () => EN_VERBS[Math.floor(Math.random() * EN_VERBS.length)])
    .replace(/\{adv\}/g, () => EN_ADVS[Math.floor(Math.random() * EN_ADVS.length)]);
}

// Singleton instance
export const wordGenerator = new WordGenerator();

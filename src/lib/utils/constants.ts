export const APP_NAME = 'TypingVerse';
export const APP_SLOGAN = '손끝으로 여는 무한한 세계';
export const APP_VERSION = '1.0.0';

export const SPEED_HISTORY_INTERVAL = 500; // ms
export const MOVING_AVERAGE_WINDOW = 5000; // ms
export const COMBO_THRESHOLDS = [2, 3, 5, 10, 20, 50];
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3, 5, 7];

export const FONT_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

export const PASS_ACCURACY = 90;

export const ACHIEVEMENTS_LIST = [
  { key: 'first_step', title: '첫 발걸음', description: '첫 연습 완료', icon: '🏅' },
  { key: 'lightning', title: '번개손', description: '300타/분 달성', icon: '⚡' },
  { key: 'sharpshooter', title: '명사수', description: '정확도 99% 이상', icon: '🎯' },
  { key: 'fire_practice', title: '불꽃연습', description: '7일 연속 연습', icon: '🔥' },
  { key: 'master', title: '마스터', description: '500타/분 달성', icon: '🏆' },
  { key: 'perfect_game', title: '퍼펙트게임', description: '게임 모드 100% 정확도', icon: '🌟' },
  { key: 'diamond', title: '다이아몬드', description: '모든 자리연습 완료', icon: '💎' },
  { key: 'king', title: '킹', description: '모든 게임 최고 단계 클리어', icon: '👑' },
  { key: 'speed_100', title: '100타 돌파', description: '100타/분 달성', icon: '🚀' },
  { key: 'speed_200', title: '200타 돌파', description: '200타/분 달성', icon: '✈️' },
  { key: 'speed_400', title: '400타 돌파', description: '400타/분 달성', icon: '🛸' },
  { key: 'accuracy_95', title: '정확한 손', description: '정확도 95% 이상', icon: '✋' },
  { key: 'combo_10', title: '콤보 입문', description: '10콤보 달성', icon: '🔗' },
  { key: 'combo_50', title: '콤보 마스터', description: '50콤보 달성', icon: '⛓️' },
  { key: 'combo_100', title: '콤보 레전드', description: '100콤보 달성', icon: '💫' },
  { key: 'practice_1h', title: '1시간 연습', description: '총 연습 시간 1시간', icon: '⏱️' },
  { key: 'practice_10h', title: '10시간 연습', description: '총 연습 시간 10시간', icon: '⏳' },
  { key: 'practice_100h', title: '100시간 연습', description: '총 연습 시간 100시간', icon: '🕐' },
  { key: 'word_1000', title: '천 단어', description: '1000개 단어 입력', icon: '📝' },
  { key: 'word_10000', title: '만 단어', description: '10000개 단어 입력', icon: '📚' },
  { key: 'streak_3', title: '3일 연속', description: '3일 연속 연습', icon: '📅' },
  { key: 'streak_30', title: '30일 연속', description: '30일 연속 연습', icon: '🗓️' },
  { key: 'rain_clear', title: '산성비 클리어', description: '산성비 레벨 10 클리어', icon: '🌧️' },
  { key: 'space_clear', title: '우주 방어 클리어', description: '우주 방어 레벨 10 클리어', icon: '🚀' },
  { key: 'race_win', title: '레이스 우승', description: '타이핑 레이스 1등', icon: '🏎️' },
  { key: 'all_positions', title: '자리 마스터', description: '모든 자리 연습 완료', icon: '⌨️' },
  { key: 'code_master', title: '코드 마스터', description: '코드 연습 30개 완료', icon: '💻' },
  { key: 'night_owl', title: '야행성', description: '자정 이후 연습', icon: '🦉' },
  { key: 'early_bird', title: '얼리버드', description: '오전 6시 이전 연습', icon: '🐦' },
  { key: 'multilingual', title: '다국어', description: '한국어와 영어 모두 연습', icon: '🌍' },
] as const;

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface UserSettings {
  language: 'ko' | 'en';
  keyboardLayout: 'qwerty-ko' | 'sebeol-390' | 'sebeol-final' | 'qwerty-en' | 'dvorak';
  showKeyboard: boolean;
  showFingerGuide: boolean;
  keySound: boolean;
  keySoundType: 'mechanical' | 'membrane' | 'typewriter' | 'bubble' | 'silent';
  keySoundVolume: number;
  errorHandling: 'show' | 'stop' | 'free';
  speedUnit: 'kpm' | 'wpm' | 'cpm';
  caretStyle: 'block' | 'line' | 'underline';
  smoothCaret: boolean;
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  theme: 'dark' | 'light' | 'system';
  colorTheme: 'neon' | 'ocean' | 'forest' | 'sunset' | 'mono' | 'custom';
  bgEffect: 'particle' | 'gradient' | 'none';
  gameBgm: boolean;
  bgmVolume: number;
  sfx: boolean;
  sfxVolume: number;
  screenShake: boolean;
  particleLevel: 'high' | 'medium' | 'low' | 'none';
}

export const defaultSettings: UserSettings = {
  language: 'ko',
  keyboardLayout: 'qwerty-ko',
  showKeyboard: true,
  showFingerGuide: true,
  keySound: true,
  keySoundType: 'mechanical',
  keySoundVolume: 0.5,
  errorHandling: 'show',
  speedUnit: 'kpm',
  caretStyle: 'line',
  smoothCaret: true,
  fontSize: 'md',
  theme: 'dark',
  colorTheme: 'neon',
  bgEffect: 'particle',
  gameBgm: true,
  bgmVolume: 0.3,
  sfx: true,
  sfxVolume: 0.5,
  screenShake: true,
  particleLevel: 'medium',
};

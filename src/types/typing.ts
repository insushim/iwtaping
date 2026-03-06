export type FingerType =
  | 'left-pinky' | 'left-ring' | 'left-middle' | 'left-index'
  | 'right-index' | 'right-middle' | 'right-ring' | 'right-pinky'
  | 'thumb';

export type TypingStatus = 'idle' | 'ready' | 'typing' | 'paused' | 'finished';

export type TypingMode = 'position' | 'word' | 'short' | 'long' | 'code' | 'speed_test' | 'accuracy_test' | 'custom_test';

export type Language = 'ko' | 'en';

export type KeyboardLayout = 'qwerty-ko' | 'sebeol-390' | 'sebeol-final' | 'qwerty-en' | 'dvorak';

export type ErrorHandling = 'show' | 'stop' | 'free';

export type SpeedUnit = 'kpm' | 'wpm' | 'cpm';

export type CaretStyle = 'block' | 'line' | 'underline';

export interface Keystroke {
  key: string;
  code: string;
  timestamp: number;
  isCorrect: boolean;
  finger: FingerType;
  responseTime: number;
}

export interface ErrorRecord {
  index: number;
  expected: string;
  actual: string;
  timestamp: number;
}

export interface CharState {
  char: string;
  status: 'pending' | 'correct' | 'incorrect' | 'current' | 'composing';
}

export interface TypingState {
  text: string;
  userInput: string;
  currentIndex: number;
  startTime: number | null;
  endTime: number | null;
  keystrokes: Keystroke[];
  errors: ErrorRecord[];
  isComposing: boolean;
  composingText: string;
  status: TypingStatus;
  charStates: CharState[];
}

export interface TypingResult {
  wpm: number;
  cpm: number;
  kpm: number;
  accuracy: number;
  maxSpeed: number;
  consistency: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  errorKeystrokes: number;
  elapsedTime: number;
  fingerAccuracy: Record<FingerType, number>;
  keyAccuracy: Record<string, number>;
  speedHistory: number[];
  problemKeys: string[];
}

export interface PracticeSession {
  id: string;
  mode: TypingMode;
  language: Language;
  result: TypingResult;
  text: string;
  timestamp: number;
}

export interface PositionDrill {
  level: number;
  title: string;
  description: string;
  keys: string[];
  drillText: string[];
  passAccuracy: number;
}

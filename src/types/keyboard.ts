import { FingerType } from './typing';

export interface KeyData {
  key: string;
  code: string;
  label: string;
  shiftLabel?: string;
  finger: FingerType;
  row: number;
  width?: number; // multiplier, default 1
}

export interface KeyboardRow {
  keys: KeyData[];
}

export interface KeyboardLayoutData {
  id: string;
  name: string;
  language: 'ko' | 'en';
  rows: KeyboardRow[];
}

export interface KeyHighlightState {
  code: string;
  state: 'idle' | 'target' | 'pressed' | 'correct' | 'incorrect';
}

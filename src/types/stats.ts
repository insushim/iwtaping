import { FingerType, TypingMode, Language } from './typing';
import { GameType } from './game';

export interface DailyStats {
  date: string;
  totalPracticeSeconds: number;
  totalKeystrokes: number;
  avgSpeed: number;
  avgAccuracy: number;
  sessionsCount: number;
}

export interface KeyStats {
  key: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgResponseTime: number;
}

export interface FingerStats {
  finger: FingerType;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  avgSpeed: number;
}

export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  totalSessions: number;
  totalPracticeTime: number;
  totalKeystrokes: number;
  bestKpm: number;
  bestWpm: number;
  bestAccuracy: number;
  avgKpm: number;
  avgWpm: number;
  avgAccuracy: number;
  dailyStats: DailyStats[];
  keyStats: Record<string, KeyStats>;
  fingerStats: Record<FingerType, FingerStats>;
  achievements: string[];
  streakDays: number;
  lastPracticeDate: string;
  gameHighScores: Record<GameType, number>;
  modeRecords: Record<TypingMode, { bestSpeed: number; bestAccuracy: number }>;
}

export interface RankingEntry {
  id: string;
  nickname: string;
  mode: TypingMode | GameType;
  language: Language;
  score: number;
  speed: number;
  accuracy: number;
  timestamp: number;
}

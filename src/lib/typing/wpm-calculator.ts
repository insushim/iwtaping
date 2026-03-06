import { countKoreanStrokes } from '../utils/helpers';

export function calculateKPM(text: string, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  const strokes = countKoreanStrokes(text);
  return Math.round(strokes / (elapsedSeconds / 60));
}

export function calculateWPM(charCount: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.round((charCount / 5) / (elapsedSeconds / 60));
}

export function calculateCPM(charCount: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0) return 0;
  return Math.round(charCount / (elapsedSeconds / 60));
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((correct / total) * 10000) / 100;
}

export function calculateConsistency(speedHistory: number[]): number {
  if (speedHistory.length < 2) return 100;
  const mean = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
  if (mean === 0) return 100;
  const variance = speedHistory.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / speedHistory.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;
  return Math.round(Math.max(0, (1 - cv) * 100) * 100) / 100;
}

export function calculateMovingAverage(
  keystrokes: { timestamp: number; isCorrect: boolean }[],
  windowMs: number = 5000
): number {
  if (keystrokes.length < 2) return 0;
  const now = keystrokes[keystrokes.length - 1].timestamp;
  const windowStart = now - windowMs;
  const recentStrokes = keystrokes.filter(k => k.timestamp >= windowStart && k.isCorrect);
  if (recentStrokes.length < 2) return 0;
  const elapsed = (now - recentStrokes[0].timestamp) / 1000;
  if (elapsed <= 0) return 0;
  return Math.round(recentStrokes.length / (elapsed / 60));
}

import { ErrorRecord, Keystroke, FingerType } from '@/types/typing';

export class AccuracyTracker {
  private keyStats: Map<string, { correct: number; total: number }> = new Map();
  private fingerStats: Map<FingerType, { correct: number; total: number }> = new Map();
  private errors: ErrorRecord[] = [];

  recordKeystroke(keystroke: Keystroke): void {
    const { key, finger, isCorrect } = keystroke;

    // Update key stats
    const keyStat = this.keyStats.get(key) || { correct: 0, total: 0 };
    keyStat.total++;
    if (isCorrect) keyStat.correct++;
    this.keyStats.set(key, keyStat);

    // Update finger stats
    const fingerStat = this.fingerStats.get(finger) || { correct: 0, total: 0 };
    fingerStat.total++;
    if (isCorrect) fingerStat.correct++;
    this.fingerStats.set(finger, fingerStat);
  }

  recordError(error: ErrorRecord): void {
    this.errors.push(error);
  }

  getKeyAccuracy(): Record<string, number> {
    const result: Record<string, number> = {};
    this.keyStats.forEach((stat, key) => {
      result[key] = stat.total > 0 ? (stat.correct / stat.total) * 100 : 100;
    });
    return result;
  }

  getFingerAccuracy(): Record<FingerType, number> {
    const fingers: FingerType[] = [
      'left-pinky', 'left-ring', 'left-middle', 'left-index',
      'right-index', 'right-middle', 'right-ring', 'right-pinky', 'thumb',
    ];
    const result = {} as Record<FingerType, number>;
    for (const f of fingers) {
      const stat = this.fingerStats.get(f);
      result[f] = stat && stat.total > 0 ? (stat.correct / stat.total) * 100 : 100;
    }
    return result;
  }

  getProblemKeys(threshold: number = 80): string[] {
    const problems: string[] = [];
    this.keyStats.forEach((stat, key) => {
      if (stat.total >= 3) {
        const accuracy = (stat.correct / stat.total) * 100;
        if (accuracy < threshold) {
          problems.push(key);
        }
      }
    });
    return problems.sort((a, b) => {
      const accA = this.keyStats.get(a)!;
      const accB = this.keyStats.get(b)!;
      return (accA.correct / accA.total) - (accB.correct / accB.total);
    });
  }

  getErrors(): ErrorRecord[] {
    return [...this.errors];
  }

  reset(): void {
    this.keyStats.clear();
    this.fingerStats.clear();
    this.errors = [];
  }
}

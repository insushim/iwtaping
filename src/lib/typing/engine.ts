import { TypingState, TypingResult, CharState, Keystroke, ErrorRecord, FingerType } from '@/types/typing';
import { calculateKPM, calculateWPM, calculateCPM, calculateAccuracy, calculateConsistency } from './wpm-calculator';
import { AccuracyTracker } from './accuracy-tracker';
import { getFingerForKey } from './finger-mapper';
import { isComposingMatch, getJamoSequence } from './korean-automata';
import { countKoreanStrokes } from '../utils/helpers';

export class TypingEngine {
  private state: TypingState;
  private tracker: AccuracyTracker;
  private speedHistory: number[] = [];
  private lastSpeedTime: number = 0;
  private onStateChange?: (state: TypingState) => void;

  constructor(text: string, onStateChange?: (state: TypingState) => void) {
    this.tracker = new AccuracyTracker();
    this.onStateChange = onStateChange;
    this.state = {
      text,
      userInput: '',
      currentIndex: 0,
      startTime: null,
      endTime: null,
      keystrokes: [],
      errors: [],
      isComposing: false,
      composingText: '',
      status: 'ready',
      charStates: text.split('').map((char, i) => ({
        char,
        status: i === 0 ? 'current' : 'pending',
      })),
    };
  }

  getState(): TypingState {
    return { ...this.state };
  }

  handleInput(input: string, isComposing: boolean = false): void {
    if (this.state.status === 'finished') return;

    if (this.state.status === 'ready') {
      this.state.status = 'typing';
      this.state.startTime = Date.now();
      this.lastSpeedTime = Date.now();
    }

    if (isComposing) {
      this.state.isComposing = true;
      this.state.composingText = input;
      this.updateComposingState();
    } else {
      this.state.isComposing = false;
      this.state.composingText = '';
      this.processCompleteInput(input);
    }

    this.recordSpeedHistory();
    this.emitChange();
  }

  handleKeyDown(e: KeyboardEvent): Keystroke | null {
    if (this.state.status === 'finished') return null;

    const finger = getFingerForKey(e.code);
    const now = Date.now();
    const lastKeystroke = this.state.keystrokes[this.state.keystrokes.length - 1];
    const responseTime = lastKeystroke ? now - lastKeystroke.timestamp : 0;

    const keystroke: Keystroke = {
      key: e.key,
      code: e.code,
      timestamp: now,
      isCorrect: true, // Will be updated
      finger,
      responseTime,
    };

    return keystroke;
  }

  recordKeystroke(keystroke: Keystroke): void {
    this.state.keystrokes.push(keystroke);
    this.tracker.recordKeystroke(keystroke);
  }

  private processCompleteInput(input: string): void {
    const newCharStates = [...this.state.charStates];

    for (let i = 0; i < input.length && i < this.state.text.length; i++) {
      if (input[i] === this.state.text[i]) {
        newCharStates[i] = { char: this.state.text[i], status: 'correct' };
      } else {
        newCharStates[i] = { char: this.state.text[i], status: 'incorrect' };
        if (!this.state.errors.find(e => e.index === i)) {
          const error: ErrorRecord = {
            index: i,
            expected: this.state.text[i],
            actual: input[i],
            timestamp: Date.now(),
          };
          this.state.errors.push(error);
          this.tracker.recordError(error);
        }
      }
    }

    // Mark current position
    const currentIdx = input.length;
    if (currentIdx < this.state.text.length) {
      newCharStates[currentIdx] = { char: this.state.text[currentIdx], status: 'current' };
    }

    // Mark remaining as pending
    for (let i = currentIdx + 1; i < this.state.text.length; i++) {
      newCharStates[i] = { char: this.state.text[i], status: 'pending' };
    }

    this.state.charStates = newCharStates;
    this.state.userInput = input;
    this.state.currentIndex = currentIdx;

    // Check completion
    if (input.length >= this.state.text.length) {
      this.state.status = 'finished';
      this.state.endTime = Date.now();
    }
  }

  private updateComposingState(): void {
    const idx = this.state.currentIndex;
    if (idx < this.state.charStates.length) {
      const composingResult = isComposingMatch(
        this.state.text,
        this.state.userInput,
        this.state.composingText,
        idx
      );

      const newCharStates = [...this.state.charStates];
      newCharStates[idx] = {
        char: this.state.text[idx],
        status: composingResult.isPartial || composingResult.isCorrect ? 'composing' : 'incorrect',
      };
      this.state.charStates = newCharStates;
    }
  }

  private recordSpeedHistory(): void {
    const now = Date.now();
    if (now - this.lastSpeedTime >= 500 && this.state.startTime) {
      const elapsed = (now - this.state.startTime) / 1000;
      const correctChars = this.state.charStates.filter(c => c.status === 'correct').length;
      const kpm = calculateKPM(
        this.state.text.substring(0, correctChars),
        elapsed
      );
      this.speedHistory.push(kpm);
      this.lastSpeedTime = now;
    }
  }

  getResult(): TypingResult {
    const elapsed = this.state.endTime && this.state.startTime
      ? (this.state.endTime - this.state.startTime) / 1000
      : this.state.startTime
        ? (Date.now() - this.state.startTime) / 1000
        : 0;

    const correctChars = this.state.charStates.filter(c => c.status === 'correct').length;
    const correctText = this.state.text.substring(0, correctChars);
    const totalKeystrokes = this.state.keystrokes.length;
    const correctKeystrokes = this.state.keystrokes.filter(k => k.isCorrect).length;

    return {
      kpm: calculateKPM(correctText, elapsed),
      wpm: calculateWPM(correctChars, elapsed),
      cpm: calculateCPM(correctChars, elapsed),
      accuracy: calculateAccuracy(correctKeystrokes, totalKeystrokes),
      maxSpeed: this.speedHistory.length > 0 ? Math.max(...this.speedHistory) : 0,
      consistency: calculateConsistency(this.speedHistory),
      totalKeystrokes,
      correctKeystrokes,
      errorKeystrokes: totalKeystrokes - correctKeystrokes,
      elapsedTime: elapsed,
      fingerAccuracy: this.tracker.getFingerAccuracy(),
      keyAccuracy: this.tracker.getKeyAccuracy(),
      speedHistory: [...this.speedHistory],
      problemKeys: this.tracker.getProblemKeys(),
    };
  }

  reset(newText?: string): void {
    const text = newText || this.state.text;
    this.tracker.reset();
    this.speedHistory = [];
    this.lastSpeedTime = 0;
    this.state = {
      text,
      userInput: '',
      currentIndex: 0,
      startTime: null,
      endTime: null,
      keystrokes: [],
      errors: [],
      isComposing: false,
      composingText: '',
      status: 'ready',
      charStates: text.split('').map((char, i) => ({
        char,
        status: i === 0 ? 'current' : 'pending',
      })),
    };
    this.emitChange();
  }

  private emitChange(): void {
    this.onStateChange?.(this.getState());
  }
}

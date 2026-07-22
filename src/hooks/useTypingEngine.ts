'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TypingResult, CharState } from '@/types/typing';
import { calculateKPM, calculateWPM, calculateCPM, calculateAccuracy, calculateConsistency } from '@/lib/typing/wpm-calculator';
import { isComposingMatch } from '@/lib/typing/korean-automata';
import { getFingerForChar, getCodeForChar, getFingerForKey } from '@/lib/typing/finger-mapper';
import { decomposeKorean } from '@/lib/utils/helpers';
import { AccuracyTracker } from '@/lib/typing/accuracy-tracker';
import { soundManager } from '@/lib/sound/sound-manager';

interface UseTypingEngineOptions {
  text: string;
  onComplete?: (result: TypingResult) => void;
  soundEnabled?: boolean;
}

/** 타건 타임스탬프 → 연속 간격(ms). 서버가 자동 입력을 판별하는 입력값이다. */
function intervalsFromKeystrokes(keystrokes: { timestamp: number }[]): number[] {
  const intervals: number[] = [];
  for (let i = 1; i < keystrokes.length; i++) {
    const delta = keystrokes[i].timestamp - keystrokes[i - 1].timestamp;
    if (delta >= 0 && delta < 10000) intervals.push(delta);
  }
  return intervals;
}

export function useTypingEngine({ text, onComplete, soundEnabled = true }: UseTypingEngineOptions) {
  const [charStates, setCharStates] = useState<CharState[]>(() =>
    text.split('').map((char, i) => ({ char, status: i === 0 ? 'current' : 'pending' }))
  );
  const [status, setStatus] = useState<'ready' | 'typing' | 'finished'>('ready');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);

  const startTimeRef = useRef<number | null>(null);
  const keystrokesRef = useRef<{ timestamp: number; isCorrect: boolean; key: string; code: string }[]>([]);
  const speedHistoryRef = useRef<number[]>([]);
  /** 현재 화면상 맞은 글자 수(속도 계산용 — 정정하면 줄어들 수 있음) */
  const correctCountRef = useRef(0);
  /** 누적 입력 시도 수(정정·재입력도 각각 1회로 셈 — 정확도 분모) */
  const attemptsRef = useRef(0);
  /** 그중 맞은 시도 수(정확도 분자) */
  const correctAttemptsRef = useRef(0);
  const trackerRef = useRef<AccuracyTracker>(new AccuracyTracker());
  const inputRef = useRef('');

  const reset = useCallback(() => {
    setCharStates(text.split('').map((char, i) => ({ char, status: i === 0 ? 'current' : 'pending' })));
    setStatus('ready');
    setCurrentIndex(0);
    setCombo(0);
    setMaxCombo(0);
    setLiveSpeed(0);
    setLiveAccuracy(100);
    startTimeRef.current = null;
    keystrokesRef.current = [];
    speedHistoryRef.current = [];
    correctCountRef.current = 0;
    attemptsRef.current = 0;
    correctAttemptsRef.current = 0;
    trackerRef.current.reset();
    inputRef.current = '';
  }, [text]);

  useEffect(() => {
    reset();
  }, [text, reset]);

  // Speed recording interval
  useEffect(() => {
    if (status !== 'typing') return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const correctText = text.substring(0, correctCountRef.current);
        const kpm = calculateKPM(correctText, elapsed);
        speedHistoryRef.current.push(kpm);
        setLiveSpeed(kpm);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [status, text]);

  /**
   * 목표 글자 1개에 대한 시도를 손가락·키 통계에 기록한다.
   * 한글 완성자는 자모로 분해해 자모마다 기록(두벌식 기준 실제 타건 수와 일치).
   */
  const recordCharStroke = useCallback((targetChar: string, isCorrect: boolean) => {
    if (!targetChar) return;
    const units = decomposeKorean(targetChar);
    for (const unit of units) {
      const finger = getFingerForChar(unit);
      if (!finger) continue;
      trackerRef.current.recordKeystroke({
        key: unit,
        code: getCodeForChar(unit) ?? '',
        timestamp: Date.now(),
        isCorrect,
        finger,
        responseTime: 0,
      });
    }
  }, []);

  const getResult = useCallback((): TypingResult => {
    const now = Date.now();
    const elapsed = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;
    const correct = correctCountRef.current;
    const correctText = text.substring(0, correct);
    const attempts = attemptsRef.current;
    const correctAttempts = correctAttemptsRef.current;

    return {
      kpm: calculateKPM(correctText, elapsed),
      wpm: calculateWPM(correct, elapsed),
      cpm: calculateCPM(correct, elapsed),
      accuracy: calculateAccuracy(correctAttempts, Math.max(attempts, 1)),
      maxSpeed: speedHistoryRef.current.length > 0 ? Math.max(...speedHistoryRef.current) : 0,
      consistency: calculateConsistency(speedHistoryRef.current),
      totalKeystrokes: attempts,
      correctKeystrokes: correctAttempts,
      errorKeystrokes: attempts - correctAttempts,
      elapsedTime: elapsed,
      fingerAccuracy: trackerRef.current.getFingerAccuracy(),
      keyAccuracy: trackerRef.current.getKeyAccuracy(),
      speedHistory: [...speedHistoryRef.current],
      problemKeys: trackerRef.current.getProblemKeys(),
      keyIntervals: intervalsFromKeystrokes(keystrokesRef.current),
    };
  }, [text]);

  const handleInput = useCallback((newInput: string, isComposing: boolean) => {
    if (status === 'finished') return;

    if (status === 'ready' && newInput.length > 0) {
      setStatus('typing');
      startTimeRef.current = Date.now();
    }

    if (isComposing) {
      // Show composing state for current character
      setCharStates((prev) => {
        const next = [...prev];
        const idx = inputRef.current.length;
        if (idx < next.length) {
          const result = isComposingMatch(text, inputRef.current, newInput.slice(idx), idx);
          next[idx] = {
            char: text[idx],
            status: result.isPartial || result.isCorrect ? 'composing' : 'incorrect',
          };
        }
        return next;
      });
      return;
    }

    // Composition complete or direct input
    const prevLength = inputRef.current.length;
    inputRef.current = newInput;
    const newStates: CharState[] = text.split('').map((char, i) => {
      if (i < newInput.length) {
        const isCorrect = newInput[i] === char;
        return { char, status: isCorrect ? 'correct' : 'incorrect' };
      }
      if (i === newInput.length) {
        return { char, status: 'current' };
      }
      return { char, status: 'pending' };
    });
    setCharStates(newStates);
    setCurrentIndex(newInput.length);

    // Update counts
    let correct = 0;
    for (let i = 0; i < newInput.length; i++) {
      if (i < text.length && newInput[i] === text[i]) correct++;
    }
    correctCountRef.current = correct;

    // Track newly finalized characters (for Korean IME combo/accuracy)
    for (let i = prevLength; i < newInput.length; i++) {
      if (i < text.length) {
        const charCorrect = newInput[i] === text[i];
        // 시도 카운터는 단조 증가 — 지우고 다시 쳐도 새 시도로 셈(정확도 세탁 방지)
        attemptsRef.current++;
        if (charCorrect) correctAttemptsRef.current++;
        recordCharStroke(text[i], charCorrect);
        if (charCorrect) {
          setCombo((prev) => {
            const next = prev + 1;
            setMaxCombo((m) => Math.max(m, next));
            return next;
          });
          if (soundEnabled && soundManager) {
            if (newInput[i] === ' ') soundManager.play('keySpace');
            else soundManager.play('keyClick', Math.random() * 3);
          }
        } else {
          setCombo(0);
          if (soundEnabled && soundManager) soundManager.play('keyError');
        }
      }
    }
    setLiveAccuracy(calculateAccuracy(correctAttemptsRef.current, Math.max(attemptsRef.current, 1)));

    // Check completion
    if (newInput.length >= text.length) {
      setStatus('finished');
      const result = getResult();
      onComplete?.(result);
    }
  }, [status, text, onComplete, soundEnabled, recordCharStroke, getResult]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status === 'finished') return;
    if (e.key === 'Escape' || e.key === 'Tab') return;

    // Skip IME composition events (Korean, Japanese, etc.)
    // e.key === 'Process' means the key is being handled by IME
    if (e.key === 'Process' || e.isComposing) return;

    // Skip control keys (Backspace, Enter, etc.) - only record printable characters
    if (e.key.length !== 1 && e.key !== ' ') return;

    const now = Date.now();
    const isCorrect = currentIndex < text.length && e.key === text[currentIndex];

    // Only record keystroke - combo/sound/totalCount are handled in handleInput
    keystrokesRef.current.push({
      timestamp: now,
      isCorrect,
      key: e.key,
      code: e.code,
    });
  }, [status, currentIndex, text]);


  return {
    charStates,
    status,
    currentIndex,
    combo,
    maxCombo,
    liveSpeed,
    liveAccuracy,
    handleInput,
    handleKeyDown,
    getResult,
    reset,
  };
}

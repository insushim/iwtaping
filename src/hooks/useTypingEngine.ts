'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { TypingState, TypingResult, CharState } from '@/types/typing';
import { calculateKPM, calculateWPM, calculateCPM, calculateAccuracy, calculateConsistency, calculateMovingAverage } from '@/lib/typing/wpm-calculator';
import { isComposingMatch, getJamoSequence } from '@/lib/typing/korean-automata';
import { getFingerForKey } from '@/lib/typing/finger-mapper';
import { countKoreanStrokes } from '@/lib/utils/helpers';
import { soundManager } from '@/lib/sound/sound-manager';

interface UseTypingEngineOptions {
  text: string;
  onComplete?: (result: TypingResult) => void;
  soundEnabled?: boolean;
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
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
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
    totalCountRef.current = 0;
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

    // Check completion
    if (newInput.length >= text.length) {
      setStatus('finished');
      const result = getResult();
      onComplete?.(result);
    }
  }, [status, text, onComplete]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status === 'finished') return;
    if (e.key === 'Escape' || e.key === 'Tab') return;

    const now = Date.now();
    const isCorrect = currentIndex < text.length && e.key === text[currentIndex];

    totalCountRef.current++;
    if (isCorrect) {
      correctCountRef.current++;
      setCombo((prev) => {
        const next = prev + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      if (soundEnabled && soundManager) {
        if (e.key === ' ') soundManager.play('keySpace');
        else if (e.key === 'Enter') soundManager.play('keyEnter');
        else soundManager.play('keyClick', Math.random() * 3);
      }
    } else if (e.key.length === 1) {
      setCombo(0);
      if (soundEnabled && soundManager) soundManager.play('keyError');
    }

    keystrokesRef.current.push({
      timestamp: now,
      isCorrect,
      key: e.key,
      code: e.code,
    });

    setLiveAccuracy(calculateAccuracy(correctCountRef.current, totalCountRef.current));
  }, [status, currentIndex, text, soundEnabled]);

  const getResult = useCallback((): TypingResult => {
    const now = Date.now();
    const elapsed = startTimeRef.current ? (now - startTimeRef.current) / 1000 : 0;
    const correct = correctCountRef.current;
    const correctText = text.substring(0, correct);
    const total = totalCountRef.current;

    return {
      kpm: calculateKPM(correctText, elapsed),
      wpm: calculateWPM(correct, elapsed),
      cpm: calculateCPM(correct, elapsed),
      accuracy: calculateAccuracy(correct, Math.max(total, 1)),
      maxSpeed: speedHistoryRef.current.length > 0 ? Math.max(...speedHistoryRef.current) : 0,
      consistency: calculateConsistency(speedHistoryRef.current),
      totalKeystrokes: total,
      correctKeystrokes: correct,
      errorKeystrokes: total - correct,
      elapsedTime: elapsed,
      fingerAccuracy: {} as TypingResult['fingerAccuracy'],
      keyAccuracy: {},
      speedHistory: [...speedHistoryRef.current],
      problemKeys: [],
    };
  }, [text]);

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

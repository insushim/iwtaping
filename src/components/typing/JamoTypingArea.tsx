'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CharState, TypingResult } from '@/types/typing';
import { TextDisplay } from './TextDisplay';
import { LiveStats } from './LiveStats';
import { ResultPanel } from './ResultPanel';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { calculateKPM, calculateAccuracy } from '@/lib/typing/wpm-calculator';
import { soundManager } from '@/lib/sound/sound-manager';

// 두벌식 physical key → jamo mapping (bypasses IME)
const DUBEOLSIK: Record<string, string> = {
  KeyQ: 'ㅂ', KeyW: 'ㅈ', KeyE: 'ㄷ', KeyR: 'ㄱ', KeyT: 'ㅅ',
  KeyY: 'ㅛ', KeyU: 'ㅕ', KeyI: 'ㅑ', KeyO: 'ㅐ', KeyP: 'ㅔ',
  KeyA: 'ㅁ', KeyS: 'ㄴ', KeyD: 'ㅇ', KeyF: 'ㄹ', KeyG: 'ㅎ',
  KeyH: 'ㅗ', KeyJ: 'ㅓ', KeyK: 'ㅏ', KeyL: 'ㅣ',
  KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyC: 'ㅊ', KeyV: 'ㅍ',
  KeyB: 'ㅠ', KeyN: 'ㅜ', KeyM: 'ㅡ',
};

const DUBEOLSIK_SHIFT: Record<string, string> = {
  KeyQ: 'ㅃ', KeyW: 'ㅉ', KeyE: 'ㄸ', KeyR: 'ㄲ', KeyT: 'ㅆ',
};

interface JamoTypingAreaProps {
  text: string;
  onComplete?: (result: TypingResult) => void;
  onRestart?: () => void;
  className?: string;
}

export function JamoTypingArea({ text, onComplete, onRestart, className = '' }: JamoTypingAreaProps) {
  const settings = useSettingsStore((s) => s.settings);
  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'ready' | 'typing' | 'finished'>('ready');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [result, setResult] = useState<TypingResult | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const speedHistoryRef = useRef<number[]>([]);

  // Initialize char states
  useEffect(() => {
    setCharStates(text.split('').map((char, i) => ({ char, status: i === 0 ? 'current' : 'pending' })));
    setCurrentIndex(0);
    setStatus('ready');
    setCombo(0);
    setMaxCombo(0);
    setLiveSpeed(0);
    setLiveAccuracy(100);
    setResult(null);
    startTimeRef.current = null;
    correctCountRef.current = 0;
    totalCountRef.current = 0;
    speedHistoryRef.current = [];
  }, [text]);

  // Speed interval
  useEffect(() => {
    if (status !== 'typing') return;
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const kpm = calculateKPM(text.substring(0, correctCountRef.current), elapsed);
        speedHistoryRef.current.push(kpm);
        setLiveSpeed(kpm);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [status, text]);

  const handleRestart = useCallback(() => {
    setCharStates(text.split('').map((char, i) => ({ char, status: i === 0 ? 'current' : 'pending' })));
    setCurrentIndex(0);
    setStatus('ready');
    setCombo(0);
    setMaxCombo(0);
    setLiveSpeed(0);
    setLiveAccuracy(100);
    setResult(null);
    startTimeRef.current = null;
    correctCountRef.current = 0;
    totalCountRef.current = 0;
    speedHistoryRef.current = [];
    onRestart?.();
  }, [text, onRestart]);

  // Keydown handler - directly maps physical keys to jamo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (status === 'finished') return;
      if (e.key === 'Escape') {
        handleRestart();
        return;
      }

      // Determine the jamo for this key
      let jamo: string | undefined;
      if (e.code === 'Space') {
        jamo = ' ';
      } else if (e.shiftKey && DUBEOLSIK_SHIFT[e.code]) {
        jamo = DUBEOLSIK_SHIFT[e.code];
      } else if (DUBEOLSIK[e.code]) {
        jamo = DUBEOLSIK[e.code];
      }

      if (!jamo) return;
      e.preventDefault(); // Prevent IME from activating

      if (status === 'ready') {
        setStatus('typing');
        startTimeRef.current = Date.now();
      }

      const idx = currentIndex;
      if (idx >= text.length) return;

      const targetChar = text[idx];
      const isCorrect = jamo === targetChar;
      totalCountRef.current++;

      if (isCorrect) {
        correctCountRef.current++;
        setCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        if (settings.keySound && soundManager) {
          soundManager.play('keyClick', Math.random() * 3);
        }
      } else {
        setCombo(0);
        if (settings.keySound && soundManager) {
          soundManager.play('keyError');
        }
      }

      setLiveAccuracy(calculateAccuracy(correctCountRef.current, totalCountRef.current));

      setCharStates((prev) => {
        const next = [...prev];
        next[idx] = { char: targetChar, status: isCorrect ? 'correct' : 'incorrect' };
        if (idx + 1 < next.length) {
          next[idx + 1] = { char: next[idx + 1].char, status: 'current' };
        }
        return next;
      });

      const nextIdx = idx + 1;
      setCurrentIndex(nextIdx);

      // Check completion
      if (nextIdx >= text.length) {
        setStatus('finished');
        const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
        const res: TypingResult = {
          kpm: calculateKPM(text.substring(0, correctCountRef.current), elapsed),
          wpm: 0,
          cpm: 0,
          accuracy: calculateAccuracy(correctCountRef.current, totalCountRef.current),
          maxSpeed: speedHistoryRef.current.length > 0 ? Math.max(...speedHistoryRef.current) : 0,
          consistency: 0,
          totalKeystrokes: totalCountRef.current,
          correctKeystrokes: correctCountRef.current,
          errorKeystrokes: totalCountRef.current - correctCountRef.current,
          elapsedTime: elapsed,
          fingerAccuracy: {} as TypingResult['fingerAccuracy'],
          keyAccuracy: {},
          speedHistory: [...speedHistoryRef.current],
          problemKeys: [],
        };
        setResult(res);
        onComplete?.(res);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, currentIndex, text, settings.keySound, handleRestart, onComplete]);

  if (result && status === 'finished') {
    return (
      <ResultPanel
        result={result}
        maxCombo={maxCombo}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <LiveStats
        speed={liveSpeed}
        accuracy={liveAccuracy}
        combo={combo}
        progress={text.length > 0 ? (currentIndex / text.length) * 100 : 0}
        status={status}
        speedUnit={settings.speedUnit}
      />

      <div
        className="relative mt-4 p-6 rounded-xl border border-[var(--key-border)] min-h-[120px]"
        style={{ background: 'var(--bg-card)' }}
      >
        <TextDisplay
          charStates={charStates}
          currentIndex={currentIndex}
          caretStyle={settings.caretStyle}
          fontSize={settings.fontSize}
        />
      </div>

      {status === 'ready' && (
        <p className="text-center mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          타이핑을 시작하세요 &middot; ESC로 재시작
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CharState, TypingResult } from '@/types/typing';
import { TextDisplay } from './TextDisplay';
import { LiveStats } from './LiveStats';
import { ResultPanel } from './ResultPanel';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTypingStore } from '@/stores/useTypingStore';
import { useStatsStore } from '@/stores/useStatsStore';
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
  const addSession = useTypingStore((s) => s.addSession);
  const recordSession = useStatsStore((s) => s.recordSession);
  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<'ready' | 'typing' | 'finished'>('ready');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [liveSpeed, setLiveSpeed] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [result, setResult] = useState<TypingResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const correctCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const speedHistoryRef = useRef<number[]>([]);
  const currentIndexRef = useRef(0);
  const statusRef = useRef<'ready' | 'typing' | 'finished'>('ready');

  // Keep refs in sync
  currentIndexRef.current = currentIndex;
  statusRef.current = status;

  // Initialize char states
  useEffect(() => {
    setCharStates(text.split('').map((char, i) => ({ char, status: i === 0 ? 'current' : 'pending' })));
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    setStatus('ready');
    statusRef.current = 'ready';
    setCombo(0);
    setMaxCombo(0);
    setLiveSpeed(0);
    setLiveAccuracy(100);
    setResult(null);
    startTimeRef.current = null;
    correctCountRef.current = 0;
    totalCountRef.current = 0;
    speedHistoryRef.current = [];
    // Focus the hidden input
    setTimeout(() => inputRef.current?.focus(), 100);
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
    currentIndexRef.current = 0;
    setStatus('ready');
    statusRef.current = 'ready';
    setCombo(0);
    setMaxCombo(0);
    setLiveSpeed(0);
    setLiveAccuracy(100);
    setResult(null);
    startTimeRef.current = null;
    correctCountRef.current = 0;
    totalCountRef.current = 0;
    speedHistoryRef.current = [];
    setTimeout(() => inputRef.current?.focus(), 100);
    onRestart?.();
  }, [text, onRestart]);

  // Process a single jamo input
  const processJamo = useCallback((jamo: string) => {
    if (statusRef.current === 'finished') return;

    if (statusRef.current === 'ready') {
      setStatus('typing');
      statusRef.current = 'typing';
      startTimeRef.current = Date.now();
    }

    const idx = currentIndexRef.current;
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
    currentIndexRef.current = nextIdx;

    // Check completion
    if (nextIdx >= text.length) {
      setStatus('finished');
      statusRef.current = 'finished';
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
      addSession({ mode: 'word', language: 'ko', text, result: res, timestamp: Date.now() });
      recordSession(res);
      onComplete?.(res);
    }
  }, [text, settings.keySound, onComplete, addSession, recordSession]);

  // Keydown handler - tries physical key mapping first
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (statusRef.current === 'finished') return;
      if (e.key === 'Escape') {
        handleRestart();
        return;
      }

      // Try physical key mapping (works when IME is off or e.code isn't 'Process')
      const code = e.code;
      let jamo: string | undefined;

      if (code === 'Space' || e.key === ' ') {
        jamo = ' ';
        e.preventDefault();
      } else if (code && code !== 'Process') {
        if (e.shiftKey && DUBEOLSIK_SHIFT[code]) {
          jamo = DUBEOLSIK_SHIFT[code];
        } else if (DUBEOLSIK[code]) {
          jamo = DUBEOLSIK[code];
        }
        if (jamo) e.preventDefault();
      }
      // If IME intercepted (code === 'Process'), let the hidden input handle it

      if (jamo) {
        processJamo(jamo);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRestart, processJamo]);

  // Hidden input handler - catches IME-composed jamo characters
  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const value = input.value;
    if (!value) return;

    // Process each character that was typed via IME
    for (const char of value) {
      const charCode = char.charCodeAt(0);
      // Accept jamo (ㄱ-ㅎ, ㅏ-ㅣ) and space
      if ((charCode >= 0x3131 && charCode <= 0x3163) || char === ' ') {
        processJamo(char);
      }
    }

    // Clear the input
    input.value = '';
  }, [processJamo]);

  // Focus input on click
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

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
    <div className={`w-full ${className}`} onClick={focusInput}>
      <LiveStats
        speed={liveSpeed}
        accuracy={liveAccuracy}
        combo={combo}
        progress={text.length > 0 ? (currentIndex / text.length) * 100 : 0}
        status={status}
        speedUnit={settings.speedUnit}
      />

      <div
        className="relative mt-4 p-6 rounded-xl border border-[var(--key-border)] cursor-text min-h-[120px]"
        style={{ background: 'var(--bg-card)' }}
      >
        <TextDisplay
          charStates={charStates}
          currentIndex={currentIndex}
          caretStyle={settings.caretStyle}
          fontSize={settings.fontSize}
        />

        {/* Hidden input to capture IME-composed jamo */}
        <input
          ref={inputRef}
          className="absolute opacity-0 w-0 h-0"
          style={{ position: 'absolute', left: -9999 }}
          onInput={handleInput}
          onCompositionEnd={(e) => {
            // When IME finishes composing, the result character appears
            const input = e.currentTarget;
            const value = input.value;
            if (value) {
              for (const char of value) {
                const charCode = char.charCodeAt(0);
                if ((charCode >= 0x3131 && charCode <= 0x3163) || char === ' ') {
                  processJamo(char);
                }
              }
              input.value = '';
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
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

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CharState, TypingResult } from '@/types/typing';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TextDisplay } from './TextDisplay';
import { LiveStats } from './LiveStats';
import { ResultPanel } from './ResultPanel';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTypingStore } from '@/stores/useTypingStore';
import { useStatsStore } from '@/stores/useStatsStore';

interface TypingAreaProps {
  text: string;
  onComplete?: (result: TypingResult) => void;
  onRestart?: () => void;
  onProgress?: (progress: number) => void;
  showKeyboard?: boolean;
  className?: string;
}

export function TypingArea({ text, onComplete, onRestart, onProgress, className = '' }: TypingAreaProps) {
  const settings = useSettingsStore((s) => s.settings);
  const addSession = useTypingStore((s) => s.addSession);
  const recordSession = useStatsStore((s) => s.recordSession);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<TypingResult | null>(null);

  const {
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
  } = useTypingEngine({
    text,
    onComplete: (r) => {
      setResult(r);
      // Record session for ranking & stats
      addSession({ mode: 'word', language: settings.language || 'ko', text, result: r, timestamp: Date.now() });
      recordSession(r);
      onComplete?.(r);
    },
    soundEnabled: settings.keySound,
  });

  // Report progress
  useEffect(() => {
    if (text.length > 0 && onProgress) {
      onProgress((currentIndex / text.length) * 100);
    }
  }, [currentIndex, text.length, onProgress]);

  // Focus input on mount and click
  useEffect(() => {
    inputRef.current?.focus();
  }, [text]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRestart();
        return;
      }
      handleKeyDown(e);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyDown]);

  const handleRestart = () => {
    reset();
    setInputValue('');
    setResult(null);
    inputRef.current?.focus();
    onRestart?.();
  };

  const handleCompositionStart = () => {
    // Korean IME composition started
  };

  const handleCompositionUpdate = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    const value = (e.target as HTMLTextAreaElement).value;
    handleInput(value, true);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    const value = (e.target as HTMLTextAreaElement).value;
    setInputValue(value);
    handleInput(value, false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    // Only process if not composing (composition events handle Korean)
    if (!(e.nativeEvent as InputEvent).isComposing) {
      handleInput(value, false);
    }
  };

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

        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionUpdate={handleCompositionUpdate}
          onCompositionEnd={handleCompositionEnd}
          className="absolute inset-0 opacity-0 w-full h-full resize-none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="타이핑 입력"
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

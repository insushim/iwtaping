'use client';

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { CharState, TypingResult } from '@/types/typing';
import { useTypingEngine } from '@/hooks/useTypingEngine';
import { TextDisplay, TypedLine } from './TextDisplay';
import { LiveStats } from './LiveStats';
import { ResultPanel } from './ResultPanel';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTypingStore } from '@/stores/useTypingStore';
import { useStatsStore } from '@/stores/useStatsStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { useMascotStore } from '@/stores/useMascotStore';
import { useCelebrationStore } from '../common/CelebrationOverlay';

interface TypingAreaProps {
  text: string;
  onComplete?: (result: TypingResult) => void;
  onRestart?: () => void;
  onProgress?: (progress: number) => void;
  /** 첫 타건으로 타이핑이 실제 시작될 때 1회 호출(시간제한 테스트 타이머 시작용). */
  onStart?: () => void;
  /** 커서가 이동할 때마다 다음에 칠 목표 문자를 통지(가상 키보드 타겟 하이라이트용). */
  onCurrentChar?: (char: string) => void;
  /** false면 완료 시 결과 패널을 표시하지 않는다(다문장 러너가 직접 진행 제어). 기본 true. */
  showResult?: boolean;
  showKeyboard?: boolean;
  className?: string;
}

/** 외부에서 시간제한 등으로 즉시 종료를 명령하기 위한 핸들. */
export interface TypingAreaHandle {
  finish: () => void;
}

export const TypingArea = forwardRef<TypingAreaHandle, TypingAreaProps>(function TypingArea(
  { text, onComplete, onRestart, onProgress, onStart, onCurrentChar, showResult = true, className = '' },
  ref,
) {
  const settings = useSettingsStore((s) => s.settings);
  const addSession = useTypingStore((s) => s.addSession);
  const recordSession = useStatsStore((s) => s.recordSession);
  const { addXP, addCoins } = useProgressStore();
  const { setMood, showMessage } = useMascotStore();
  const { trigger: celebrate } = useCelebrationStore();
  const bestKpm = useStatsStore((s) => s.stats.bestKpm);
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
    finish,
    reset,
  } = useTypingEngine({
    text,
    onComplete: (r) => {
      setResult(r);
      // Record session for ranking & stats
      addSession({ mode: 'word', language: settings.language || 'ko', text, result: r, timestamp: Date.now() });
      recordSession(r, { maxCombo, language: settings.language === 'en' ? 'en' : 'ko' });

      // Mascot reaction
      if (r.accuracy >= 98 && r.kpm >= 300) {
        setMood('cheering');
        showMessage('완벽해! 진짜 대단해! 🌟', 3000);
      } else if (r.accuracy >= 95) {
        setMood('excited');
        showMessage('잘했어! 훌륭한 정확도! 👏', 3000);
      } else if (r.accuracy >= 85) {
        setMood('happy');
        showMessage('좋아! 계속 이렇게! 💪', 3000);
      } else {
        setMood('thinking');
        showMessage('조금 더 천천히 정확하게 해볼까? 🤔', 3000);
      }

      // Check personal best
      if (r.kpm > bestKpm && bestKpm > 0) {
        celebrate({
          type: 'personal_best',
          title: '새로운 최고 기록!',
          subtitle: `${Math.round(r.kpm)} 타/분`,
          icon: '🏆',
        });
      }

      onComplete?.(r);
    },
    soundEnabled: settings.keySound,
  });

  // 외부(시간제한 테스트)에서 즉시 종료 명령을 받기 위한 핸들
  useImperativeHandle(ref, () => ({ finish }), [finish]);

  // 첫 타건으로 typing 상태 진입 시 1회 onStart 통지(타이머 시작)
  const startedNotifiedRef = useRef(false);
  useEffect(() => {
    if (status === 'typing' && !startedNotifiedRef.current) {
      startedNotifiedRef.current = true;
      onStart?.();
    }
    if (status === 'ready') startedNotifiedRef.current = false;
  }, [status, onStart]);

  // Report progress
  useEffect(() => {
    if (text.length > 0 && onProgress) {
      onProgress((currentIndex / text.length) * 100);
    }
  }, [currentIndex, text.length, onProgress]);

  // 다음에 칠 목표 문자 통지(가상 키보드 하이라이트)
  useEffect(() => {
    onCurrentChar?.(status === 'finished' ? '' : (text[currentIndex] ?? ''));
  }, [currentIndex, text, status, onCurrentChar]);

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
    setInputValue(value); // 합성 중인 글자도 아래 입력 라인에 즉시 반영
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

  if (showResult && result && status === 'finished') {
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

        <TypedLine typed={inputValue} target={text} fontSize={settings.fontSize} />

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
});

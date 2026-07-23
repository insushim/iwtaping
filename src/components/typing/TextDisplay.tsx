'use client';

import { useRef, useEffect } from 'react';
import { CharState, CaretStyle } from '@/types/typing';
import { FONT_SIZES } from '@/lib/utils/constants';

interface TextDisplayProps {
  charStates: CharState[];
  currentIndex: number;
  caretStyle?: CaretStyle;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** 현재 타이핑 중인 단어에 배경 하이라이트를 준다(한컴 타자연습 스타일). */
  highlightCurrentWord?: boolean;
}

/** currentIndex가 속한 단어(공백으로 구분)의 [start,end) 범위를 구한다. */
function currentWordRange(charStates: CharState[], currentIndex: number): [number, number] {
  const n = charStates.length;
  if (n === 0) return [0, 0];
  const idx = Math.min(currentIndex, n - 1);
  if (charStates[idx]?.char === ' ') return [idx, idx];
  let start = idx;
  while (start > 0 && charStates[start - 1].char !== ' ') start--;
  let end = idx;
  while (end < n && charStates[end].char !== ' ') end++;
  return [start, end];
}

export function TextDisplay({
  charStates,
  currentIndex,
  caretStyle = 'line',
  fontSize = 'md',
  highlightCurrentWord = true,
}: TextDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (caretRef.current) {
      caretRef.current.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
    }
  }, [currentIndex]);

  const statusClass = (status: CharState['status']) => {
    switch (status) {
      case 'correct': return 'typing-correct';
      case 'incorrect': return 'typing-incorrect';
      case 'current': return 'typing-current';
      case 'composing': return 'typing-composing';
      default: return 'typing-pending';
    }
  };

  const size = FONT_SIZES[fontSize];
  const [wStart, wEnd] = highlightCurrentWord ? currentWordRange(charStates, currentIndex) : [-1, -1];

  return (
    <div
      ref={containerRef}
      className="relative leading-relaxed select-none overflow-hidden"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: `${size}px`,
        lineHeight: '1.8',
        maxHeight: `${size * 1.8 * 5}px`,
      }}
    >
      {charStates.map((cs, i) => {
        const inWord = i >= wStart && i < wEnd;
        return (
          <span
            key={i}
            className={`typing-char ${statusClass(cs.status)} relative`}
            style={inWord ? { background: 'rgba(108,92,231,0.16)', borderRadius: 2 } : undefined}
          >
            {i === currentIndex && (
              <span
                ref={caretRef}
                className={`absolute caret-blink ${caretStyle === 'block' ? 'inset-0 rounded-sm' : caretStyle === 'underline' ? 'bottom-0 left-0 right-0 h-0.5' : 'top-0 bottom-0 left-0 w-0.5'}`}
                style={{
                  background: caretStyle === 'block' ? 'rgba(0,210,211,0.3)' : 'var(--typing-caret)',
                }}
              />
            )}
            {cs.char === ' ' ? ' ' : cs.char}
          </span>
        );
      })}
    </div>
  );
}

interface TypedLineProps {
  /** 사용자가 실제로 입력한 문자열(합성 중 포함). */
  typed: string;
  /** 목표 문자열 — 글자별 정오 판정 기준. */
  target: string;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * 한컴 타자연습처럼 "내가 지금 친 글자"를 목표 텍스트 아래에 그대로 보여준다.
 * 하이라이트만으로는 무엇을 틀렸는지 알기 어렵다는 피드백 반영.
 */
export function TypedLine({ typed, target, fontSize = 'md' }: TypedLineProps) {
  const size = FONT_SIZES[fontSize];
  const chars = typed.split('');

  return (
    <div
      className="mt-3 pt-3 border-t border-[var(--key-border)]"
      aria-label="입력한 글자"
    >
      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        내가 입력한 글자
      </div>
      <div
        className="leading-relaxed select-none min-h-[1.8em] break-all"
        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: `${size}px`, lineHeight: '1.8' }}
      >
        {chars.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>여기에 입력한 글자가 표시돼요…</span>
        ) : (
          <>
            {chars.map((ch, i) => {
              const ok = i < target.length && ch === target[i];
              return (
                <span
                  key={i}
                  style={{
                    color: ok ? 'var(--color-success)' : 'var(--color-error)',
                    background: ok ? 'transparent' : 'rgba(255,71,87,0.14)',
                    borderRadius: 2,
                    fontWeight: ok ? 400 : 700,
                  }}
                >
                  {ch === ' ' ? ' ' : ch}
                </span>
              );
            })}
            <span
              className="caret-blink"
              style={{ display: 'inline-block', width: 2, height: '1.1em', verticalAlign: 'text-bottom', background: 'var(--typing-caret)' }}
            />
          </>
        )}
      </div>
    </div>
  );
}

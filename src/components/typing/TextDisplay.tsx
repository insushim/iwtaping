'use client';

import { useRef, useEffect } from 'react';
import { CharState, CaretStyle } from '@/types/typing';
import { FONT_SIZES } from '@/lib/utils/constants';

interface TextDisplayProps {
  charStates: CharState[];
  currentIndex: number;
  caretStyle?: CaretStyle;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl';
}

export function TextDisplay({ charStates, currentIndex, caretStyle = 'line', fontSize = 'md' }: TextDisplayProps) {
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
      {charStates.map((cs, i) => (
        <span key={i} className={`typing-char ${statusClass(cs.status)} relative`}>
          {i === currentIndex && (
            <span
              ref={caretRef}
              className={`absolute caret-blink ${caretStyle === 'block' ? 'inset-0 rounded-sm' : caretStyle === 'underline' ? 'bottom-0 left-0 right-0 h-0.5' : 'top-0 bottom-0 left-0 w-0.5'}`}
              style={{
                background: caretStyle === 'block' ? 'rgba(0,210,211,0.3)' : 'var(--typing-caret)',
              }}
            />
          )}
          {cs.char === ' ' ? '\u00A0' : cs.char}
        </span>
      ))}
    </div>
  );
}

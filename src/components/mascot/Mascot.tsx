'use client';

import { useMascotStore, MascotMood } from '@/stores/useMascotStore';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  showBubble?: boolean;
}

// Pure SVG cat mascot - "타비" (Tabby)
export function Mascot({ mood: moodOverride, size = 120, className = '', showBubble: showBubbleOverride }: MascotProps) {
  const { mascot } = useMascotStore();
  const mood = moodOverride || mascot.mood;
  const showBubble = showBubbleOverride ?? mascot.showBubble;

  const animClass = getMoodAnimation(mood);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: size + 30 }}>
      {/* Speech bubble */}
      {showBubble && mascot.message && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap slide-down z-10"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--key-border)',
            color: 'var(--text-primary)',
            maxWidth: 200,
            whiteSpace: 'normal',
            textAlign: 'center',
          }}
        >
          {mascot.message}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
            style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--key-border)', borderBottom: '1px solid var(--key-border)' }}
          />
        </div>
      )}

      {/* Cat SVG */}
      <div className={animClass} style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size}>
          {/* Body */}
          <ellipse cx="60" cy="85" rx="28" ry="22" fill="#6C5CE7" />

          {/* Head */}
          <circle cx="60" cy="50" r="26" fill="#A29BFE" />

          {/* Ears */}
          <polygon points="38,32 30,8 48,26" fill="#A29BFE" />
          <polygon points="82,32 90,8 72,26" fill="#A29BFE" />
          <polygon points="40,30 34,14 47,26" fill="#FD79A8" />
          <polygon points="80,30 86,14 73,26" fill="#FD79A8" />

          {/* Eyes */}
          {mood === 'sleeping' ? (
            <>
              <line x1="48" y1="48" x2="56" y2="48" stroke="#1A1A3E" strokeWidth="2" strokeLinecap="round" />
              <line x1="64" y1="48" x2="72" y2="48" stroke="#1A1A3E" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : mood === 'sad' ? (
            <>
              <circle cx="50" cy="48" r="4" fill="#1A1A3E" />
              <circle cx="70" cy="48" r="4" fill="#1A1A3E" />
              <circle cx="52" cy="46" r="1.5" fill="white" />
              <circle cx="72" cy="46" r="1.5" fill="white" />
              {/* Tear */}
              <ellipse cx="54" cy="56" rx="2" ry="3" fill="#48DBFB" opacity="0.7" />
            </>
          ) : mood === 'excited' || mood === 'cheering' ? (
            <>
              {/* Star eyes */}
              <text x="50" y="53" textAnchor="middle" fontSize="12" fill="#FECA57">★</text>
              <text x="70" y="53" textAnchor="middle" fontSize="12" fill="#FECA57">★</text>
            </>
          ) : (
            <>
              <circle cx="50" cy="48" r="4.5" fill="#1A1A3E" />
              <circle cx="70" cy="48" r="4.5" fill="#1A1A3E" />
              <circle cx="52" cy="46" r="2" fill="white" />
              <circle cx="72" cy="46" r="2" fill="white" />
            </>
          )}

          {/* Nose */}
          <ellipse cx="60" cy="55" rx="2.5" ry="2" fill="#FD79A8" />

          {/* Mouth */}
          {mood === 'happy' || mood === 'excited' || mood === 'cheering' ? (
            <path d="M54,58 Q60,65 66,58" fill="none" stroke="#1A1A3E" strokeWidth="1.5" strokeLinecap="round" />
          ) : mood === 'sad' ? (
            <path d="M54,62 Q60,57 66,62" fill="none" stroke="#1A1A3E" strokeWidth="1.5" strokeLinecap="round" />
          ) : (
            <>
              <path d="M54,58 Q57,61 60,58" fill="none" stroke="#1A1A3E" strokeWidth="1" strokeLinecap="round" />
              <path d="M60,58 Q63,61 66,58" fill="none" stroke="#1A1A3E" strokeWidth="1" strokeLinecap="round" />
            </>
          )}

          {/* Whiskers */}
          <line x1="35" y1="52" x2="46" y2="54" stroke="#1A1A3E" strokeWidth="0.8" opacity="0.5" />
          <line x1="35" y1="56" x2="46" y2="56" stroke="#1A1A3E" strokeWidth="0.8" opacity="0.5" />
          <line x1="74" y1="54" x2="85" y2="52" stroke="#1A1A3E" strokeWidth="0.8" opacity="0.5" />
          <line x1="74" y1="56" x2="85" y2="56" stroke="#1A1A3E" strokeWidth="0.8" opacity="0.5" />

          {/* Paws */}
          <ellipse cx="44" cy="100" rx="8" ry="5" fill="#A29BFE" />
          <ellipse cx="76" cy="100" rx="8" ry="5" fill="#A29BFE" />

          {/* Tail */}
          <path d="M88,85 Q100,75 95,60" fill="none" stroke="#6C5CE7" strokeWidth="5" strokeLinecap="round" />

          {/* Belly */}
          <ellipse cx="60" cy="88" rx="14" ry="12" fill="#C4B5FD" opacity="0.5" />

          {/* Blush */}
          {(mood === 'happy' || mood === 'excited' || mood === 'cheering') && (
            <>
              <circle cx="42" cy="56" r="4" fill="#FD79A8" opacity="0.3" />
              <circle cx="78" cy="56" r="4" fill="#FD79A8" opacity="0.3" />
            </>
          )}

          {/* Sleeping Zzz */}
          {mood === 'sleeping' && (
            <g opacity="0.6">
              <text x="78" y="38" fontSize="10" fill="var(--color-secondary)" fontWeight="bold">z</text>
              <text x="85" y="28" fontSize="8" fill="var(--color-secondary)" fontWeight="bold">z</text>
              <text x="90" y="20" fontSize="6" fill="var(--color-secondary)" fontWeight="bold">z</text>
            </g>
          )}

          {/* Typing hands animation hint */}
          {mood === 'typing' && (
            <g opacity="0.8">
              <ellipse cx="44" cy="96" rx="6" ry="3" fill="#A29BFE">
                <animate attributeName="ry" values="3;4;3" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx="76" cy="96" rx="6" ry="3" fill="#A29BFE">
                <animate attributeName="ry" values="4;3;4" dur="0.3s" repeatCount="indefinite" />
              </ellipse>
            </g>
          )}

          {/* Cheering arms */}
          {mood === 'cheering' && (
            <>
              <line x1="38" y1="80" x2="24" y2="60" stroke="#A29BFE" strokeWidth="5" strokeLinecap="round">
                <animate attributeName="x2" values="24;20;24" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="y2" values="60;56;60" dur="0.5s" repeatCount="indefinite" />
              </line>
              <line x1="82" y1="80" x2="96" y2="60" stroke="#A29BFE" strokeWidth="5" strokeLinecap="round">
                <animate attributeName="x2" values="96;100;96" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="y2" values="60;56;60" dur="0.5s" repeatCount="indefinite" />
              </line>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function getMoodAnimation(mood: MascotMood): string {
  switch (mood) {
    case 'happy': return '';
    case 'excited': return 'bounce-in';
    case 'sad': return '';
    case 'sleeping': return '';
    case 'cheering': return '';
    case 'thinking': return 'float';
    case 'typing': return '';
    case 'idle':
    default: return 'float';
  }
}

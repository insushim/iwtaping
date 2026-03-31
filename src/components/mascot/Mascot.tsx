'use client';

import { useMascotStore, MascotMood } from '@/stores/useMascotStore';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  showBubble?: boolean;
}

export function Mascot({ mood: moodOverride, size = 120, className = '', showBubble: showBubbleOverride }: MascotProps) {
  const { mascot } = useMascotStore();
  const mood = moodOverride || mascot.mood;
  const showBubble = showBubbleOverride ?? mascot.showBubble;

  const animStyle = getMoodStyle(mood);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Speech bubble - positioned above */}
      {showBubble && mascot.message && (
        <div
          className="mb-2 px-4 py-2 rounded-2xl text-xs font-medium slide-down"
          style={{
            background: 'rgba(108,92,231,0.12)',
            border: '1px solid rgba(108,92,231,0.25)',
            color: 'var(--text-primary)',
            maxWidth: 260,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {mascot.message}
        </div>
      )}

      {/* Mascot SVG */}
      <div style={{ ...animStyle, width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#C4B5FD" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </radialGradient>
            <radialGradient id="headGrad" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#DDD6FE" />
              <stop offset="100%" stopColor="#A78BFA" />
            </radialGradient>
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Tail */}
          <path d="M78,72 C88,65 92,52 85,45" fill="none" stroke="#8B5CF6" strokeWidth="4.5" strokeLinecap="round">
            {(mood === 'happy' || mood === 'excited' || mood === 'cheering') && (
              <animateTransform attributeName="transform" type="rotate" values="-5,78,72;5,78,72;-5,78,72" dur="0.6s" repeatCount="indefinite" />
            )}
          </path>

          {/* Body - rounded blob */}
          <ellipse cx="50" cy="75" rx="24" ry="18" fill="url(#bodyGrad)" />
          {/* Belly */}
          <ellipse cx="50" cy="77" rx="15" ry="12" fill="#EDE9FE" opacity="0.6" />

          {/* Paws */}
          <ellipse cx="36" cy="88" rx="7" ry="4.5" fill="#A78BFA" />
          <ellipse cx="64" cy="88" rx="7" ry="4.5" fill="#A78BFA" />
          {/* Paw pads */}
          <circle cx="36" cy="89" r="1.5" fill="#DDD6FE" opacity="0.5" />
          <circle cx="64" cy="89" r="1.5" fill="#DDD6FE" opacity="0.5" />

          {/* Head - large round */}
          <circle cx="50" cy="42" r="28" fill="url(#headGrad)" />

          {/* Ears */}
          <path d="M26,26 L18,4 L38,20 Z" fill="#A78BFA" />
          <path d="M74,26 L82,4 L62,20 Z" fill="#A78BFA" />
          {/* Inner ears */}
          <path d="M27,24 L21,8 L36,20 Z" fill="#F9A8D4" opacity="0.6" />
          <path d="M73,24 L79,8 L64,20 Z" fill="#F9A8D4" opacity="0.6" />

          {/* Face */}
          {renderEyes(mood)}
          {renderMouth(mood)}

          {/* Nose */}
          <ellipse cx="50" cy="46" rx="2.8" ry="2" fill="#F472B6" />
          {/* Nose highlight */}
          <ellipse cx="49.2" cy="45.3" rx="1" ry="0.6" fill="white" opacity="0.4" />

          {/* Whiskers */}
          <g opacity="0.3" stroke="#7C3AED" strokeWidth="0.6">
            <line x1="35" y1="44" x2="20" y2="41" />
            <line x1="35" y1="47" x2="19" y2="48" />
            <line x1="35" y1="50" x2="20" y2="53" />
            <line x1="65" y1="44" x2="80" y2="41" />
            <line x1="65" y1="47" x2="81" y2="48" />
            <line x1="65" y1="50" x2="80" y2="53" />
          </g>

          {/* Blush */}
          {(mood === 'happy' || mood === 'excited' || mood === 'cheering' || mood === 'idle') && (
            <>
              <circle cx="32" cy="50" r="5" fill="url(#blushGrad)" />
              <circle cx="68" cy="50" r="5" fill="url(#blushGrad)" />
            </>
          )}

          {/* Mood-specific decorations */}
          {mood === 'sleeping' && (
            <g>
              <text x="72" y="28" fontSize="9" fill="#A78BFA" fontWeight="bold" opacity="0.7">z</text>
              <text x="79" y="20" fontSize="7" fill="#A78BFA" fontWeight="bold" opacity="0.5">z</text>
              <text x="84" y="14" fontSize="5" fill="#A78BFA" fontWeight="bold" opacity="0.3">z</text>
            </g>
          )}

          {mood === 'excited' && (
            <g>
              <text x="18" y="22" fontSize="8" fill="#FBBF24" opacity="0.8">✦</text>
              <text x="78" y="18" fontSize="6" fill="#FBBF24" opacity="0.6">✦</text>
              <text x="12" y="38" fontSize="5" fill="#FBBF24" opacity="0.4">✦</text>
            </g>
          )}

          {mood === 'cheering' && (
            <>
              {/* Raised paws */}
              <circle cx="24" cy="55" r="5" fill="#A78BFA" />
              <circle cx="76" cy="55" r="5" fill="#A78BFA" />
              <text x="14" y="20" fontSize="7" fill="#FBBF24" opacity="0.7">✦</text>
              <text x="82" y="20" fontSize="7" fill="#FBBF24" opacity="0.7">✦</text>
              <text x="50" y="10" fontSize="6" fill="#F472B6" opacity="0.5" textAnchor="middle">♥</text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function renderEyes(mood: MascotMood) {
  if (mood === 'sleeping') {
    return (
      <>
        <path d="M38,39 Q42,42 46,39" fill="none" stroke="#4C1D95" strokeWidth="2" strokeLinecap="round" />
        <path d="M54,39 Q58,42 62,39" fill="none" stroke="#4C1D95" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }

  if (mood === 'sad') {
    return (
      <>
        {/* Big round sad eyes */}
        <circle cx="40" cy="38" r="5.5" fill="white" />
        <circle cx="60" cy="38" r="5.5" fill="white" />
        <circle cx="41" cy="39" r="3.5" fill="#4C1D95" />
        <circle cx="61" cy="39" r="3.5" fill="#4C1D95" />
        <circle cx="42" cy="37.5" r="1.5" fill="white" />
        <circle cx="62" cy="37.5" r="1.5" fill="white" />
        {/* Sad eyebrows */}
        <line x1="35" y1="31" x2="45" y2="30" stroke="#4C1D95" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="30" x2="65" y2="31" stroke="#4C1D95" strokeWidth="1.5" strokeLinecap="round" />
        {/* Tear */}
        <ellipse cx="46" cy="45" rx="1.5" ry="2.5" fill="#93C5FD" opacity="0.7" />
      </>
    );
  }

  if (mood === 'excited' || mood === 'cheering') {
    return (
      <>
        {/* Sparkle eyes */}
        <circle cx="40" cy="38" r="6" fill="white" />
        <circle cx="60" cy="38" r="6" fill="white" />
        <circle cx="40" cy="38" r="4" fill="#4C1D95" />
        <circle cx="60" cy="38" r="4" fill="#4C1D95" />
        {/* Big sparkle highlights */}
        <circle cx="42" cy="36" r="2" fill="white" />
        <circle cx="62" cy="36" r="2" fill="white" />
        <circle cx="38.5" cy="39.5" r="1" fill="white" opacity="0.7" />
        <circle cx="58.5" cy="39.5" r="1" fill="white" opacity="0.7" />
      </>
    );
  }

  // Default / happy / thinking / typing / idle
  return (
    <>
      {/* Big cute eyes */}
      <circle cx="40" cy="38" r="5.5" fill="white" />
      <circle cx="60" cy="38" r="5.5" fill="white" />
      {/* Pupils */}
      <circle cx="41" cy="38.5" r="3.5" fill="#4C1D95" />
      <circle cx="61" cy="38.5" r="3.5" fill="#4C1D95" />
      {/* Highlights */}
      <circle cx="42.5" cy="36.5" r="1.8" fill="white" />
      <circle cx="62.5" cy="36.5" r="1.8" fill="white" />
      <circle cx="39.5" cy="39.5" r="0.8" fill="white" opacity="0.6" />
      <circle cx="59.5" cy="39.5" r="0.8" fill="white" opacity="0.6" />
    </>
  );
}

function renderMouth(mood: MascotMood) {
  if (mood === 'happy' || mood === 'excited' || mood === 'cheering') {
    return (
      <path d="M44,50 Q47,55 50,50 Q53,55 56,50" fill="none" stroke="#4C1D95" strokeWidth="1.3" strokeLinecap="round" />
    );
  }
  if (mood === 'sad') {
    return (
      <path d="M44,53 Q50,49 56,53" fill="none" stroke="#4C1D95" strokeWidth="1.3" strokeLinecap="round" />
    );
  }
  if (mood === 'sleeping') {
    return (
      <path d="M46,50 Q50,52 54,50" fill="none" stroke="#4C1D95" strokeWidth="1" strokeLinecap="round" />
    );
  }
  // Default cat mouth (w shape)
  return (
    <path d="M45,50 Q47.5,52.5 50,50 Q52.5,52.5 55,50" fill="none" stroke="#4C1D95" strokeWidth="1" strokeLinecap="round" />
  );
}

function getMoodStyle(mood: MascotMood): React.CSSProperties {
  switch (mood) {
    case 'excited':
    case 'cheering':
      return { animation: 'mascot-bounce 0.6s ease-in-out infinite' };
    case 'sleeping':
      return { animation: 'mascot-sleep 3s ease-in-out infinite' };
    case 'thinking':
    case 'idle':
      return { animation: 'float 3s ease-in-out infinite' };
    default:
      return {};
  }
}

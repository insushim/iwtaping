'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TypingArea } from '@/components/typing/TypingArea';
import { shuffleArray } from '@/lib/utils/helpers';
import { TypingResult } from '@/types/typing';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { generateKoreanSentence, generateEnglishSentence } from '@/lib/content/word-generator';

interface Car { name: string; progress: number; speed: number; color: string; isPlayer: boolean; }

const AI_SPEEDS = [
  { name: 'AI 초급', speed: 0.5, color: '#48DBFB' },
  { name: 'AI 중급', speed: 1.2, color: '#FECA57' },
  { name: 'AI 고급', speed: 2.2, color: '#FF6B6B' },
];

export default function RaceGamePage() {
  const { settings } = useSettingsStore();
  const [status, setStatus] = useState<'menu' | 'countdown' | 'racing' | 'finished'>('menu');
  const [text, setText] = useState('');
  const [cars, setCars] = useState<Car[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [playerProgress, setPlayerProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isKorean = settings.language === 'ko';

  const loadText = async () => {
    try {
      if (settings.language === 'ko') {
        const mod = await import('@/data/korean/sentences-short');
        const sentences = shuffleArray(mod.koreanSentencesShort).slice(0, 3);
        let t = sentences.map(s => s.text).join(' ');
        // Add procedurally generated sentences
        for (let i = 0; i < 2; i++) t += ' ' + generateKoreanSentence();
        setText(t);
      } else {
        const mod = await import('@/data/english/sentences-short');
        const sentences = shuffleArray(mod.englishSentencesShort).slice(0, 3);
        let t = sentences.map(s => s.text).join(' ');
        for (let i = 0; i < 2; i++) t += ' ' + generateEnglishSentence();
        setText(t);
      }
    } catch {
      const s = isKorean
        ? Array.from({ length: 5 }, () => generateKoreanSentence()).join(' ')
        : Array.from({ length: 5 }, () => generateEnglishSentence()).join(' ');
      setText(s);
    }
  };

  const startRace = async () => {
    await loadText();
    setCars([
      { name: isKorean ? '플레이어' : 'Player', progress: 0, speed: 0, color: '#6C5CE7', isPlayer: true },
      ...AI_SPEEDS.map(ai => ({ ...ai, name: isKorean ? ai.name : ai.name.replace('AI 초급', 'AI Easy').replace('AI 중급', 'AI Medium').replace('AI 고급', 'AI Hard'), progress: 0, isPlayer: false })),
    ]);
    setPlayerProgress(0);
    setStatus('countdown');
    setCountdown(3);
  };

  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) { setStatus('racing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== 'racing') return;
    intervalRef.current = setInterval(() => {
      setCars(prev => {
        const updated = prev.map(car => {
          if (car.isPlayer) return car;
          // Natural speed variation: sometimes pause, sometimes burst
          const variation = 0.3 + Math.random() * 1.4; // 0.3x ~ 1.7x
          const newProgress = Math.min(100, car.progress + car.speed * 0.2 * variation);
          return { ...car, progress: newProgress };
        });
        // End race if any AI finishes
        const anyFinished = updated.some(c => !c.isPlayer && c.progress >= 100);
        if (anyFinished) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setStatus('finished'), 0);
        }
        return updated;
      });
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  const handleProgress = (progress: number) => {
    setPlayerProgress(progress);
    setCars(prev => prev.map(car => car.isPlayer ? { ...car, progress } : car));
    if (progress >= 100) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setStatus('finished');
    }
  };

  const handleComplete = (result: TypingResult) => {
    setCars(prev => prev.map(car => car.isPlayer ? { ...car, progress: 100 } : car));
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('finished');
  };

  const rank = [...cars].sort((a, b) => b.progress - a.progress);
  const playerRank = rank.findIndex(c => c.isPlayer) + 1;

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">
          <svg viewBox="0 0 80 80" width="80" height="80" className="mx-auto">
            <rect width="80" height="80" rx="16" fill="#0A0A2E"/>
            <g transform="translate(40,40)">
              <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#6C5CE7"/>
              <rect x="-22" y="-4" width="6" height="8" rx="2" fill="#A29BFE"/>
              <rect x="16" y="-4" width="6" height="8" rx="2" fill="#A29BFE"/>
              <rect x="-14" y="-12" width="28" height="8" rx="3" fill="#4A3FAF"/>
              <rect x="-10" y="-11" width="8" height="5" rx="1" fill="rgba(72,219,251,0.5)"/>
              <rect x="2" y="-11" width="8" height="5" rx="1" fill="rgba(72,219,251,0.5)"/>
              <circle cx="-12" cy="10" r="4" fill="#333" stroke="#555" strokeWidth="1"/>
              <circle cx="12" cy="10" r="4" fill="#333" stroke="#555" strokeWidth="1"/>
              <rect x="18" y="-2" width="8" height="2" rx="1" fill="#FF6B6B" opacity="0.8"/>
            </g>
            <text x="40" y="70" textAnchor="middle" fill="#FECA57" fontSize="8" fontFamily="monospace" fontWeight="bold">RACE</text>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {isKorean ? '타이핑 레이스' : 'Typing Race'}
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {isKorean ? 'AI와 타이핑 속도 대결!' : 'Race against AI opponents!'}
        </p>
        <Button size="lg" onClick={startRace}>{isKorean ? '레이스 시작' : 'Start Race'}</Button>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-8xl font-bold neon-text" style={{ fontFamily: "'Outfit'", color: 'var(--color-primary)' }}>{countdown}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      {/* Race track */}
      <Card className="p-4 mb-4">
        {cars.map((car, i) => (
          <div key={i} className="mb-3">
            <div className="flex items-center gap-2 text-sm mb-1">
              <span style={{ color: car.color, fontWeight: 'bold', fontFamily: "'JetBrains Mono'" }}>{car.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono'" }}>{Math.round(car.progress)}%</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden relative" style={{ background: 'var(--bg-tertiary)' }}>
              {/* Track markings */}
              <div className="absolute inset-0 flex items-center">
                {[25, 50, 75].map(p => (
                  <div key={p} className="absolute h-full w-px" style={{ left: `${p}%`, background: 'rgba(255,255,255,0.05)' }} />
                ))}
              </div>
              <div className="h-full rounded-lg transition-all duration-200 flex items-center justify-end pr-2"
                style={{ width: `${Math.max(5, car.progress)}%`, background: `linear-gradient(90deg, ${car.color}40, ${car.color})` }}>
                <span className="text-sm">
                  {car.isPlayer ? (
                    <svg viewBox="0 0 24 12" width="24" height="12">
                      <rect x="2" y="1" width="20" height="10" rx="3" fill={car.color}/>
                      <rect x="0" y="3" width="4" height="6" rx="1" fill="#A29BFE"/>
                      <rect x="20" y="3" width="4" height="6" rx="1" fill="#A29BFE"/>
                      <circle cx="6" cy="12" r="2" fill="#333"/>
                      <circle cx="18" cy="12" r="2" fill="#333"/>
                    </svg>
                  ) : '🚗'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {status === 'racing' && text && (
        <TypingArea text={text} onComplete={handleComplete} onProgress={handleProgress} />
      )}

      {status === 'finished' && (
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>
            {isKorean ? '레이스 완료!' : 'Race Complete!'}
          </h2>
          <p className="text-sm mb-6" style={{
            color: playerRank === 1 ? 'var(--color-success)' : playerRank === 2 ? 'var(--color-accent-warm)' : 'var(--text-secondary)',
            fontWeight: playerRank <= 2 ? 'bold' : 'normal',
          }}>
            {playerRank === 1 ? (isKorean ? '1등! 축하합니다!' : '1st Place! Congratulations!') :
             playerRank === 2 ? (isKorean ? '2등! 잘했어요!' : '2nd Place! Well done!') :
             (isKorean ? `${playerRank}등` : `${playerRank}th Place`)}
          </p>
          <div className="max-w-sm mx-auto">
            {rank.map((car, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[var(--key-border)]"
                style={{ background: car.isPlayer ? 'rgba(108,92,231,0.1)' : 'transparent', borderRadius: car.isPlayer ? 8 : 0, padding: car.isPlayer ? '0.625rem 0.75rem' : undefined }}>
                <span className="text-lg font-bold w-8 text-center" style={{
                  color: i === 0 ? '#FECA57' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono'"
                }}>
                  {i + 1}
                </span>
                <span style={{ color: car.color, fontWeight: 'bold' }}>{car.name}</span>
                <span className="ml-auto text-sm" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--text-muted)' }}>{Math.round(car.progress)}%</span>
              </div>
            ))}
          </div>
          <Button size="lg" className="mt-6" onClick={startRace}>{isKorean ? '다시 도전' : 'Race Again'}</Button>
        </div>
      )}
    </div>
  );
}

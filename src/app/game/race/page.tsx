'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TypingArea } from '@/components/typing/TypingArea';
import { shuffleArray } from '@/lib/utils/helpers';
import { TypingResult } from '@/types/typing';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface Car { name: string; progress: number; speed: number; color: string; isPlayer: boolean; }

const AI_SPEEDS = [
  { name: 'AI 초급', speed: 1.5, color: '#48DBFB' },
  { name: 'AI 중급', speed: 3, color: '#FECA57' },
  { name: 'AI 고급', speed: 5, color: '#FF6B6B' },
];

export default function RaceGamePage() {
  const { settings } = useSettingsStore();
  const [status, setStatus] = useState<'menu' | 'countdown' | 'racing' | 'finished'>('menu');
  const [text, setText] = useState('');
  const [cars, setCars] = useState<Car[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [playerProgress, setPlayerProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadText = async () => {
    try {
      if (settings.language === 'ko') {
        const mod = await import('@/data/korean/sentences-short');
        const sentences = shuffleArray(mod.koreanSentencesShort).slice(0, 3);
        setText(sentences.map(s => s.text).join(' '));
      } else {
        const mod = await import('@/data/english/sentences-short');
        const sentences = shuffleArray(mod.englishSentencesShort).slice(0, 3);
        setText(sentences.map(s => s.text).join(' '));
      }
    } catch {
      setText(settings.language === 'ko'
        ? '빠른 갈색 여우가 게으른 개를 뛰어넘습니다. 타이핑 연습은 꾸준히 하는 것이 중요합니다.'
        : 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.');
    }
  };

  const startRace = async () => {
    await loadText();
    setCars([
      { name: 'Player', progress: 0, speed: 0, color: '#6C5CE7', isPlayer: true },
      ...AI_SPEEDS.map(ai => ({ ...ai, progress: 0, isPlayer: false })),
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

  // AI movement
  useEffect(() => {
    if (status !== 'racing') return;
    intervalRef.current = setInterval(() => {
      setCars(prev => {
        const updated = prev.map(car => {
          if (car.isPlayer) return car;
          const newProgress = Math.min(100, car.progress + car.speed * (0.15 + Math.random() * 0.25));
          return { ...car, progress: newProgress };
        });
        // Check if any AI finished
        const aiFinished = updated.some(c => !c.isPlayer && c.progress >= 100);
        if (aiFinished) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setStatus('finished'), 0);
        }
        return updated;
      });
    }, 300);
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

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">🏎️</div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>타이핑 레이스</h1>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>AI와 타이핑 속도 대결!</p>
        <Button size="lg" onClick={startRace}>레이스 시작</Button>
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
              <span style={{ color: car.color, fontWeight: 'bold' }}>{car.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(car.progress)}%</span>
            </div>
            <div className="h-6 rounded-full overflow-hidden relative" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full transition-all duration-200 flex items-center justify-end pr-1" style={{ width: `${Math.max(3, car.progress)}%`, background: car.color }}>
                <span className="text-xs">{car.isPlayer ? '🏎️' : '🚗'}</span>
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
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Outfit'" }}>레이스 완료!</h2>
          <div className="max-w-sm mx-auto">
            {rank.map((car, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--key-border)]">
                <span className="text-lg font-bold" style={{ color: i === 0 ? 'var(--color-accent-warm)' : 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <span style={{ color: car.color, fontWeight: 'bold' }}>{car.name}</span>
                <span className="ml-auto text-sm" style={{ fontFamily: "'JetBrains Mono'" }}>{Math.round(car.progress)}%</span>
              </div>
            ))}
          </div>
          <Button size="lg" className="mt-6" onClick={startRace}>다시 도전</Button>
        </div>
      )}
    </div>
  );
}

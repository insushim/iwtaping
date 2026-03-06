'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, shuffleArray } from '@/lib/utils/helpers';

const COLORS = ['#6C5CE7', '#00D2D3', '#FF6B6B', '#FECA57', '#00B894', '#FD79A8'];
const GRID_SIZE = 6;

interface Block { char: string; color: string; id: number; }

export default function PuzzleGamePage() {
  const [status, setStatus] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [grid, setGrid] = useState<(Block | null)[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [input, setInput] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const mod = await import('@/data/korean/words-beginner');
        setWords(mod.koreanWordsBeginner.filter(w => w.length >= 2 && w.length <= 4));
      } catch {
        setWords(['사과', '바다', '하늘', '나무', '구름', '별빛', '노을', '달빛']);
      }
    })();
  }, []);

  const generateGrid = (): (Block | null)[][] => {
    const g: (Block | null)[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: (Block | null)[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const chars = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅓㅗㅜㅡㅣ';
        row.push({
          char: chars[Math.floor(Math.random() * chars.length)],
          color: pickRandom(COLORS),
          id: nextIdRef.current++,
        });
      }
      g.push(row);
    }
    return g;
  };

  const startGame = () => {
    setStatus('playing');
    setGrid(generateGrid());
    setScore(0);
    setTimeLeft(300);
    setInput('');
    inputRef.current?.focus();
  };

  // Timer
  useEffect(() => {
    if (status !== 'playing') return;
    if (timeLeft <= 0) { setStatus('gameover'); soundManager?.play('gameOver'); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [status, timeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if input matches any word from pool
    const word = input.trim();
    if (words.includes(word) || word.length >= 2) {
      setScore(s => s + word.length * 50);
      soundManager?.play('combo', word.length);

      // Remove random blocks and refill
      setGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        const toRemove = Math.min(word.length, GRID_SIZE);
        for (let i = 0; i < toRemove; i++) {
          const r = Math.floor(Math.random() * GRID_SIZE);
          const c = Math.floor(Math.random() * GRID_SIZE);
          newGrid[r][c] = null;
        }
        // Fill nulls
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (!newGrid[r][c]) {
              const chars = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅓㅗㅜㅡㅣ';
              newGrid[r][c] = { char: chars[Math.floor(Math.random() * chars.length)], color: pickRandom(COLORS), id: nextIdRef.current++ };
            }
          }
        }
        return newGrid;
      });
    }
    setInput('');
  };

  if (status === 'menu') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <div className="text-6xl mb-4">🧩</div>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit'" }}>워드 퍼즐</h1>
      <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>3분 안에 최대한 많은 단어를 입력하세요!</p>
      <Button size="lg" onClick={startGame}>게임 시작</Button>
    </div>
  );

  if (status === 'gameover') return (
    <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
      <h1 className="text-3xl font-bold mb-4">시간 종료!</h1>
      <Card className="p-6 max-w-xs mx-auto mb-6">
        <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>최종 점수</div>
        <div className="text-4xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div>
      </Card>
      <Button size="lg" onClick={startGame}>다시 도전</Button>
    </div>
  );

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-[600px] mx-auto px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>점수 </span>
          <span className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</span>
        </div>
        <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: timeLeft <= 30 ? 'var(--color-error)' : 'var(--color-secondary)' }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
          {grid.flat().map((block) => (
            <div
              key={block?.id ?? Math.random()}
              className="aspect-square rounded-lg flex items-center justify-center text-lg font-bold transition-all"
              style={{
                background: block ? block.color : 'transparent',
                opacity: block ? 1 : 0.2,
                fontFamily: "'Noto Sans KR', sans-serif",
                color: 'white',
              }}
            >
              {block?.char}
            </div>
          ))}
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', 'Noto Sans KR'" }} placeholder="단어를 입력하세요..." autoComplete="off" autoFocus />
        <Button type="submit" size="lg">입력</Button>
      </form>
    </div>
  );
}

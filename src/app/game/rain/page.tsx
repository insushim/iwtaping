'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { pickRandom, randomBetween } from '@/lib/utils/helpers';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';
import {
  ParticleSystem, ScreenShake,
  createStarfield, drawStarfield,
  drawRainEffect, drawWordBubble, drawShieldBar,
  type Star,
} from '@/lib/game/renderer';

interface FallingWord {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  rotation: number;
  glowPhase: number;
}

const COLORS = ['#6C5CE7', '#00D2D3', '#FF6B6B', '#FECA57', '#00B894', '#FD79A8', '#48DBFB', '#A29BFE'];

export default function RainGamePage() {
  const { settings } = useSettingsStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [ph, setPh] = useState(10.0);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [destroyCount, setDestroyCount] = useState(0);

  const wordsRef = useRef<FallingWord[]>([]);
  const animFrameRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const phRef = useRef(10.0);
  const killRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef(new ParticleSystem());
  const shakeRef = useRef(new ScreenShake());
  const isKorean = settings.language === 'ko';

  useEffect(() => {
    wordGenerator.reset();
    const words = wordGenerator.getWords({
      language: settings.language,
      theme: 'nature',
      difficulty: 1,
      count: 500,
      minLength: settings.language === 'ko' ? 2 : 3,
      maxLength: settings.language === 'ko' ? 6 : 12,
    });
    (async () => {
      try {
        if (settings.language === 'ko') {
          const mod = await import('@/data/korean/words-beginner');
          const mod2 = await import('@/data/korean/words-intermediate');
          setWordPool([...new Set([...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate, ...words])]);
        } else {
          const mod = await import('@/data/english/words-common200');
          const mod2 = await import('@/data/english/words-common1000');
          const base = [...mod.englishCommon200, ...mod2.englishCommon1000].filter(w => w.length >= 3);
          setWordPool([...new Set([...base, ...words])]);
        }
      } catch {
        setWordPool(words);
      }
    })();
  }, [settings.language]);

  useEffect(() => {
    if (level > 1) {
      const newWords = wordGenerator.getWords({
        language: settings.language, difficulty: Math.min(10, level), count: 100,
        minLength: settings.language === 'ko' ? 2 : 3,
      });
      setWordPool(prev => [...new Set([...prev, ...newWords])]);
    }
  }, [level, settings.language]);

  const startGame = () => {
    setStatus('countdown');
    setScore(0); setLevel(1); setCombo(0); setMaxCombo(0); setPh(10.0);
    setInput(''); setDestroyCount(0);
    wordsRef.current = []; nextIdRef.current = 0; lastSpawnRef.current = 0;
    scoreRef.current = 0; levelRef.current = 1; comboRef.current = 0; phRef.current = 10.0;
    killRef.current = 0;
    particlesRef.current = new ParticleSystem();
    shakeRef.current = new ScreenShake();
    setCountdown(3);
  };

  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) { setStatus('playing'); inputRef.current?.focus(); return; }
    soundManager?.play('countdown');
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  useEffect(() => {
    if (status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    if (starsRef.current.length === 0) starsRef.current = createStarfield(60, W, H);

    const loop = (time: number) => {
      const currentLevel = levelRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // Background - dark stormy sky
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#06061A');
      grad.addColorStop(0.4, '#0C0C28');
      grad.addColorStop(0.8, '#141438');
      grad.addColorStop(1, '#1A1A4A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Stars (dimmer, storm sky)
      drawStarfield(ctx, starsRef.current, time, 0.005);

      // Lightning effect (occasional)
      if (currentLevel > 3 && Math.random() < 0.003) {
        ctx.fillStyle = 'rgba(200,200,255,0.08)';
        ctx.fillRect(0, 0, W, H);
      }

      // Rain particles
      drawRainEffect(ctx, W, H, time, Math.min(3, 0.5 + currentLevel * 0.3));

      // Cloud shadows at top
      for (let i = 0; i < 5; i++) {
        const cx = (i * 200 + time * 0.01) % (W + 200) - 100;
        ctx.fillStyle = 'rgba(20,20,50,0.4)';
        ctx.beginPath();
        ctx.ellipse(cx, -10, 120, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spawn word
      if (time - lastSpawnRef.current > Math.max(1200 - currentLevel * 50, 400) && wordsRef.current.length < 2 + currentLevel) {
        lastSpawnRef.current = time;
        const text = wordGenerator.getUniqueWord(wordPool) || (isKorean ? '단어' : 'word');
        wordsRef.current.push({
          id: nextIdRef.current++,
          text,
          x: randomBetween(60, W - 60),
          y: -30,
          speed: 0.25 + currentLevel * 0.06 + Math.random() * 0.15,
          color: pickRandom(COLORS),
          rotation: (Math.random() - 0.5) * 0.02,
          glowPhase: Math.random() * Math.PI * 2,
        });
      }

      // Update & draw words
      const alive: FallingWord[] = [];
      for (const word of wordsRef.current) {
        word.y += word.speed;

        // Ground hit
        if (word.y > H - 50) {
          phRef.current -= 0.3;
          setPh(phRef.current);
          shake.shake(3);
          // Splash effect
          particles.emit(word.x, H - 40, 10, {
            speed: 2, life: 20, size: 3,
            colors: [word.color, '#FF6B6B'],
            spread: Math.PI, angle: -Math.PI / 2,
          });
          soundManager?.play('keyError');
          if (phRef.current <= 0) {
            setStatus('gameover');
            cancelAnimationFrame(animFrameRef.current);
            soundManager?.play('gameOver');
            ctx.restore();
            return;
          }
          continue;
        }

        // Draw word with enhanced style
        const glow = 0.5 + Math.sin(time * 0.003 + word.glowPhase) * 0.3;
        ctx.save();
        ctx.translate(word.x, word.y);
        ctx.rotate(Math.sin(time * 0.001 + word.id) * word.rotation);

        // Droplet effect behind word
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.quadraticCurveTo(-8, -10, -6, 0);
        ctx.quadraticCurveTo(0, 6, 6, 0);
        ctx.quadraticCurveTo(8, -10, 0, -20);
        ctx.fillStyle = `rgba(108,92,231,${0.1 * glow})`;
        ctx.fill();

        ctx.restore();

        drawWordBubble(ctx, word.x, word.y, word.text, word.color, { fontSize: 15 });
        alive.push(word);
      }
      wordsRef.current = alive;

      // Particles
      particles.update();
      particles.draw(ctx);

      // Ground/water line
      const waterGrad = ctx.createLinearGradient(0, H - 45, 0, H);
      waterGrad.addColorStop(0, 'rgba(108,92,231,0.05)');
      waterGrad.addColorStop(1, 'rgba(108,92,231,0.2)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, H - 45, W, 45);
      // Water ripples
      ctx.strokeStyle = 'rgba(108,92,231,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const rx = (i * 120 + time * 0.05) % W;
        ctx.beginPath();
        ctx.ellipse(rx, H - 40, 20, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // pH bar
      const phVal = phRef.current;
      drawShieldBar(ctx, 20, H - 28, phVal, 10, W - 40);
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'center';
      ctx.fillText(`pH ${phVal.toFixed(1)}`, W / 2, H - 14);

      // HUD
      ctx.font = "bold 18px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#E8E8FF';
      ctx.textAlign = 'left';
      ctx.fillText(`${scoreRef.current}`, 20, 28);
      ctx.font = "9px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = 'rgba(232,232,255,0.4)';
      ctx.fillText('SCORE', 20, 14);

      ctx.font = "bold 16px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#A29BFE';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${levelRef.current}`, W / 2, 28);

      if (comboRef.current > 1) {
        ctx.font = "bold 14px 'JetBrains Mono', monospace";
        ctx.fillStyle = '#FD79A8';
        ctx.textAlign = 'right';
        ctx.fillText(`${comboRef.current}x COMBO`, W - 20, 28);
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status, wordPool, isKorean]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const idx = wordsRef.current.findIndex(w => w.text === input.trim());
    if (idx >= 0) {
      const word = wordsRef.current[idx];
      particlesRef.current.explode(word.x, word.y, 0.6);
      wordsRef.current.splice(idx, 1);
      const points = input.length * 10;
      scoreRef.current += points;
      setScore(scoreRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(m => Math.max(m, comboRef.current));
      killRef.current += 1;
      setDestroyCount(killRef.current);
      if (killRef.current % 15 === 0) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        soundManager?.play('levelUp');
      }
      soundManager?.play('explosion');
    } else {
      comboRef.current = 0;
      setCombo(0);
      soundManager?.play('keyError');
    }
    setInput('');
  };

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-6xl mb-4">
          <svg viewBox="0 0 80 80" width="80" height="80" className="mx-auto">
            <rect width="80" height="80" rx="16" fill="#0A0A2E"/>
            <line x1="20" y1="10" x2="18" y2="30" stroke="#6C5CE7" strokeWidth="2" opacity="0.6"/>
            <line x1="40" y1="5" x2="38" y2="25" stroke="#A29BFE" strokeWidth="2" opacity="0.5"/>
            <line x1="60" y1="12" x2="58" y2="32" stroke="#6C5CE7" strokeWidth="2" opacity="0.7"/>
            <line x1="30" y1="20" x2="28" y2="40" stroke="#A29BFE" strokeWidth="1.5" opacity="0.4"/>
            <line x1="50" y1="18" x2="48" y2="38" stroke="#6C5CE7" strokeWidth="1.5" opacity="0.5"/>
            <rect x="18" y="42" width="44" height="22" rx="5" fill="#1A1A4E" stroke="#6C5CE7" strokeWidth="1.5"/>
            <text x="40" y="57" textAnchor="middle" fill="#00D2D3" fontSize="12" fontFamily="monospace" fontWeight="bold">ABC</text>
            <line x1="35" y1="64" x2="33" y2="72" stroke="rgba(108,92,231,0.3)" strokeWidth="6" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {isKorean ? '산성비' : 'Acid Rain'}
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          {isKorean ? '떨어지는 단어를 입력해서 제거하세요!' : 'Type falling words before they hit the ground!'}
        </p>
        <Button size="lg" onClick={startGame}>{isKorean ? '게임 시작' : 'Start Game'}</Button>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-8xl font-bold neon-text" style={{ fontFamily: "'Outfit'", color: 'var(--color-primary)' }}>{countdown}</div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Outfit'", color: 'var(--color-error)' }}>
          {isKorean ? '게임 오버' : 'Game Over'}
        </h1>
        <div className="grid grid-cols-4 gap-3 mb-8 max-w-lg mx-auto">
          <Card className="p-3">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '점수' : 'SCORE'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{score}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '레벨' : 'LEVEL'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-secondary)' }}>{level}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '콤보' : 'COMBO'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-combo)' }}>{maxCombo}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '격파' : 'CLEARED'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: '#00B894' }}>{destroyCount}</div>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>{isKorean ? '다시 시작' : 'Retry'}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ background: 'var(--bg-card)', height: '500px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
          placeholder={isKorean ? '단어를 입력하세요...' : 'Type the word...'} autoComplete="off" autoFocus />
        <Button type="submit" size="lg">{isKorean ? '입력' : 'Enter'}</Button>
      </form>
    </div>
  );
}

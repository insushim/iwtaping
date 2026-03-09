'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { soundManager } from '@/lib/sound/sound-manager';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { wordGenerator } from '@/lib/content/word-generator';
import {
  ParticleSystem, ScreenShake,
  createStarfield, drawStarfield, drawNebula, drawSpaceBackground,
  drawPlayerShip, drawEnemyShip, drawLaser, drawMissile,
  drawShieldBar, drawHUD, drawWordBubble,
  type Star,
} from '@/lib/game/renderer';

interface Enemy {
  id: number;
  text: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  color: string;
  typed: string;
  shipType: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  spawnTime: number;
  dying?: boolean;
}

interface Projectile {
  x: number;
  y: number;
  targetId: number;
  speed: number;
  angle: number;
  type: 'laser' | 'missile';
}

export default function SpaceGamePage() {
  const { settings } = useSettingsStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'menu' | 'countdown' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [shield, setShield] = useState(10);
  const [input, setInput] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [destroyCount, setDestroyCount] = useState(0);

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const animRef = useRef<number>(0);
  const nextIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const shieldRef = useRef(10);
  const killCountRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const particlesRef = useRef(new ParticleSystem());
  const shakeRef = useRef(new ScreenShake());
  const isKorean = settings.language === 'ko';

  // Load word pool with procedural generation
  useEffect(() => {
    wordGenerator.reset();
    const words = wordGenerator.getWords({
      language: settings.language,
      theme: 'space',
      difficulty: 1,
      count: 500,
      minLength: settings.language === 'ko' ? 2 : 3,
      maxLength: settings.language === 'ko' ? 6 : 12,
    });

    // Also load base data
    (async () => {
      try {
        if (settings.language === 'ko') {
          const mod = await import('@/data/korean/words-beginner');
          const mod2 = await import('@/data/korean/words-intermediate');
          const base = [...mod.koreanWordsBeginner, ...mod2.koreanWordsIntermediate].filter(w => w.length >= 2);
          setWordPool([...new Set([...base, ...words])]);
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

  // Refresh word pool on level up
  useEffect(() => {
    if (level > 1) {
      const newWords = wordGenerator.getWords({
        language: settings.language,
        theme: 'space',
        difficulty: Math.min(10, level),
        count: 200,
        minLength: settings.language === 'ko' ? 2 : 3,
        maxLength: settings.language === 'ko' ? Math.min(8, 3 + level) : Math.min(14, 4 + level),
      });
      setWordPool(prev => [...new Set([...prev, ...newWords])]);
    }
  }, [level, settings.language]);

  const startGame = () => {
    setStatus('countdown');
    setScore(0); setLevel(1); setCombo(0); setMaxCombo(0);
    setShield(10); setInput(''); setDestroyCount(0);
    enemiesRef.current = []; projectilesRef.current = [];
    nextIdRef.current = 0; lastSpawnRef.current = 0;
    targetRef.current = null;
    scoreRef.current = 0; levelRef.current = 1; comboRef.current = 0;
    shieldRef.current = 10; killCountRef.current = 0;
    particlesRef.current = new ParticleSystem();
    shakeRef.current = new ScreenShake();
    wordGenerator.reset();
    setCountdown(3);
  };

  useEffect(() => {
    if (status !== 'countdown') return;
    if (countdown <= 0) { setStatus('playing'); inputRef.current?.focus(); return; }
    soundManager?.play('countdown');
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  // Main game loop
  useEffect(() => {
    if (status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    const cx = W / 2, cy = H - 70;
    const particles = particlesRef.current;
    const shake = shakeRef.current;

    // Initialize starfield
    if (starsRef.current.length === 0) {
      starsRef.current = createStarfield(120, W, H);
    }

    const loop = (time: number) => {
      const currentLevel = levelRef.current;
      const currentShield = shieldRef.current;
      const shakeOffset = shake.update();

      ctx.save();
      ctx.translate(shakeOffset.x, shakeOffset.y);

      // === BACKGROUND ===
      drawSpaceBackground(ctx, W, H, time);
      drawStarfield(ctx, starsRef.current, time, 0.015);
      drawNebula(ctx, W, H, time);

      // === PLAYER SHIP ===
      drawPlayerShip(ctx, cx, cy, time, currentShield > 0);

      // === SPAWN ENEMIES ===
      const spawnInterval = Math.max(2200 - currentLevel * 100, 600);
      const maxEnemies = Math.min(3 + currentLevel, 15);
      if (time - lastSpawnRef.current > spawnInterval && enemiesRef.current.length < maxEnemies) {
        lastSpawnRef.current = time;
        const isBoss = currentLevel > 3 && killCountRef.current > 0 && killCountRef.current % 20 === 0 && !enemiesRef.current.some(e => e.isBoss);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(W, H) * 0.65;
        const word = wordGenerator.getUniqueWord(wordPool) || (isKorean ? '적기' : 'enemy');

        const enemy: Enemy = {
          id: nextIdRef.current++,
          text: (() => {
            if (!isBoss) return word;
            const candidates = wordPool.filter(w => w.length >= (isKorean ? 4 : 6));
            return (candidates[Math.floor(Math.random() * candidates.length)] || (isKorean ? '최종보스' : 'destroyer'));
          })(),
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist - H * 0.3,
          angle: 0,
          speed: isBoss ? 0.15 + currentLevel * 0.01 : 0.25 + currentLevel * 0.04,
          color: isBoss ? '#FF0000' : ['#FF6B6B', '#00D2D3', '#FECA57', '#FD79A8', '#48DBFB', '#A29BFE'][Math.floor(Math.random() * 6)],
          typed: '',
          shipType: isBoss ? 2 : Math.floor(Math.random() * 4),
          hp: isBoss ? 1 : 1,
          maxHp: isBoss ? 1 : 1,
          isBoss,
          spawnTime: time,
        };
        enemy.angle = Math.atan2(cy - enemy.y, cx - enemy.x);
        enemiesRef.current.push(enemy);
      }

      // === UPDATE & DRAW ENEMIES ===
      const alive: Enemy[] = [];
      for (const e of enemiesRef.current) {
        if (!e.dying) {
          e.x += Math.cos(e.angle) * e.speed;
          e.y += Math.sin(e.angle) * e.speed;

          const dist = Math.hypot(e.x - cx, e.y - cy);

          // Hit player
          if (dist < 35) {
            shieldRef.current--;
            setShield(shieldRef.current);
            shake.shake(8);
            particles.explode(e.x, e.y, 0.5);
            soundManager?.play('keyError');
            if (shieldRef.current <= 0) {
              particles.explode(cx, cy, 2);
              setStatus('gameover');
              cancelAnimationFrame(animRef.current);
              soundManager?.play('gameOver');
              ctx.restore();
              return;
            }
            continue;
          }
        }

        // Draw enemy ship
        const age = (time - e.spawnTime) / 1000;
        ctx.globalAlpha = e.dying ? (0.3 + Math.sin(time * 0.02) * 0.2) : Math.min(1, age * 2);

        const scale = e.isBoss ? 1.8 : 1;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        ctx.translate(-e.x, -e.y);
        drawEnemyShip(ctx, e.x, e.y, e.shipType, time, e.color);
        ctx.restore();

        // Draw word bubble (hide for dying enemies)
        if (!e.dying) {
          const isTargeted = targetRef.current === e.id;
          drawWordBubble(ctx, e.x, e.y + (e.isBoss ? 30 : 20) * scale, e.text, e.color, {
            targeted: isTargeted,
            fontSize: e.isBoss ? 16 : 14,
          });

          // Boss health bar
          if (e.isBoss) {
            drawShieldBar(ctx, e.x - 30, e.y + 40, e.hp, e.maxHp, 60);
          }

          // Draw laser to targeted enemy
          if (isTargeted && e.typed.length > 0) {
            drawLaser(ctx, cx, cy - 20, e.x, e.y, time, '#00D2D3');
            particles.laserHit(e.x, e.y);
          }
        }

        ctx.globalAlpha = 1;
        alive.push(e);
      }
      enemiesRef.current = alive;

      // === UPDATE PROJECTILES ===
      const aliveProjectiles: Projectile[] = [];
      for (const p of projectilesRef.current) {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Check if hit target (dying enemies)
        const target = enemiesRef.current.find(e => e.id === p.targetId && e.dying);
        if (target) {
          const d = Math.hypot(p.x - target.x, p.y - target.y);
          if (d < 25) {
            // Missile hit! Destroy enemy
            particles.explode(target.x, target.y, target.isBoss ? 2 : 1);
            shake.shake(target.isBoss ? 10 : 4);
            soundManager?.play('explosion');
            enemiesRef.current = enemiesRef.current.filter(e => e.id !== target.id);
            continue; // Missile consumed
          }
        }

        // Off screen
        if (p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;

        drawMissile(ctx, p.x, p.y, p.angle, time);
        aliveProjectiles.push(p);
      }
      projectilesRef.current = aliveProjectiles;

      // === PARTICLES ===
      particles.update();
      particles.draw(ctx);

      // === HUD ===
      drawHUD(ctx, {
        score: scoreRef.current,
        level: levelRef.current,
        combo: comboRef.current,
        label: isKorean ? 'LEVEL' : 'LEVEL',
      }, W);

      // Shield bar
      drawShieldBar(ctx, 20, H - 25, currentShield, 10, 200);
      ctx.font = "10px 'Noto Sans KR', sans-serif";
      ctx.fillStyle = 'rgba(232,232,255,0.5)';
      ctx.textAlign = 'left';
      ctx.fillText(isKorean ? '방어막' : 'SHIELD', 20, H - 30);

      // Kill counter
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = 'rgba(232,232,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(`${isKorean ? '격파' : 'KILLS'}: ${killCountRef.current}`, W - 20, H - 10);

      ctx.restore();

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, wordPool, isKorean]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const trimmed = input.trim();
    const idx = enemiesRef.current.findIndex(e => !e.dying && e.text === trimmed);

    if (idx >= 0) {
      const enemy = enemiesRef.current[idx];

      // Fire projectile
      const canvas = canvasRef.current;
      if (canvas) {
        const W = canvas.offsetWidth;
        const cx = W / 2, cy = canvas.offsetHeight - 70;
        const angle = Math.atan2(enemy.y - cy, enemy.x - cx);
        projectilesRef.current.push({
          x: cx, y: cy - 20,
          targetId: enemy.id,
          speed: 12,
          angle,
          type: 'missile',
        });
      }

      // Mark enemy as dying (missile must hit first)
      enemy.dying = true;
      enemy.speed = 0;

      const basePoints = trimmed.length * 15;
      const comboBonus = Math.floor(comboRef.current / 5) * 0.5;
      const bossBonus = enemy.isBoss ? 5 : 1;
      const points = Math.round(basePoints * (1 + comboBonus) * bossBonus);

      scoreRef.current += points;
      setScore(scoreRef.current);
      comboRef.current += 1;
      setCombo(comboRef.current);
      setMaxCombo(m => Math.max(m, comboRef.current));
      killCountRef.current += 1;
      setDestroyCount(killCountRef.current);

      // Level up every 10 kills
      if (killCountRef.current % 10 === 0) {
        levelRef.current += 1;
        setLevel(levelRef.current);
        soundManager?.play('levelUp');
        // Restore 1 shield on level up
        if (shieldRef.current < 10) {
          shieldRef.current = Math.min(10, shieldRef.current + 1);
          setShield(shieldRef.current);
        }
      }
      // explosion sound plays on missile impact in animation loop
    } else {
      comboRef.current = 0;
      setCombo(0);
      soundManager?.play('keyError');
    }
    setInput('');
    targetRef.current = null;
  }, [input]);

  // Auto-target as user types
  useEffect(() => {
    if (!input.trim()) { targetRef.current = null; return; }
    const match = enemiesRef.current.find(e => e.text.startsWith(input.trim()));
    if (match) {
      targetRef.current = match.id;
      match.typed = input.trim();
    } else {
      targetRef.current = null;
    }
  }, [input]);

  if (status === 'menu') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <div className="text-7xl mb-4">
          <svg viewBox="0 0 80 80" width="80" height="80" className="mx-auto">
            <defs>
              <linearGradient id="shipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A29BFE"/>
                <stop offset="100%" stopColor="#6C5CE7"/>
              </linearGradient>
            </defs>
            <rect width="80" height="80" rx="16" fill="#0A0A2E"/>
            <circle cx="15" cy="12" r="1" fill="#E8E8FF" opacity="0.6"/>
            <circle cx="65" cy="18" r="1.2" fill="#A29BFE" opacity="0.5"/>
            <circle cx="55" cy="60" r="0.8" fill="#E8E8FF" opacity="0.4"/>
            <g transform="translate(40,45)">
              <polygon points="0,-18 -12,10 0,5 12,10" fill="url(#shipGrad)"/>
              <polygon points="0,-18 -7,5 0,8 7,5" fill="#8B7CF7"/>
              <polygon points="0,-14 -4,-4 0,-2 4,-4" fill="#48DBFB"/>
              <ellipse cx="0" cy="14" rx="5" ry="8" fill="#6C5CE7" opacity="0.4"/>
            </g>
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {isKorean ? '우주 방어' : 'Space Defense'}
        </h1>
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {isKorean ? '적 우주선의 단어를 입력해서 격파하세요!' : 'Type words to destroy enemy ships!'}
        </p>
        <div className="max-w-md mx-auto mb-6">
          <Card className="p-4 text-left">
            <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <li>{isKorean ? '• 적 우주선에 표시된 단어를 입력하면 격파' : '• Type displayed words to destroy enemies'}</li>
              <li>{isKorean ? '• 10기 격파할 때마다 레벨 업' : '• Level up every 10 kills'}</li>
              <li>{isKorean ? '• 콤보로 보너스 점수 획득' : '• Chain combos for bonus points'}</li>
              <li>{isKorean ? '• 보스 적기 등장 시 긴 단어 입력 필요' : '• Boss enemies require longer words'}</li>
              <li>{isKorean ? '• 레벨 업 시 방어막 1 회복' : '• Shield +1 on level up'}</li>
            </ul>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>{isKorean ? '게임 시작' : 'Start Game'}</Button>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-8xl font-bold neon-text" style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}>{countdown}</div>
      </div>
    );
  }

  if (status === 'gameover') {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-error)', fontFamily: "'Outfit'" }}>
          {isKorean ? '게임 오버' : 'Game Over'}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {isKorean ? '우주선이 파괴되었습니다' : 'Your ship has been destroyed'}
        </p>
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
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '최대 콤보' : 'MAX COMBO'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-combo)' }}>{maxCombo}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isKorean ? '격파' : 'KILLS'}</div>
            <div className="text-xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: '#00B894' }}>{destroyCount}</div>
          </Card>
        </div>
        <Button size="lg" onClick={startGame}>{isKorean ? '다시 시작' : 'Retry'}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-4">
      <div className="relative rounded-xl overflow-hidden border border-[var(--key-border)]" style={{ height: '500px' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--key-border)] text-lg"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono'" }}
          placeholder={isKorean ? '단어를 입력하세요...' : 'Type the word...'}
          autoComplete="off"
          autoFocus
        />
        <Button type="submit" size="lg">{isKorean ? '발사' : 'Fire'}</Button>
      </form>
    </div>
  );
}

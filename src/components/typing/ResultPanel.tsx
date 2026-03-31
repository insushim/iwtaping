'use client';

import { useState, useEffect } from 'react';
import { TypingResult } from '@/types/typing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Mascot } from '../mascot/Mascot';
import { MascotMood } from '@/stores/useMascotStore';
import { useProgressStore } from '@/stores/useProgressStore';
import { useCelebrationStore } from '../common/CelebrationOverlay';
import { formatTime } from '@/lib/utils/helpers';

interface ResultPanelProps {
  result: TypingResult;
  maxCombo: number;
  onRestart: () => void;
}

// Grade system
function getGrade(kpm: number, accuracy: number): { grade: string; label: string; color: string; className: string } {
  const score = kpm * 0.7 + accuracy * 3;
  if (score >= 500) return { grade: 'S', label: '전설', color: '#FFD700', className: 'grade-s' };
  if (score >= 400) return { grade: 'A', label: '최고', color: '#6C5CE7', className: 'grade-a' };
  if (score >= 300) return { grade: 'B', label: '훌륭', color: '#00D2D3', className: 'grade-b' };
  if (score >= 200) return { grade: 'C', label: '좋음', color: '#00B894', className: 'grade-c' };
  return { grade: 'D', label: '노력', color: '#9090C0', className: 'grade-d' };
}

function getMascotMood(grade: string): MascotMood {
  if (grade === 'S') return 'cheering';
  if (grade === 'A') return 'excited';
  if (grade === 'B') return 'happy';
  return 'thinking';
}

function getMascotMessage(grade: string): string {
  if (grade === 'S') return '와! 완벽해! 넌 타이핑 천재야! 🌟';
  if (grade === 'A') return '대단해! 정말 잘했어! 👏';
  if (grade === 'B') return '좋아! 점점 나아지고 있어! 💪';
  if (grade === 'C') return '좋은 시도야! 계속 연습하자! 😊';
  return '괜찮아! 연습하면 꼭 잘할 수 있어! 🤗';
}

// Animated counter
function AnimatedNumber({ value, duration = 1000, delay = 0 }: { value: number; duration?: number; delay?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => {
      let start = 0;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplay(Math.round(start + (value - start) * eased));
        if (progress < 1) requestAnimationFrame(tick);
      };
      tick();
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, duration, delay]);
  return <>{display}</>;
}

export function ResultPanel({ result, maxCombo, onRestart }: ResultPanelProps) {
  const { addXP, addCoins } = useProgressStore();
  const { trigger } = useCelebrationStore();
  const [phase, setPhase] = useState(0); // 0=grade, 1=stats, 2=rewards
  const [xpAwarded, setXpAwarded] = useState(false);

  const grade = getGrade(result.kpm, result.accuracy);
  const mascotMood = getMascotMood(grade.grade);
  const mascotMsg = getMascotMessage(grade.grade);

  // Calculate XP & coins
  const earnedXP = Math.floor(result.kpm * 0.3 + result.accuracy * 0.5 + maxCombo * 0.2);
  const earnedCoins = Math.floor(earnedXP * 0.15);

  useEffect(() => {
    // Phase transitions
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase >= 2 && !xpAwarded) {
      setXpAwarded(true);
      addXP(earnedXP);
      addCoins(earnedCoins);
    }
  }, [phase, xpAwarded, addXP, addCoins, earnedXP, earnedCoins]);

  const stats = [
    { label: '타/분', value: Math.round(result.kpm), color: 'var(--color-primary)', delay: 200 },
    { label: 'WPM', value: Math.round(result.wpm), color: 'var(--color-secondary)', delay: 300 },
    { label: '정확도', value: result.accuracy, suffix: '%', decimals: 1, color: result.accuracy >= 95 ? 'var(--color-success)' : 'var(--color-warning)', delay: 400 },
    { label: '일관성', value: result.consistency, suffix: '%', decimals: 1, color: 'var(--color-primary-light)', delay: 500 },
    { label: '최고 속도', value: Math.round(result.maxSpeed), color: 'var(--color-accent-warm)', delay: 600 },
    { label: '최대 콤보', value: maxCombo, color: 'var(--color-combo)', delay: 700 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Grade reveal */}
      <div className="text-center mb-6">
        <div className="bounce-in">
          <Mascot mood={mascotMood} size={80} />
        </div>

        <div className={`text-8xl font-extrabold mt-2 ${grade.className}`} style={{ fontFamily: "'Outfit'" }}>
          <span className="bounce-in" style={{ display: 'inline-block', animationDelay: '0.3s' }}>
            {grade.grade}
          </span>
        </div>
        <div className="text-sm mt-1 slide-up" style={{ color: grade.color, animationDelay: '0.5s', opacity: 0 }}>
          {grade.label}
        </div>
        <p className="text-xs mt-2 slide-up" style={{ color: 'var(--text-secondary)', animationDelay: '0.7s', opacity: 0 }}>
          {mascotMsg}
        </p>
      </div>

      {/* Stats grid */}
      {phase >= 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {stats.map((stat, i) => (
            <Card key={stat.label} className="p-3 text-center slide-up" style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: stat.color }}>
                <AnimatedNumber value={stat.decimals ? parseFloat(stat.value.toFixed(stat.decimals)) : stat.value} delay={stat.delay} />
                {stat.suffix || ''}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail row */}
      {phase >= 1 && (
        <Card className="p-3 mb-4 slide-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span style={{ color: 'var(--text-muted)' }}>경과 시간</span>
              <div className="font-mono font-bold mt-0.5">{formatTime(result.elapsedTime)}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>총 키 입력</span>
              <div className="font-mono font-bold mt-0.5">{result.totalKeystrokes}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>정확 입력</span>
              <div className="font-mono font-bold mt-0.5" style={{ color: 'var(--color-success)' }}>{result.correctKeystrokes}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>오타</span>
              <div className="font-mono font-bold mt-0.5" style={{ color: 'var(--color-error)' }}>{result.errorKeystrokes}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Speed chart */}
      {phase >= 1 && result.speedHistory.length > 1 && (
        <Card className="p-3 mb-4 slide-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <h3 className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>속도 변화</h3>
          <div className="h-24 flex items-end gap-[2px]">
            {result.speedHistory.map((speed, i) => {
              const max = Math.max(...result.speedHistory, 1);
              const height = (speed / max) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${height}%`,
                    background: `linear-gradient(to top, var(--color-primary), var(--color-secondary))`,
                    opacity: 0.4 + (height / 100) * 0.6,
                    animation: `slide-up 0.3s ease-out ${0.8 + i * 0.02}s forwards`,
                    transform: 'scaleY(0)',
                    transformOrigin: 'bottom',
                  }}
                  title={`${Math.round(speed)} 타/분`}
                />
              );
            })}
          </div>
        </Card>
      )}

      {/* XP & Coin rewards */}
      {phase >= 2 && (
        <Card variant="glow" className="p-4 mb-6 text-center slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>획득 보상</div>
          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-2xl font-bold gradient-text" style={{ fontFamily: "'JetBrains Mono'" }}>
                +<AnimatedNumber value={earnedXP} delay={200} />
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-accent-warm)' }}>
                +<AnimatedNumber value={earnedCoins} delay={400} />
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>코인 🪙</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button onClick={onRestart} size="lg" variant="gradient">
          다시 시도
        </Button>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const SLOGAN = '손끝으로 여는 무한한 세계';
const DEMO_TEXTS = [
  '빠른 갈색 여우가 게으른 개를 뛰어넘습니다.',
  'The quick brown fox jumps over the lazy dog.',
  '세 살 버릇 여든까지 간다.',
  '천 리 길도 한 걸음부터 시작된다.',
];

const practiceCards = [
  { href: '/practice/position', icon: '🎯', title: '자리 연습', desc: '홈키부터 전체 키보드까지 단계별 연습' },
  { href: '/practice/word', icon: '📝', title: '낱말 연습', desc: '초급/중급/고급 낱말 타이핑' },
  { href: '/practice/short', icon: '💬', title: '짧은 글', desc: '속담, 명언, 일상 문장 연습' },
  { href: '/practice/long', icon: '📖', title: '긴 글', desc: '문학, 에세이, 필사 연습' },
  { href: '/practice/code', icon: '💻', title: '코드 타이핑', desc: 'Python, JS, HTML 코드 연습' },
  { href: '/test/speed', icon: '⚡', title: '속도 테스트', desc: '15초~120초 타이핑 속도 측정' },
];

const gameCards = [
  { href: '/game/rain', icon: '🌧️', title: '산성비', desc: '떨어지는 단어를 입력해서 제거' },
  { href: '/game/space', icon: '🚀', title: '우주 방어', desc: '적 우주선의 단어를 입력해서 격파' },
  { href: '/game/race', icon: '🏎️', title: '타이핑 레이스', desc: 'AI와 타이핑 속도 대결' },
  { href: '/game/defense', icon: '🏰', title: '킹덤 디펜스', desc: '성을 지키며 타이핑하는 전략 게임' },
  { href: '/game/zombie', icon: '🧟', title: '좀비 서바이벌', desc: '좀비를 물리치며 생존하기' },
  { href: '/game/puzzle', icon: '🔗', title: '끝말잇기', desc: '마지막 글자로 시작하는 단어를 이어가세요' },
];

export default function Home() {
  const [sloganIdx, setSloganIdx] = useState(0);
  const [sloganText, setSloganText] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= SLOGAN.length) {
        setSloganText(SLOGAN.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24">
        <h1
          className="text-5xl md:text-7xl font-extrabold neon-text mb-4"
          style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--color-primary)' }}
        >
          TypingVerse
        </h1>
        <p className="text-xl md:text-2xl h-8" style={{ color: 'var(--text-secondary)', fontFamily: "'Noto Sans KR', sans-serif" }}>
          {sloganText}
          <span className="caret-blink" style={{ borderRight: '2px solid var(--color-secondary)' }}>&nbsp;</span>
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/practice">
            <Button size="lg">연습 시작</Button>
          </Link>
          <Link href="/game">
            <Button variant="secondary" size="lg">게임 플레이</Button>
          </Link>
        </div>
      </section>

      {/* Practice Modes */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
          연습 모드
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {practiceCards.map((card) => (
            <Link key={card.href} href={card.href} className="no-underline">
              <Card hoverable className="p-6 h-full">
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{card.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Game Modes */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
          게임 모드
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameCards.map((card) => (
            <Link key={card.href} href={card.href} className="no-underline">
              <Card hoverable className="p-6 h-full">
                <div className="text-3xl mb-3">{card.icon}</div>
                <h3 className="text-lg font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{card.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="text-center py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '연습 모드', value: '5가지' },
            { label: '게임', value: '6종' },
            { label: '언어', value: '한/영' },
            { label: '연습 콘텐츠', value: '2000+' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="text-2xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-secondary)' }}>
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

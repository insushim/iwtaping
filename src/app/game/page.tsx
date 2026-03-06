'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const games = [
  { href: '/game/rain', icon: '🌧️', title: '산성비', desc: '떨어지는 단어를 입력해서 제거하세요', difficulty: '쉬움~어려움' },
  { href: '/game/space', icon: '🚀', title: '우주 방어', desc: '적 우주선의 단어를 입력해서 격파하세요', difficulty: '보통~어려움' },
  { href: '/game/race', icon: '🏎️', title: '타이핑 레이스', desc: 'AI 라이벌과 타이핑 속도 대결', difficulty: '보통' },
  { href: '/game/defense', icon: '🏰', title: '킹덤 디펜스', desc: '성을 지키며 타이핑하는 전략 게임', difficulty: '어려움' },
  { href: '/game/zombie', icon: '🧟', title: '좀비 서바이벌', desc: '좀비를 물리치며 생존하기', difficulty: '어려움' },
  { href: '/game/puzzle', icon: '🧩', title: '워드 퍼즐', desc: '블록을 맞추는 단어 퍼즐 게임', difficulty: '쉬움' },
];

export default function GamePage() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>게임 모드</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>재미있게 타이핑 실력을 키우세요</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Link key={game.href} href={game.href} className="no-underline">
            <Card hoverable className="p-6 h-full">
              <div className="text-4xl mb-3">{game.icon}</div>
              <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>{game.title}</h2>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{game.desc}</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,92,231,0.2)', color: 'var(--color-primary-light)' }}>
                {game.difficulty}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

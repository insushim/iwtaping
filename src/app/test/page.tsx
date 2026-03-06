'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const modes = [
  { href: '/test/speed', icon: '⚡', title: '속도 테스트', desc: '15초/30초/60초/120초 중 선택하여 속도 측정' },
  { href: '/test/accuracy', icon: '🎯', title: '정확도 모드', desc: '정확도에 집중하는 특별 테스트' },
  { href: '/test/custom', icon: '✏️', title: '커스텀 테스트', desc: '직접 텍스트를 입력하여 테스트' },
];

export default function TestPage() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>타자 검정</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>나의 타자 실력을 측정해보세요</p>

      <div className="flex flex-col gap-4">
        {modes.map((mode) => (
          <Link key={mode.href} href={mode.href} className="no-underline">
            <Card hoverable className="p-6 flex items-center gap-4">
              <div className="text-4xl">{mode.icon}</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{mode.title}</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{mode.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

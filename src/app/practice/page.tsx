'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';

const modes = [
  { href: '/practice/position', icon: '🎯', title: '자리 연습', desc: '홈키부터 전체 키보드까지 30단계 체계적 연습', badge: '30단계' },
  { href: '/practice/word', icon: '📝', title: '낱말 연습', desc: '초급/중급/고급 한글 및 영문 낱말 타이핑', badge: '1500+ 단어' },
  { href: '/practice/short', icon: '💬', title: '짧은 글 연습', desc: '속담, 명언, 뉴스, 일상회화 단문 연습', badge: '200+ 문장' },
  { href: '/practice/long', icon: '📖', title: '긴 글 연습', desc: '문학 작품, 에세이, 실용문 필사 연습', badge: '50+ 텍스트' },
  { href: '/practice/code', icon: '💻', title: '코드 타이핑', desc: 'Python, JavaScript, HTML, CSS 코드 스니펫 연습', badge: '100+ 스니펫' },
];

export default function PracticePage() {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>연습 모드</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        실력에 맞는 연습 모드를 선택하세요
      </p>

      <div className="flex flex-col gap-4">
        {modes.map((mode) => (
          <Link key={mode.href} href={mode.href} className="no-underline">
            <Card hoverable className="p-6 flex items-center gap-4">
              <div className="text-4xl">{mode.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{mode.title}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,92,231,0.2)', color: 'var(--color-primary-light)' }}>
                    {mode.badge}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{mode.desc}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface RankEntry {
  rank: number;
  name: string;
  speed: number;
  accuracy: number;
  date: string;
}

export default function RankingPage() {
  const [mode, setMode] = useState<'speed' | 'game'>('speed');
  const [rankings, setRankings] = useState<RankEntry[]>([]);

  useEffect(() => {
    // Load from localStorage
    try {
      const sessions = JSON.parse(localStorage.getItem('typingverse-sessions') || '[]');
      const sorted = sessions
        .filter((s: { result?: { kpm: number; accuracy: number } }) => s.result)
        .sort((a: { result: { kpm: number } }, b: { result: { kpm: number } }) => b.result.kpm - a.result.kpm)
        .slice(0, 20)
        .map((s: { result: { kpm: number; accuracy: number }; timestamp: number }, i: number) => ({
          rank: i + 1,
          name: 'Player',
          speed: Math.round(s.result.kpm),
          accuracy: s.result.accuracy,
          date: new Date(s.timestamp).toLocaleDateString(),
        }));
      setRankings(sorted);
    } catch {
      setRankings([]);
    }
  }, [mode]);

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>랭킹</h1>

      <div className="flex gap-2 mb-6">
        <Button variant={mode === 'speed' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('speed')}>속도 랭킹</Button>
        <Button variant={mode === 'game' ? 'primary' : 'secondary'} size="sm" onClick={() => setMode('game')}>게임 랭킹</Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>순위</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>이름</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>속도</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>정확도</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>날짜</th>
            </tr>
          </thead>
          <tbody>
            {rankings.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                  아직 기록이 없습니다. 연습을 시작해보세요!
                </td>
              </tr>
            ) : (
              rankings.map((entry) => (
                <tr key={entry.rank} className="border-t border-[var(--key-border)]">
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: entry.rank <= 3 ? 'var(--color-accent-warm)' : 'var(--text-secondary)', fontFamily: "'JetBrains Mono'" }}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.name}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "'JetBrains Mono'", color: 'var(--color-primary)' }}>{entry.speed} 타/분</td>
                  <td className="px-4 py-3 text-right" style={{ fontFamily: "'JetBrains Mono'", color: entry.accuracy >= 95 ? 'var(--color-success)' : 'var(--text-secondary)' }}>{entry.accuracy.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-muted)' }}>{entry.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

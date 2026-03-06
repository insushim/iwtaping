'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { useStatsStore } from '@/stores/useStatsStore';
import { formatTime } from '@/lib/utils/helpers';
import { ACHIEVEMENTS_LIST } from '@/lib/utils/constants';

export default function StatsPage() {
  const { stats, loadStats } = useStatsStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const todayStats = stats.dailyStats.find(d => d.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Outfit', sans-serif" }}>통계</h1>

      {/* Today */}
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>오늘의 기록</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '연습 시간', value: todayStats ? formatTime(todayStats.totalPracticeSeconds) : '00:00', color: 'var(--color-primary)' },
          { label: '키 입력', value: todayStats?.totalKeystrokes || 0, color: 'var(--color-secondary)' },
          { label: '평균 타수', value: Math.round(todayStats?.avgSpeed || 0), color: 'var(--color-primary-light)' },
          { label: '평균 정확도', value: `${(todayStats?.avgAccuracy || 0).toFixed(1)}%`, color: 'var(--color-success)' },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ fontFamily: "'JetBrains Mono'", color: item.color }}>{item.value}</div>
          </Card>
        ))}
      </div>

      {/* Overall */}
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>전체 기록</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '총 세션', value: stats.totalSessions },
          { label: '총 연습 시간', value: formatTime(stats.totalPracticeTime) },
          { label: '최고 타수', value: `${Math.round(stats.bestKpm)} 타/분` },
          { label: '최고 정확도', value: `${stats.bestAccuracy.toFixed(1)}%` },
          { label: '평균 타수', value: `${Math.round(stats.avgKpm)} 타/분` },
          { label: '평균 정확도', value: `${stats.avgAccuracy.toFixed(1)}%` },
          { label: '연속 출석', value: `${stats.streakDays}일` },
          { label: '총 키 입력', value: stats.totalKeystrokes.toLocaleString() },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</div>
            <div className="text-lg font-bold mt-1" style={{ fontFamily: "'JetBrains Mono'" }}>{item.value}</div>
          </Card>
        ))}
      </div>

      {/* Speed History Chart */}
      {stats.dailyStats.length > 1 && (
        <>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>일별 평균 속도</h2>
          <Card className="p-4 mb-8">
            <div className="h-40 flex items-end gap-[2px]">
              {stats.dailyStats.slice(-30).map((d, i) => {
                const max = Math.max(...stats.dailyStats.slice(-30).map(x => x.avgSpeed), 1);
                const h = (d.avgSpeed / max) * 100;
                return (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: 'linear-gradient(to top, var(--color-primary), var(--color-secondary))' }} title={`${d.date}: ${Math.round(d.avgSpeed)} 타/분`} />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{stats.dailyStats.slice(-30)[0]?.date}</span>
              <span>{stats.dailyStats.slice(-1)[0]?.date}</span>
            </div>
          </Card>
        </>
      )}

      {/* Achievements */}
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>업적</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {ACHIEVEMENTS_LIST.map((ach) => {
          const unlocked = stats.achievements.includes(ach.key);
          return (
            <Card key={ach.key} className="p-3 text-center" style={{ opacity: unlocked ? 1 : 0.4 }}>
              <div className="text-2xl mb-1">{ach.icon}</div>
              <div className="text-xs font-bold">{ach.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{ach.description}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

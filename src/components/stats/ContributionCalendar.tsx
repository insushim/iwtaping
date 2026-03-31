'use client';

import { useMemo } from 'react';
import { DailyStats } from '@/types/stats';

interface ContributionCalendarProps {
  dailyStats: DailyStats[];
  className?: string;
}

export function ContributionCalendar({ dailyStats, className = '' }: ContributionCalendarProps) {
  const { weeks, months, maxVal } = useMemo(() => {
    // Build 52 weeks of data
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const statsMap = new Map<string, DailyStats>();
    for (const s of dailyStats) {
      statsMap.set(s.date, s);
    }

    let maxVal = 1;
    const weeks: { date: string; value: number; day: number }[][] = [];
    let currentWeek: { date: string; value: number; day: number }[] = [];

    const months: { label: string; col: number }[] = [];
    let lastMonth = -1;

    const d = new Date(startDate);
    let col = 0;
    while (d <= today) {
      const dateStr = d.toISOString().split('T')[0];
      const stat = statsMap.get(dateStr);
      const value = stat ? stat.sessionsCount : 0;
      if (value > maxVal) maxVal = value;

      const month = d.getMonth();
      if (month !== lastMonth) {
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        months.push({ label: monthNames[month], col });
        lastMonth = month;
      }

      currentWeek.push({ date: dateStr, value, day: d.getDay() });

      if (d.getDay() === 6 || d.getTime() === today.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
        col++;
      }

      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, months, maxVal };
  }, [dailyStats]);

  function getColor(value: number): string {
    if (value === 0) return 'var(--bg-tertiary)';
    const intensity = value / maxVal;
    if (intensity < 0.25) return 'rgba(108, 92, 231, 0.25)';
    if (intensity < 0.5) return 'rgba(108, 92, 231, 0.45)';
    if (intensity < 0.75) return 'rgba(108, 92, 231, 0.65)';
    return 'rgba(108, 92, 231, 0.9)';
  }

  const cellSize = 11;
  const gap = 2;

  return (
    <div className={`overflow-x-auto ${className}`}>
      {/* Month labels */}
      <div className="flex mb-1 text-[10px]" style={{ color: 'var(--text-muted)', paddingLeft: 28 }}>
        {months.map((m, i) => (
          <span key={i} style={{ position: 'relative', left: m.col * (cellSize + gap) - (i > 0 ? months[i-1].col * (cellSize + gap) : 0), minWidth: 0 }}>
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 text-[10px] pr-1" style={{ color: 'var(--text-muted)', width: 24 }}>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>월</span>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>수</span>
          <span style={{ height: cellSize }}></span>
          <span style={{ height: cellSize, lineHeight: `${cellSize}px` }}>금</span>
          <span style={{ height: cellSize }}></span>
        </div>

        {/* Grid */}
        <div className="flex gap-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                const cell = week.find(c => c.day === dayIdx);
                return (
                  <div
                    key={dayIdx}
                    className="rounded-sm transition-colors"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: cell ? getColor(cell.value) : 'transparent',
                    }}
                    title={cell ? `${cell.date}: ${cell.value}회 연습` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 justify-end text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>적음</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: cellSize,
              height: cellSize,
              background: v === 0 ? 'var(--bg-tertiary)' :
                `rgba(108, 92, 231, ${0.25 + v * 0.65})`,
            }}
          />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}
